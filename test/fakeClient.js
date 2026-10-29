// A stand-in for the discord.js Client: real events through EventEmitter, and an
// application command manager that keeps what was registered in `registered`
// and every call made to it in `calls`.
const { EventEmitter } = require('node:events');

function fakeCommandManager(existing = []) {
  let nextId = 1;
  const registered = new Map();
  const calls = [];
  const add = (command) => {
    const id = String(nextId++);
    registered.set(id, { id, ...command });
    return registered.get(id);
  };
  for (const command of existing) add(command);

  return {
    registered,
    calls,
    names: () => [...registered.values()].map((command) => command.name).sort(),
    cache: { find: (match) => [...registered.values()].find(match) },
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
      registered.set(id, { ...registered.get(id), ...command });
      return registered.get(id);
    },
    async delete(id) {
      calls.push(['delete', registered.get(id).name]);
      registered.delete(id);
    },
    async set(commands) {
      calls.push(['set', commands.map((command) => command.name)]);
      registered.clear();
      return commands.map(add);
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
    calls: [],
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    ...extra,
  };
}

function autocomplete(commandName) {
  return { ...chatInput(commandName), isChatInputCommand: () => false, isAutocomplete: () => true };
}

/** Waits until `ready()` is true; the handler sets itself up asynchronously after clientReady. */
async function until(ready, what) {
  const deadline = Date.now() + 2000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

module.exports = { fakeClient, fakeLogger, chatInput, autocomplete, until };
