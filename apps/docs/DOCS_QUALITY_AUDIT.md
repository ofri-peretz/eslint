# Documentation Quality Audit

> **Created:** January 6, 2026  
> **Priority:** HIGH - Blocks production deployment

## Critical Issues Summary

| Issue                        | Count    | Status     |
| ---------------------------- | -------- | ---------- |
| CWE-000 placeholders         | 66 rules | ✅ Fixed   |
| Placeholder examples         | 33 rules | ⚠️ Pending |
| Missing error message format | Many     | ⚠️ Pending |
| Wrong GitHub links           | 110 refs | ✅ Fixed   |
| Missing FN documentation     | Variable | ⚠️ Pending |

---

## Required Documentation Sections

Every rule documentation file MUST contain:

### 1. Quick Summary Table

```markdown
| Aspect            | Details                        |
| ----------------- | ------------------------------ |
| **CWE Reference** | [CWE-XX](link)                 |
| **Severity**      | Critical/High/Medium/Low       |
| **Auto-Fix**      | ✅ Yes / ⚠️ Suggests / ❌ No   |
| **Category**      | Security / Performance / Style |
```

### 2. Examples Section

```markdown
## Examples

### ❌ Incorrect

\`\`\`javascript
// Real vulnerable code example
const query = `SELECT * FROM users WHERE id = ${userId}`;
\`\`\`

### ✅ Correct

\`\`\`javascript
// Real secure code example  
const query = 'SELECT \* FROM users WHERE id = $1';
client.query(query, [userId]);
\`\`\`
```

### 3. Error Message Format

```markdown
## Error Message

When triggered, this rule produces:

\`\`\`
🔒 CWE-89 OWASP:A03 CVSS:9.8 | SQL injection via string concatenation | CRITICAL
Fix: Use parameterized query: client.query('...', [params])
\`\`\`
```

### 4. Known False Negatives

```markdown
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.
\`\`\`typescript
const query = userInput; // Built elsewhere
db.query(query); // ❌ NOT DETECTED
\`\`\`
**Mitigation**: Validate user inputs at the source.
```

### 5. Options (if applicable)

```markdown
## Options

| Option       | Type     | Default | Description  |
| ------------ | -------- | ------- | ------------ |
| `optionName` | `string` | `""`    | What it does |

### Configuration Example

\`\`\`javascript
export default [{
rules: {
'plugin/rule': ['error', { optionName: 'value' }]
}
}];
\`\`\`
```

---

## Reference: Well-Documented Rule

See `packages/eslint-plugin-secure-coding/docs/rules/detect-child-process.md` as the gold standard template.

---

## Fix Commands

```bash
# Find CWE-000 placeholders
grep -r "CWE-000" packages/*/docs/rules/*.md

# Find placeholder examples
grep -r "// Insecure pattern" packages/*/docs/rules/*.md

# Find wrong GitHub links (should be 0 now)
grep -r "import-js/" packages/*/docs/rules/*.md

# Re-sync docs after fixing
pnpm tsx scripts/sync-rule-docs.ts
```

---

## Quality Gates

Before a rule doc is complete, it must have:

- [ ] Valid CWE reference (not CWE-000)
- [ ] Correct OWASP mapping
- [ ] Real ❌ Incorrect code example
- [ ] Real ✅ Correct code example
- [ ] Error message format section
- [ ] Known False Negatives section
- [ ] API-style Options table (if options exist)
