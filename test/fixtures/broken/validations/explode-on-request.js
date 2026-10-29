module.exports = (interaction) => {
  if (interaction.explodeValidation) throw new Error('boom in validation');
};
