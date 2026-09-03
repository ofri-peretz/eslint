// The same read written with concatenation and hand-rolled quoting.
const { Client } = require('pg');

const client = new Client();

async function importBatch(fileName) {
  await client.connect();
  await client.query("COPY staging.batch FROM '" + fileName + "' CSV");
}

module.exports = { importBatch };
