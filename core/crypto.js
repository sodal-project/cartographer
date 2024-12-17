/**
 * Provide simplified global encryption and decryption functions
 */

const crypto = require('crypto');
const config = require('./config.js');
require('dotenv').config();

const algorithm = "aes-256-gcm";

/**
 * Encrypt a string
 * 
 * @param {string} module - Passed by core, used to generate a unique key
 * @param {string} text - The string to encrypt
 */
async function encrypt(module, text) {
  const iv = crypto.randomBytes(12).toString('base64');
  const key = crypto.createHash('sha256').update(String(process.env.MODULE_SECRET + module)).digest('base64');

  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag().toString('base64');

  return { encrypted, iv, tag };
}

/**
 * Decrypt a string
 */
async function decrypt(module, secretPackage) {
  const { encrypted, iv, tag } = secretPackage;
  const key = crypto.createHash('sha256').update(String(process.env.MODULE_SECRET + module)).digest('base64');

  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
}