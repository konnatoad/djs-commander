import { Client } from 'discord.js';
import type { LocalCommand, Logger } from '../types';
/**
 * Makes Discord's commands match the command files in one bulk overwrite: new files
 * are registered, changed ones edited, and commands with no file (or `deleted: true`)
 * removed. Nothing is sent when they already match.
 */
export declare function registerCommands({ client, commands: localCommands, testServer, logger, }: {
    client: Client;
    commands: LocalCommand[];
    testServer?: string;
    logger?: Logger;
}): Promise<void>;
