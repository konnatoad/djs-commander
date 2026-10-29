// What CommandHandler does today and has to keep doing through 1.0.0.
// Runs against the built dist, since that's what kafkaBot installs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { CommandHandler } = require('../dist/index.js');
const { fakeClient, fakeLogger, chatInput, autocomplete, until } = require('./fakeClient');

const bot = path.join(__dirname, 'fixtures/bot');

async function readyHandler({ existing, validations = true } = {}) {
  const client = fakeClient({ existing });
  const logger = fakeLogger();
  const handler = new CommandHandler({
    client,
    commandsPath: path.join(bot, 'commands'),
    eventsPath: path.join(bot, 'events'),
    validationsPath: validations ? path.join(bot, 'validations') : undefined,
    logger,
  });
  client.emit('clientReady', client);
  await until(() => client.listenerCount('interactionCreate') > 0, 'command listeners');
  return { client, handler, logger };
}

test('loads commands from nested folders', async () => {
  const { handler } = await readyHandler();
  assert.deepEqual(handler.commands.map((command) => command.name).sort(), ['ping', 'roll']);
});

test('registers commands that Discord does not have yet', async () => {
  const { client } = await readyHandler();
  const commands = client.application.commands;
  await until(() => commands.names().length === 2, 'registration');
  assert.deepEqual(commands.names(), ['ping', 'roll']);
});

test('runs a command with the interaction, client and handler', async () => {
  const { client, handler } = await readyHandler({ validations: false });
  const interaction = chatInput('ping');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'the command');
  assert.deepEqual(interaction.calls, [['ping', client, handler]]);
});

test('runs validations first with (interaction, command, handler, client)', async () => {
  const { client, handler } = await readyHandler();
  const interaction = chatInput('ping');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length === 2, 'validation and command');
  assert.deepEqual(interaction.calls[0], ['validation', 'ping', handler, client]);
  assert.equal(interaction.calls[1][0], 'ping');
});

test('a validation returning true stops the command', async () => {
  const { client } = await readyHandler();
  const interaction = chatInput('ping', { blocked: true });
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'the validation');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(interaction.calls.map(([name]) => name), ['validation']);
});

test('ignores interactions for commands it does not know', async () => {
  const { client } = await readyHandler();
  const interaction = chatInput('nope');
  client.emit('interactionCreate', interaction);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(interaction.calls, []);
});

test('sends autocomplete to the command that has it', async () => {
  const { client } = await readyHandler();
  const interaction = autocomplete('roll');
  client.emit('interactionCreate', interaction);
  await until(() => interaction.calls.length, 'autocomplete');
  assert.deepEqual(interaction.calls, [['roll autocomplete']]);
});

test('runs event functions in file order with (...args, client, handler)', async () => {
  const { client, handler } = await readyHandler();
  const message = { calls: [] };
  client.emit('messageCreate', message);
  await until(() => message.calls.length === 3, 'event functions');
  assert.deepEqual(message.calls, [['first', client, handler], ['stop'], ['last']]);
});

test('an event function returning true stops the ones after it', async () => {
  const { client } = await readyHandler();
  const message = { calls: [], stop: true };
  client.emit('messageCreate', message);
  await until(() => message.calls.length === 2, 'event functions');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(message.calls.map(([name]) => name), ['first', 'stop']);
});

test('needs a client', () => {
  assert.throws(() => new CommandHandler({}), /"client" is required/);
});

test('needs a commands path for validations', () => {
  assert.throws(
    () => new CommandHandler({ client: fakeClient(), validationsPath: path.join(bot, 'validations') }),
    /only available in the presence of a commands path/
  );
});
