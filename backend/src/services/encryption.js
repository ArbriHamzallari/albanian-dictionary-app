const crypto = require('crypto');

// AES-256-GCM encryption for chat message text at rest (INF-3).
//
// The key comes from MESSAGE_ENC_KEY: 64 hex chars = 32 bytes. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Stored format: "v1:<iv b64>:<authTag b64>:<ciphertext b64>". The "v1" prefix is
// a key/version tag for rotation (see below). GCM gives confidentiality + an auth
// tag so tampered ciphertext fails to decrypt rather than returning garbage.
//
// KEY ROTATION
//   1. Generate a new key; set MESSAGE_ENC_KEY to it and keep the old one as
//      MESSAGE_ENC_KEY_V1 (or whatever the retiring tag is).
//   2. Bump KEY_VERSION here to "v2" and add the old key to KEYS below so existing
//      "v1:" rows still decrypt.
//   3. Optionally run a one-off re-encryption pass (read each row, decrypt, encrypt
//      with the new key, write back) and then drop the old key.
// Because the version tag is stored with every row, old and new rows coexist.

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION = 'v1';

function loadKey(envVar) {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(`${envVar} is not set. Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  }
  const key = Buffer.from(raw.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error(`${envVar} must be 32 bytes (64 hex characters).`);
  }
  return key;
}

// Map of version tag -> key. Add retired keys here during rotation.
let keysCache = null;
function keys() {
  if (!keysCache) {
    keysCache = { [KEY_VERSION]: loadKey('MESSAGE_ENC_KEY') };
  }
  return keysCache;
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keys()[KEY_VERSION], iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${KEY_VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decrypt(stored) {
  const [version, ivB64, tagB64, dataB64] = String(stored).split(':');
  const key = keys()[version];
  if (!key) {
    throw new Error(`No decryption key for version "${version}".`);
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
