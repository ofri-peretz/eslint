// Wave 2. `$12` referenced twice is still one parameter, and it is the twelfth
// — so eleven values is a shortfall, not a surplus.
const { Client } = require('pg');

const client = new Client();

async function insertWide(v) {
  await client.query(
    `INSERT INTO wide (a,b,c,d,e,f,g,h,i,j,k,l)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (a) DO UPDATE SET l = $12`,
    [v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10]],
  );
}

module.exports = { insertWide };
