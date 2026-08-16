/**
 * VULNERABLE - `require` bound to a local before use. Common in bundler-evasion
 * code and in Koa middleware; the alias changes nothing about what runs.
 */
const load = require;

module.exports = async function themeMiddleware(ctx, next) {
  const theme = load(ctx.request.body.theme);
  ctx.state.theme = theme;
  await next();
};
