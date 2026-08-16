/**
 * SAFE - persistent state written to the per-user application data directory,
 * which is the place it belongs. Nothing here touches shared temp storage.
 */
const path = require('path');
const fs = require('fs');

function saveSettings(app, settings) {
  const dir = app.getPath('userData');
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(settings, null, 2));
}

module.exports = { saveSettings };
