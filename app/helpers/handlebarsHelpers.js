module.exports = {
  json: function (context) {
    return JSON.stringify(context);
  },
  eq: function (a, b) {
    return a === b;
  },
  add: function (a, b) {
    return a + b;
  },
};