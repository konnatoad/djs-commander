# djs-commander

A command, event and validation handler for discord.js v14. This is a fork of
[notunderctrl/djs-commander](https://github.com/notunderctrl/djs-commander) that keeps
its file layout and adds:

- **Registration that matches your files:** one bulk overwrite at startup. New commands
  are registered, changed ones edited (subcommands, options and permissions included),
  and commands whose file is gone are removed. Nothing is sent when Discord already
  matches.
- **Subcommands:** export a function per subcommand instead of switching on
  `getSubcommand()` yourself. They're checked against `data` at startup.
- **Errors are logged, not thrown:** a command, validation, autocomplete or event file
  that throws is logged with its name and stack, and the bot keeps running.
- **Any logger:** anything with `info`, `warn` and `error` (console, winston, pino…).
- **Types built in**, for TypeScript and editors.

## Installation

```bash
npm install github:konnatoad/djs-commander#v1.0.0
```

## Usage

```js
// index.js
const { Client, IntentsBitField } = require('discord.js');
const { CommandHandler } = require('djs-commander');
const path = require('path');

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  validationsPath: path.join(__dirname, 'validations'), // needs commandsPath
  testServer: 'TEST_SERVER_ID', // register in this guild instead of globally
  logger: console, // anything with info, warn and error; console when left out
});

client.login('YOUR_TOKEN_HERE');
```

Only code files are loaded (`.js`, `.cjs`, `.mjs` and `.ts`, not `.d.ts`), in order of
their path, so notes, JSON and source maps can sit next to them.

## Commands

Every file in the commands folder and its subfolders is a command:

```shell
commands/
├── ping.js
└── moderation/
    └── warn.js
```

```js
// commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),

  run: ({ interaction, client, handler }) => {
    interaction.reply(`Pong! ${client.ws.ping}ms`);
  },

  // deleted: true, // leaves the command out, so it's removed from Discord
};
```

- `interaction` is the interaction that ran the command.
- `client` is the discord.js Client.
- `handler` is the CommandHandler, for things like `handler.commands`.

`data` can be a builder or the JSON Discord takes. User and message context menu
commands work the same way, without a description. An `autocomplete` function gets the
same `{ interaction, client, handler }` for autocomplete interactions. Anything else the
file exports (like `devOnly`) stays on the command, for validations to read.

### Subcommands

Instead of `run`, export `subcommands`: a function per subcommand, and for a subcommand
group, an object of them.

```js
// commands/moderation/warn.js
module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warnings')
    .addSubcommand((sub) => sub.setName('add').setDescription('Add a warning'))
    .addSubcommandGroup((group) =>
      group
        .setName('list')
        .setDescription('List warnings')
        .addSubcommand((sub) => sub.setName('mine').setDescription('Your warnings'))
    ),

  subcommands: {
    add: ({ interaction }) => interaction.reply('Warned.'),
    list: {
      mine: ({ interaction }) => interaction.reply('No warnings.'),
    },
  },
};
```

A file exports `run` or `subcommands`, not both. Every subcommand in `data` needs a
function and every function a subcommand in `data`, or the bot stops at startup and
names the file.

### Registration

When the client is ready, the commands are compared with what Discord has, and if
anything differs they're all sent in one bulk overwrite. The log says what changed:

```
✅ Registered command "ping".
🔁 Edited command "warn".
🗑 Removed command "old".
```

A command with no file anymore is removed, so the files are the whole list. An
Activity's Entry Point command is kept, since Discord won't let a bulk overwrite drop it.
A failed registration is logged, and the bot keeps running.

### Errors

When a command, a validation or autocomplete throws, the error is logged with the
command's name and its stack. Nothing replies to the interaction for you; replying is up
to the command. A validation that throws stops the command, like one that returns
`true`.

## Events

Each folder in the events folder is named after an event, and its files run when it
fires, in order of their path:

```shell
events/
├── clientReady/
│   └── console-log.js
└── messageCreate/
    ├── auto-mod/
    │   └── delete-swear-words.js
    └── chat-bot.js
```

```js
// events/clientReady/console-log.js
module.exports = (argument, client, handler) => {
  console.log(`${client.user.tag} is online.`);
};
```

- `argument` is what the event gives you, like the message for `messageCreate`. Events
  with more arguments pass them all first.
- `client` is the discord.js Client.
- `handler` is the CommandHandler.

A file that returns something truthy stops the files after it for that event. A file
that throws is logged and the next one still runs. Files are imported once, at startup,
and one that doesn't import is logged and left out.

## Validations

Validations run before every command, in order of their path:

```shell
validations/
└── dev-only.js
```

```js
// validations/dev-only.js
module.exports = (interaction, command, handler, client) => {
  if (command.devOnly && interaction.user.id !== 'DEVELOPER_ID') {
    interaction.reply('This command is for the developer only');
    return true; // stops the command and the validations after this one
  }
};
```

- `interaction` is the interaction.
- `command` is the command: its `name`, `description`, `options` and whatever else its
  file exports.
- `handler` is the CommandHandler.
- `client` is the discord.js Client.

## TypeScript

The types come with the package:

```ts
import type { CommandModule } from 'djs-commander';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
  run: ({ interaction }) => interaction.reply('Pong!'),
} satisfies CommandModule;
```

`Logger`, `CommandHandlerOptions`, `RunContext`, `RunFunction`, `Subcommands`,
`LocalCommand` and `Validation` are exported too.
