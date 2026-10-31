module.exports = {
  data: { name: 'alpha', description: 'Loads first' },
  run: ({ interaction }) => interaction.calls.push(['alpha']),
};
