/**
 * VULNERABLE - The "it works now" pair: same-origin policy switched off to make
 * a cross-origin XHR succeed, plus mixed content allowed so an http:// asset
 * loads inside an https:// document. Both are network-level downgrades.
 */
const { BrowserWindow } = require('electron');

function openReportViewer(reportUrl) {
  const viewer = new BrowserWindow({
    show: false,
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  viewer.loadURL(reportUrl);
  return viewer;
}

module.exports = { openReportViewer };
