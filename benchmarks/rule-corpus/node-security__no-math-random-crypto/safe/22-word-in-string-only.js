/**
 * SAFE (wave 2, text-vs-structure probe) - the vocabulary appears only inside
 * a comment and a log message.
 *
 * The Math.random() here spreads a background rotation job over a window so
 * every pod does not wake at the same second. A report on this file proves the
 * rule is reading TEXT rather than structure.
 */
'use strict';

const logger = require('../lib/logger');

// Rotation of the signing secret happens hourly; this only staggers the wakeup.
function scheduleRotationSweep(run) {
  const spread = Math.random() * 60_000;
  logger.info('scheduling session token rotation sweep', { spreadMs: spread });
  return setTimeout(run, 3_600_000 + spread);
}

module.exports = { scheduleRotationSweep };
