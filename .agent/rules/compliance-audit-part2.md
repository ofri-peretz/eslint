---
title: Rule Documentation Compliance Audit - Part 2
description: Code examples and False Negative standards.
---

# Rule Documentation Compliance Audit Standard - Part 2

## Known False Negatives (Critical Requirement)

All rules must document static analysis limitations to ensure transparency.

### Standard Format:

### [Pattern Category]

**Why**: [Explanation]

```typescript
// ❌ NOT DETECTED - [explanation]
[code example]
```

**Mitigation**: [Guidance]

### Common Patterns to Document:

- Values from variables or imported constants.
- Dynamic/computed property access.
- Wrapper functions or complex middleware.
- Environment variables (content unknown until runtime).

---

## Code Example Standards

### ❌ Incorrect Examples

- Must use TypeScript syntax highlighting.
- Must include inline comments explaining the vulnerability.
- Minimal, focused code snippets.

### ✅ Correct Examples

- Must demonstrate the secure alternative.
- Must include inline comments explaining the fix.

---

## Style & Formatting

### Emoji Standard

- 🔴 CRITICAL (CVSS 9.0-10.0)
- 🟠 HIGH (CVSS 7.0-8.9)
- 🟡 MEDIUM (CVSS 4.0-6.9)
- 🟢 LOW (CVSS 0.1-3.9)
- 📊 Rule Details
- ❌ Incorrect / ✅ Correct
- ⚙️ Options / 🛡️ Why This Matters

### Link Standard

- CWE: `https://cwe.mitre.org/data/definitions/XXX.html`
- Internal: Relative paths `./rule-name.md`
