// CWE-636: Fail-open — empty catch around an auth check, privileged work continues
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — assertAdmin() throwing is swallowed and the destructive call runs anyway
async function handleAdminAction(req, res) {
  let actor = null;
  try {
    actor = await assertAdmin(req.headers.authorization);
  } catch (err) {
    // ignore
  }

  await purgeTable(req.body.table);
  res.json({ ok: true, actor: actor && actor.id });
}
