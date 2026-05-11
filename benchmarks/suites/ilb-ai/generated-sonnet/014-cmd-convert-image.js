const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
async function convertImage(inputFilename, outputFilename) {
  await execFileAsync('convert', [inputFilename, outputFilename]);
}
module.exports = convertImage;
