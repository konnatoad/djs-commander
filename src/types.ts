import type {
  ApplicationCommandType,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandHandler } from './index';

/** Anything with `info`, `warn` and `error`: console, winston, pino and the like. */
export interface Logger {
  info(message: string): unknown;
  warn(message: string): unknown;
  error(message: string): unknown;
}

export interface CommandHandlerOptions {
  client: Client;
  commandsPath?: string;
  eventsPath?: string;
  validationsPath?: string;
  /** A guild id: commands are registered there instead of globally. */
  testServer?: string;
  /** Where the handler logs; console when it's left out. */
  logger?: Logger;
}

/** What `run`, a subcommand and `autocomplete` are called with. */
export interface RunContext<I = ChatInputCommandInteraction> {
  interaction: I;
  client: Client;
  handler: CommandHandler;
}

export type RunFunction<I = ChatInputCommandInteraction> = (context: RunContext<I>) => unknown;

/** By subcommand name, or by group name and then subcommand name. */
export type Subcommands = Record<string, RunFunction | Record<string, RunFunction>>;

/** What a command file exports. It has either `run` or `subcommands`. */
export interface CommandModule {
  /** A builder like `SlashCommandBuilder`, or the JSON Discord takes. */
  data: { toJSON(): RESTPostAPIApplicationCommandsJSONBody } | RESTPostAPIApplicationCommandsJSONBody;
  /** Context menu commands get their own interaction type. */
  run?: RunFunction<any>;
  subcommands?: Subcommands;
  autocomplete?: RunFunction<AutocompleteInteraction>;
  /** Leaves the command out, so Discord removes it. */
  deleted?: boolean;
  /** Anything else, like `devOnly`, is kept on the command for validations to read. */
  [key: string]: unknown;
}

/** A loaded command: its data as Discord takes it, plus the rest of the file's exports. */
export interface LocalCommand {
  name: string;
  type?: ApplicationCommandType;
  description?: string;
  deleted?: boolean;
  run?: RunFunction<any>;
  subcommands?: Subcommands;
  autocomplete?: RunFunction<AutocompleteInteraction>;
  [key: string]: any;
}

/** A validation file's function. Returning something truthy stops the command. */
export type Validation = (
  interaction: CommandInteraction,
  command: LocalCommand,
  handler: CommandHandler,
  client: Client
) => unknown;
