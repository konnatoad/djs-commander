// returning true stops the event functions after this one
module.exports = (message) => {
  message.calls.push(['stop']);
  return message.stop;
};
