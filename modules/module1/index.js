const core = require('../../core/core.js');

function runIntegration(data) {
  const coreData = core.savePersona();
  core.log('module 1 ran an integration');
  return {
    messages: 'module 1 ran an integration',
    passedData: data,
    coreData: coreData
  }
}

function returnData(data) {
  const coreData = core.getData();
  core.log('module 1 returned data');
  return {
    messages: 'module 1 is returning data',
    passedData: data,
    coreData: coreData
  }
}

module.exports = {
  runIntegration,
  returnData
};
