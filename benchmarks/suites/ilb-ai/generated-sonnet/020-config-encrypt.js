const crypto = require('crypto');
function encryptSensitiveData(plaintext) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    key: key.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
