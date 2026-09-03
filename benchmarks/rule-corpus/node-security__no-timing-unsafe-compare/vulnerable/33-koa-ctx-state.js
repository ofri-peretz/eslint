/**
 * VULNERABLE (wave 3, positive control) - Koa, where both operands hang off
 * `ctx` and the server half is `ctx.state`.
 *
 * The Koa spelling of vulnerable/22.
 */
'use strict';

async function requireApiToken(ctx, next) {
  if (ctx.state.apiToken !== ctx.request.headers['x-api-token']) {
    ctx.status = 403;
    ctx.body = { error: 'forbidden' };
    return;
  }

  await next();
}

module.exports = { requireApiToken };
