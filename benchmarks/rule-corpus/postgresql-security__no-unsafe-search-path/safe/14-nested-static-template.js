// Wave 2. A template interpolating another template, all of it constant.
const { Pool } = require('pg');

const pool = new Pool();
const APP = 'app';

async function init(client) {
  await client.query(`SET search_path TO ${`${APP}, public`}`);
  return pool;
}

module.exports = { init };
