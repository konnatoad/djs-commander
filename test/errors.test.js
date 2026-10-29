// Anything a command, validation, autocomplete or event throws is logged with its
// name instead of becoming an unhandled rejection.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { CommandHandler } = require('../dist/index.js');
const { fakeClient, fakeLogger, chatInput, contextMenu, autocomplete, until } = require('./fakeClient');

const bot = path.join(__dirname, 'fixtures/broken');

const unhandled = [];
const recordUnhandled = (error) => unhandled.push(error);
before(() => process.on('unhandledRejection', recordUnhandled));
after(() => process.off('unhandledRejection', recordUnhandled));

async function readyHandler() {
  const client = fakeClient();
  const logger = fakeLogger();
  new CommandHandler({
    client,
    commandsPath: path.join(bot, 'commands'),
    eventsPath: path.join(bot, 'events'),
    validationsPath: path.join(bot, 'validations'),
    logger,
  });
  client.emit('clientReady', client);
  await until(() => client.listenerCount('interactionCreate') > 0, 'command listeners');
  return { client, logger };
}

const errors = (logger) => logger.lines.filter(([level]) => level === 'error').map(([, line]) => line);

test('logs a command that throws', async () => {
  const { client, logger } = await readyHandler();
  client.emit('interactionCreate', chatInput('explode'));
  await until(() => errors(logger).length, 'the error');
  assert.match(errors(logger)[0], /^Command "explode" failed: Error: boom in run\n\s+at /);
  assert.deepEqual(unhandled, []);
});

test('logs a command that rejects', async () => {
  const { client, logger } = await readyHandler();
  client.emit('interactionCreate', chatInput('later'));
  await until(() => errors(logger).length, 'the error');
  assert.match(errors(logger)[0], /^Command "later" failed: Error: boom after await/);
  assert.deepEqual(unhandled, []);
});

test('logs a validation that throws and does not run the command', async () => {
  const { client, logger } = await readyHandler();
  const interaction = chatInput('report', { explodeValidation: true });
  client.emit('interactionCreate', interaction);
  await until(() => errors(logger).length, 'the error');
  assert.match(errors(logger)[0], /^A validation failed for "report", so it didn't run: Error: boom in validation/);
  assert.deepEqual(interaction.calls, []);
  assert.deepEqual(unhandled, []);
});

test('logs autocomplete that throws', async () => {
  const { client, logger } = await readyHandler();
  client.emit('interactionCreate', autocomplete('explode'));
  await until(() => errors(logger).length, 'the error');
  assert.match(errors(logger)[0], /^Autocomplete for "explode" failed: Error: boom in autocomplete/);
  assert.deepEqual(unhandled, []);
});

test('ignores autocomplete for a command without it', async () => {
  const { client, logger } = await readyHandler();
  client.emit('interactionCreate', autocomplete('report'));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(errors(logger), []);
});

test('logs an event function that throws and still runs the next one', async () => {
  const { client, logger } = await readyHandler();
  const message = { calls: [] };
  client.emit('messageCreate', message);
  await until(() => message.calls.length, 'the next event function');
  assert.match(errors(logger)[0], /^Event "messageCreate" failed in 1-throws\.js: Error: boom in event/);
  assert.deepEqual(message.calls, [['still runs']]);
  assert.deepEqual(unhandled, []);
});

test('runs a context menu and a slash command that share a name separately', async () => {
  const { client } = await readyHandler();
  const slash = chatInput('report');
  const menu = contextMenu('report', 2);
  client.emit('interactionCreate', slash);
  client.emit('interactionCreate', menu);
  await until(() => slash.calls.length && menu.calls.length, 'both commands');
  assert.deepEqual(slash.calls, [['slash report']]);
  assert.deepEqual(menu.calls, [['menu report']]);
});

test('ignores a message context menu nobody registered', async () => {
  const { client, logger } = await readyHandler();
  const menu = contextMenu('report', 3);
  client.emit('interactionCreate', menu);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(menu.calls, []);
  assert.deepEqual(errors(logger), []);
});

test('ignores interactions that are not commands', async () => {
  const { client, logger } = await readyHandler();
  const button = { ...chatInput('report'), isCommand: () => false, isAutocomplete: () => false };
  client.emit('interactionCreate', button);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(button.calls, []);
  assert.deepEqual(errors(logger), []);
});

test('listens for interactions once', async () => {
  const { client } = await readyHandler();
  assert.equal(client.listenerCount('interactionCreate'), 1);
});
