/**
 * SAFE - `/templates` is not `/temp`. A CDN URL and a build output path that
 * merely contain the letters t-e-m-p are not writes to the shared temp
 * directory. This is the shape that produced a real false positive on
 * Shopify/cli, so it is worth keeping honest.
 */
const fs = require('fs');
const path = require('path');

const TEMPLATE_INDEX_URL = 'https://cdn.example.com/static/cli/extensions/templates.json';

function emitTemplateIndex(outDir, index) {
  fs.writeFileSync(path.join(outDir, 'templates.json'), JSON.stringify(index));
  return TEMPLATE_INDEX_URL;
}

module.exports = { emitTemplateIndex, TEMPLATE_INDEX_URL };
