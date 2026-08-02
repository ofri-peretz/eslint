// CWE-409: Safe — gunzip capped with maxOutputLength
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — maxOutputLength makes zlib abort with an error
// once output exceeds the cap, so a bomb cannot exhaust memory.
const zlib = require('zlib');

const MAX_OUTPUT = 10 * 1024 * 1024; // 10 MB ceiling

function inflateBody(reqBody, cb) {
  zlib.gunzip(reqBody, { maxOutputLength: MAX_OUTPUT }, (err, buf) => {
    if (err) return cb(err);
    cb(null, buf.toString('utf8'));
  });
}

module.exports = { inflateBody };
