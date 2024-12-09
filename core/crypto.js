/**
 * @fileoverview Provide simplified global encryption and decryption functions
 * @module Core/crypto
 * @description
 * Provides AES-256-GCM encryption/decryption functions with module-specific keys.
 * Each module gets a unique encryption key derived from MODULE_SECRET and the module name.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import process from 'process';
import Buffer from 'buffer';
dotenv.config();

const algorithm = "aes-256-gcm";

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param {string} module - Module name used to generate a unique key
 * @param {string} text - The plaintext to encrypt
 * @returns {Promise<Object>} Encryption package
 * @property {string} encrypted - Base64 encoded encrypted data
 * @property {string} iv - Base64 encoded initialization vector
 * @property {string} tag - Base64 encoded authentication tag
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
 * Decrypt a string using AES-256-GCM
 * 
 * @param {string} module - Module name used to generate the unique key
 * @param {Object} secretPackage - Package containing encrypted data
 * @param {string} secretPackage.encrypted - Base64 encoded encrypted data
 * @param {string} secretPackage.iv - Base64 encoded initialization vector
 * @param {string} secretPackage.tag - Base64 encoded authentication tag
 * @returns {Promise<string>} The decrypted plaintext
 * @throws {Error} If decryption fails due to tampering or incorrect key
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

export default {
  encrypt,
  decrypt,
}