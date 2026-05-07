const fs = require('fs').promises;
const path = require('path');
async function listUserFiles(userId) {
  const userDir = path.join('/Users', userId);
  try {
    const files = await fs.readdir(userDir);
    return files;
  } catch (error) {
    throw new Error(`Failed to list files for user ${userId}: ${error.message}`);
  }
}
module.exports = listUserFiles;
