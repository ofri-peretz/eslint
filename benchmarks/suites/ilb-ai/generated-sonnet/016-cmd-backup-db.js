const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const execFileAsync = promisify(execFile);
async function backupDatabase(databaseName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.join(backupDir, `${databaseName}_${timestamp}.sql`);
  await fs.mkdir(backupDir, { recursive: true });
  const { stdout, stderr } = await execFileAsync('pg_dump', [
    '-d',
    databaseName,
    '-f',
    backupPath,
    '--no-owner',
    '--no-privileges'
  ]);
  return backupPath;
}
module.exports = backupDatabase;
