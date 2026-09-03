/**
 * SAFE - protocol negotiation on a header the client sent and already knows.
 *
 * There is no secret on either side of any of these comparisons.
 */
'use strict';

function bodyParser(req, res, next) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0];

  if (contentType === 'application/json') {
    req.parse = 'json';
  } else if (contentType === 'application/x-www-form-urlencoded') {
    req.parse = 'form';
  } else {
    res.status(415).send('unsupported media type');
    return;
  }

  next();
}

module.exports = { bodyParser };
