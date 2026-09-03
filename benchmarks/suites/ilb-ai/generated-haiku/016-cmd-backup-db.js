const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function backupDatabase(databaseName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `${databaseName}-${timestamp}.sql`);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  try {
    execSync(`pg_dump ${databaseName} > ${backupFile}`, { stdio: 'inherit' });
    console.log(`Database backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    throw new Error(`Failed to backup database: ${error.message}`);
  }
}
module.exports = backupDatabase;
