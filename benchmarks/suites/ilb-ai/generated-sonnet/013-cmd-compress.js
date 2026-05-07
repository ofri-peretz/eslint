const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
function compressFile(filename) {
  const gzip = zlib.createGzip();
  const source = fs.createReadStream(filename);
  const destination = fs.createWriteStream(`${filename}.gz`);
  pipeline(source, gzip, destination, (err) => {
    if (err) {
      console.error('Compression failed:', err);
      process.exitCode = 1;
    }
  });
}
