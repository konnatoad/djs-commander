module.exports = {
  data: { name: 'beta', description: 'Loads second' },
  run: ({ interaction }) => interaction.calls.push(['beta']),
};
