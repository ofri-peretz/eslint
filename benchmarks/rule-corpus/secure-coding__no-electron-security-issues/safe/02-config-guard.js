/**
 * SAFE - The guard, not the vulnerability. This module refuses to build a
 * window from a configuration that turned the flags off. The insecure values
 * appear as COMPARISONS, never as properties of an options object.
 */
function assertHardened(webPreferences) {
  if (webPreferences.nodeIntegration === true) {
    throw new Error('nodeIntegration must stay disabled');
  }
  if (webPreferences.contextIsolation === false) {
    throw new Error('contextIsolation must stay enabled');
  }
  if (webPreferences.webSecurity === false) {
    throw new Error('webSecurity must stay enabled');
  }
  return webPreferences;
}

module.exports = { assertHardened };
