/**
 * Provide simplified global encryption and decryption functions
 */

const crypto = require('crypto');
require('dotenv').config();

/**
 * Encrypt a string
 */
function encrypt(text, optionalKey) {
  const secret = process.env.GLOBAL_CONFIG_SECRET + optionalKey;
  const algorithm = process.env.GLOBAL_CONFIG_KEY_ALGORITHM;

  const cipher = crypto.createCipher(algorithm, secret);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt a string
 */
function decrypt(text, optionalKey) {
  const secret = process.env.GLOBAL_CONFIG_SECRET + optionalKey;
  const algorithm = process.env.GLOBAL_CONFIG_KEY_ALGORITHM;

  const decipher = crypto.createDecipher(algorithm, secret);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
}