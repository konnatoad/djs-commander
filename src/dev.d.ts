import { Client, APIApplicationCommand, SlashCommandBuilder } from 'discord.js';

export interface LocalCommand extends APIApplicationCommand {
  deleted?: boolean;
  [key: string]: any;
}
