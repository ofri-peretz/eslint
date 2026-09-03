// CWE-434: multer upload constrained by a fileFilter
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of multer-no-filter.js
const upload = multer({
  fileFilter(req, file, cb) {
    cb(null, file.mimetype === 'image/png');
  },
}).single('avatar');
