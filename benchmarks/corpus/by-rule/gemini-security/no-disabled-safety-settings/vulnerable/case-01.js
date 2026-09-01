// gemini-security/no-disabled-safety-settings — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by gemini-security/no-disabled-safety-settings
import { GoogleGenerativeAI } from '@google/generative-ai';
const cfg = { threshold: 'BLOCK_NONE' };
