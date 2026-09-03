/**
 * VULNERABLE (wave 2, positive control) - optional chaining on both operands.
 *
 * `?.` is a different AST node from `.` in some parsers and the same one with
 * a flag in others. The comparison is unchanged either way.
 */
'use strict';

async function verifyTenant(req, accounts) {
  const account = await accounts.byId(req.params.tenantId);

  if (req.body?.apiKey !== account?.apiKey) {
    return { status: 403 };
  }
  return { status: 200 };
}

module.exports = { verifyTenant };
