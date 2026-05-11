const { execFile } = require("child_process");
function convertImage(inputFilename, outputFilename) {
  return new Promise((resolve, reject) => {
    execFile("magick", [inputFilename, outputFilename], (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
module.exports = { convertImage };
