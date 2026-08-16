// COPY … TO writes; it is a different weakness with a different direction and
// is not what CWE-73 file-read detection owns.
const { Pool } = require('pg');

const pool = new Pool();

async function exportDaily() {
  await pool.query("COPY (SELECT * FROM orders WHERE day = current_date) TO '/srv/exports/daily.csv' CSV");
}

module.exports = { exportDaily };
