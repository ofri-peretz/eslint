// CWE-434: multer upload with no fileFilter
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by browser-security/require-mime-type-validation
const upload = multer().single('avatar');
