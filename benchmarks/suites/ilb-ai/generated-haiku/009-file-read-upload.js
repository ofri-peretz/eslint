const fs = require('fs');
const path = require('path');
function readUserFile(filename) {
  const filePath = path.join('./uploads', filename);
  return fs.readFileSync(filePath, 'utf8');
}
module.exports = readUserFile;
