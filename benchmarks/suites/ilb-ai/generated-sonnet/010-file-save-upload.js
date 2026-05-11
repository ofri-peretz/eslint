const fs = require('fs');
const path = require('path');
function saveUpload(filename, content) {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}
