import { pathToFileURL } from 'url';
import { ApplicationCommandType } from 'discord.js';
import { getFilePaths } from './getPaths';

export async function buildCommandTree(commandsDir?: string) {
  const commandTree = [];

  if (!commandsDir) return [];

  const commandFilePaths = getFilePaths(commandsDir, true);

  for (const commandFilePath of commandFilePaths) {
    const imported = await import(pathToFileURL(commandFilePath).href);
    const mod = imported.default ?? imported;
    let { data, run, deleted, ...rest } = mod;
    if (!data) throw new Error(`File ${commandFilePath} must export "data".`);
    if (!run) throw new Error(`File ${commandFilePath} must export a "run" function.`);
    if (!data.name) throw new Error(`File ${commandFilePath} must have a command name.`);
    // context menu commands (user and message) have no description
    const isSlashCommand = (data.type ?? ApplicationCommandType.ChatInput) === ApplicationCommandType.ChatInput;
    if (isSlashCommand && !data.description) throw new Error(`File ${commandFilePath} must have a command description.`);

    try {
      data = data.toJSON();
    } catch (error) {}

    commandTree.push({
      ...data,
      ...rest,
      deleted,
      run,
    });
  }

  return commandTree;
}
