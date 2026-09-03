const fs = require('fs').promises;
const path = require('path');
async function listUserFiles(userId) {
  const userDir = path.join('/users', userId);
  const files = await fs.readdir(userDir);
  return files;
}
