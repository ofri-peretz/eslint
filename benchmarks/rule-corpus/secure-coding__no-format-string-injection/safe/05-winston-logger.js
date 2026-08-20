/**
 * SAFE - Not a printf-style sink. Winston's `logger.info(message, meta)` takes
 * a message and a metadata OBJECT; it does not treat the first argument as a
 * format template, so a `%s` in the user's message has nothing to consume.
 *
 * A rule that reported this would be reporting the recommended logging library.
 */
const winston = require('winston');

const logger = winston.createLogger({ level: 'info' });

function logSearch(req) {
  logger.info(req.query.term, { route: '/search', tenant: req.params.tenant });
  logger.warn(req.body.note, { userId: req.body.userId });
}

module.exports = { logSearch, logger };
