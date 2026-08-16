/**
 * SAFE - the specifier is a module constant. Hoisting a path to a `const` is
 * ordinary style; nothing about it is runtime-assembled.
 */
const LOGGER_MODULE = './logging/pino-adapter';

const logger = require(LOGGER_MODULE);

module.exports = function withLogging(handler) {
  return (req, res) => {
    logger.info({ path: req.path }, 'request');
    return handler(req, res);
  };
};
