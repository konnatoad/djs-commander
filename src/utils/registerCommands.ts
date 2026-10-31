import { ApplicationCommand, ApplicationCommandType, Client } from 'discord.js';
import type { LocalCommand, Logger } from '../types';
import { getAppCommands } from './getAppCommands';

// What Discord stores for a command; the rest of a command file's export (run,
// autocomplete, deleted, devOnly and the like) stays local.
const API_FIELDS = [
  'type',
  'name',
  'name_localizations',
  'description',
  'description_localizations',
  'options',
  'default_member_permissions',
  'nsfw',
  'contexts',
  'integration_types',
  'handler',
];

function apiCommand(command: LocalCommand) {
  const api: Record<string, any> = {};
  for (const field of API_FIELDS) {
    if (command[field] !== undefined) api[field] = command[field];
  }
  return api;
}

const sameCommand = (existing: ApplicationCommand, command: Record<string, any>) =>
  existing.name === command.name && existing.type === (command.type ?? ApplicationCommandType.ChatInput);

// Discord leaves out a subcommand's options when it has none, so a builder's
// `options: []` has to count as no options at all.
function withoutEmptyOptions(options?: Record<string, any>[]): Record<string, any>[] | undefined {
  return options?.map(({ options: inner, ...option }) => {
    const nested = withoutEmptyOptions(inner);
    return nested?.length ? { ...option, options: nested } : option;
  });
}

// Discord fills in nsfw, contexts and integration types when a command leaves them
// out, so leaving one out can't count as a change. Option order is what people see
// in the client, so reordering does count.
function isUnchanged(existing: ApplicationCommand, command: Record<string, any>) {
  return existing.equals(
    {
      ...command,
      options: withoutEmptyOptions(command.options),
      nsfw: command.nsfw ?? false,
      contexts: command.contexts ?? existing.contexts,
      integration_types: command.integration_types ?? existing.integrationTypes,
    } as any,
    true
  );
}

/**
 * Makes Discord's commands match the command files in one bulk overwrite: new files
 * are registered, changed ones edited, and commands with no file (or `deleted: true`)
 * removed. Nothing is sent when they already match.
 */
export async function registerCommands({
  client,
  commands: localCommands,
  testServer,
  logger,
}: {
  client: Client;
  commands: LocalCommand[];
  testServer?: string;
  logger?: Logger;
}) {
  const log = logger ?? console;

  try {
    const applicationCommands = await getAppCommands(client, testServer);
    const existing: ApplicationCommand[] = [...applicationCommands.cache.values()];
    const commands = localCommands.filter((command) => !command.deleted).map(apiCommand);
    const isLocal = (current: ApplicationCommand) => commands.some((command) => sameCommand(current, command));

    const changes: string[] = [];
    for (const command of commands) {
      const current = existing.find((candidate) => sameCommand(candidate, command));
      if (!current) changes.push(`✅ Registered command "${command.name}".`);
      else if (!isUnchanged(current, command)) changes.push(`🔁 Edited command "${command.name}".`);
    }

    // An Activity's Entry Point command can't be left out of a bulk overwrite
    const kept = existing.filter(
      (current) => current.type === ApplicationCommandType.PrimaryEntryPoint && !isLocal(current)
    );
    for (const current of existing) {
      if (!kept.includes(current) && !isLocal(current)) changes.push(`🗑 Removed command "${current.name}".`);
    }

    if (!changes.length) return;
    await applicationCommands.set([...commands, ...kept]);
    for (const change of changes) log.info(change);
  } catch (error) {
    log.error(`Couldn't register commands: ${error}`);
  }
}
