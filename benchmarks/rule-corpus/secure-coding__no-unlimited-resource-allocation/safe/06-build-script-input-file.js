/**
 * SAFE - `inputFile` contains the substring `input`. It is a path a build
 * script resolves against its own working directory.
 *
 * mongoose scripts/website.js:512
 */
const fs = require('fs');
const path = require('path');

function render(cwd, inputFile) {
  const contents = fs.readFileSync(path.resolve(cwd, inputFile)).toString();
  return contents.length;
}

module.exports = { render };
