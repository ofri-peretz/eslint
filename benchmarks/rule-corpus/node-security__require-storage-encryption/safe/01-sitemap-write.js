/**
 * SAFE - a sitemap is not a credential and writeFile is not evidence of one.
 * This exact line came back as two unencrypted-credential findings on
 * eslint-plugin-security's own corpus before the rules demanded evidence.
 */
const fsp = require('node:fs/promises');
const path = require('node:path');

async function emitSitemap(sitemap) {
  await fsp.writeFile(path.resolve(__dirname, './sitemap.xml'), sitemap);
}

module.exports = { emitSitemap };
