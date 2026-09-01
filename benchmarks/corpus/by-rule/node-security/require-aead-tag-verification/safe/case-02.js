// node-security/require-aead-tag-verification — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/require-aead-tag-verification
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
          let ct = cipher.update(plaintext, 'utf8', 'hex');
          ct += cipher.final('hex');
          const authTag = cipher.getAuthTag();
