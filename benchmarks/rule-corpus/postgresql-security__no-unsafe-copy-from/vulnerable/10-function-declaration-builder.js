// Adversarial: the most ordinary builder spelling of all — a block-bodied
// function declaration returning a concatenation.
const { Pool } = require('pg');

const pool = new Pool();

function buildCopy(source) {
  return "COPY shipments FROM '" + source + "' WITH (FORMAT csv)";
}

async function run(source) {
  await pool.query(buildCopy(source));
}

module.exports = { run };
