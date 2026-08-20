/**
 * SAFE - The sibling of the vulnerable multer fixture, with the one line that
 * makes the difference. Without this pair, `09-multer-no-file-size-limit`
 * would also pass on a rule that reports every multer call.
 */
const multer = require('multer');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload };
