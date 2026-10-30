// plain subcommands
const run = (name) => ({ interaction }) => interaction.calls.push([name]);
module.exports = {
  data: {
    name: 'config',
    description: 'Sets the bot up',
    options: [
      { type: 1, name: 'setup', description: 'Turn it on' },
      { type: 1, name: 'disable', description: 'Turn it off' },
    ],
  },
  subcommands: { setup: run('config setup'), disable: run('config disable') },
};
