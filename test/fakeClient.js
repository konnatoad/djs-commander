// A stand-in for the discord.js Client: real events through EventEmitter, and an
// application command manager that keeps what was registered in `registered`
// and every call made to it in `calls`. Registered commands are real discord.js
// ApplicationCommands with the defaults Discord fills in, so comparing against
// them works the way it does against Discord.
const { EventEmitter } = require('node:events');
const { ApplicationCommand, ApplicationCommandManager } = require('discord.js');

/** A command the way Discord sends it back: with its defaults filled in. */
function asDiscordHasIt(command, id) {
  return {
    id,
    application_id: '1',
    version: '1',
    type: 1,
    default_member_permissions: null,
    nsfw: false,
    contexts: null,
    integration_types: [0],
    ...Object.fromEntries(Object.entries(command).filter(([, value]) => value !== undefined)),
  };
}

function fakeCommandManager(existing = []) {
  let nextId = 1;
  const registered = new Map();
  const calls = [];
  const add = (command) => {
    const id = String(nextId++);
    registered.set(id, new ApplicationCommand({ options: {} }, asDiscordHasIt(command, id)));
    return registered.get(id);
  };
  for (const command of existing) add(command);

  return {
    registered,
    calls,
    cache: registered,
    names: () => [...registered.values()].map((command) => command.name).sort(),
    find: (name) => [...registered.values()].find((command) => command.name === name),
    async fetch() {
      calls.push(['fetch']);
      return registered;
    },
    async create(command) {
      calls.push(['create', command.name]);
      return add(command);
    },
    async edit(id, command) {
      calls.push(['edit', registered.get(id).name]);
      registered.delete(id);
      return add(command);
    },
    async delete(id) {
      calls.push(['delete', registered.get(id).name]);
      registered.delete(id);
    },
    async set(commands) {
      // the same conversion discord.js does before sending them
      const sent = commands.map((command) => ApplicationCommandManager.transformCommand(command));
      calls.push(['set', sent.map((command) => command.name)]);
      if (this.failNextSet) {
        this.failNextSet = false;
        throw new Error('Missing Access');
      }
      registered.clear();
      return sent.map(add);
    },
  };
}

function fakeClient({ existing } = {}) {
  const client = new EventEmitter();
  client.application = { commands: fakeCommandManager(existing) };
  return client;
}

function fakeLogger() {
  const lines = [];
  return {
    lines,
    info: (message) => lines.push(['info', message]),
    warn: (message) => lines.push(['warn', message]),
    error: (message) => lines.push(['error', message]),
  };
}

function chatInput(commandName, extra = {}) {
  return {
    commandName,
    commandType: 1,
    calls: [],
    isCommand: () => true,
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    ...extra,
  };
}

/** A right-click User (type 2) or Message (type 3) app command. */
function contextMenu(commandName, commandType, extra = {}) {
  return { ...chatInput(commandName, extra), commandType, isChatInputCommand: () => false };
}

function autocomplete(commandName, extra = {}) {
  return {
    ...chatInput(commandName, extra),
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => true,
  };
}

/** Waits until `ready()` is true; the handler sets itself up asynchronously after clientReady. */
async function until(ready, what) {
  const deadline = Date.now() + 2000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

module.exports = { fakeClient, fakeLogger, chatInput, contextMenu, autocomplete, until };
