import path from 'path';
import { pathToFileURL } from 'url';
import { ApplicationCommandType, Client, CommandInteraction } from 'discord.js';
import { Logger } from 'winston';
import { LocalCommand } from './dev';
import { getFolderPaths, getFilePaths } from './utils/getPaths';
import { buildCommandTree } from './utils/buildCommandTree';
import { registerCommands } from './utils/registerCommands';

export class CommandHandler {
  private readonly _client: Client;
  private readonly _commandsPath: string | undefined;
  private readonly _eventsPath: string | undefined;
  private readonly _validationsPath: string | undefined;
  private readonly _testServer: string | undefined;
  private readonly _validationFuncs: Array<(interaction: CommandInteraction, command: LocalCommand, handler: CommandHandler, client: Client) => unknown>;
  private readonly _logger: Logger | undefined;
  private _commands: Array<LocalCommand>;
  // keyed by type and name, since a context menu can share its name with a slash command
  private _commandsByKey = new Map<string, LocalCommand>();

  constructor({
    client,
    commandsPath,
    eventsPath,
    validationsPath,
    testServer,
    logger,
  }: {
    client: Client;
    commandsPath?: string;
    eventsPath?: string;
    validationsPath?: string;
    testServer?: string;
    logger?: Logger;
  }) {
    if (!client)
      throw new Error('Property "client" is required when instantiating CommandHandler.');

    this._client = client;
    this._commandsPath = commandsPath;
    this._eventsPath = eventsPath;
    this._validationsPath = validationsPath;
    this._testServer = testServer;
    this._commands = [];
    this._validationFuncs = [];
    this._logger = logger;

    if (this._validationsPath && !commandsPath) {
      throw new Error(
        'Command validations are only available in the presence of a commands path. Either add "commandsPath" or remove "validationsPath"'
      );
    }

    if (this._commandsPath) {
      this._client.once('clientReady', async () => {
        await this._commandsInit();
        this._registerSlashCommands();
        this._validationsPath && await this._validationsInit();
        this._handleInteractions();
      });
    }

    if (this._eventsPath) {
      this._eventsInit();
    }
  }

  async _commandsInit() {
    let commands = await buildCommandTree(this._commandsPath);
    this._commands = commands;
    this._commandsByKey = new Map(commands.map((command) => [commandKey(command.type, command.name), command]));
  }

  private get _log() {
    return this._logger ?? console;
  }

  _registerSlashCommands() {
    registerCommands({
      client: this._client,
      commands: this._commands,
      testServer: this._testServer,
      logger: this._logger,
    });
  }

  _eventsInit() {
    const eventPaths = getFolderPaths(this._eventsPath);

    for (const eventPath of eventPaths) {
      const eventName = path.basename(eventPath);
      const eventFuncPaths = getFilePaths(eventPath, true);
      eventFuncPaths.sort();

      if (!eventName) continue;

      this._client.on(eventName, async (...arg) => {
        for (const eventFuncPath of eventFuncPaths) {
          // one broken event file is logged and skipped; the ones after it still run
          try {
            const imported = await import(pathToFileURL(eventFuncPath).href);
            const eventFunc = imported.default ?? imported;
            const cantRunEvent = await eventFunc(...arg, this._client, this);
            if (cantRunEvent) break;
          } catch (error) {
            this._log.error(`Event "${eventName}" failed in ${path.basename(eventFuncPath)}: ${describe(error)}`);
          }
        }
      });
    }
  }

  async _validationsInit() {
    const validationFilePaths = getFilePaths(this._validationsPath);
    validationFilePaths.sort();

    for (const validationFilePath of validationFilePaths) {
      const imported = await import(pathToFileURL(validationFilePath).href);
      const validationFunc = imported.default ?? imported;
      if (typeof validationFunc !== 'function') {
        throw new Error(`Validation file ${validationFilePath} must export a function by default.`);
      }

      this._validationFuncs.push(validationFunc);
    }
  }

  // Slash commands, context menus and autocomplete. A command that throws is logged
  // and nothing replies for it; replying is up to the command.
  _handleInteractions() {
    this._client.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

      const command = this._commandsByKey.get(commandKey(interaction.commandType, interaction.commandName));
      if (!command) return;
      const context = { interaction, client: this._client, handler: this };

      if (interaction.isAutocomplete()) {
        try {
          await command.autocomplete?.(context);
        } catch (error) {
          this._log.error(`Autocomplete for "${command.name}" failed: ${describe(error)}`);
        }
        return;
      }

      try {
        for (const validationFunc of this._validationFuncs) {
          const cantRunCommand = await validationFunc(interaction, command, this, this._client);
          if (cantRunCommand) return;
        }
      } catch (error) {
        this._log.error(`A validation failed for "${command.name}", so it didn't run: ${describe(error)}`);
        return;
      }

      try {
        await command.run(context);
      } catch (error) {
        this._log.error(`Command "${command.name}" failed: ${describe(error)}`);
      }
    });
  }

  get commands() {
    return this._commands;
  }
}

const commandKey = (type: ApplicationCommandType | undefined, name: string) =>
  `${type ?? ApplicationCommandType.ChatInput}:${name}`;

const describe = (error: unknown) => (error instanceof Error ? error.stack ?? error.message : String(error));
