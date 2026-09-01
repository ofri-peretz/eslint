// node-security/no-unsafe-buffer-alloc — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by node-security/no-unsafe-buffer-alloc
function f() { let header; header = Buffer.allocUnsafe(16); header.writeUInt32BE(len, 0); socket.write(header); }
