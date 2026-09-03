/**
 * VULNERABLE (wave 2) - `Math['random']()`.
 *
 * Bracket notation is what a minifier, a property-mangling build step, or a
 * developer working around a `no-restricted-properties` lint rule leaves
 * behind. The value is byte-identical to `Math.random()`; only the AST node
 * shape changed - the callee's property is a Literal, not an Identifier.
 */
'use strict';

const db = require('../lib/db');

async function issueDeviceToken(deviceId) {
  const deviceToken = Math['random']().toString(36).slice(2);
  await db.devices.update({ deviceId }, { deviceToken });
  return deviceToken;
}

module.exports = { issueDeviceToken };
