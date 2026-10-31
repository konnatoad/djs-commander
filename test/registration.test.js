// Registration makes Discord's commands match the command files in one bulk overwrite.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { CommandHandler } = require('../dist/index.js');
const { fakeClient, fakeLogger, until } = require('./fakeClient');

const folders = [];
after(() => folders.forEach((folder) => fs.rmSync(folder, { recursive: true, force: true })));

/** A commands folder with one file per command, each exporting `data` and `run`. */
function commandFiles(commands) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'djs-commander-'));
  folders.push(folder);
  for (const { deleted, ...data } of commands) {
    const file = `module.exports = { data: ${JSON.stringify(data)}, run() {}, deleted: ${Boolean(deleted)} };`;
    fs.writeFileSync(path.join(folder, `${data.name}-${data.type ?? 1}.js`), file);
  }
  return folder;
}

/** Starts a handler on `client` and waits until registration has finished. */
async function start(client, commands, options = {}) {
  const logger = fakeLogger();
  const manager = options.manager ?? client.application.commands;
  const fetches = manager.calls.filter(([call]) => call === 'fetch').length;
  new CommandHandler({ client, commandsPath: commandFiles(commands), logger, ...options.handler });
  client.emit('clientReady', client);
  await until(() => manager.calls.filter(([call]) => call === 'fetch').length > fetches, 'the fetch');
  await new Promise((resolve) => setTimeout(resolve, 20));
  return logger;
}

const sets = (manager) => manager.calls.filter(([call]) => call === 'set');
const logged = (logger) => logger.lines.map(([, line]) => line);

const ping = { name: 'ping', description: 'Replies with pong' };
const warn = {
  name: 'warn',
  description: 'Warnings',
  options: [
    { type: 1, name: 'add', description: 'Add a warning', options: [{ type: 6, name: 'user', description: 'Who', required: true }] },
    { type: 1, name: 'list', description: 'List warnings' },
  ],
};

test('registers new commands in one request', async () => {
  const client = fakeClient();
  const logger = await start(client, [ping, warn]);
  const manager = client.application.commands;
  assert.deepEqual(sets(manager), [['set', ['ping', 'warn']]]);
  assert.equal(manager.calls.filter(([call]) => ['create', 'edit', 'delete'].includes(call)).length, 0);
  assert.deepEqual(logged(logger), ['✅ Registered command "ping".', '✅ Registered command "warn".']);
});

test('sends nothing when Discord already matches the files', async () => {
  const client = fakeClient({ existing: [ping, warn] });
  const logger = await start(client, [ping, warn]);
  assert.deepEqual(sets(client.application.commands), []);
  assert.deepEqual(logger.lines, []);
});

test('a subcommand without options matches what Discord sends back for it', async () => {
  // a builder gives `options: []` for it, and Discord leaves the field out
  const quote = {
    name: 'quote',
    description: 'Quotes',
    options: [
      { type: 1, name: 'add', description: 'Add a quote', options: [{ type: 3, name: 'text', description: 'What' }] },
      { type: 1, name: 'removeall', description: 'Remove all quotes', options: [] },
    ],
  };
  const client = fakeClient();
  await start(client, [quote]);
  assert.equal(client.application.commands.find('quote').options[1].options, undefined);
  const logger = await start(client, [quote]);
  assert.equal(sets(client.application.commands).length, 1);
  assert.deepEqual(logger.lines, []);
});

test('sends nothing on the next start after registering', async () => {
  const client = fakeClient();
  await start(client, [ping, warn]);
  const logger = await start(client, [ping, warn]);
  assert.equal(sets(client.application.commands).length, 1);
  assert.deepEqual(logger.lines, []);
});

test('removes commands that no longer have a file', async () => {
  const client = fakeClient({ existing: [ping, warn, { name: 'tempban', description: 'Ban for a while' }] });
  const logger = await start(client, [ping, warn]);
  assert.deepEqual(client.application.commands.names(), ['ping', 'warn']);
  assert.deepEqual(logged(logger), ['🗑 Removed command "tempban".']);
});

test('removes commands marked deleted and does not register them', async () => {
  const client = fakeClient({ existing: [ping, warn] });
  const logger = await start(client, [ping, { ...warn, deleted: true }, { name: 'old', description: 'Gone', deleted: true }]);
  assert.deepEqual(client.application.commands.names(), ['ping']);
  assert.deepEqual(logged(logger), ['🗑 Removed command "warn".']);
});

test('notices a change inside a subcommand', async () => {
  const client = fakeClient({ existing: [ping, warn] });
  const changed = structuredClone(warn);
  changed.options[0].options[0].required = false;
  const logger = await start(client, [ping, changed]);
  assert.deepEqual(logged(logger), ['🔁 Edited command "warn".']);
  assert.equal(client.application.commands.find('warn').options[0].options[0].required, false);
});

test('notices a renamed subcommand when the count stays the same', async () => {
  const client = fakeClient({ existing: [warn] });
  const renamed = structuredClone(warn);
  renamed.options[1].name = 'show';
  const logger = await start(client, [renamed]);
  assert.deepEqual(logged(logger), ['🔁 Edited command "warn".']);
});

test('notices reordered subcommands', async () => {
  const client = fakeClient({ existing: [warn] });
  const logger = await start(client, [{ ...warn, options: [...warn.options].reverse() }]);
  assert.deepEqual(logged(logger), ['🔁 Edited command "warn".']);
});

test('notices a permission change', async () => {
  const client = fakeClient({ existing: [warn] });
  const logger = await start(client, [{ ...warn, default_member_permissions: String(PermissionFlagsBits.KickMembers) }]);
  assert.deepEqual(logged(logger), ['🔁 Edited command "warn".']);
  assert.equal(client.application.commands.find('warn').defaultMemberPermissions.bitfield, PermissionFlagsBits.KickMembers);
});

test('notices nsfw and contexts being set', async () => {
  const client = fakeClient({ existing: [ping, warn] });
  const logger = await start(client, [{ ...ping, nsfw: true }, { ...warn, contexts: [0] }]);
  assert.deepEqual(logged(logger), ['🔁 Edited command "ping".', '🔁 Edited command "warn".']);
});

test('keeps a slash command and a context menu that share a name', async () => {
  const menu = { type: 2, name: 'warn', description: '' };
  const client = fakeClient({ existing: [warn, menu] });
  const logger = await start(client, [warn, menu]);
  assert.deepEqual(logger.lines, []);
  assert.deepEqual(client.application.commands.names(), ['warn', 'warn']);
});

test("keeps an Activity's Entry Point command", async () => {
  const launch = { type: 4, name: 'launch', description: 'Start the activity', handler: 2 };
  const client = fakeClient({ existing: [launch, { name: 'tempban', description: 'Ban for a while' }] });
  const logger = await start(client, [ping]);
  assert.deepEqual(client.application.commands.names(), ['launch', 'ping']);
  assert.deepEqual(logged(logger), ['✅ Registered command "ping".', '🗑 Removed command "tempban".']);
});

test('only sends the fields Discord stores', async () => {
  const client = fakeClient();
  const folder = commandFiles([]);
  fs.writeFileSync(
    path.join(folder, 'ping.js'),
    `module.exports = { data: ${JSON.stringify(ping)}, run() {}, autocomplete() {}, devOnly: true, testOnly: true };`
  );
  let sent;
  const manager = client.application.commands;
  const set = manager.set.bind(manager);
  manager.set = (commands) => ((sent = commands), set(commands));
  new CommandHandler({ client, commandsPath: folder, logger: fakeLogger() });
  client.emit('clientReady', client);
  await until(() => sent, 'the set');
  assert.deepEqual(Object.keys(sent[0]).sort(), ['description', 'name']);
});

test('logs a failed registration instead of throwing', async () => {
  const client = fakeClient();
  client.application.commands.failNextSet = true;
  const logger = await start(client, [ping]);
  assert.deepEqual(logger.lines, [['error', "Couldn't register commands: Error: Missing Access"]]);
});

test('registers in the test server when one is given', async () => {
  const client = fakeClient();
  const guild = fakeClient({ existing: [{ name: 'old', description: 'Gone' }] }).application;
  client.guilds = { fetch: async (id) => (id === '123' ? guild : null) };
  const logger = await start(client, [ping], { manager: guild.commands, handler: { testServer: '123' } });
  assert.deepEqual(guild.commands.names(), ['ping']);
  assert.deepEqual(sets(client.application.commands), []);
  assert.deepEqual(logged(logger), ['✅ Registered command "ping".', '🗑 Removed command "old".']);
});
