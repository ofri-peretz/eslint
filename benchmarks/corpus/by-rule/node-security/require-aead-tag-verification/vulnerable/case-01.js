// node-security/require-aead-tag-verification — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by node-security/require-aead-tag-verification
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          let out = decipher.update(ciphertext, 'hex', 'utf8');
          out += decipher.final('utf8');
