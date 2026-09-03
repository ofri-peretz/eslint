/**
 * SAFE - Not an Electron file at all. `renderer.js` is one of the most common
 * filenames in JavaScript: React has a renderer, webpack has a renderer, every
 * static-site generator has a renderer. This one turns markdown into HTML
 * during a Node build step, and reading files off disk is its entire job.
 *
 * The file loads no Electron API, exports a plain Node function, and never runs
 * in a browser process. Nothing here is a "Direct Node Access in the renderer
 * process" finding; the only thing that could produce one is the filename.
 */
const fs = require('fs');
const os = require('os');

function renderMarkdownFile(relativePath) {
  const source = fs.readFileSync(relativePath, 'utf8');
  const tmp = os.tmpdir();
  return { html: source.replace(/^# (.*)$/gm, '<h1>$1</h1>'), tmp };
}

module.exports = { renderMarkdownFile };
