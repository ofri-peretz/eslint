/**
 * VULNERABLE (CWE-798) - The DSN passed as the bare constructor argument.
 */
const { Client } = require('pg');

const client = new Client('postgres://reporting:Summer2024!@analytics.internal/warehouse');

module.exports = { client };
