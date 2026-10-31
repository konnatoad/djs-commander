module.exports = {
  data: { name: 'ping', description: 'Replies with pong' },
  run: ({ interaction, client, handler }) => interaction.calls.push(['ping', client, handler]),
};
