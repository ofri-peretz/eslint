// CWE-294: jwt.sign leaving the default iat in place
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of jwt-no-timestamp.js
import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user' }, secret, { expiresIn: '1h' });
