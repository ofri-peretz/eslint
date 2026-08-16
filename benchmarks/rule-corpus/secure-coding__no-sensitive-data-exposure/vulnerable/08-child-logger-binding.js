/**
 * VULNERABLE - A pino child logger bound to a request. `log` is the idiomatic
 * pino name and the receiver is a local binding, not a variable literally
 * called `logger`. The credential still reaches the same log stream.
 */
import { rootLogger } from '../lib/logger.js';

export function handleTokenExchange(req, res) {
  const log = rootLogger.child({ requestId: req.id });
  log.info(`exchanging refresh token ${req.body.refreshToken}`);
  res.status(204).end();
}
