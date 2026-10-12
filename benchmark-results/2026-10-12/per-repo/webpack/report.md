# ILB-Wild — webpack

> Pinned: `b29de5fcd3d22cff32b807b4a58ed02134852c20` · 65K ⭐ · Build Tool (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 587 |
| Lines of code | 158,661 |
| Total findings | 31 (25 errors, 6 warnings) |
| Findings density | **0.2 / kLoC** |
| Files with findings | 20 (3.4%) |
| Wall-clock (median, 3 runs) | **4904 ms** (±1475, CV 25.2%) |
| Per-file lint cost | 8.35 ms/file |
| Peak RSS | 788 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 5 / 43 | 11.6% |
| secure-coding | 3 / 34 | 8.8% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 9 | 947.59 ms |
| `node-security/no-unsafe-buffer-alloc` | 6 | 63.79 ms |
| `node-security/detect-eval-with-expression` | 5 | 17.95 ms |
| `node-security/require-stream-error-handler` | 4 | 8.12 ms |
| `secure-coding/no-unsafe-regex-construction` | 3 | 11.41 ms |
| `secure-coding/no-xxe-injection` | 2 | 27.21 ms |
| `node-security/no-dynamic-algorithm-selection` | 1 | 3.74 ms |
| `node-security/no-unsafe-dynamic-require` | 1 | 6.76 ms |
| `secure-coding/no-privilege-escalation` | 0 | 204.77 ms |
| `secure-coding/no-ldap-injection` | 0 | 138.7 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 947.59 ms | 9 |
| `secure-coding/no-privilege-escalation` | 204.77 ms | 0 |
| `secure-coding/no-ldap-injection` | 138.7 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 91.8 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 65.82 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 63.79 ms | 6 |
| `secure-coding/no-hardcoded-credentials` | 55.65 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 42.66 ms | 0 |
| `node-security/no-toctou-vulnerability` | 37.63 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 34.63 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:625 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-unsafe-regex-construction` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:663 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Dynamic regex flags: Dynamic flags can lead to unexpected behavior or security issues \| HIGH Fix: Use static flags instead of dynamic flags \| https://owasp.org/www-community/attacks/Regular_expres
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/TemplatedPathPlugin.js:29 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/TemplatedPathPlugin.js:30 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/NormalModule.js:736 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/DotenvPlugin.js:30 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `node-security/no-dynamic-algorithm-selection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/util/createHash.js:86 — 🔒 CWE-327 OWASP:A04-Cryptographic CVSS:7.5 \| `crypto.createHash()` receives a dynamic algorithm name. An attacker who controls this value can downgrade to a weak algorithm (MD5, SHA1, RC4) or cause a crash. \| HIGH [PCI-DSS,HIPAA,ISO27001,N
- `node-security/detect-eval-with-expression` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/util/binarySearchBounds.js:111 — 🔒 CWE-95 OWASP:A05-Injection CVSS:9.8 \| eval() can be refactored to safer alternative \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Arrow function or regular function \| https://owasp.org/www-community/attacks/Code_Injection
- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/util/StringXor.js:56 — 🔒 CWE-908 CVSS:7.5 \| `Buffer.allocUnsafe(size)` returns memory that has not been zeroed. Every byte not overwritten before the buffer is read or sent leaks whatever the allocator previously stored there. \| HIGH Fix: Use `Buffer.alloc(si
- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/util/StringXor.js:64 — 🔒 CWE-908 CVSS:7.5 \| `Buffer.allocUnsafe(size)` returns memory that has not been zeroed. Every byte not overwritten before the buffer is read or sent leaks whatever the allocator previously stored there. \| HIGH Fix: Use `Buffer.alloc(si
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/sharing/utils.js:31 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Self-loop quantifier (exponential backtracking): A quantifier reaches itself via the parent loop. An attacker can craft input that triggers exponential backtracking. \| CRITICAL Fix: Atomic group,
- `secure-coding/no-unsafe-regex-construction` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/serialization/RegExpObjectSerializer.js:27 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Dynamic regex flags: Dynamic flags can lead to unexpected behavior or security issues \| HIGH Fix: Use static flags instead of dynamic flags \| https://owasp.org/www-community/attacks/Regular_expres
- `node-security/no-unsafe-dynamic-require` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/serialization/ObjectMiddleware.js:803 — 🔒 CWE-95 OWASP:A05-Injection CVSS:9.8 \| Dynamic require() detected \| CRITICAL [SOC2,PCI-DSS,ISO27001] Fix: Use allowlist: const ALLOWED = ["mod1", "mod2"]; if (!ALLOWED.includes(name)) throw Error("Not allowed") \| https://owasp.org/www-
- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/serialization/FileMiddleware.js:192 — 🔒 CWE-908 CVSS:7.5 \| `Buffer.allocUnsafe(size)` returns memory that has not been zeroed. Every byte not overwritten before the buffer is read or sent leaks whatever the allocator previously stored there. \| HIGH Fix: Use `Buffer.alloc(si
- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/serialization/FileMiddleware.js:709 — 🔒 CWE-908 CVSS:7.5 \| `Buffer.allocUnsafeSlow(size)` allocates outside the shared pool but is equally uninitialized — the returned bytes are whatever was last in that memory. \| HIGH Fix: Use `Buffer.alloc(size)`, or append `.fill(0)` to

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `lib/**/*.js`
