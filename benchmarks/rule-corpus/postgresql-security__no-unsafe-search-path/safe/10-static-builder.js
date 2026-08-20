// Adversarial: a local builder, but it returns a constant. Resolving the
// builder has to fold the value too, not merely notice that a call happened.
const { Pool } = require('pg');

const pool = new Pool();
const DEFAULT_PATH = 'app, public';

function defaultSearchPath() {
  return `SET search_path TO ${DEFAULT_PATH}`;
}

async function init() {
  await pool.query(defaultSearchPath());
}

module.exports = { init };
