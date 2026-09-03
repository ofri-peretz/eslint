/**
 * SAFE - build tooling naming a file in its own repository. `__dirname` and a
 * hard-coded relative path are not attacker-reachable, and treating them as
 * suspicious is what made the pre-inversion rule unusable on monorepos.
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');

function packageVersions() {
  return fs
    .readdirSync(path.join(ROOT, 'packages'))
    .map((name) => require(path.join(ROOT, 'packages', name, 'package.json')))
    .map((pkg) => `${pkg.name}@${pkg.version}`);
}

module.exports = { packageVersions };
