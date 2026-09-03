/**
 * VULNERABLE - optional chaining around the same delete. The middleware is
 * defensive about the payload existing and careless about what removing the
 * field actually accomplishes.
 */
function stripAuthArtifacts(ctx) {
  delete ctx.state?.jwt;
  delete ctx.state?.bearer;
  return ctx;
}

module.exports = { stripAuthArtifacts };
