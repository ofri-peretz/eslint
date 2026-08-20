// CWE-434: multer upload with no fileFilter
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-16
// This MUST be detected by browser-security/require-mime-type-validation
//
// The import is the point. `multer()` used to appear here with nothing binding
// it, and the rule matched on the callee's NAME — which meant any `x.single(...)`
// in any file was an upload. It now resolves the receiver back to a real multer
// import before consulting the method set, so the binding is the evidence rather
// than the spelling. Every real codebase has this line; the fixture was missing it.
import multer from 'multer';

const upload = multer().single('avatar');
