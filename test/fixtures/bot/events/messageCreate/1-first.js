module.exports = (message, client, handler) => {
  message.calls.push(['first', client, handler]);
};
