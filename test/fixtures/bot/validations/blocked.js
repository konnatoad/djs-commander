// returning true keeps the command from running
module.exports = (interaction, command, handler, client) => {
  interaction.calls.push(['validation', command.name, handler, client]);
  return interaction.blocked;
};
