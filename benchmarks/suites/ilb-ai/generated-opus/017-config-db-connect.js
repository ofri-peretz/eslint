const { Pool } = require("pg");
function connectToDatabase() {
  const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  return pool;
}
module.exports = { connectToDatabase };
