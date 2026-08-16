/**
 * SAFE - An operator endpoint that changes the logger's verbosity at runtime.
 * `level` here is `debug` / `info` / `warn`, a Pino log level. It grants
 * nothing, it is validated against Pino's own closed set, and the route is
 * already behind the admin guard mounted in the parent router.
 *
 * `level` is one of the property names a privilege rule watches, so a rule that
 * decides on the property name alone reports a logging control as privilege
 * escalation.
 */
import { Router } from 'express';
import pino from 'pino';

export const logger = pino();

const router = Router();

router.put('/internal/log-level', (req, res) => {
  if (!pino.levels.values[req.body.level]) {
    res.status(400).json({ error: 'unknown level' });
    return;
  }
  logger.level = req.body.level;
  res.json({ level: logger.level });
});

export default router;
