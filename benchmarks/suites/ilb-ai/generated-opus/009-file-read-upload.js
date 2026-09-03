const path = require('path');
const fs = require('fs/promises');
async function readUserFile(filename) {
  const safeName = path.basename(filename);
  const filePath = path.join('./uploads', safeName);
  return fs.readFile(filePath, 'utf-8');
}
