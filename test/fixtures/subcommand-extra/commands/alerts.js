module.exports = {
  data: {
    name: 'alerts',
    description: 'Stream alerts',
    options: [{ type: 2, name: 'youtube', description: 'YouTube alerts', options: [{ type: 1, name: 'add', description: 'Add a channel' }] }],
  },
  subcommands: { youtube: { add: () => {}, remove: () => {} } },
};
