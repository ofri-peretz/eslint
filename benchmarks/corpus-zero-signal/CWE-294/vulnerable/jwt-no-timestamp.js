// CWE-294: jwt.sign with noTimestamp:true — no iat, so replay is undetectable
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by jwt-security/require-issued-at
import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user' }, secret, { noTimestamp: true });
