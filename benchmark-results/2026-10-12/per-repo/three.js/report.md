# ILB-Wild — three.js

> Pinned: `r170` · 105K ⭐ · 3D Graphics Engine
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 678 |
| Lines of code | 107,041 |
| Total findings | 17 (16 errors, 1 warnings) |
| Findings density | **0.16 / kLoC** |
| Files with findings | 10 (1.5%) |
| Wall-clock (median, 3 runs) | **4420 ms** (±124, CV 2.7%) |
| Per-file lint cost | 6.52 ms/file |
| Peak RSS | 623 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 1 / 46 | 2.2% |
| secure-coding | 4 / 34 | 11.8% |
| node-security | 2 / 43 | 4.7% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 7 | 428.64 ms |
| `node-security/no-math-random-crypto` | 4 | 16.15 ms |
| `secure-coding/no-xpath-injection` | 2 | 19.95 ms |
| `browser-security/no-eval` | 1 | 81.63 ms |
| `node-security/detect-eval-with-expression` | 1 | 13.57 ms |
| `secure-coding/no-xxe-injection` | 1 | 26.09 ms |
| `secure-coding/no-unsafe-deserialization` | 1 | 26.03 ms |
| `secure-coding/no-ldap-injection` | 0 | 114.07 ms |
| `browser-security/no-http-urls` | 0 | 120.42 ms |
| `secure-coding/no-privilege-escalation` | 0 | 125.97 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 428.64 ms | 7 |
| `secure-coding/no-privilege-escalation` | 125.97 ms | 0 |
| `browser-security/no-http-urls` | 120.42 ms | 0 |
| `secure-coding/no-ldap-injection` | 114.07 ms | 0 |
| `browser-security/no-eval` | 81.63 ms | 1 |
| `browser-security/no-innerhtml` | 79.84 ms | 0 |
| `browser-security/no-websocket-eval` | 71.25 ms | 0 |
| `browser-security/no-postmessage-innerhtml` | 70.02 ms | 0 |
| `browser-security/no-worker-message-innerhtml` | 67.66 ms | 0 |
| `browser-security/no-filereader-innerhtml` | 67.65 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/webgpu/nodes/WGSLNodeFunction.js:4 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/nodes/parsers/GLSLNodeFunction.js:4 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `browser-security/no-eval` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/nodes/code/ScriptableNode.js:415 — 🔒 CWE-95 OWASP:A05-Injection CVSS:9.8 \| Using Function constructor with dynamic input can execute arbitrary code. This is a critical security vulnerability. \| CRITICAL [SOC2,PCI-DSS,ISO27001] Fix: Use safe alternatives like JSON.parse()
- `node-security/detect-eval-with-expression` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/nodes/code/ScriptableNode.js:415 — 🔒 CWE-95 OWASP:A05-Injection CVSS:9.8 \| Use direct property access instead of eval() for dynamic property access \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use obj[key] or Map.get(key) instead of eval() \| https://owasp.org/www-community/attack
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/MathUtils.js:12 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/MathUtils.js:13 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/MathUtils.js:14 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/MathUtils.js:15 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/Color.js:184 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/Color.js:199 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/math/Color.js:219 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/loaders/LoaderUtils.js:65 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-xxe-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/loaders/FileLoader.js:190 — 🔒 CWE-611 OWASP:A05-Injection CVSS:9.1 \| XML from untrusted source without validation \| HIGH Fix: Validate and sanitize XML input before parsing \| https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/loaders/nodes/NodeLoader.js:93 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/animation/AnimationClip.js:150 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `src/**/*.{js,ts}`
