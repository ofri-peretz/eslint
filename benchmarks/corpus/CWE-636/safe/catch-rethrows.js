// CWE-636: Safe — the catch block rethrows before any privileged work
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — the error is logged and rethrown, so the destructive call is never reached
async function handleAdminAction(req, res) {
  let actor;
  try {
    actor = await assertAdmin(req.headers.authorization);
  } catch (err) {
    logger.error({ event: 'admin_assert_failed', reason: err.name });
    throw err;
  }

  await purgeTable(req.body.table);
  res.json({ ok: true, actor: actor.id });
}
