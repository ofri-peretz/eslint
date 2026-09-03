// Adversarial: concatenation, but every operand is a literal. Concatenating
// two constants produces a constant.
const { Client } = require('pg');

const client = new Client();

async function useApp() {
  await client.query('SET search_path TO ' + 'app, public');
}

module.exports = { useApp };
