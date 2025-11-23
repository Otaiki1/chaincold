require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Encrypt and save wallet private key
 * Run this once to encrypt your private key
 */
async function encryptKey() {
  const PRIVATE_KEY = process.env.GATEWAY_PRIVATE_KEY;
  const PRIVATE_KEY_PASSWORD = process.env.PRIVATE_KEY_PASSWORD || 'default_password_change_me';

  if (!PRIVATE_KEY) {
    console.error('ERROR: GATEWAY_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  try {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const encryptedJsonKey = await wallet.encrypt(PRIVATE_KEY_PASSWORD);
    
    const encryptKeyPath = path.join(__dirname, '.encryptKey.json');
    fs.writeFileSync(encryptKeyPath, encryptedJsonKey);
    
    console.log('✅ Encrypted key saved to .encryptKey.json');
    console.log('⚠️  Make sure to set PRIVATE_KEY_PASSWORD in .env');
    console.log('⚠️  Add .encryptKey.json to .gitignore');
  } catch (error) {
    console.error('Error encrypting key:', error);
    process.exit(1);
  }
}

/**
 * Load wallet from encrypted key
 */
async function loadWallet(provider) {
  const encryptKeyPath = path.join(__dirname, '.encryptKey.json');
  
  if (!fs.existsSync(encryptKeyPath)) {
    // Fallback to plain private key if encrypted key doesn't exist
    const PRIVATE_KEY = process.env.GATEWAY_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      throw new Error('GATEWAY_PRIVATE_KEY not set and .encryptKey.json not found');
    }
    console.warn('⚠️  Using plain private key. Consider encrypting it with: node encryptKey.js');
    return new ethers.Wallet(PRIVATE_KEY, provider);
  }

  const PRIVATE_KEY_PASSWORD = process.env.PRIVATE_KEY_PASSWORD || 'default_password_change_me';
  const encryptedKey = fs.readFileSync(encryptKeyPath, 'utf8');
  
  try {
    const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKey, PRIVATE_KEY_PASSWORD);
    return wallet.connect(provider);
  } catch (error) {
    console.error('Error decrypting key:', error.message);
    throw new Error('Failed to decrypt wallet. Check PRIVATE_KEY_PASSWORD in .env');
  }
}

// Run encryption if called directly
if (require.main === module) {
  encryptKey()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  encryptKey,
  loadWallet,
};

