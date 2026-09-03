const fs = require('fs').promises;
const path = require('path');
async function readUserFile(filename) {
  const filePath = path.join('./uploads', path.basename(filename));
  return await fs.readFile(filePath, 'utf8');
}
