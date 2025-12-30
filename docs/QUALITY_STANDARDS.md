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

#### Core Security Plugins

| Plugin                        | Scope                       | Examples                                       | ❌ NOT Allowed        |
| ----------------------------- | --------------------------- | ---------------------------------------------- | --------------------- |
| `eslint-plugin-secure-coding` | Framework-agnostic security | `no-sql-injection`, `no-hardcoded-credentials` | SDK-specific patterns |
| `eslint-plugin-crypto`        | Cryptographic operations    | `no-weak-cipher`, `require-random-iv`          | JWT handling          |
| `eslint-plugin-jwt`           | JWT token handling          | `no-algorithm-none`, `require-expiration`      | Generic crypto        |

#### Framework-Specific Plugins

| Plugin                           | Scope              | Examples                                         | ❌ NOT Allowed   |
| -------------------------------- | ------------------ | ------------------------------------------------ | ---------------- |
| `eslint-plugin-express-security` | Express.js         | `require-helmet`, `no-cors-credentials-wildcard` | NestJS, Lambda   |
| `eslint-plugin-nestjs-security`  | NestJS framework   | `require-guards`, `require-throttler`            | Express, Lambda  |
| `eslint-plugin-lambda-security`  | AWS Lambda & Middy | `no-exposed-secrets`, `require-input-validation` | Express, NestJS  |
| `eslint-plugin-browser-security` | Browser APIs & DOM | `no-innerhtml`, `require-postmessage-origin`     | Node.js patterns |

#### Database-Specific Plugins

| Plugin             | Scope                      | Examples                                   | ❌ NOT Allowed      |
| ------------------ | -------------------------- | ------------------------------------------ | ------------------- |
| `eslint-plugin-pg` | PostgreSQL (node-postgres) | `no-sql-injection`, `require-pool-release` | Generic SQL drivers |

#### AI Provider-Specific Plugins

| Plugin                             | Scope            | Examples                                    | ❌ NOT Allowed         |
| ---------------------------------- | ---------------- | ------------------------------------------- | ---------------------- |
| `eslint-plugin-vercel-ai-security` | Vercel AI SDK    | `require-max-tokens`, `require-rate-limit`  | OpenAI, Anthropic SDKs |
| `eslint-plugin-openai-security`    | OpenAI SDK       | `no-raw-api-key`, `require-moderation`      | Vercel, Anthropic SDKs |
| `eslint-plugin-anthropic-security` | Anthropic SDK    | `require-max-tokens`, `no-hardcoded-key`    | Vercel, OpenAI SDKs    |
| `eslint-plugin-google-ai-security` | Google AI SDK    | `require-safety-settings`, `no-raw-api-key` | Other AI SDKs          |
| `eslint-plugin-agentic-security`   | Agentic patterns | `require-tool-confirmation`, `no-auto-exec` | SDK-specific impl      |

#### Utility Plugins

| Plugin                        | Scope                  | Examples                                    | ❌ NOT Allowed  |
| ----------------------------- | ---------------------- | ------------------------------------------- | --------------- |
| `eslint-plugin-import-next`   | Import optimization    | `no-circular-deps`, `no-deprecated-imports` | Security rules  |
| `eslint-plugin-react-a11y`    | React accessibility    | `require-alt-text`, `require-aria-labels`   | Security rules  |
| `eslint-plugin-llm-optimized` | LLM message formatting | Message clarity standards                   | Detection logic |

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

| Metric     | Minimum | Target | Blocking? |
| ---------- | ------- | ------ | :-------: |
| Lines      | 90%     | 95%+   |    ✅     |
| Branches   | 75%     | 85%+   |    ⚠️     |
| Functions  | 95%     | 100%   |    ✅     |
| Statements | 90%     | 95%+   |    ✅     |

### Verification Command

```bash
# Check coverage for a specific plugin
nx run eslint-plugin-X:test --coverage

# Check coverage for a specific rule
nx run eslint-plugin-X:test --coverage -- --testPathPattern="rule-name"

# Generate coverage report for Codecov
nx run-many -t test --coverage --projects='eslint-plugin-*'
```

### Required Edge Cases (per rule)

Every rule MUST have tests covering:

| Category                | Example Tests                         | Required |
| ----------------------- | ------------------------------------- | :------: |
| **Happy Path**          | Basic valid/invalid detection         |    ✅    |
| **Boundary Conditions** | Empty strings, null values, undefined |    ✅    |
| **Nested Structures**   | Deeply nested callbacks, promises     |    ✅    |
| **ES Module Variants**  | CommonJS `require()` vs ESM `import`  |    ✅    |
| **Template Literals**   | Tagged templates, multiline strings   |    ✅    |
| **Destructuring**       | Object/array destructuring patterns   |    ⚠️    |
| **Spread Operators**    | `...args`, `...config` patterns       |    ⚠️    |
| **Options Handling**    | All option combinations               |    ✅    |
| **Auto-Fix Output**     | Verify fix produces valid code        |    ✅    |

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

### c8/v8 Ignore Best Practices

Use coverage ignore comments **only** for structurally untestable code:

```typescript
// ✅ CORRECT: Safety checker that requires JSDoc context
/* c8 ignore start -- safetyChecker.isSafe requires JSDoc @safe annotation not testable via RuleTester */
if (safetyChecker.isSafe(node, context)) {
  return;
}
/* c8 ignore stop */

// ✅ CORRECT: File system operation
/* c8 ignore next -- requires actual filesystem access */
if (fs.existsSync(lockFilePath)) return;

// ❌ WRONG: No explanation
/* c8 ignore next */
return defaultValue;

// ❌ WRONG: Testable code that just needs more test cases
/* c8 ignore start */
if (options.strictMode) {
  // ← This IS testable!
  // ...
}
/* c8 ignore stop */
```

### c8 Ignore Decision Tree

```
Is the code covered?
├── YES → No action needed
└── NO → Can the code be tested via RuleTester?
    ├── YES → Add missing test cases
    └── NO → Why not?
        ├── JSDoc/annotation requirement → ✅ Use c8 ignore with explanation
        ├── File system access → ✅ Use c8 ignore with explanation
        ├── Runtime-only condition → ✅ Use c8 ignore with explanation
        └── Dead code / unreachable → ❌ REMOVE the code
```

> **Reference**: See [RULETESTER-COVERAGE-LIMITATIONS.md](./RULETESTER-COVERAGE-LIMITATIONS.md) for detailed patterns.

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

| File              | Purpose              | Required | Must Include                                   |
| ----------------- | -------------------- | :------: | ---------------------------------------------- |
| `README.md`       | Plugin overview      |    ✅    | Rules list, install, configs, OWASP coverage   |
| `CHANGELOG.md`    | Version history      |    ✅    | All changes with conventional commit format    |
| `LICENSE`         | Legal                |    ✅    | MIT or chosen license                          |
| `AGENTS.md`       | LLM instructions     |    ✅    | Codebase context for AI assistants (see below) |
| `CONTRIBUTING.md` | Contributor guide    |    ⚠️    | Setup, testing, PR process (can link to root)  |
| `.npmignore`      | Publish optimization |    ✅    | Exclude tests, docs, config files from npm     |
| `docs/rules/`     | Rule documentation   |    ✅    | One `.md` file per rule with examples          |

### README.md Structure (Highly Navigable)

Every README must include cross-plugin navigation for ecosystem discoverability:

```markdown
# eslint-plugin-{name}

Brief description (1-2 sentences)

## Installation

## Quick Start

## Available Rules (with OWASP mapping)

| Rule                                   | Description | OWASP    | Fixable |
| -------------------------------------- | ----------- | -------- | :-----: |
| [rule-name](./docs/rules/rule-name.md) | Description | A03:2021 |   ✅    |

## Configurations (minimal, recommended, strict)

## OWASP Coverage Matrix

## Related Packages

> **Part of the [Forge-JS ESLint Ecosystem](https://github.com/user/eslint)**

| Package                                                             | Description                 |
| ------------------------------------------------------------------- | --------------------------- |
| [eslint-plugin-secure-coding](../eslint-plugin-secure-coding)       | Framework-agnostic security |
| [eslint-plugin-crypto](../eslint-plugin-crypto)                     | Cryptographic security      |
| [eslint-plugin-jwt](../eslint-plugin-jwt)                           | JWT token handling          |
| [eslint-plugin-express-security](../eslint-plugin-express-security) | Express.js framework        |
| [eslint-plugin-nestjs-security](../eslint-plugin-nestjs-security)   | NestJS framework            |
| [eslint-plugin-lambda-security](../eslint-plugin-lambda-security)   | AWS Lambda & Middy          |
| [eslint-plugin-browser-security](../eslint-plugin-browser-security) | Browser APIs & DOM          |
| [eslint-plugin-pg](../eslint-plugin-pg)                             | PostgreSQL security         |

## Contributing
```

### AGENTS.md Structure (Following [agents.md](https://agents.md) Best Practices)

Every plugin MUST have an `AGENTS.md` to enable AI-assisted development:

```markdown
# AGENTS.md

> AI Assistant Instructions for eslint-plugin-{name}

## Overview

Brief description of the plugin's purpose and scope.

## Quick Start

\`\`\`bash

# Setup commands

cd packages/eslint-plugin-{name}
pnpm install
pnpm build
pnpm test
\`\`\`

## Project Structure

\`\`\`
src/
├── index.ts # Plugin entry point
├── rules/ # Rule implementations
│ ├── rule-name/
│ │ └── index.ts
├── utils/ # Shared utilities
└── configs/ # Preset configurations
\`\`\`

## Code Style Guidelines

- Use `AST_NODE_TYPES` from `@typescript-eslint/utils`
- Follow Zero-FP (False Positive) design principles
- All rules must have structured LLM-optimized messages

## Testing Instructions

\`\`\`bash
pnpm test # Run all tests
pnpm test:coverage # With coverage
pnpm test -- --watch # Watch mode
\`\`\`

## Rule Categories

| Category    | Description             | Example Rules      |
| ----------- | ----------------------- | ------------------ |
| Security    | Vulnerability detection | `no-sql-injection` |
| Performance | Resource optimization   | `require-limits`   |

## Common Fix Patterns

- Pattern 1: Description and fix approach
- Pattern 2: Description and fix approach

## Security Considerations

- OWASP mapping for all security rules
- CWE identifiers required
- CVSS scoring where applicable
```

### .npmignore Template

Every plugin MUST have a `.npmignore` to optimize package size:

```gitignore
# Source files (TypeScript)
src/
*.ts
!*.d.ts
tsconfig*.json

# Tests
**/*.test.ts
**/*.spec.ts
__tests__/
coverage/
vitest.config.*

# Documentation (optional - keep docs/rules for intellisense)
# docs/

# Development files
.eslintrc*
eslint.config.*
.prettierrc*
CONTRIBUTING.md
AGENTS.md

# Build artifacts
.turbo/
*.tsbuildinfo

# IDE
.vscode/
.idea/
```

### CHANGELOG.md Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### Added

- feat: New rule `require-foo` - detects missing foo configuration

### Changed

- refactor: Improved `no-bar` performance by 40%

### Fixed

- fix: False positive in `no-baz` when using template literals

### Security

- security: Updated dependencies to address CVE-XXXX-XXXXX
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
    type: 'problem', // Required: 'problem' | 'suggestion' | 'layout'
    docs: {
      description: 'Concise description', // Required
      recommended: 'error', // Required: 'error' | 'warn' | 'off'
    },
    messages: {
      messageId: 'Clear, actionable message', // Required
    },
    schema: [], // Required: Options schema
  },
});
```

---

## 6. Coverage Limitations Guidelines

> Full documentation: [RULETESTER-COVERAGE-LIMITATIONS.md](./RULETESTER-COVERAGE-LIMITATIONS.md)

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

## 7. Auto-Fix Requirements

> **Core Philosophy**: "Remediation over Detection" - We provide fixes that refactor code, not just flag it.

### Auto-Fix Classification

| Rule Type              | Fix Type     | Example                                                 |
| ---------------------- | ------------ | ------------------------------------------------------- |
| Deprecated API usage   | ✅ `fix`     | `no-deprecated-crypto` → migrate to `crypto.subtle`     |
| Missing config options | ✅ `fix`     | `require-max-tokens` → add `maxTokens: 4096`            |
| Hardcoded values       | ⚠️ `suggest` | `no-hardcoded-key` → replace with `process.env.API_KEY` |
| Architectural issues   | ❌ Manual    | `no-sql-injection` → requires context-specific refactor |
| Security patterns      | ⚠️ `suggest` | `require-csrf-protection` → multiple valid approaches   |

### Fix Quality Criteria

- [ ] Fix compiles without TypeScript errors
- [ ] Fix doesn't introduce new rule violations
- [ ] Fix preserves code semantics (doesn't break logic)
- [ ] Suggestion fixes use `suggest` meta instead of `fix`
- [ ] Complex fixes include inline comments explaining changes

### When to Use `suggest` vs `fix`

```typescript
// ✅ Use `fix` when there's ONE correct solution
meta: {
  fixable: 'code',
},
create(context) {
  return {
    CallExpression(node) {
      context.report({
        fix: (fixer) => fixer.replaceText(node, 'correctCode'),
      });
    },
  };
}

// ⚠️ Use `suggest` when there are MULTIPLE valid solutions
meta: {
  hasSuggestions: true,
},
create(context) {
  return {
    CallExpression(node) {
      context.report({
        suggest: [
          { desc: 'Option A: Use environment variable', fix: ... },
          { desc: 'Option B: Use secrets manager', fix: ... },
        ],
      });
    },
  };
}
```

---

## 8. OWASP Version Alignment

### Active OWASP Standards

| Domain              | OWASP Version                    | Reference                                                        |
| ------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Web Applications    | OWASP Top 10 (2021)              | [owasp.org/Top10](https://owasp.org/Top10/)                      |
| APIs                | OWASP API Security Top 10 (2023) | [owasp.org/API-Security](https://owasp.org/API-Security/)        |
| Mobile Applications | OWASP Mobile Top 10 (2024)       | [owasp.org/Mobile](https://owasp.org/www-project-mobile-top-10/) |
| LLM Applications    | OWASP LLM Top 10 (2025)          | [llmtop10.com](https://llmtop10.com/)                            |

### Mapping Format

Always include the year in OWASP references:

```typescript
// ✅ Correct - includes year
'@owasp A03:2021 Injection';

// ❌ Incorrect - missing year
'@owasp A03 Injection';
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
- [ ] Fixable rule without working auto-fix

### Non-Blocking Issues (fix in follow-up)

- [ ] Coverage 90-95% (could be higher)
- [ ] Minor documentation gaps
- [ ] Code style nitpicks
- [ ] Missing `suggest` alternatives

---

## Related Documentation

- [Plugin Review Workflow](./PLUGIN-REVIEW-WORKFLOW.md) - Step-by-step review process
- [Contributing Guide](./CONTRIBUTING.md) - Release process and versioning
- [Coverage Limitations](./RULETESTER-COVERAGE-LIMITATIONS.md) - c8 ignore patterns
- [CI/CD Pipeline](./CICD.md) - Automated quality gates
