module.exports = {
  data: { name: 'report', description: 'A slash command named like the context menu' },
  run: ({ interaction }) => {
    interaction.calls.push(['slash report']);
  },
};
