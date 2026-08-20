/**
 * SAFE - Reported for most of this rule's life because the printed text of
 * `Database.dataDir` CONTAINS the four characters `data`. A name is not a
 * taint root.
 *
 * uptime-kuma server/database.js:208
 */
const fs = require('fs');
const path = require('path');

const Database = { dataDir: '/var/lib/app' };

function readConfig() {
  return fs.readFileSync(path.join(Database.dataDir, 'db-config.json')).toString('utf-8');
}

module.exports = { readConfig };
