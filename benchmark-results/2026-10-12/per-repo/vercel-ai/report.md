# ILB-Wild — vercel-ai

> Pinned: `d57cf11d0e8d06bb3c2e1bcda89ad6a6a5530793` · 15K ⭐ · AI SDK

## Summary

| Metric | Value |
|---|---|
| Files linted | 1,458 |
| Lines of code | 159,997 |
| Total findings | 102 (4 errors, 98 warnings) |
| Findings density | **0.64 / kLoC** |
| Files with findings | 9 (0.6%) |
| Wall-clock (median, 3 runs) | **7246 ms** (±1007, CV 14.2%) |
| Per-file lint cost | 4.97 ms/file |
| Peak RSS | 818 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| vercel-ai-security | 2 / 19 | 10.5% |
| node-security | 1 / 43 | 2.3% |
| secure-coding | 2 / 34 | 5.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `vercel-ai-security/require-max-tokens` | 97 | 8.38 ms |
| `vercel-ai-security/no-system-prompt-leak` | 2 | 24.39 ms |
| `secure-coding/no-redos-vulnerable-regex` | 1 | 186.61 ms |
| `secure-coding/no-hardcoded-credentials` | 1 | 106.96 ms |
| `node-security/no-unsafe-buffer-alloc` | 1 | 47.27 ms |
| `secure-coding/no-privilege-escalation` | 0 | 189.19 ms |
| `secure-coding/no-ldap-injection` | 0 | 191.96 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 103.8 ms |
| `vercel-ai-security/require-validated-prompt` | 0 | 90.5 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 61.57 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-ldap-injection` | 191.96 ms | 0 |
| `secure-coding/no-privilege-escalation` | 189.19 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 186.61 ms | 1 |
| `secure-coding/no-hardcoded-credentials` | 106.96 ms | 1 |
| `node-security/no-weak-hash-algorithm` | 103.8 ms | 0 |
| `vercel-ai-security/require-validated-prompt` | 90.5 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 61.57 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 47.27 ms | 1 |
| `secure-coding/no-unlimited-resource-allocation` | 45.75 ms | 0 |
| `secure-coding/no-graphql-injection` | 41.58 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/provider-utils/src/to-json-schema/zod3-to-json-schema/parsers/string.ts:37 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Ambiguous alternation (exponential backtracking): Alternatives inside a quantified group match the same input, so every character can be taken by either branch and the engine explores 2^n paths befor
- `vercel-ai-security/no-system-prompt-leak` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/mcp/src/tool/mcp-client.ts:291 — 🔒 CWE-200 OWASP:A01-Broken CVSS:7.5 \| System prompt "this._serverInstructions" is exposed in return statement. This reveals AI behavior instructions to users. \| HIGH [SOC2] Fix: Remove system prompt from API response. Only return the AI
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/google/src/interactions/google-interactions-agent.test-d.ts:24 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Common password detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitio
- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/amazon-bedrock/src/amazon-bedrock-event-stream-decoder.ts:24 — 🔒 CWE-789 CVSS:7.5 \| The allocation size is read off the wire, so the peer picks it. For `new Array(n)` the hazard is a narrow band, not "large n": V8 keeps a packed backing store only up to ~33.5M elements, and a length just under that tu
- `vercel-ai-security/no-system-prompt-leak` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/prompt/standardize-prompt.ts:109 — 🔒 CWE-200 OWASP:A01-Broken CVSS:7.5 \| System prompt "instructions" is exposed in return statement. This reveals AI behavior instructions to users. \| HIGH [SOC2] Fix: Remove system prompt from API response. Only return the AI-generated c
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:14 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:23 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:33 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:45 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:57 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:69 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:83 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:94 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:106 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:
- `vercel-ai-security/require-max-tokens` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/ai/src/generate-text/stream-text.test-d.ts:118 — ⚠️ CWE-770 OWASP:A05-Security CVSS:6.5 \| streamText call without a token limit can lead to excessive resource consumption \| MEDIUM [SOC2] Fix: Add a token limit: streamText({ maxOutputTokens: 4096, ... }) (v5+) or maxTokens (v4) \| https:

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/*/src/**/*.ts`
