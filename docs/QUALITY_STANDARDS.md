# ESLint Rules Quality Standards

> **Purpose**: Production-ready quality checklist for ESLint rules in this monorepo.
>
> **Audience**: LLMs and reviewers performing comprehensive quality reviews before releases.

---

## Quick Reference Checklist

Use this checklist for every rule before release:

```
□ Conceptual Fit - Rule belongs in this plugin (see §1)
□ Test Coverage - 90%+ line coverage (see §2)
□ Rule Complexity - Minimal AST traversal, O(n) or better (see §3)
□ Documentation - Complete README, rule docs, CHANGELOG (see §4)
□ Rule Documentation - Has description, examples, OWASP mapping (see §5)
□ Coverage Limitations - Follows c8 ignore guidelines (see §6)
```

---

## 1. Conceptual Fit & Plugin Separation

### Rule

Each plugin has a specific scope. Rules must NOT leak across boundaries.

### Plugin Scopes

| Plugin                             | Scope                           | Examples                                               | ❌ NOT Allowed               |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `eslint-plugin-secure-coding`      | **Framework-agnostic security** | `no-sql-injection`, `no-hardcoded-credentials`         | SDK-specific patterns        |
| `eslint-plugin-vercel-ai-security` | **Vercel AI SDK only**          | `require-max-tokens`, `require-validated-prompt`       | Generic security rules       |
| `eslint-plugin-openai-security`    | **OpenAI SDK only**             | `no-raw-api-key`, `require-moderation`                 | Vercel AI patterns           |
| `eslint-plugin-agentic-security`   | **Agentic patterns (any SDK)**  | `require-tool-confirmation`, `no-autonomous-execution` | SDK-specific implementations |

### Review Questions

1. **Does this rule detect a pattern specific to ONE SDK?**
   - ✅ Yes → SDK-specific plugin
   - ❌ No → `eslint-plugin-secure-coding`

2. **Does this rule check for function calls from a specific library?**
   - ✅ Yes → SDK-specific plugin
   - ❌ No → `eslint-plugin-secure-coding`

3. **Could this rule apply to vanilla JavaScript/TypeScript?**
   - ✅ Yes → `eslint-plugin-secure-coding`
   - ❌ No → SDK-specific plugin

### ❌ Anti-Pattern Examples

```typescript
// WRONG: This is in eslint-plugin-secure-coding but checks Vercel AI SDK
if (callee.name === 'generateText') {
  // ← SDK-specific!
  // Should be in eslint-plugin-vercel-ai-security
}

// CORRECT: Generic pattern in eslint-plugin-secure-coding
if (node.value.includes('password') || node.value.includes('secret')) {
  // Generic hardcoded credential detection
}
```

---

## 2. Test Coverage Requirements

### Minimum Thresholds

| Metric     | Minimum | Target |
| ---------- | ------- | ------ |
| Lines      | 90%     | 95%+   |
| Branches   | 75%     | 85%+   |
| Functions  | 95%     | 100%   |
| Statements | 90%     | 95%+   |

### Verification Command

```bash
# Check coverage for a specific plugin
pnpm nx test eslint-plugin-secure-coding --coverage

# Check coverage for a specific rule
pnpm nx test eslint-plugin-secure-coding --coverage --testPathPattern="no-sql-injection"
```

### Coverage Review Points

1. **Red flags** (investigate immediately):
   - Lines < 80%
   - Functions < 90%
   - Large blocks of uncovered code

2. **Acceptable gaps** (document with `c8 ignore`):
   - Safety checker early returns (see §6)
   - File system operations
   - Runtime-only conditions

3. **NOT acceptable** (must fix):
   - Main rule logic uncovered
   - Error reporting paths uncovered
   - Option handling uncovered

---

## 3. Rule Complexity & Performance

### DevEx Principle

ESLint runs on **every keystroke** in IDEs. Rules must be FAST.

### Complexity Budget

| Tier         | Complexity | Max Time | Example                             |
| ------------ | ---------- | -------- | ----------------------------------- |
| 🟢 Simple    | O(n)       | <5ms     | Single visitor, direct checks       |
| 🟡 Moderate  | O(n log n) | <20ms    | Scope analysis, type checking       |
| 🔴 Complex   | O(n²)      | <50ms    | Cross-file analysis, deep traversal |
| ⛔ Forbidden | O(n³+)     | N/A      | Nested loops over all nodes         |

### Performance Anti-Patterns

```typescript
// ❌ BAD: Nested traversal - O(n²)
Program() {
  sourceCode.ast.body.forEach(node => {
    sourceCode.ast.body.forEach(otherNode => {  // ← Quadratic!
      // ...
    });
  });
}

// ✅ GOOD: Single pass with caching
const variableMap = new Map();
Program() {
  // Build index once
  sourceCode.ast.body.forEach(node => variableMap.set(node.name, node));
},
Identifier(node) {
  // O(1) lookup
  const definition = variableMap.get(node.name);
}
```

### Review Questions

1. **How many times does this rule traverse the AST?**
   - 1 pass → ✅
   - 2+ passes → ⚠️ Justify
   - Nested loops → ❌ Refactor

2. **Does this rule cache computed values?**
   - ✅ Uses `Map` or `Set` for lookups
   - ❌ Recomputes on every node

3. **Does this rule use expensive operations?**
   - ⚠️ Regex: Pre-compile, avoid in hot paths
   - ⚠️ String.includes: OK, but cache if repeated
   - ❌ JSON.parse in visitor: Never

---

## 4. Documentation Standards

### Required Files per Plugin

| File              | Purpose           | Must Include                                 |
| ----------------- | ----------------- | -------------------------------------------- |
| `README.md`       | Plugin overview   | Rules list, install, configs, OWASP coverage |
| `CHANGELOG.md`    | Version history   | All changes with conventional commit format  |
| `LICENSE`         | Legal             | MIT or chosen license                        |
| `CONTRIBUTING.md` | Contributor guide | Setup, testing, PR process                   |
| `AGENTS.md`       | LLM instructions  | Codebase context for AI assistants           |

### README.md Structure

```markdown
# eslint-plugin-{name}

Brief description (1-2 sentences)

## Installation

## Quick Start

## Available Rules (with OWASP mapping)

## Configurations (minimal, recommended, strict)

## OWASP Coverage Matrix

## Contributing
```

### CHANGELOG.md Format

```markdown
# Changelog

## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### Added

- feat: New rule `require-foo`

### Changed

- refactor: Improved `no-bar` performance

### Fixed

- fix: False positive in `no-baz`
```

---

## 5. Rule Documentation Requirements

### Every Rule Must Have

1. **JSDoc in source file**:

```typescript
/**
 * @description Detects SQL injection vulnerabilities from unsanitized user input
 * @owasp A03:2021 Injection
 * @recommended error
 * @fixable false
 */
```

2. **Markdown documentation** (`docs/rules/{rule-name}.md`):

````markdown
# rule-name

## Description

What this rule detects and why it matters.

## OWASP Mapping

- **OWASP Top 10**: A03:2021 - Injection
- **CWE**: CWE-89 - SQL Injection

## Rule Details

When this rule reports and when it doesn't.

## Examples

### ❌ Incorrect

```js
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
````

### ✅ Correct

```js
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

## Options

Configuration options if any.

## When Not To Use It

Legitimate cases to disable this rule.

````

### Rule Meta Requirements

```typescript
export const rule = createRule({
  name: 'rule-name',
  meta: {
    type: 'problem',  // Required: 'problem' | 'suggestion' | 'layout'
    docs: {
      description: 'Concise description',  // Required
      recommended: 'error',  // Required: 'error' | 'warn' | 'off'
    },
    messages: {
      messageId: 'Clear, actionable message',  // Required
    },
    schema: [],  // Required: Options schema
  },
});
````

---

## 6. Coverage Limitations Guidelines

> Full documentation: [RULETESTER-COVERAGE-LIMITATIONS.md](./packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md)

### When to Use `c8 ignore`

| Pattern                           | Use c8 ignore? | Action                 |
| --------------------------------- | :------------: | ---------------------- |
| Safety checker `isSafe()` returns |       ✅       | Document with reason   |
| File system operations            |       ✅       | Document with reason   |
| Deep scope traversal              |       ⚠️       | Try adding tests first |
| Redundant type narrowing          |       ❌       | Remove the code        |
| Dead code after early return      |       ❌       | Remove the code        |

### Correct c8 ignore Usage

```typescript
/* c8 ignore start -- safetyChecker.isSafe requires JSDoc annotations not testable via RuleTester */
if (safetyChecker.isSafe(node, context)) {
  return;
}
/* c8 ignore stop */
```

### Review Questions

1. **Why is this code uncovered?**
   - Structural limitation → ✅ Use c8 ignore with comment
   - Missing test cases → ❌ Add tests
   - Dead code → ❌ Remove it

2. **Is the c8 ignore comment explained?**
   - ✅ Has `-- reason` suffix
   - ❌ Generic ignore without explanation

---

## Review Workflow for LLMs

When reviewing a rule for release readiness:

### Step 1: Conceptual Fit Check

```
Ask: "Does this rule belong in this plugin?"
Check: No SDK-specific code in eslint-plugin-secure-coding
Check: No generic patterns in SDK-specific plugins
```

### Step 2: Coverage Analysis

```bash
pnpm nx test {plugin-name} --coverage --testPathPattern="{rule-name}"
```

```
Check: Lines ≥ 90%
Check: Functions ≥ 95%
Check: Any c8 ignore has documented reason
```

### Step 3: Performance Review

```
Scan for: Nested loops, repeated AST traversal, uncached regex
Check: Single-pass visitor pattern
Check: Maps/Sets for lookups
```

### Step 4: Documentation Completeness

```
Check: README lists this rule
Check: docs/rules/{rule-name}.md exists and is complete
Check: OWASP mapping present
Check: Examples for ❌ incorrect and ✅ correct
```

### Step 5: Code Quality

```
Check: Clear variable names
Check: Descriptive error messages
Check: Options schema if configurable
Check: TypeScript types (no any)
```

---

## Release Readiness Decision

| Result                | All Checks Pass |  Some Checks Fail  |
| --------------------- | :-------------: | :----------------: |
| **Ready for release** |   ✅ Approve    | ❌ Request changes |

### Blocking Issues (MUST fix before release)

- [ ] Rule in wrong plugin (conceptual mismatch)
- [ ] Coverage < 90% without valid c8 ignore
- [ ] O(n²) or worse complexity
- [ ] Missing rule documentation
- [ ] No OWASP mapping

### Non-Blocking Issues (fix in follow-up)

- [ ] Coverage 90-95% (could be higher)
- [ ] Minor documentation gaps
- [ ] Code style nitpicks
