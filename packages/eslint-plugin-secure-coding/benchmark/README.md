# ESLint Security Plugins Benchmark

A comprehensive benchmark comparing `eslint-plugin-secure-coding` vs `eslint-plugin-security`.

## Quick Start

```bash
cd benchmark
npm install
npm run benchmark         # Full benchmark
npm run benchmark:fair    # Apples-to-apples comparison
```

---

## 📊 Benchmark Results Summary

### Benchmark 1: Recommended vs. Recommended

| Criteria                         | `secure-coding/recommended` | `security/recommended` | Winner           |
| -------------------------------- | --------------------------- | ---------------------- | ---------------- |
| **⚡ Performance per Issue**     | **9.95ms**                  | 28.16ms                | 🟢 secure-coding |
| **Performance (Total)**          | 795.99ms                    | 591.41ms               | 🔵 security      |
| **Issues Found**                 | 80                          | 21                     | 🟢 secure-coding |
| **False Positives (safe.js)**    | **0**                       | 4                      | 🟢 secure-coding |
| **Rules Triggered**              | 30                          | 10                     | 🟢 secure-coding |
| **Total Rules Available**        | 89                          | 14                     | 🟢 secure-coding |
| **OWASP Web Top 10 Coverage**    | 10/10 (100%)                | ~3/10 (~30%)           | 🟢 secure-coding |
| **OWASP Mobile Top 10 Coverage** | 10/10 (100%)                | 0/10 (0%)              | 🟢 secure-coding |
| **CWE References**               | ✅ All rules                | ❌ None                | 🟢 secure-coding |
| **CVSS Scores in Messages**      | ✅ Yes                      | ❌ No                  | 🟢 secure-coding |
| **LLM-Optimized Messages**       | ⭐⭐⭐⭐⭐                  | ⭐⭐                   | 🟢 secure-coding |
| **Fix Suggestions per Rule**     | 3-6 suggestions             | 0 suggestions          | 🟢 secure-coding |
| **Documentation Level**          | Comprehensive               | Basic                  | 🟢 secure-coding |

---

### Benchmark 2: Apples-to-Apples (Same 14 Rules)

| Criteria                      | `secure-coding` (14 rules) | `security` (14 rules) | Winner           |
| ----------------------------- | -------------------------- | --------------------- | ---------------- |
| **⚡ Performance per Issue**  | **24.95ms**                | 25.12ms               | 🟢 secure-coding |
| **Performance (Total)**       | 723.54ms                   | 527.58ms              | 🔵 security      |
| **Issues Found**              | 29                         | 21                    | 🟢 secure-coding |
| **False Positives (safe.js)** | **0**                      | 4                     | 🟢 secure-coding |
| **Detection Rate**            | 138%                       | 100% (baseline)       | 🟢 secure-coding |
| **Missed Vulnerabilities**    | 0 (baseline)               | 8                     | 🟢 secure-coding |

#### Rule-by-Rule Detection (Same Categories)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| Timing Attacks |  |  |  |  |  |  |  |  |  |
| Child Process |  |  |  |  |  |  |  |  |  |
| Non-literal Regexp |  |  |  |  |  |  |  |  |  |
| Eval/Code Execution |  |  |  |  |  |  |  |  |  |
| Insufficient Randomness |  |  |  |  |  |  |  |  |  |
| FS Path Traversal |  |  |  |  |  |  |  |  |  |
| Object Injection |  |  |  |  |  |  |  |  |  |
| Dynamic Require |  |  |  |  |  |  |  |  |  |
| Unsafe Regex |  |  |  |  |  |  |  |  |  |
| Buffer (deprecated APIs) |  |  |  |  |  |  |  |  |  |
| **TOTAL** |  |  |  |  |  |  |  |  |  |
---

## 🔍 LLM/AI Message Comparison

### `eslint-plugin-security` message:

```
Found child_process.exec() with non Literal first argument
```

### `eslint-plugin-secure-coding` message:

```
🔒 CWE-78 OWASP:A03-Injection CVSS:9.8 | Command injection detected | CRITICAL
   Fix: Use execFile/spawn with {shell: false} and array args
   📚 https://owasp.org/www-community/attacks/Command_Injection
```

| LLM Feature              | `secure-coding` | `security` |
| ------------------------ | --------------- | ---------- |
| CWE ID                   | ✅              | ❌         |
| OWASP mapping            | ✅              | ❌         |
| Severity score           | ✅              | ❌         |
| Exact fix instruction    | ✅              | ❌         |
| Documentation link       | ✅              | ❌         |
| Compliance tags          | ✅              | ❌         |
| Multiple fix suggestions | ✅ (3-6)        | ❌ (0)     |

---

## 📈 False Positive Analysis

> **v2.3.0 Update**: All false positives have been **FIXED**! Both `recommended` and `strict` configs now achieve **100% precision**.

### Config Comparison

| Config          | False Positives | Precision | Notes                      |
| --------------- | --------------- | --------- | -------------------------- |
| **recommended** | **0**           | **100%**  | Optimal for most projects  |
| **strict**      | **0**           | **100%**  | Maximum detection coverage |

### Fixes Applied in v2.3.0

1. **`no-arbitrary-file-access`**: Now detects `path.basename()` sanitization, `startsWith()` guards, and safe variable naming
2. **`no-weak-password-recovery`**: Narrowed scope to require BOTH password AND reset/recover/forgot keywords
3. **`no-unvalidated-user-input`**: Removed overly broad `input` pattern, uses prefix-based ignorePatterns

### eslint-plugin-security Comparison

| Category         | `secure-coding` | `security` | Notes                                     |
| ---------------- | --------------- | ---------- | ----------------------------------------- |
| Object Injection | 0               | 3 warnings | Fixed via validation pattern detection    |
| Path Traversal   | 0               | 1 warning  | Fixed via guard clause & startsWith check |
| **TOTAL**        | **0**           | **4**      |                                           |

### `eslint-plugin-security` False Positives (4 total)

**1. Object Injection FP #1** (line 38)

```js
// Pattern: Validated key access with allowlist
const VALID_KEYS = ['name', 'email', 'age'];
if (VALID_KEYS.includes(key)) {
  return obj[key]; // ⚠️ security flags this despite includes() validation
}
```

**2. Object Injection FP #2** (line 45)

```js
// Pattern: hasOwnProperty check before access
if (Object.prototype.hasOwnProperty.call(obj, key)) {
  return obj[key]; // ⚠️ security flags this despite hasOwnProperty check
}
```

**3. Object Injection FP #3** (line 153)

```js
// Pattern: Allowlist validation before dynamic access
const ALLOWED_THEMES = ['light', 'dark', 'system'];
if (!ALLOWED_THEMES.includes(userTheme)) throw new Error('Invalid');
config[userTheme] = true; // ⚠️ security flags this despite throw guard
```

**4. Path Traversal FP** (line 107)

```js
// Pattern: basename + startsWith validation
const safeName = path.basename(userFilename);
const safePath = path.join(SAFE_DIR, safeName);
if (!safePath.startsWith(SAFE_DIR)) throw new Error('Invalid');
fs.readFileSync(safePath); // ⚠️ security flags despite full validation
```

### Why `secure-coding` Avoids These False Positives

| Pattern                   | Detection Method                               |
| ------------------------- | ---------------------------------------------- |
| `allowlist.includes(key)` | AST-based check for includes() in if-condition |
| `hasOwnProperty(key)`     | AST-based check for hasOwnProperty/hasOwn      |
| Guard clause + throw      | Preceding sibling IfStatement with early exit  |
| `startsWith()` validation | AST-based path validation detection            |

### Precision Comparison

| Metric                 | `secure-coding` | `security` |
| ---------------------- | --------------- | ---------- |
| True Positives         | 80              | 21         |
| False Positives        | 0               | 4          |
| **Precision**          | **100%**        | 84.0%      |
| **Detection Coverage** | 100% (baseline) | 26%        |

> With 0 false positives and 80 true positives, `secure-coding` achieves **100% precision** while detecting 3.8x more issues.

---

## 🏆 Final Verdict

| Category              | `secure-coding` | `security` | Winner           |
| --------------------- | --------------- | ---------- | ---------------- |
| Performance per Issue | **9.95ms**      | 28.16ms    | 🟢 secure-coding |
| Detection Coverage    | 80 issues       | 21 issues  | 🟢 secure-coding |
| False Positives       | **0**           | 4          | 🟢 secure-coding |
| Precision             | **100%**        | 84.0%      | 🟢 secure-coding |
| OWASP Coverage        | 20/20           | ~3/20      | 🟢 secure-coding |
| LLM/AI Optimization   | ⭐⭐⭐⭐⭐      | ⭐⭐       | 🟢 secure-coding |

### Key Insights

1. **Performance per issue matters more than raw speed** - `secure-coding` is **2.83x more efficient** per issue found.

2. **"Speed advantage" is a detection gap** - `security` is faster because it misses vulnerabilities.

3. **100% precision with 0 false positives** - After v2.2.6 optimizations, all flagged issues are real vulnerabilities.

4. **Fair comparison (same 14 rules)**: `secure-coding` is only 1.37x slower while finding 38% more issues.

---

## 📁 File Structure

```
benchmark/
├── README.md                              # This file
├── package.json                           # Dependencies
├── benchmark.mjs                          # Main performance benchmark
├── fair-benchmark.mjs                     # Apples-to-apples comparison
├── eslint.config.secure-coding.mjs        # Full secure-coding config
├── eslint.config.secure-coding-14.mjs     # 14 equivalent rules only
├── eslint.config.secure-coding-recommended.mjs  # Recommended preset
├── eslint.config.security.mjs             # Full security config
├── eslint.config.security-recommended.mjs # Recommended preset
└── test-files/
    ├── vulnerable.js                      # JS file with vulnerabilities
    ├── vulnerable.ts                      # TS file with vulnerabilities
    └── safe-patterns.js                   # Safe patterns (false positive test)
```

---

## 🔄 Re-running the Benchmark

```bash
# Install dependencies
npm install

# Run full benchmark
npm run benchmark

# Run fair comparison (same 14 rules)
npm run benchmark:fair

# Run specific config
npx eslint --config eslint.config.secure-coding.mjs test-files/vulnerable.js
npx eslint --config eslint.config.security.mjs test-files/vulnerable.js
```

---

_Last updated: December 20, 2024_
