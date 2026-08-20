/**
 * SAFE - a CLI comparing two configuration values on the developer's machine.
 *
 * Both `apiKey` reads are local config. Nobody is on the other end of a
 * network timing this, and there is no attacker-controlled operand at all.
 */
'use strict';

function warnOnDrift(localConfig, remoteConfig, logger) {
  if (localConfig.apiKey !== remoteConfig.apiKey) {
    logger.warn('local app credentials differ from the linked remote app');
  }
  if (localConfig.clientId !== remoteConfig.clientId) {
    logger.warn('local client id differs from the linked remote app');
  }
}

module.exports = { warnOnDrift };
