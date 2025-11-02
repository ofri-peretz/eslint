# LLM-Optimized ESLint Rule Message Format Guide

## 🎯 Objective

Make ESLint rule messages crystal clear and actionable for both developers and LLMs by following a consistent 4-line format.

## ✅ Approved Format (4 Lines)

### Structure

```
Line 1: [Icon] [Vulnerability Type] ([CWE-XXXX]) | [SEVERITY]
Line 2: ❌ Current: [Dangerous code example]
Line 3: ✅ Fix: [Safe alternative with explanation]
Line 4: 📚 [Documentation link]
```

### Example

```
🔒 SQL Injection (CWE-89) | CRITICAL
❌ Current: db.query(`SELECT * FROM users WHERE id = ${userId}`)
✅ Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])
📚 https://owasp.org/www-community/attacks/SQL_Injection
```

## 📊 Optimization Status

### ✅ Already Optimized (5 Rules)

| Rule | Icon | CWE | Lines | Status |
|------|------|-----|-------|--------|
| `detect-non-literal-regexp` | ⚠️ | CWE-400 | 4 | ✅ |
| `no-sql-injection` | 🔒 | CWE-89 | 4 | ✅ |
| `detect-eval-with-expression` | 🔒 | CWE-95 | 4 | ✅ |
| `detect-object-injection` | ⚠️ | CWE-915 | 4 | ✅ |
| `detect-child-process` | ⚠️ | CWE-78 | 4 | ✅ |

### 🔴 Need Optimization (2 Priority)

| Rule | Current Format | Lines | Need |
|------|---|---|---|
| `database-injection` | One-liner verbose | 1 | 4-line format |
| `no-unsafe-dynamic-require` | Generic message | 1 | 4-line format + examples |

### ⏳ Future Optimization (13+ Rules)

- `detect-non-literal-fs-filename`
- `detect-non-literal-regexp`
- `enforce-naming`
- `cognitive-complexity`
- `identical-functions`
- `no-console-log`
- `no-circular-dependencies`
- `no-internal-modules`
- `img-requires-alt`
- `required-attributes`
- `no-deprecated-api`
- `react-class-to-hooks`
- `react-no-inline-functions`

## 🎨 Icon & Color Guide

| Icon | Meaning | CWE Category | Severity |
|------|---------|------|----------|
| 🔒 | Security/Injection | CWE-78, CWE-89, CWE-95, etc. | CRITICAL |
| ⚠️ | ReDoS/Injection Risk | CWE-400, CWE-915 | CRITICAL/HIGH |
| 🚀 | Performance | CWE-1312 | MEDIUM |
| ♿ | Accessibility | WCAG 2.1 | MEDIUM |
| 🔧 | Code Quality | CWE-1126 | MEDIUM |

## 📝 Message Template

```typescript
// BEFORE (Generic)
'Security: Dynamic require() | Risk: CRITICAL | Attack: Arbitrary Code Execution'

// AFTER (LLM-Optimized)
'🔒 Dynamic require() (CWE-95) | CRITICAL\n' +
'❌ Current: require(userPath)\n' +
'✅ Fix: Use whitelist: const modules = {...}; require(modules[key])\n' +
'📚 https://owasp.org/www-community/attacks/Code_Injection'
```

## 🔍 Validation Checklist

For each rule message, verify:

- [ ] **Line 1**: Icon + Vulnerability name + CWE code + Severity (CRITICAL/HIGH/MEDIUM)
- [ ] **Line 2**: Shows DANGEROUS code pattern with ❌ prefix
- [ ] **Line 3**: Shows SAFE alternative with ✅ prefix and brief explanation
- [ ] **Line 4**: Links to authoritative documentation (OWASP, CWE, etc.)
- [ ] **Total lines**: Exactly 4 lines (use `\n` to separate)
- [ ] **Example code**: Real, practical examples developers recognize
- [ ] **Clarity**: Message readable by both humans and LLMs

## 📚 Reference Links

### Security Resources
- https://owasp.org/www-community/attacks/
- https://cwe.mitre.org/data/definitions/

### Code Quality Resources
- https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin/docs/rules

### Accessibility Resources
- https://www.w3.org/WAI/WCAG21/quickref/

## 🚀 Implementation Priority

### Phase 1: Security Rules (Priority)
1. ✅ `database-injection` - CWE-89
2. ✅ `no-unsafe-dynamic-require` - CWE-95

### Phase 2: Quality Rules
3. `enforce-naming` - Code quality
4. `cognitive-complexity` - Maintainability
5. `identical-functions` - DRY principle

### Phase 3: Accessibility & Patterns
6. `img-requires-alt` - WCAG
7. `required-attributes` - WCAG
8-15. Remaining rules

## ✨ Benefits of This Format

✅ **For Developers**
- Quick understanding of the problem
- Clear before/after examples
- Direct link to documentation
- Actionable fix guidance

✅ **For LLMs**
- Structured format for parsing
- Clear separation of concerns
- Example code for training context
- Consistent pattern across rules

✅ **For Maintenance**
- Easy to update with new examples
- Standard format reduces cognitive load
- Consistent with industry standards
- Better searchability

## 🔄 Update Process

For each rule needing optimization:

1. **Identify** current message format
2. **Extract** CWE code and severity
3. **Create** before/after code examples
4. **Find** authoritative documentation
5. **Format** as 4-line message
6. **Test** with both human and LLM review
7. **Deploy** to production

---

**Status**: 5/20 rules optimized (25%)  
**Target**: 20/20 rules optimized (100%)  
**Next Phase**: Optimize database-injection and no-unsafe-dynamic-require
