// Adversarial: a method that is not one of the two SQL sinks, in a file that
// does use PostgreSQL. Being handed a string that reads like SQL is not the
// same as executing it.
const { Pool } = require('pg');

const pool = new Pool();

const auditTrail = [];

function planImport(sourcePath) {
  auditTrail.push(`COPY orders FROM '${sourcePath}' CSV`);
  return { pool, planned: auditTrail.length };
}

module.exports = { planImport };
