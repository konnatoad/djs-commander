// rejects instead of throwing, the way an awaited reply that fails does
module.exports = {
  data: { name: 'later', description: 'Rejects' },
  run: async () => {
    throw new Error('boom after await');
  },
};
