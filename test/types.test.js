// The build writes the types from src/types.ts into dist, next to the code they describe.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const read = (file) => fs.readFileSync(path.join(dist, file), 'utf8');

test('the package points at the built types', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.types, './dist/index.d.ts');
  assert.equal(pkg.exports['.'].types, './dist/index.d.ts');
  assert.ok(fs.existsSync(path.join(__dirname, '..', pkg.types)), 'yarn build writes dist/index.d.ts');
});

test('every public type is exported', () => {
  const index = read('index.d.ts');
  assert.match(index, /export declare class CommandHandler/);
  for (const name of [
    'CommandHandlerOptions',
    'CommandModule',
    'LocalCommand',
    'Logger',
    'RunContext',
    'RunFunction',
    'Subcommands',
    'Validation',
  ]) {
    assert.ok(index.includes(name), `${name} is exported`);
  }
});

test('the logger is any { info, warn, error }, not winston', () => {
  assert.match(read('types.d.ts'), /export interface Logger/);
  for (const file of ['index.d.ts', 'types.d.ts']) assert.doesNotMatch(read(file), /from ['"]winston['"]/);
  const pkg = require('../package.json');
  for (const field of ['peerDependencies', 'devDependencies', 'dependencies']) {
    assert.equal(pkg[field]?.winston, undefined, `winston isn't in ${field}`);
  }
});
