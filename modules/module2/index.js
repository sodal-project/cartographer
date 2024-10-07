const core = require('../../core/core.js');

function runIntegration(data) {
  const coreData = core.savePersona();
  core.log('module 2 ran an integration');
  return {
    messages: 'module 2 ran an integration',
    passedData: data,
    coreData: coreData
  }
}

function returnData(data) {
  const coreData = core.getData();
  core.log('module 2 returned data');
  return {
    messages: 'module 2 is returning data',
    passedData: data,
    coreData: coreData
  }
}

module.exports = {
  runIntegration,
  returnData
};
