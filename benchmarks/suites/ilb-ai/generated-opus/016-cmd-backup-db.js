const { execFile } = require("child_process");
const path = require("path");
function backupDatabase(databaseName) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = path.join("backups", `${databaseName}_${timestamp}.sql`);
    execFile(
      "pg_dump",
      ["-d", databaseName, "-f", outputFile],
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Backup failed: ${stderr || error.message}`));
          return;
        }
        resolve(outputFile);
      }
    );
  });
}
module.exports = backupDatabase;
