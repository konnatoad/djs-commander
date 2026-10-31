// groups, next to a subcommand that isn't in a group
const run = (name) => ({ interaction, client, handler }) => interaction.calls.push([name, client, handler]);
module.exports = {
  data: {
    name: 'alerts',
    description: 'Stream alerts',
    options: [
      { type: 1, name: 'list', description: 'Show all alerts' },
      {
        type: 2,
        name: 'youtube',
        description: 'YouTube alerts',
        options: [
          { type: 1, name: 'add', description: 'Add a channel' },
          { type: 1, name: 'remove', description: 'Remove a channel' },
        ],
      },
      {
        type: 2,
        name: 'twitch',
        description: 'Twitch alerts',
        options: [{ type: 1, name: 'add', description: 'Add a channel' }],
      },
    ],
  },
  subcommands: {
    list: run('alerts list'),
    youtube: { add: run('alerts youtube add'), remove: run('alerts youtube remove') },
    twitch: { add: run('alerts twitch add') },
  },
};
