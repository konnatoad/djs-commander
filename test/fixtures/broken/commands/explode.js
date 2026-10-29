module.exports = {
  data: { name: 'explode', description: 'Throws' },
  run: () => {
    throw new Error('boom in run');
  },
  autocomplete: () => {
    throw new Error('boom in autocomplete');
  },
};
