import type { CommandHandlerOptions, LocalCommand } from './types';
export type { CommandHandlerOptions, CommandModule, LocalCommand, Logger, RunContext, RunFunction, Subcommands, Validation, } from './types';
export declare class CommandHandler {
    private readonly _client;
    private readonly _commandsPath;
    private readonly _eventsPath;
    private readonly _validationsPath;
    private readonly _testServer;
    private readonly _validationFuncs;
    private readonly _logger;
    private _commands;
    private _commandsByKey;
    constructor({ client, commandsPath, eventsPath, validationsPath, testServer, logger }: CommandHandlerOptions);
    _commandsInit(): Promise<void>;
    private get _log();
    _registerSlashCommands(): void;
    _eventsInit(): void;
    _importEventFuncs(eventName: string, eventFuncPaths: string[]): Promise<{
        file: string;
        eventFunc: (...args: unknown[]) => unknown;
    }[]>;
    _validationsInit(): Promise<void>;
    _handleInteractions(): void;
    get commands(): LocalCommand[];
}
