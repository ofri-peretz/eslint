// secure-coding/no-homoglyph-identifiers — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-homoglyph-identifiers
const ADMIN_ROLE = 'admin';
          const GUEST_ROLE = 'guest';

          function grantAccess(user) {
            return user.role === ADMIN_ROLE ? 'full-access' : 'read-only';
          }

          function describeUser(user) {
            return `${user.name} (${grantAccess(user)})`;
          }
