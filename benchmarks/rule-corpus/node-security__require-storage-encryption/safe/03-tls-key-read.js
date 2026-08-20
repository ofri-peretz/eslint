/**
 * SAFE - reading a TLS key from disk at startup is how TLS is supposed to work.
 * Nothing is written; the private key never leaves the process.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

function createServer(app) {
  const key = fs.readFileSync(path.join(__dirname, './ssl.key'));
  const cert = fs.readFileSync(path.join(__dirname, './ssl.crt'));
  return https.createServer({ key, cert }, app);
}

module.exports = { createServer };
