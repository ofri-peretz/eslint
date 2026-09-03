/**
 * SAFE - An object whose KEYS are every flag the rule watches, used as a lookup
 * table for the desktop team's hardening report. The values are the copy shown
 * next to each row, not settings.
 *
 * The keys are identical to a real insecure config; only the values differ. A
 * rule that matched the key and stopped would report the report.
 */
const WEB_PREFERENCE_GUIDANCE = {
  nodeIntegration: 'must be false — grants the renderer require()',
  contextIsolation: 'must be true — keeps the preload in its own world',
  webSecurity: 'must be true — enforces same-origin',
  allowRunningInsecureContent: 'must be false — blocks http:// subresources',
  sandbox: 'must be true — keeps the renderer in an OS sandbox',
  enableRemoteModule: 'removed from Electron core',
  webviewTag: 'must be false unless every <webview> is audited',
};

function describeFlag(flag) {
  return WEB_PREFERENCE_GUIDANCE[flag] ?? 'not tracked';
}

module.exports = { WEB_PREFERENCE_GUIDANCE, describeFlag };
