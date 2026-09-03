const { createReadStream, createWriteStream } = require("fs");
const { createGzip } = require("zlib");
const { pipeline } = require("stream/promises");
async function compressFile(filename) {
  const source = createReadStream(filename);
  const destination = createWriteStream(`${filename}.gz`);
  const gzip = createGzip();
  await pipeline(source, gzip, destination);
}
module.exports = { compressFile };
