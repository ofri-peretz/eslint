# I Benchmarked ESLint Security Plugins: 100% Precision, 3.8x More Vulnerabilities Found

_By Ofri Peretz_

---

I've been building a security linter for the past few months. This week, I finally ran a proper head-to-head benchmark against the incumbent: `eslint-plugin-security`.

The results surprised me. Let me walk you through the full methodology.

## The Test Setup

I created two test files:

**vulnerable.js** — 218 lines of intentionally insecure code covering 12 vulnerability categories:

- Command injection (`exec`, `execSync`, `spawn`)
- Path traversal (`fs.readFile` with user input)
- Object injection (dynamic property access)
- SQL injection (string concatenation)
- Code execution (`eval`, `Function`)
- Regex DoS (catastrophic backtracking)
- Weak cryptography (MD5, SHA1, `Math.random`)
- Timing attacks (direct string comparison)
- XSS (`innerHTML` with user content)
- Insecure cookies
- Dynamic require
- Buffer issues

**safe-patterns.js** — 167 lines of code using common defensive patterns. These should NOT trigger warnings:

- Allowlist validation before dynamic access
- `hasOwnProperty` checks
- Guard clauses with `throw`
- `startsWith()` path validation
- `crypto.timingSafeEqual()` for comparisons
- DOMPurify sanitization

I ran each plugin 5 times and measured average execution time, issues found, and false positives.

_Assumption: Run-to-run variance estimated at ≤15%; reported differences (2.83x, 3.8x) exceed this margin._

---

## Test 1: The Fair Fight (Same 14 Rules)

First, the apples-to-apples comparison. Both plugins with **only the 14 rules that exist in both**.

| Metric             | My Plugin   | Incumbent |
| ------------------ | ----------- | --------- |
| **Time per Issue** | **24.95ms** | 25.12ms   |
| **Total Issues**   | 29          | 21        |
| **Detection Rate** | 138%        | 100%      |

With identical rule categories, my plugin finds **38% more issues**. Why? The detection patterns are more comprehensive. We catch `execSync()` where others only check `exec()`. We flag multiple timing attack patterns where others catch one.

**Rule-by-rule breakdown:**

| Category            | Incumbent | Mine  | Diff |
| ------------------- | --------- | ----- | ---- |
| Timing Attacks      | 1         | **5** | +4   |
| Child Process       | 2         | **4** | +2   |
| Non-literal Regexp  | 1         | **3** | +2   |
| Eval/Code Execution | 1         | **2** | +1   |

---

## Test 2: Recommended Presets (Full Comparison)

Next, the out-of-box experience. Each plugin's recommended configuration.

| Metric              | My Plugin  | Incumbent |
| ------------------- | ---------- | --------- |
| **Time per Issue**  | **9.95ms** | 28.16ms   |
| **Issues Found**    | 80         | 21        |
| **Rules Triggered** | 30         | 10        |
| **Total Rules**     | 89         | 14        |

My plugin is **2.83x more efficient per issue** while detecting **3.8x more vulnerabilities**.

"But the incumbent is faster overall!"

Yes. Because it's missing most of the vulnerabilities. That's like saying a smoke detector that never goes off is more efficient.

---

## Test 3: False Positives (The Real Test)

This is where precision matters. I ran both plugins against safe-patterns.js—code that uses proper defensive patterns.

| Plugin    | False Positives | Precision |
| --------- | --------------- | --------- |
| Mine      | **0**           | **100%**  |
| Incumbent | 4               | 84%       |

### What the incumbent flagged (incorrectly):

**FP #1: Validated key access**

```javascript
if (VALID_KEYS.includes(key)) {
  return obj[key]; // ⚠️ Flagged despite allowlist validation
}
```

**FP #2: hasOwnProperty check**

```javascript
if (Object.prototype.hasOwnProperty.call(obj, key)) {
  return obj[key]; // ⚠️ Flagged despite existence check
}
```

**FP #3: Guard clause with throw**

```javascript
if (!ALLOWED.includes(userInput)) throw new Error('Invalid');
config[userInput] = true; // ⚠️ Flagged despite throw guard
```

**FP #4: Path validation**

```javascript
if (!safePath.startsWith(SAFE_DIR)) throw new Error('Invalid');
fs.readFileSync(safePath); // ⚠️ Flagged despite startsWith check
```

### Why my plugin recognizes these

I use **AST-based validation detection**. For each flagged pattern, I check:

- Is there an `includes()` check in the enclosing if-statement?
- Is there a `hasOwnProperty()` call first?
- Is there a preceding guard clause with early exit?
- Is there a `startsWith()` path validation?

This isn't magic. It's just smarter static analysis.

---

## OWASP Coverage

| Standard      | My Plugin | Incumbent |
| ------------- | --------- | --------- |
| Web Top 10    | 10/10     | ~3/10     |
| Mobile Top 10 | 10/10     | 0/10      |
| **Total**     | **20/20** | **~3/20** |

---

## AI/LLM Optimization

One thing I'm particularly proud of: the error messages are designed for AI coding assistants.

**Incumbent's message:**

```
Found child_process.exec() with non Literal first argument
```

**My message:**

```
🔒 CWE-78 OWASP:A03-Injection CVSS:9.8 | Command injection detected | CRITICAL
   Fix: Use execFile/spawn with {shell: false} and array args
   📚 https://owasp.org/www-community/attacks/Command_Injection
```

When Cursor or Copilot sees my error, it knows exactly what to do. The CWE ID, OWASP category, and fix instruction give it context that a vague error message cannot.

---

## Features & Documentation

Here's the full feature comparison that goes beyond detection:

| Feature                | Mine                         | Incumbent   |
| ---------------------- | ---------------------------- | ----------- |
| **Total Rules**        | 89                           | 14          |
| **Documentation**      | Comprehensive (per-rule)     | Basic       |
| **Fix Suggestions**    | 3-6 per rule                 | 0           |
| **CWE References**     | ✅ All rules                 | ❌ None     |
| **CVSS Scores**        | ✅ Yes                       | ❌ No       |
| **OWASP Mapping**      | ✅ Web + Mobile              | ❌ None     |
| **TypeScript Support** | ✅ Full                      | ⚠️ Partial  |
| **Presets**            | minimal, recommended, strict | recommended |

---

## The Bottom Line

| Category         | Mine          | Incumbent | Winner |
| ---------------- | ------------- | --------- | ------ |
| Efficiency/Issue | **9.95ms**    | 28.16ms   | ✅     |
| Detection        | 80 issues     | 21 issues | ✅     |
| False Positives  | **0**         | 4         | ✅     |
| Precision        | **100%**      | 84%       | ✅     |
| Total Rules      | 89            | 14        | ✅     |
| OWASP Coverage   | 20/20         | ~3/20     | ✅     |
| Documentation    | Comprehensive | Basic     | ✅     |
| Fix Suggestions  | 3-6 per rule  | 0         | ✅     |
| LLM Optimization | ⭐⭐⭐⭐⭐    | ⭐⭐      | ✅     |

**Key takeaways:**

1. Raw speed is meaningless if you're missing vulnerabilities
2. False positives erode trust and cause alert fatigue
3. 100% precision is achievable with smarter AST analysis
4. 6x more rules (89 vs 14) covering web, mobile, API, and AI security
5. Every rule includes CWE/OWASP references, CVSS scores, and 3-6 fix suggestions

---

## Try It

```bash
npm install eslint-plugin-secure-coding --save-dev
```

The benchmark code is open source if you want to verify these results yourself.

---

[eslint-plugin-secure-coding on npm](https://www.npmjs.com/package/eslint-plugin-secure-coding)

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)
