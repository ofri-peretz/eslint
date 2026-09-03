// Wave 2. A COPY TO whose target query nests two levels of parentheses and
// mentions FROM twice. Skipping the balanced group has to be balanced.
const { Client } = require('pg');

const client = new Client();

async function exportRollup() {
  await client.query(
    "COPY (SELECT * FROM (SELECT id, total FROM orders) o WHERE o.total > 0) TO '/srv/exports/rollup.csv' CSV",
  );
}

module.exports = { exportRollup };
