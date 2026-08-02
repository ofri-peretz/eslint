// CWE-409: Decompression Bomb — gunzip without maxOutputLength
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — a few KB of crafted gzip can inflate to gigabytes;
// with no maxOutputLength the whole expansion is buffered into memory (DoS).
const zlib = require('zlib');

function inflateBody(reqBody, cb) {
  zlib.gunzip(reqBody, (err, buf) => {
    if (err) return cb(err);
    cb(null, buf.toString('utf8'));
  });
}

module.exports = { inflateBody };
