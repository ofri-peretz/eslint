/**
 * SAFE - The correct remediation for vulnerable/05: certificate validation left
 * on, with the corporate CA supplied explicitly instead of being bypassed.
 */
const fs = require('node:fs');
const request = require('request');

exports.fetchLedger = function fetchLedger(callback) {
  request(
    {
      url: 'https://ledger.internal/api/entries',
      strictSSL: true,
      ca: fs.readFileSync('/etc/ssl/corp-root.pem'),
      json: true,
    },
    callback,
  );
};
