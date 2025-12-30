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
□ FP/FN Prevention - Zero false positives, documented limitations (see §2.1)
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

| Plugin                             | Scope         | Examples                                   | ❌ NOT Allowed |
| ---------------------------------- | ------------- | ------------------------------------------ | -------------- |
| `eslint-plugin-vercel-ai-security` | Vercel AI SDK | `require-max-tokens`, `require-rate-limit` | Other AI SDKs  |

#### Utility Plugins

| Plugin                      | Scope               | Examples                                    | ❌ NOT Allowed |
| --------------------------- | ------------------- | ------------------------------------------- | -------------- |
| `eslint-plugin-import-next` | Import optimization | `no-circular-deps`, `no-deprecated-imports` | Security rules |
| `eslint-plugin-react-a11y`  | React accessibility | `require-alt-text`, `require-aria-labels`   | Security rules |

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

## 2.1 False Positive & False Negative Prevention

> **Zero-FP Philosophy**: Our rules are designed for automated pipelines where noise is the enemy. Every rule MUST be audited for both false positives and false negatives.

### Definitions

| Term                    | Definition                                          | Impact                                          |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------- |
| **False Positive (FP)** | Rule reports an error where no vulnerability exists | Erodes developer trust, leads to rule disabling |
| **False Negative (FN)** | Rule misses an actual vulnerability                 | Security gap, defeats purpose of the rule       |
| **True Positive (TP)**  | Rule correctly identifies a vulnerability           | Desired behavior                                |
| **True Negative (TN)**  | Rule correctly allows safe code                     | Desired behavior                                |

### Required Test Categories

Every rule MUST have explicit tests for:

| Category               | Purpose                                              | Minimum Tests |
| ---------------------- | ---------------------------------------------------- | :-----------: |
| **True Positives**     | Verify rule catches vulnerabilities                  |      5+       |
| **True Negatives**     | Verify rule allows safe patterns                     |      5+       |
| **Known FP Scenarios** | Document and test edge cases that could FP           |      3+       |
| **Known FN Scenarios** | Document patterns rule cannot catch (with rationale) | Document only |

### False Positive Test Patterns

```typescript
// ✅ Test cases that SHOULD NOT trigger the rule (valid code):

ruleTester.run('no-sql-injection', rule, {
  valid: [
    // FP Prevention: Parameterized queries are safe
    { code: `db.query('SELECT * FROM users WHERE id = $1', [userId])` },

    // FP Prevention: Constant strings are safe
    { code: `db.query('SELECT * FROM users WHERE id = 1')` },

    // FP Prevention: Template literals with no interpolation
    { code: 'db.query(`SELECT * FROM users`)' },

    // FP Prevention: Sanitized input (when using DOMPurify, etc.)
    { code: `element.innerHTML = DOMPurify.sanitize(userInput)` },

    // FP Prevention: Test files should be allowed (with option)
    {
      code: `db.query(\`SELECT * FROM users WHERE id = \${id}\`)`,
      filename: 'test/user.test.ts',
      options: [{ allowInTests: true }],
    },
  ],
});
```

### False Negative Awareness

Document what your rule CANNOT catch (static analysis limitations):

```typescript
/**
 * @rule no-sql-injection
 *
 * KNOWN FALSE NEGATIVES (cannot detect statically):
 *
 * 1. Dynamic query building across modules
 *    - Query built in moduleA, executed in moduleB
 *
 * 2. Indirect variable assignment
 *    - let query = safe; query = unsafe; db.query(query);
 *
 * 3. Runtime-determined values
 *    - db.query(config.getQuery()); // Can't know what getQuery returns
 *
 * 4. Obfuscated patterns
 *    - eval('db' + '.query')(userInput);
 */
```

### FP/FN Audit Checklist

Before release, verify each rule against this checklist:

```
□ All common safe patterns tested as `valid` cases
□ Edge cases documented (safe patterns that look dangerous)
□ Known FN scenarios documented in rule JSDoc
□ Rule options exist for legitimate overrides (allowInTests, allowPatterns)
□ Error messages explain WHY code is flagged (helps devs verify FP)
□ Playground demo includes both TP and TN examples
```

### FP/FN Metrics

Track precision for each rule:

| Metric        | Formula                                         |               Target               |
| ------------- | ----------------------------------------------- | :--------------------------------: |
| **Precision** | TP / (TP + FP)                                  |               ≥ 99%                |
| **Recall**    | TP / (TP + FN)                                  | ≥ 95% (document known limitations) |
| **F1 Score**  | 2 × (Precision × Recall) / (Precision + Recall) |               ≥ 97%                |

### Common FP Sources

| Pattern         | Why it FPs                          | Solution                |
| --------------- | ----------------------------------- | ----------------------- |
| Sanitized input | Rule doesn't recognize sanitization | Add sanitizer detection |
| Test files      | Intentionally insecure for testing  | `allowInTests` option   |
| Constants       | Constant strings aren't user input  | Check for literals      |
| Comments/docs   | Code examples in comments           | Exclude string literals |
| Type narrowing  | TypeScript already validated        | Check type annotations  |

### Example: FP-Aware Rule Design

```typescript
export const rule = createRule({
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          // FP Prevention: Allow in test files
          allowInTests: { type: 'boolean', default: false },

          // FP Prevention: Allow specific patterns
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },

          // FP Prevention: Recognize sanitizers
          knownSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: ['DOMPurify.sanitize', 'escape', 'sanitizeHtml'],
          },
        },
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};

    // FP Prevention: Skip test files if configured
    if (options.allowInTests && isTestFile(context.filename)) {
      return {};
    }

    return {
      // Rule logic with FP-aware checks
    };
  },
});
```

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

### 3.1 AST-First Rule Design

> **Principle**: Always prefer AST validation over regex manipulation. AST-based detection is **significantly more performant** and **more reliable** than string/regex parsing.

#### When to Use AST vs Regex

| Scenario                       | Approach | Rationale                                       |
| ------------------------------ | -------- | ----------------------------------------------- |
| **Detecting code patterns**    | ✅ AST   | Nodes provide structured, reliable access       |
| **Auto-fixing code**           | ✅ AST   | Build new code from nodes, not string manip     |
| **Validating imports/exports** | ✅ AST   | ImportDeclaration, ExportDeclaration nodes      |
| **Parsing comment content**    | ⚠️ Regex | Comments don't have AST - regex acceptable here |
| **Matching arbitrary strings** | ⚠️ Regex | User-defined patterns need regex                |
| **Detecting string literals**  | ✅ AST   | Use `Literal` node + type checking              |

#### AST-First Examples

```typescript
// ❌ BAD: Using regex to modify import statement
fix(fixer) {
  const importText = sourceCode.getText(node);
  const fixed = importText
    .replace(/^import\s+type\s*\{/, 'import {')
    .replace(/\{([^}]+)\}/, ...);  // Fragile!
  return fixer.replaceText(node, fixed);
}

// ✅ GOOD: Using AST to build new import
fix(fixer) {
  const specifiersText = namedSpecifiers
    .map((spec) => getSpecifierText(spec))
    .join(', ');
  const sourceText = sourceCode.getText(node.source);
  const newImport = `import { ${specifiersText} } from ${sourceText};`;
  return fixer.replaceText(node, newImport);
}
```

#### Acceptable Regex Use Cases

1. **Comment parsing** (no AST representation):

   ```typescript
   // Comments don't have structured AST - regex is appropriate
   const match = comment.value.match(/webpackChunkName:\s*["']([^"']+)["']/);
   ```

2. **User-configurable patterns**:

   ```typescript
   // Allow users to define their own ignore patterns
   const ignorePatterns = options.ignore || [];
   return ignorePatterns.some((pattern) => new RegExp(pattern).test(source));
   ```

3. **String content validation** (not code structure):
   ```typescript
   // Checking the VALUE of a string, not code structure
   if (/password|secret|key/i.test(node.value)) { ... }
   ```

#### Pre-Commit Review Checklist

```
□ Every regex in the rule - is there an AST alternative?
□ All fixers use AST node manipulation, not string regex
□ Any remaining regex is pre-compiled outside hot paths
□ Regex used only for: comments, user patterns, or string content
```

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

### README.md Structure (Highly Navigable + AEO-Optimized)

Every README must be optimized for both human and AI consumption (Answer Engine Optimization):

#### AEO (Answer Engine Optimization) Requirements

| Element                  | Purpose                    | Example                                                                           |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------- |
| **Concise headline**     | AI can summarize in 1 line | "Feature-based security rules that AI assistants can actually understand and fix" |
| **Structured badges**    | Machine-readable metadata  | npm version, codecov, license badges                                              |
| **FAQ-friendly headers** | LLMs can answer questions  | `## What you get`, `## Quick Start`                                               |
| **Structured tables**    | Parseable rule lists       | CWE, OWASP, CVSS columns                                                          |
| **Code blocks**          | Copy-paste ready           | Complete eslint.config.js examples                                                |
| **Callout boxes**        | Highlight important info   | `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`                                     |

#### Required Badges

Every README must include appropriate badges in the header section. Badges provide machine-readable metadata and quick visual indicators.

| Badge             | Required | When to Include                          | Markdown Template                                                                                                                                                                     |
| ----------------- | :------: | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **npm version**   |    ✅    | Always (after first npm publish)         | `[![npm version](https://img.shields.io/npm/v/{package-name}.svg)](https://www.npmjs.com/package/{package-name})`                                                                     |
| **License**       |    ✅    | Always                                   | `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)`                                                                         |
| **codecov**       |    ✅    | Always (after codecov integration)       | `[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component={component})](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D={component})` |
| **npm downloads** |    ⚠️    | For established packages (>100 weekly)   | `[![npm downloads](https://img.shields.io/npm/dw/{package-name}.svg)](https://www.npmjs.com/package/{package-name})`                                                                  |
| **AI-Native**     |    ⚠️    | For plugins with MCP/agent integration   | `[![AI-Native: Agent Ready](https://img.shields.io/badge/AI--Native-Agent%20Ready-success)](https://eslint.org/docs/latest/use/mcp)`                                                  |
| **TypeScript**    |    ⚠️    | For plugins with full TypeScript support | `[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)`                                                                            |
| **Build Status**  |    ❌    | Only for standalone repos (not monorepo) | `[![Build Status](https://github.com/{org}/{repo}/actions/workflows/ci.yml/badge.svg)](https://github.com/{org}/{repo}/actions)`                                                      |
| **Bundle Size**   |    ❌    | Only for performance-critical packages   | `[![Bundle Size](https://img.shields.io/bundlephobia/minzip/{package-name})](https://bundlephobia.com/package/{package-name})`                                                        |

##### Badge Placement Order

```markdown
# eslint-plugin-{name}

> 🔐 [Concise headline - one sentence describing the plugin]

[![npm version]...] [![License]...] [![codecov]...]
[![npm downloads]...] [![AI-Native]...] <!-- Optional badges on second line -->
```

##### Badge Conditions Explained

- **npm version**: Add after first `npm publish`. Use `0.0.1` placeholder badge until published.
- **codecov**: Add after package is integrated into Codecov components. Use component name matching folder (e.g., `crypto`, `jwt`, `pg`).
- **npm downloads**: Add only when package has established usage (reduces clutter for new packages).
- **AI-Native**: Add for plugins that include `AGENTS.md` and are optimized for MCP/agent consumption.
- **TypeScript**: Add for plugins with full `.d.ts` exports and type-safe configurations.
- **Build Status**: Avoid in monorepos (covered by root CI). Only for standalone repositories.
- **Bundle Size**: Only relevant for frontend-heavy packages where bundle size matters.

#### Required README Sections (in order)

```markdown
# eslint-plugin-{name}

**[Concise value proposition - 1 sentence max]**

[![npm version]...] [![codecov]...] [![License]...]

> [!NOTE]
> [Key announcement or version note if applicable]

---

## 💡 What you get

- **Feature 1:** Brief description
- **LLM-optimized:** Structured messages with CWE + OWASP + fix guidance
- **Standards aligned:** OWASP mapping, CWE tagging

---

## 📊 OWASP Coverage Matrix

| Category     | Description            | Rules              |
| ------------ | ---------------------- | ------------------ |
| **A01:2021** | Broken Access Control  | `rule-1`, `rule-2` |
| **A02:2021** | Cryptographic Failures | `rule-3`, `rule-4` |

---

## 🔐 Rules (with full metadata)

💼 = Set in `recommended` | ⚠️ = Warns | 🔧 = Auto-fixable | 💡 = Suggestions

### Category Name (N rules)

| Rule                                   | CWE    | OWASP | CVSS | Description       | 💼  | 🔧  | 💡  |
| -------------------------------------- | ------ | ----- | ---- | ----------------- | --- | --- | --- |
| [rule-name](./docs/rules/rule-name.md) | CWE-79 | A03   | 6.1  | Brief description | 💼  | 🔧  |     |

---

## 🚀 Quick Start

\`\`\`bash
npm install --save-dev eslint-plugin-{name}
\`\`\`

\`\`\`javascript
// eslint.config.js
import pluginName from 'eslint-plugin-{name}';

export default [
pluginName.configs.recommended,
];
\`\`\`

---

## 📋 Available Presets

| Preset        | Description         |
| ------------- | ------------------- |
| `recommended` | Balanced defaults   |
| `strict`      | All rules as errors |

---

## 🔗 Related Packages

> **Part of the [Interlace ESLint Ecosystem](https://github.com/ofri-peretz/eslint)** — AI-native security plugins with LLM-optimized error messages

| Plugin                                                                                           |                                                                Downloads                                                                 | Description                       | Rules |
| ------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------: | --------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding)           |      [![npm](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://npmjs.com/package/eslint-plugin-secure-coding)      | Universal security (OWASP Top 10) |  89   |
| [`eslint-plugin-crypto`](https://npmjs.com/package/eslint-plugin-crypto)                         |             [![npm](https://img.shields.io/npm/dm/eslint-plugin-crypto.svg)](https://npmjs.com/package/eslint-plugin-crypto)             | Cryptographic security            |  24   |
| [`eslint-plugin-jwt`](https://npmjs.com/package/eslint-plugin-jwt)                               |                [![npm](https://img.shields.io/npm/dm/eslint-plugin-jwt.svg)](https://npmjs.com/package/eslint-plugin-jwt)                | JWT token handling                |  13   |
| [`eslint-plugin-browser-security`](https://npmjs.com/package/eslint-plugin-browser-security)     |   [![npm](https://img.shields.io/npm/dm/eslint-plugin-browser-security.svg)](https://npmjs.com/package/eslint-plugin-browser-security)   | Browser APIs & DOM                |  21   |
| [`eslint-plugin-express-security`](https://npmjs.com/package/eslint-plugin-express-security)     |   [![npm](https://img.shields.io/npm/dm/eslint-plugin-express-security.svg)](https://npmjs.com/package/eslint-plugin-express-security)   | Express.js framework              |   9   |
| [`eslint-plugin-nestjs-security`](https://npmjs.com/package/eslint-plugin-nestjs-security)       |    [![npm](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg)](https://npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS framework                  |   5   |
| [`eslint-plugin-lambda-security`](https://npmjs.com/package/eslint-plugin-lambda-security)       |    [![npm](https://img.shields.io/npm/dm/eslint-plugin-lambda-security.svg)](https://npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda & Middy                |   5   |
| [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg)                                 |                 [![npm](https://img.shields.io/npm/dm/eslint-plugin-pg.svg)](https://npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security               |  13   |
| [`eslint-plugin-vercel-ai-security`](https://npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security.svg)](https://npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK                     |  19   |
| [`eslint-plugin-import-next`](https://npmjs.com/package/eslint-plugin-import-next)               |        [![npm](https://img.shields.io/npm/dm/eslint-plugin-import-next.svg)](https://npmjs.com/package/eslint-plugin-import-next)        | High-performance import linting   |  12   |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
```

#### Rules Table Format (Full Metadata)

Every rules table MUST include:

| Column               | Required | Purpose                         |
| -------------------- | :------: | ------------------------------- |
| **Rule**             |    ✅    | Link to rule documentation      |
| **CWE**              |    ✅    | Common Weakness Enumeration ID  |
| **OWASP**            |    ✅    | OWASP Top 10 category (A01-A10) |
| **CVSS**             |    ⚠️    | Severity score (0.0-10.0)       |
| **Description**      |    ✅    | Brief 1-line description        |
| **💼 (Recommended)** |    ✅    | Shows if in recommended config  |
| **🔧 (Fixable)**     |    ✅    | Shows if auto-fixable           |
| **💡 (Suggestions)** |    ⚠️    | Shows if provides suggestions   |

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

### npm Publishing Requirements

> **CRITICAL**: Every published npm package MUST include `README.md`. A package without a README provides no value to users and damages brand perception.

#### Required Files in Published Package

| File           |     Required     | Purpose                                              |
| -------------- | :--------------: | ---------------------------------------------------- |
| `README.md`    | ✅ **MANDATORY** | Primary documentation shown on npm                   |
| `package.json` |        ✅        | Package metadata                                     |
| `LICENSE`      |        ✅        | Legal requirements                                   |
| `CHANGELOG.md` |        ✅        | Version history                                      |
| `AGENTS.md`    |        ⚠️        | AI assistant instructions (optional but recommended) |
| `*.d.ts`       |        ✅        | TypeScript type definitions                          |
| `*.js`         |        ✅        | Compiled JavaScript                                  |

#### project.json Assets Configuration

Every plugin's `project.json` MUST include README.md in the build assets:

```json
{
  "targets": {
    "build": {
      "options": {
        "assets": [
          "packages/{plugin-name}/README.md", // ← MANDATORY
          "packages/{plugin-name}/LICENSE",
          "packages/{plugin-name}/CHANGELOG.md",
          "packages/{plugin-name}/.npmignore"
        ]
      }
    }
  }
}
```

Alternative glob pattern (also acceptable):

```json
"assets": ["packages/{plugin-name}/*.md", "packages/{plugin-name}/.npmignore"]
```

#### Pre-Publish Verification Checklist

Before running `npm publish`, verify:

```bash
# 1. Build the package
nx run {plugin-name}:build

# 2. Verify README.md exists in dist
ls -la dist/packages/{plugin-name}/README.md

# 3. Check README.md content is not empty
head -20 dist/packages/{plugin-name}/README.md

# 4. Verify all required files exist
ls dist/packages/{plugin-name}/ | grep -E "(README|LICENSE|CHANGELOG|package.json)"
```

#### ❌ BLOCKING: Missing README

If `README.md` is missing from the dist folder:

1. **DO NOT PUBLISH** - npm will show "This package does not have a README"
2. Check `project.json` assets configuration
3. Verify the source `README.md` exists in the package root
4. Run `nx run {plugin-name}:build --skip-nx-cache` to rebuild
5. Verify the file was copied to `dist/packages/{plugin-name}/README.md`

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
