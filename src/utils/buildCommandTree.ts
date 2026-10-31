import { pathToFileURL } from 'url';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { getFilePaths } from './getPaths';

export async function buildCommandTree(commandsDir?: string) {
  const commandTree = [];

  if (!commandsDir) return [];

  const commandFilePaths = getFilePaths(commandsDir, true);

  for (const commandFilePath of commandFilePaths) {
    const imported = await import(pathToFileURL(commandFilePath).href);
    const mod = imported.default ?? imported;
    let { data, run, subcommands, deleted, ...rest } = mod;
    if (!data) throw new Error(`File ${commandFilePath} must export "data".`);
    if (!data.name) throw new Error(`File ${commandFilePath} must have a command name.`);
    // context menu commands (user and message) have no description
    const isSlashCommand = (data.type ?? ApplicationCommandType.ChatInput) === ApplicationCommandType.ChatInput;
    if (isSlashCommand && !data.description) throw new Error(`File ${commandFilePath} must have a command description.`);

    try {
      data = data.toJSON();
    } catch (error) {}

    if (subcommands) {
      if (run) throw new Error(`File ${commandFilePath} exports both "run" and "subcommands"; use one of them.`);
      checkSubcommands(commandFilePath, data, subcommands);
    } else if (!run) {
      throw new Error(`File ${commandFilePath} must export a "run" function or "subcommands".`);
    }

    commandTree.push({
      ...data,
      ...rest,
      deleted,
      run,
      subcommands,
    });
  }

  return commandTree;
}

/** "add", or "youtube add" for a subcommand in a group: how both sides are compared. */
function subcommandsInData(data: any): string[] {
  const names: string[] = [];
  for (const option of data.options ?? []) {
    if (option.type === ApplicationCommandOptionType.Subcommand) names.push(option.name);
    if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
      for (const sub of option.options ?? []) names.push(`${option.name} ${sub.name}`);
    }
  }
  return names;
}

function subcommandsExported(commandFilePath: string, subcommands: Record<string, any>): string[] {
  const names: string[] = [];
  for (const [name, value] of Object.entries(subcommands)) {
    if (typeof value === 'function') {
      names.push(name);
    } else if (value && typeof value === 'object') {
      for (const [sub, func] of Object.entries(value)) {
        if (typeof func !== 'function')
          throw new Error(`File ${commandFilePath}: subcommands.${name}.${sub} must be a function.`);
        names.push(`${name} ${sub}`);
      }
    } else {
      throw new Error(`File ${commandFilePath}: subcommands.${name} must be a function or a group of functions.`);
    }
  }
  return names;
}

/**
 * Every subcommand in `data` needs a function in `subcommands` and the other way round,
 * so a typo stops the bot at startup instead of a subcommand silently doing nothing.
 */
function checkSubcommands(commandFilePath: string, data: any, subcommands: Record<string, any>) {
  const inData = subcommandsInData(data);
  const exported = subcommandsExported(commandFilePath, subcommands);
  const problems = [
    ...inData.filter((name) => !exported.includes(name)).map((name) => `"${name}" is in data but has no function`),
    ...exported.filter((name) => !inData.includes(name)).map((name) => `"${name}" has a function but isn't in data`),
  ];
  if (problems.length) {
    throw new Error(`File ${commandFilePath} has subcommands that don't match: ${problems.join('; ')}.`);
  }
}
