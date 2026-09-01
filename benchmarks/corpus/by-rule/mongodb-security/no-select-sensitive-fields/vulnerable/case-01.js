// mongodb-security/no-select-sensitive-fields — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by mongodb-security/no-select-sensitive-fields
const userSchema = new Schema({ email: String, password: String });
db.users.find({ username: req.body.username });
