const fs = require('fs');
const path = require('path');
function deleteFile(filename) {
  const filePath = path.join('./uploads', filename);
  fs.unlinkSync(filePath);
}
