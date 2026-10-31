// nested folders are commands too
module.exports = {
  data: { name: 'roll', description: 'Rolls a die' },
  run: ({ interaction }) => interaction.calls.push(['roll']),
  autocomplete: ({ interaction }) => interaction.calls.push(['roll autocomplete']),
};
