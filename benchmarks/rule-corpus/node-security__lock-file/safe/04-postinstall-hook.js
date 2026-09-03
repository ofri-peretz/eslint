/**
 * SAFE - a postinstall hook: the file where a missing lock file does the most
 * damage, since an unpinned tree is resolved fresh on every install and this
 * script runs whatever that resolution produced.
 *
 * Even here the rule reads nothing. If this repository deleted its lock file,
 * this fixture's verdict would flip without one character of it changing -
 * which is the whole reason CWE-829 cannot be scored per-FILE.
 */
const { execFileSync } = require('node:child_process');

function rebuildNativeModules() {
  execFileSync('node-gyp', ['rebuild'], { stdio: 'inherit' });
}

if (process.env.npm_lifecycle_event === 'postinstall') {
  rebuildNativeModules();
}

module.exports = { rebuildNativeModules };
