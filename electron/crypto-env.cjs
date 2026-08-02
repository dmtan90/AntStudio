const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Secret key and salt for encrypting default env values
const APP_SECRET = process.env.APP_SECRET || 'AntStudio_Encrypted_Env_Secret_Key_2026';
const SALT = process.env.SALT || 'antstudio_salt_v1';
const ALGORITHM = 'aes-256-cbc';

function getDerivedKey() {
  return crypto.scryptSync(APP_SECRET, SALT, 32);
}

/**
 * Encrypt an input .env file and write to target .env.enc file
 */
function encryptEnvFile(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.warn(`[CryptoEnv] Source file not found: ${inputPath}`);
    return false;
  }
  console.log(`encryptEnvFile with APP_SECRET: ${APP_SECRET} , SALT :${SALT} , ALGORITHM :${ALGORITHM}`);
  const content = fs.readFileSync(inputPath, 'utf8');
  const iv = crypto.randomBytes(16);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([iv, cipher.update(content, 'utf8'), cipher.final()]);
  fs.writeFileSync(outputPath, encrypted);
  console.log(`🔒 Encrypted ${inputPath} -> ${outputPath}`);
  return true;
}

/**
 * Decrypt a .env.enc file and parse into process.env
 */
function loadEncryptedEnv(encFilePath) {
  if (!fs.existsSync(encFilePath)) {
    return false;
  }

  try {
    const fileBuffer = fs.readFileSync(encFilePath);
    if (fileBuffer.length < 17) {
      console.warn(`[CryptoEnv] Invalid encrypted env file: ${encFilePath}`);
      return false;
    }

    const iv = fileBuffer.subarray(0, 16);
    const encryptedData = fileBuffer.subarray(16);
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    const decryptedStr = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');
    const parsed = dotenv.parse(decryptedStr);

    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
    console.log(`[Electron] Successfully loaded encrypted defaults from: ${encFilePath}`);
    return true;
  } catch (err) {
    console.error(`[CryptoEnv] Failed to decrypt env file ${encFilePath}:`, err.message);
    return false;
  }
}

module.exports = {
  encryptEnvFile,
  loadEncryptedEnv
};
