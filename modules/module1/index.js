const core = require('../../core.js');

function runIntegration() {
  const data = core.savePersona();
  return {
    messages: 'module 1 ran an integration',
    data: data
  }
}

function returnData() {
  const data = core.getData();
  return {
    messages: 'module 1 is returning data',
    data: data
  }
}

module.exports = {
  runIntegration,
  returnData
};
