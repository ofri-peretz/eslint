// Provenance: n11techhub/mcp-bitbucket
// src/infrastructure/configuration/logger/LoggerConfiguration.ts:75 (HEAD 2026-08-22).
//
// Benign because: `recursive: true` IS the mitigation for this race. mkdirSync with
// that flag does not throw on EEXIST, so a directory appearing between the check and
// the call changes nothing — which is the whole hazard TOCTOU describes. There is also
// no privilege boundary: this is a local log directory created at process start.
//
// A rule that reports the guarded, idempotent form is reporting the fix.
const fs = require('node:fs');
const path = require('node:path');

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error(`[Logger] Failed to create log directory: ${logDir}`, error);
  }
}

module.exports = { logDir };
