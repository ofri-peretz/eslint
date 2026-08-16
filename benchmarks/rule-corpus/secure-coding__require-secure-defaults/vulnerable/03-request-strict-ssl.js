/**
 * VULNERABLE - `strictSSL: false` is request/requestretry's spelling of
 * "accept any certificate". Still extremely common in legacy integrations.
 */
const request = require('request');

exports.fetchLedger = function fetchLedger(callback) {
  request(
    {
      url: 'https://ledger.internal/api/entries',
      strictSSL: false,
      json: true,
    },
    callback,
  );
};
