import path from 'path';
import { pathToFileURL } from 'url';
import { ApplicationCommandType, ChatInputCommandInteraction, Client, CommandInteraction } from 'discord.js';
import type { CommandHandlerOptions, LocalCommand, Logger, RunFunction, Validation } from './types';
import { getFolderPaths, getFilePaths } from './utils/getPaths';
import { buildCommandTree } from './utils/buildCommandTree';
import { registerCommands } from './utils/registerCommands';

export type {
  CommandHandlerOptions,
  CommandModule,
  LocalCommand,
  Logger,
  RunContext,
  RunFunction,
  Subcommands,
  Validation,
} from './types';

export class CommandHandler {
  private readonly _client: Client;
  private readonly _commandsPath: string | undefined;
  private readonly _eventsPath: string | undefined;
  private readonly _validationsPath: string | undefined;
  private readonly _testServer: string | undefined;
  private readonly _validationFuncs: Validation[];
  private readonly _logger: Logger | undefined;
  private _commands: Array<LocalCommand>;
  // keyed by type and name, since a context menu can share its name with a slash command
  private _commandsByKey = new Map<string, LocalCommand>();

  constructor({ client, commandsPath, eventsPath, validationsPath, testServer, logger }: CommandHandlerOptions) {
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

  // The listeners go on right away, so an event fired before the files finish importing
  // waits for them instead of being missed. Each file is imported once.
  _eventsInit() {
    const eventPaths = getFolderPaths(this._eventsPath);

    for (const eventPath of eventPaths) {
      const eventName = path.basename(eventPath);
      if (!eventName) continue;

      const eventFuncs = this._importEventFuncs(eventName, getFilePaths(eventPath, true));

      this._client.on(eventName, async (...arg) => {
        for (const { file, eventFunc } of await eventFuncs) {
          // one broken event file is logged and skipped; the ones after it still run
          try {
            const cantRunEvent = await eventFunc(...arg, this._client, this);
            if (cantRunEvent) break;
          } catch (error) {
            this._log.error(`Event "${eventName}" failed in ${file}: ${describe(error)}`);
          }
        }
      });
    }
  }

  // Never rejects: a file that doesn't import is logged once and left out.
  async _importEventFuncs(eventName: string, eventFuncPaths: string[]) {
    const eventFuncs: Array<{ file: string; eventFunc: (...args: unknown[]) => unknown }> = [];

    for (const eventFuncPath of eventFuncPaths) {
      const file = path.basename(eventFuncPath);
      try {
        const imported = await import(pathToFileURL(eventFuncPath).href);
        const eventFunc = imported.default ?? imported;
        if (typeof eventFunc !== 'function') throw new Error('it must export a function');
        eventFuncs.push({ file, eventFunc });
      } catch (error) {
        this._log.error(`Event "${eventName}" file ${file} didn't load, so it won't run: ${describe(error)}`);
      }
    }

    return eventFuncs;
  }

  async _validationsInit() {
    const validationFilePaths = getFilePaths(this._validationsPath);

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
      if (interaction.isAutocomplete()) {
        try {
          await command.autocomplete?.({ interaction, client: this._client, handler: this });
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

      const { run, name } = commandRun(command, interaction);
      if (!run) {
        // Discord can still have an old subcommand for a moment after the files changed
        this._log.warn(`Nothing to run for "${name}", it isn't in the command file anymore.`);
        return;
      }

      try {
        await run({ interaction, client: this._client, handler: this });
      } catch (error) {
        this._log.error(`Command "${name}" failed: ${describe(error)}`);
      }
    });
  }

  get commands() {
    return this._commands;
  }
}

/**
 * The function to run for an interaction, and the name to log it under: `run`, or for a
 * command that exports `subcommands`, the one for the subcommand (and group) that was used.
 */
function commandRun(command: LocalCommand, interaction: CommandInteraction) {
  const subcommands = command.subcommands;
  if (!subcommands) return { run: command.run, name: command.name };

  const options = (interaction as ChatInputCommandInteraction).options;
  const group = options.getSubcommandGroup(false);
  const subcommand = options.getSubcommand(false) ?? '';
  let run: RunFunction<any> | undefined;
  if (group) {
    const inGroup = subcommands[group];
    run = typeof inGroup === 'object' ? inGroup[subcommand] : undefined;
  } else {
    const found = subcommands[subcommand];
    run = typeof found === 'function' ? found : undefined;
  }
  const name = [command.name, group, subcommand].filter(Boolean).join(' ');
  return { run, name };
}

const commandKey = (type: ApplicationCommandType | undefined, name: string) =>
  `${type ?? ApplicationCommandType.ChatInput}:${name}`;

const describe = (error: unknown) => (error instanceof Error ? error.stack ?? error.message : String(error));
