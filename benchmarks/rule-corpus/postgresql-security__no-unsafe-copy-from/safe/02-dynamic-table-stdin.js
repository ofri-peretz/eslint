// The table name is interpolated, which is an identifier-injection problem
// owned by no-unsafe-query. The SOURCE is STDIN — no file is read, and this
// rule owns the source, not the target.
const { Client } = require('pg');

const client = new Client();

async function bulkLoad(table, stream) {
  const copy = client.query(`COPY ${table} FROM STDIN WITH (FORMAT csv)`);
  stream.pipe(copy);
}

module.exports = { bulkLoad };
