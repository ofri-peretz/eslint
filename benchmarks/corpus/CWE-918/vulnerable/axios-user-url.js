// CWE-918: SSRF — axios with user-controlled URL
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const axios = require('axios');
const endpoint = req.query.endpoint;
const result = await axios.get(endpoint);
