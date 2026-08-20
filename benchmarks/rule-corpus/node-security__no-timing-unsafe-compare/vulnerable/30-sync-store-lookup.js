/**
 * VULNERABLE (wave 3) - the stored secret is fetched SYNCHRONOUSLY.
 *
 * Attacks the assumption behind the tie-break: that a value which crossed an
 * I/O boundary crossed an `await`. An in-process LRU cache is not async, and
 * neither is `fs.readFileSync`. Both operands still read the request (the
 * lookup key came from the URL), so the taint model still marks both, and the
 * evidence that one of them is server state has vanished.
 */
'use strict';

const cache = require('../lib/credential-cache');

function authorizeIntegration(req, res, next) {
  const stored = cache.getSync(req.params.integrationId);

  if (req.body.apiKey !== stored.apiKey) {
    res.status(403).send('forbidden');
    return;
  }

  next();
}

module.exports = { authorizeIntegration };
