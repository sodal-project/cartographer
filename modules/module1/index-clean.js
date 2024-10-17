const core = require('../../core/core.js');

async function index() {
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

async function writeConfig(formData) {
  const response = await core.writeConfig(formData);
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

async function deleteConfig(formData) {
  const response = await core.deleteConfig(formData.delete);
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

module.exports = {
  index,
  writeConfig,
  deleteConfig,
};
