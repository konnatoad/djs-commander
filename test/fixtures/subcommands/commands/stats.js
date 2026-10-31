// has subcommands in data but dispatches them itself with run, like kafkaBot's stats.js
module.exports = {
  data: {
    name: 'stats',
    description: 'Game stats',
    options: [{ type: 1, name: 'tft', description: 'TFT stats' }],
  },
  run: ({ interaction }) => interaction.calls.push(['stats run', interaction.options.getSubcommand()]),
};
