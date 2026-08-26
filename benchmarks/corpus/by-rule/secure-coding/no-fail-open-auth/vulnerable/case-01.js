// secure-coding/no-fail-open-auth — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by secure-coding/no-fail-open-auth
async function handleAdminAction(req, res) {
         let actor = null;
         try { actor = await assertAdmin(req.headers.authorization); } catch (err) {}
         await purgeTable(req.body.table);
         res.json({ ok: true, actor: actor && actor.id });
       }
