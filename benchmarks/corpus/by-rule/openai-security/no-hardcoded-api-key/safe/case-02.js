// openai-security/no-hardcoded-api-key — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by openai-security/no-hardcoded-api-key
import OpenAI from 'openai-edge';
const c = new OpenAI({ apiKey: 'sk-proj-AAAA' });
