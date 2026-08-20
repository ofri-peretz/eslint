/**
 * VULNERABLE - multer with no `limits.fileSize` writes whatever arrives to
 * disk. The upload endpoint is the resource, and nothing bounds it.
 */
const multer = require('multer');

const upload = multer({
  dest: 'uploads/',
});

module.exports = { upload };
