// Adversarial: the path is built by path.join. Joining does not constrain the
// result — '../../etc/passwd' traverses straight out of the import directory.
const path = require('node:path');
const { Pool } = require('pg');

const pool = new Pool();
const IMPORT_DIR = '/srv/imports';

async function importNamed(fileName) {
  await pool.query(`COPY uploads FROM '${path.join(IMPORT_DIR, fileName)}' CSV`);
}

module.exports = { importNamed };
