// Adversarial: lowercase keywords spread over several lines, so the FROM and
// the COPY are separated by a newline rather than a space.
const { Client } = require('pg');

const client = new Client();

async function importCustomers(path) {
  await client.query(`
    copy customers
      from '${path}'
      with (format csv)
  `);
}

module.exports = { importCustomers };
