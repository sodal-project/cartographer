
/**
 * Private Functions
 */
function addPersonaToDatabase() {
  return { value: 'persona added to database' };
}

function getDataFromDatabase() {
  return { value: 'data from database' };
}

/**
 * Public Functions
 */
function savePersona() {
  return addPersonaToDatabase();
}

function getData() {
  return getDataFromDatabase();
}

module.exports = {
  savePersona,
  getData
};
