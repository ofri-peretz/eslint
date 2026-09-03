const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
async function convertImage(inputFilename, outputFilename) {
  try {
    await execPromise(`convert "${inputFilename}" "${outputFilename}"`);
    return { success: true, message: `Image converted from ${inputFilename} to ${outputFilename}` };
  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}
module.exports = convertImage;
