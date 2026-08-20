/**
 * VULNERABLE - the buffer IS eventually filled, but it is logged first. The
 * hazard CWE-908 names is a byte READ before it is WRITTEN, and the read here
 * happens two lines before the covering copy.
 */
const { Buffer } = require('node:buffer');

function stageRecord(source, logger) {
  const staging = Buffer.allocUnsafe(source.length);
  logger.debug('staging head: %s', staging.subarray(0, 8).toString('hex'));
  source.copy(staging);
  return staging;
}

module.exports = { stageRecord };
