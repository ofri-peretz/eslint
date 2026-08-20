/**
 * SAFE - a constant temp path that is only reported to the user, never written
 * through. `doctor` commands print where they would look; printing a path
 * stores nothing.
 */
const os = require('os');
const path = require('path');

function describeCacheLocation(print) {
  print(`cache would live at ${path.join(os.tmpdir(), 'mycli-cache')}`);
}

module.exports = { describeCacheLocation };
