/**
 * SAFE - the vocabulary appears only in a log line and a documentation URL.
 * Nothing is written anywhere. A report here would prove the rule reads text
 * rather than tracking a write.
 */
const logger = require('./logger');

const CLEANUP_DOCS = 'https://docs.example.com/runbooks/tmp/cleanup';

function warnAboutTempUsage(bytes) {
  logger.warn(`/tmp holds ${bytes} bytes of stale artifacts; see ${CLEANUP_DOCS}`);
}

module.exports = { warnAboutTempUsage };
