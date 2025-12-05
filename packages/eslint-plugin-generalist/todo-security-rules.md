# 🔒 eslint-plugin-security Rules TODO

Comprehensive list of rules from `eslint-plugin-security` to be implemented in `eslint-plugin-generalist`.

> **Status:**
> 🟢 = Implemented
> 🟡 = In Progress / Planned
> 🔴 = Not Started
> ❌ = Skipped (Legacy/Not needed)

## 📊 Analysis
- **Total Rules:** ~14
- **Implemented:** ~12 (We have 29 security rules total, covering most of these plus more)
- **Priority:** Critical

---

## 🕵️ Vulnerability Detection

These rules detect classic Node.js security issues.

| Status | Rule | Description | Priority | Our Equivalent |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 | `detect-unsafe-regex` | Detects potential ReDoS in RegEx. | **Critical** | `detect-non-literal-regexp` / `no-redos-vulnerable-regex` |
| 🟢 | `detect-non-literal-regexp` | Detects RegExp constructor with non-literal string. | **Critical** | `detect-non-literal-regexp` |
| 🟢 | `detect-non-literal-require` | Detects variable usage in `require()`. | **Critical** | `no-unsafe-dynamic-require` |
| 🟢 | `detect-non-literal-fs-filename` | Detects variable usage in `fs` calls (path traversal). | **Critical** | `detect-non-literal-fs-filename` |
| 🟢 | `detect-eval-with-expression` | Detects `eval()` with variables (RCE). | **Critical** | `detect-eval-with-expression` |
| 🟢 | `detect-pseudoRandomBytes` | Detects weak crypto (pseudoRandomBytes). | High | `no-insufficient-random` / `no-weak-crypto` |
| 🟢 | `detect-child-process` | Detects `child_process` execution with variables (Command Injection). | **Critical** | `detect-child-process` |
| 🟢 | `detect-object-injection` | Detects variable key access on objects (Prototype Pollution / DoS). | High | `detect-object-injection` (Improved with type checks?) |
| 🟢 | `detect-no-csrf-before-method-override` | Detects missing CSRF before method override. | Medium | `no-missing-csrf-protection` |
| 🟢 | `detect-buffer-noassert` | Detects buffer read/write with `noAssert` flag (Buffer Overflow). | Low | |
| 🟢 | `detect-child-process` | Detects instances of `child_process.exec` with variables. | **Critical** | `detect-child-process` |
| 🟢 | `detect-disable-mustache-escape` | Detects object assignment to `disableMustacheEscape`. | Low | |
| 🟢 | `detect-possible-timing-attacks` | Detects potential timing attacks in comparisons. | High | `no-insecure-comparison` |
| 🟢 | `detect-bidi-characters` | Detects Trojan Source attacks (BiDi characters). | Medium | |

## 🧠 AI Implementation Context

### The "False Positive" Problem
`detect-object-injection` is infamous for flagging *valid* code:
```javascript
// Flagged by standard plugin:
const value = config[key];
```
This is often valid lookup.

**Our Improvement:**
We should use **Type Information** (via `typescript-eslint`) to check if `key` is controlled by user input or if `config` is a plain object vs a Map.
- If `config` is a `Map`, lookup is safe.
- If `key` is a literal union `'a' | 'b'`, lookup is safe.

### Strategy
1.  **Coverage:** We already exceed the standard plugin's coverage.
2.  **Accuracy:** Focus on reducing false positives for `object-injection` and `non-literal-fs-filename`.
3.  **Fixes:** Provide structured fixes for *how* to sanitize input (e.g., "Use a whitelist map" or "Use `path.join` instead of concatenation").

### Reference Implementation Links
- [eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

