const fs = require('fs');
const path = require('path');
function deleteFile(filename) {
  const safeName = path.basename(filename);
  const filePath = path.join('./uploads', safeName);
  fs.unlinkSync(filePath);
}
