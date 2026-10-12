// openai-security/no-browser-api-key-exposure — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by openai-security/no-browser-api-key-exposure
// 2026-10-12 FP/FN audit: the case this was derived from constructed an
// `OpenAI` nothing imported; re-derived from the bound Agents SDK case.
import { OpenAIProvider } from '@openai/agents';
const c = new OpenAIProvider({ dangerouslyAllowBrowser: true });
