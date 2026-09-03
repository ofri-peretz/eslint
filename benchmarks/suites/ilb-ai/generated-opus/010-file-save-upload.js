const fs = require('fs');
const path = require('path');
function saveUpload(filename, content) {
  const uploadsDir = './uploads';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const safeName = path.basename(filename);
  const filePath = path.join(uploadsDir, safeName);
  fs.writeFileSync(filePath, content);
  return filePath;
}
module.exports = saveUpload;
