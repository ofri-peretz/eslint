// node-security/no-unsafe-buffer-alloc — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/no-unsafe-buffer-alloc
function f(stage1, digest) {
         let returnBytes = Buffer.allocUnsafe(digest.length);
         for (let i = 0; i < digest.length; i++) {
           returnBytes[i] = stage1[i] ^ digest[i];
         }
         return returnBytes;
       }
