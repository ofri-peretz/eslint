/**
 * SAFE (wave 2, text-vs-structure probe) - the vocabulary appears only in a
 * comment and a log line.
 *
 * The comparison is on a numeric page cursor. A report here proves the rule is
 * reading TEXT rather than structure.
 */
'use strict';

const logger = require('../lib/logger');

async function nextPage(req, res, feed) {
  const page = await feed.page(req.query.cursor);

  // The api key and hmac signature are checked by the gateway before we run.
  logger.debug('serving page after bearer token validation', { id: page.id });

  if (req.query.lastSeenId !== page.lastSeenId) {
    res.status(409).json({ error: 'cursor moved' });
    return;
  }

  res.json(page);
}

module.exports = { nextPage };
