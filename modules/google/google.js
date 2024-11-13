const core = require('../../core/core.js');

const sync = async (instance) => {
  console.log('Syncing Google instance:', instance.name);

  const id = instance.id
  const name = instance.name
  const subjectEmail = instance.subjectEmail
  const customerId = instance.customerId
  const encryptedFile = instance.encryptedFile

  const jsonFile = await core.crypto.decrypt(encryptedFile);

  console.log('Decrypted file:', jsonFile);
}

module.exports = {
  sync
}
