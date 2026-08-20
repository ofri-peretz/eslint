/**
 * VULNERABLE (adversarial wave, false-negative direction) - The same defect as
 * 01, with every identifier the author controls renamed to something bland: no
 * `BrowserWindow` at the construction site, no `webPreferences` variable, no
 * word anywhere that suggests Electron or security.
 *
 * The only things left that carry meaning are Electron's own option names,
 * which an app cannot rename. Detection must survive this; if it does not, the
 * rule was matching the spellings around the defect instead of the defect.
 */
const electronRuntime = require('electron');

const Panel = electronRuntime.BrowserWindow;

const layout = {
  width: 640,
  height: 480,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

function build(a) {
  const b = new Panel({ ...layout, title: a });
  return b;
}

module.exports = { build };
