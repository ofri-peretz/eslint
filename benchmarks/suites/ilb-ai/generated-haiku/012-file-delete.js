const fs = require('fs');
const path = require('path');
function deleteFile(filename) {
  const filepath = path.join('./uploads', filename);
  fs.unlinkSync(filepath);
}
module.exports = deleteFile;
