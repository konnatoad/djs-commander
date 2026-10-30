// A command file can export `subcommands` instead of `run`, and the handler runs the
// function for the subcommand that was used. Mismatches stop the bot at startup.
const { test } = require('node:test');
const { execFile } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const { CommandHandler } = require('../dist/index.js');
const { fakeClient, fakeLogger, chatInput, until } = require('./fakeClient');

const fixtures = path.join(__dirname, 'fixtures');

async function readyHandler() {
  const client = fakeClient();
  const logger = fakeLogger();
  const handler = new CommandHandler({ client, commandsPath: path.join(fixtures, 'subcommands/commands'), logger });
  client.emit('clientReady', client);
  await until(() => client.listenerCount('interactionCreate') > 0, 'command listeners');
  return { client, handler, logger };
}

/** A slash command interaction for `/name [group] subcommand`. */
function used(name, group, subcommand) {
  return chatInput(name, {
    options: {
      getSubcommandGroup: () => group,
      getSubcommand: () => subcommand,
    },
  });
}

test('runs the function for a plain subcommand', async () => {
  const { client } = await readyHandler();
  const interaction = used('config', null, 'disable');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'the subcommand');
  assert.deepEqual(interaction.calls, [['config disable']]);
});

test('runs the function for a subcommand in a group, with the usual context', async () => {
  const { client, handler } = await readyHandler();
  const interaction = used('alerts', 'youtube', 'remove');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'the subcommand');
  assert.deepEqual(interaction.calls, [['alerts youtube remove', client, handler]]);
});

test('a subcommand outside the groups works next to them', async () => {
  const { client } = await readyHandler();
  const interaction = used('alerts', null, 'list');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'the subcommand');
  assert.deepEqual(interaction.calls.map(([name]) => name), ['alerts list']);
});

test('run still works for a command that dispatches its own subcommands', async () => {
  const { client } = await readyHandler();
  const interaction = used('stats', null, 'tft');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'run');
  assert.deepEqual(interaction.calls, [['stats run', 'tft']]);
});

test('subcommands are not sent to Discord', async () => {
  const { client } = await readyHandler();
  const commands = client.application.commands;
  await until(() => commands.names().length === 3, 'registration');
  for (const command of commands.registered.values()) assert.equal(command.subcommands, undefined);
  assert.deepEqual(commands.find('alerts').options.map((option) => option.name), ['list', 'youtube', 'twitch']);
});

test('an error in a subcommand is logged with its full name', async () => {
  const { client, handler, logger } = await readyHandler();
  handler.commands.find((command) => command.name === 'config').subcommands.setup = () => {
    throw new Error('boom in setup');
  };
  client.emit('interactionCreate', used('config', null, 'setup'));
  await until(() => logger.lines.some(([level]) => level === 'error'), 'the error');
  assert.match(logger.lines.find(([level]) => level === 'error')[1], /^Command "config setup" failed: Error: boom in setup/);
});

/**
 * Starts a bot on a fixture in its own node process, the way a real bot starts, and
 * returns how it ended: a mismatch has to stop the process before anything registers.
 */
function startBot(bot) {
  const script = `
    const { CommandHandler } = require(${JSON.stringify(path.join(__dirname, '../dist/index.js'))});
    const { fakeClient, fakeLogger } = require(${JSON.stringify(path.join(__dirname, 'fakeClient.js'))});
    const client = fakeClient();
    new CommandHandler({ client, commandsPath: ${JSON.stringify(path.join(fixtures, bot, 'commands'))}, logger: fakeLogger() });
    client.emit('clientReady', client);
    setTimeout(() => console.log('registered:', client.application.commands.names().join(',')), 200);
  `;
  return new Promise((resolve) =>
    execFile(process.execPath, ['-e', script], (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }))
  );
}

test('a subcommand in data with no function stops startup, naming the file', async () => {
  const { code, stdout, stderr } = await startBot('subcommand-typo');
  assert.notEqual(code, 0);
  assert.equal(stdout, '');
  assert.match(stderr, /subcommand-typo\/commands\/config\.js has subcommands that don't match/);
  assert.match(stderr, /"disable" is in data but has no function/);
  assert.match(stderr, /"disabel" has a function but isn't in data/);
});

test('a function for a subcommand that is not in data stops startup', async () => {
  const { code, stderr } = await startBot('subcommand-extra');
  assert.notEqual(code, 0);
  assert.match(stderr, /subcommand-extra\/commands\/alerts\.js/);
  assert.match(stderr, /"youtube remove" has a function but isn't in data/);
});

test('a matching command file starts and registers', async () => {
  const { code, stdout } = await startBot('subcommands');
  assert.equal(code, 0);
  assert.equal(stdout.trim(), 'registered: alerts,config,stats');
});
