const fs = require('fs');
const zlib = require('zlib');
function compressFile(filename) {
  return new Promise((resolve, reject) => {
    const source = fs.createReadStream(filename);
    const destination = fs.createWriteStream(`${filename}.gz`);
    const gzip = zlib.createGzip();
    source
      .pipe(gzip)
      .pipe(destination)
      .on('finish', () => resolve(`${filename}.gz`))
      .on('error', reject);
    source.on('error', reject);
    gzip.on('error', reject);
  });
}
module.exports = compressFile;
