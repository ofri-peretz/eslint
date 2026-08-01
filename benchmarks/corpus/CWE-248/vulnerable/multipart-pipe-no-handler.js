// CWE-248: Uncaught Exception — multipart stream piped without error handling
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — a truncated upload makes busboy's file stream emit
// 'error'; with no handler on either stream the exception takes down the server.
const Busboy = require('busboy');
const fs = require('fs');

function upload(req, res) {
  const busboy = Busboy({ headers: req.headers });
  busboy.on('file', (name, file) => {
    file.pipe(fs.createWriteStream(`./tmp/${name}`)); // unhandled 'error'
  });
  req.pipe(busboy);
}

module.exports = { upload };
