// a user context menu with the same name as the slash command
module.exports = {
  data: { type: 2, name: 'report' },
  run: ({ interaction }) => {
    interaction.calls.push(['menu report']);
  },
};
