/**
 * VULNERABLE - `path.join` is a pure function of its arguments, so it is only
 * as static as they are. One segment here comes from the environment, which
 * makes the joined path attacker-steerable - and `path.join` happily
 * normalises `../../..` while doing it.
 */
const path = require('node:path');

const THEMES_DIR = path.join(__dirname, 'themes');

function loadTheme() {
  return require(path.join(THEMES_DIR, process.env.SITE_THEME, 'index.js'));
}

module.exports = { loadTheme };
