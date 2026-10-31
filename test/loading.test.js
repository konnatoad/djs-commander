// Only code files are loaded, always in sorted order, and event files are imported
// once instead of on every event.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { CommandHandler } = require('../dist/index.js');
const { fakeClient, fakeLogger, chatInput, until } = require('./fakeClient');

const bot = path.join(__dirname, 'fixtures/loading');

function startHandler() {
  const client = fakeClient();
  const logger = fakeLogger();
  const handler = new CommandHandler({
    client,
    commandsPath: path.join(bot, 'commands'),
    eventsPath: path.join(bot, 'events'),
    validationsPath: path.join(bot, 'validations'),
    logger,
  });
  return { client, handler, logger };
}

async function readyHandler() {
  const started = startHandler();
  started.client.emit('clientReady', started.client);
  await until(() => started.client.listenerCount('interactionCreate') > 0, 'command listeners');
  return started;
}

const errors = (logger) => logger.lines.filter(([level]) => level === 'error').map(([, line]) => line);

test('loads only the code files as commands, in sorted order', async () => {
  const { handler, logger } = await readyHandler();
  assert.deepEqual(handler.commands.map((command) => command.name), ['alpha', 'beta']);
  assert.deepEqual(errors(logger).filter((line) => !line.startsWith('Event "typingStart"')), []);
});

test('runs validations in sorted order and skips non-code files', async () => {
  const { client } = await readyHandler();
  const interaction = chatInput('alpha');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length === 3, 'validations and command');
  assert.deepEqual(interaction.calls, [['first validation'], ['second validation'], ['alpha']]);
});

test('runs event files in sorted order and skips non-code files', async () => {
  const { client, logger } = startHandler();
  const message = { calls: [] };
  client.emit('messageCreate', message);
  await until(() => message.calls.length === 3, 'event functions');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(message.calls, ['a', 'b', 'c']);
  assert.deepEqual(errors(logger).filter((line) => line.includes('messageCreate')), []);
});

test('an event fired right after starting still runs', async () => {
  const { client } = startHandler();
  const typing = { calls: [] };
  // nothing has been imported yet at this point
  client.emit('typingStart', typing);
  await until(() => typing.calls.length, 'the event function');
  assert.deepEqual(typing.calls, ['works']);
});

test('an event file that fails to import is logged once, not on every event', async () => {
  const { client, logger } = startHandler();
  const first = { calls: [] };
  const second = { calls: [] };
  client.emit('typingStart', first);
  client.emit('typingStart', second);
  await until(() => first.calls.length && second.calls.length, 'both events');
  await new Promise((resolve) => setTimeout(resolve, 20));

  const loadErrors = errors(logger).filter((line) => line.startsWith('Event "typingStart"'));
  assert.equal(loadErrors.length, 1);
  assert.match(loadErrors[0], /^Event "typingStart" file 1-broken-on-load\.js didn't load, so it won't run: Error: boom on load/);
  assert.deepEqual([first.calls, second.calls], [['works'], ['works']]);
});
