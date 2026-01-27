# ESLint Plugin Test Coverage Audit Report

**Date**: January 25, 2026  
**Scope**: All 19 active ESLint plugins in the Interlace ecosystem (~412 rules)  
**Objective**: Identify test coverage gaps, FP/FN protection, and RuleTester limitations

---

## Executive Summary

| Metric                                 | Value       |
| -------------------------------------- | ----------- |
| **Total Plugins**                      | 19 active   |
| **Total Rules**                        | ~412        |
| **Plugins with Full Rule-Level Tests** | 11/19 (58%) |
| **Plugins with Interface-Only Tests**  | 6/19 (32%)  |
| **Plugins with Mixed Coverage**        | 2/19 (10%)  |
| **Critical Priority Gaps**             | 3 plugins   |
| **High Priority Gaps**                 | 4 plugins   |

### Verified Coverage Metrics (from test runs)

| Plugin             | Statement  | Branch | Function   | Lines  |
| ------------------ | ---------- | ------ | ---------- | ------ |
| `mongodb-security` | **72.94%** | 69.38% | **34.78%** | 72.61% |
| `react-a11y`       | **54.05%** | 45.81% | **47.09%** | 55.91% |

## ⚠️ **Critical**: Both plugins have <50% function coverage, meaning rule logic is largely untested.

## Test Coverage Analysis by Plugin

### 🟢 FULL COVERAGE (11 Plugins)

These plugins have dedicated test files for each rule:

| Plugin               | Rules | Tests | Coverage | Notes                                           |
| -------------------- | ----- | ----- | -------- | ----------------------------------------------- |
| `secure-coding`      | 27    | 27+1  | ✅ 100%  | Excellent structure with `__tests__/` directory |
| `node-security`      | 30    | 30+1  | ✅ 100%  | All rules have dedicated `.test.ts` files       |
| `browser-security`   | 45    | 45+1  | ✅ 100%  | Complete rule-level testing                     |
| `jwt`                | 13    | 13+2  | ✅ 100%  | Includes utils testing                          |
| `vercel-ai-security` | 19    | 19+1  | ✅ 100%  | Full test coverage                              |
| `lambda-security`    | 14    | 14+1  | ✅ 100%  | All handlers tested                             |
| `express-security`   | 10    | 10+1  | ✅ 100%  | Complete test suite                             |
| `nestjs-security`    | 6     | 6+1   | ✅ 100%  | All rules covered                               |
| `import-next`        | 56    | 56+1  | ✅ 100%  | Extensive tests including integration tests     |
| `react-features`     | 44    | 45+1  | ✅ ~100% | Flat + categorized rules tested                 |
| `pg`                 | 13    | 13+2  | ✅ 100%  | Uses `.spec.ts` pattern in rule folders         |

### 🟡 PARTIAL COVERAGE (2 Plugins)

These plugins have some rule-level tests but significant gaps:

| Plugin             | Rules | Tests | Coverage | Gap                        |
| ------------------ | ----- | ----- | -------- | -------------------------- |
| `react-a11y`       | 37    | 12+1  | ⚠️ 32%   | **25 rules missing tests** |
| `mongodb-security` | 16    | 1+2   | ⚠️ 6%    | **15 rules missing tests** |

### 🔴 INTERFACE-ONLY COVERAGE (6 Plugins)

These plugins have only `index.test.ts` for plugin interface validation, no individual rule tests:

| Plugin            | Rules | Tests | Coverage | Status                                 |
| ----------------- | ----- | ----- | -------- | -------------------------------------- |
| `maintainability` | 8     | 6+1   | ⚠️ 75%   | Plugin interface + some rule tests     |
| `reliability`     | 8     | 7+1   | ⚠️ 88%   | Plugin interface + some rule tests     |
| `operability`     | 6     | 6+1   | ✅ 100%  | Good rule-level coverage               |
| `conventions`     | 9     | 7+1   | ⚠️ 78%   | 2 rules missing tests                  |
| `modularity`      | 5     | 1     | ⚠️ 0%    | **Only interface test, no rule tests** |
| `modernization`   | 3     | 1     | ⚠️ 0%    | **Only interface test, no rule tests** |

---

## Critical Gaps Analysis

### 🚨 CRITICAL PRIORITY (Immediate Action Required)

#### 1. `eslint-plugin-mongodb-security` - 15 Rules Missing Tests

**Risk Level**: HIGH (NoSQL injection, credential exposure)

| Missing Rule                     | CWE      | Risk     |
| -------------------------------- | -------- | -------- |
| `no-operator-injection`          | CWE-943  | Critical |
| `no-unsafe-where`                | CWE-943  | Critical |
| `no-unsafe-regex-query`          | CWE-1333 | High     |
| `no-hardcoded-connection-string` | CWE-798  | High     |
| `no-hardcoded-credentials`       | CWE-798  | High     |
| `require-tls-connection`         | CWE-319  | High     |
| `require-auth-mechanism`         | CWE-287  | High     |
| `require-schema-validation`      | CWE-20   | Medium   |
| `no-select-sensitive-fields`     | CWE-200  | Medium   |
| `no-bypass-middleware`           | CWE-862  | Medium   |
| `no-unsafe-populate`             | CWE-943  | Medium   |
| `no-unbounded-find`              | CWE-400  | Low      |
| `require-projection`             | CWE-200  | Low      |
| `require-lean-queries`           | N/A      | Low      |
| `no-debug-mode-production`       | CWE-489  | Medium   |

**Recommendation**: Create `src/rules/{rule-name}/{rule-name}.test.ts` for each rule.

#### 2. `eslint-plugin-react-a11y` - 25 Rules Missing Tests

**Risk Level**: MEDIUM (Accessibility violations, WCAG compliance)

| Missing Rule                             | WCAG Level | Risk   |
| ---------------------------------------- | ---------- | ------ |
| `anchor-has-content`                     | A          | High   |
| `anchor-is-valid`                        | AA         | Medium |
| `aria-props`                             | A          | High   |
| `aria-role`                              | A          | High   |
| `aria-unsupported-elements`              | A          | High   |
| `autocomplete-valid`                     | AA         | Medium |
| `click-events-have-key-events`           | A          | High   |
| `heading-has-content`                    | A          | High   |
| `html-has-lang`                          | A          | High   |
| `iframe-has-title`                       | A          | High   |
| `interactive-supports-focus`             | A          | High   |
| `label-has-associated-control`           | AA         | Medium |
| `lang`                                   | A          | High   |
| `media-has-caption`                      | AA         | Medium |
| `mouse-events-have-key-events`           | AA         | Medium |
| `no-access-key`                          | AA         | Low    |
| `no-aria-hidden-on-focusable`            | A          | High   |
| `no-autofocus`                           | AA         | Medium |
| `no-distracting-elements`                | A          | High   |
| `no-noninteractive-element-interactions` | A          | High   |
| `no-redundant-roles`                     | AA         | Low    |
| `no-static-element-interactions`         | A          | High   |
| `role-has-required-aria-props`           | A          | High   |
| `scope`                                  | A          | Medium |
| `tabindex-no-positive`                   | AA         | Medium |

**Recommendation**: This is a large gap. Prioritize WCAG Level A rules first.

#### 3. `eslint-plugin-modularity` & `eslint-plugin-modernization` - No Rule Tests

**Risk Level**: LOW (Not published, development stage)

| Plugin          | Missing                                                                                                                                    | Total |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| `modularity`    | `ddd-anemic-domain-model`, `ddd-value-object-immutability`, `enforce-naming`, `enforce-rest-conventions`, `no-external-api-calls-in-utils` | 5     |
| `modernization` | `no-instanceof-array`, `prefer-at`, `prefer-event-target`                                                                                  | 3     |

**Recommendation**: Add tests before publishing.

---

## High Priority Gaps

### 1. `eslint-plugin-conventions` - 2 Rules Missing Tests

| Missing Rule                       | Description                   |
| ---------------------------------- | ----------------------------- |
| `filename-case`                    | Naming convention enforcement |
| `consistent-existence-index-check` | Index check consistency       |

### 2. `eslint-plugin-maintainability` - 2 Rules Missing Tests

| Missing Rule                  | Description                 |
| ----------------------------- | --------------------------- |
| `consistent-function-scoping` | Function scope organization |
| `no-unreadable-iife`          | IIFE readability            |

### 3. `eslint-plugin-reliability` - 1 Rule Missing Test

| Missing Rule       | Description             |
| ------------------ | ----------------------- |
| `no-await-in-loop` | Async loop anti-pattern |

---

## Test Quality Assessment

### Exemplary Test Files (Reference Patterns)

1. **`node-security/detect-eval-with-expression.test.ts`** (417 lines)
   - ✅ Comprehensive valid/invalid cases
   - ✅ Edge case coverage (no arguments, parenthesized eval)
   - ✅ Option testing (allowLiteralStrings, strategy)
   - ✅ Pattern detection coverage (JSON, Math, Template, Object)
   - ✅ Line-specific coverage targeting

2. **`jwt/no-algorithm-confusion.test.ts`** (107 lines)
   - ✅ Clean test organization with describe blocks
   - ✅ Multiple library patterns (jwt.verify, jwtVerify)
   - ✅ Algorithm-specific edge cases

3. **`pg/no-unsafe-query.spec.ts`** (42 lines)
   - ⚠️ Basic coverage
   - ⚠️ Could benefit from more edge cases
   - ⚠️ No option testing

### Test Structure Standards

Based on the best test files, all rule tests should include:

```typescript
describe('rule-name', () => {
  describe('Valid Code', () => {
    // Safe patterns that should NOT trigger errors
  });

  describe('Invalid Code', () => {
    // Patterns that MUST trigger errors
  });

  describe('Edge Cases', () => {
    // Boundary conditions, unusual inputs
  });

  describe('Options', () => {
    // All configurable options tested
  });

  describe('FP Protection - Known False Positives', () => {
    // Documented cases that could trigger false positives
  });

  describe('FN Protection - Known Patterns', () => {
    // Attack patterns that MUST be detected
  });
});
```

---

## RuleTester Limitations

**Important**: ESLint RuleTester cannot test the following scenarios:

| Limitation                    | Description                                               | Workaround                                    |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| **Type Information**          | Rules using TypeScript type info require `projectService` | Use `parserOptions: { projectService: true }` |
| **Multi-File Analysis**       | Cross-file dependencies (imports, circular deps)          | Integration tests with real file systems      |
| **Runtime Behavior**          | Actual execution of code                                  | Not testable via RuleTester                   |
| **Async Operations**          | Rules with async context                                  | Limited async testing support                 |
| **Configuration Inheritance** | Config cascade testing                                    | Manual config testing                         |
| **Auto-Fix Side Effects**     | Fix conflicts with other rules                            | E2E testing required                          |
| **Performance**               | Rule execution time                                       | Benchmark scripts                             |
| **Real Project Context**      | Monorepo structures, workspace configs                    | Integration test suites                       |

### Recommendations for Non-RuleTester Testing

1. **Integration Tests**: `src/rules/__tests__/integration-demo.test.ts` pattern
2. **Benchmark Tests**: `scripts/benchmark-plugin.ts`
3. **Compatibility Tests**: `src/__compatibility__/` pattern (already exists)
4. **Real-World Fixtures**: Test against actual codebases

---

## Recommendations Summary

### Immediate (1-2 days)

1. ⚠️ Add tests for `mongodb-security` critical rules (15 rules)
2. ⚠️ Add tests for `modularity` rules (5 rules, pre-publish requirement)
3. ⚠️ Add tests for `modernization` rules (3 rules, pre-publish requirement)

### Short-term (1 week)

4. Add tests for `react-a11y` WCAG Level A rules (15 rules)
5. Add tests for missing `conventions` rules (2 rules)
6. Add tests for missing `maintainability` rules (2 rules)
7. Add tests for missing `reliability` rules (1 rule)

### Medium-term (2-4 weeks)

8. Add tests for remaining `react-a11y` rules (10 rules)
9. Enhance existing tests with FP/FN sections
10. Add integration test suites for complex rules
11. Create test quality guidelines document

---

## Test File Template

For quick implementation, use this template for missing tests:

```typescript
/**
 * Tests for {rule-name} rule
 * Security: CWE-XXX (Description)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ruleName } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('{rule-name}', () => {
  describe('Valid Code - Safe Patterns', () => {
    ruleTester.run('valid - safe usage', ruleName, {
      valid: [
        // Add safe patterns here
        { code: `// safe code` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Security Violations', () => {
    ruleTester.run('invalid - security issues', ruleName, {
      valid: [],
      invalid: [
        {
          code: `// vulnerable code`,
          errors: [{ messageId: 'errorId' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', ruleName, {
      valid: [
        // Boundary conditions
      ],
      invalid: [
        // Complex patterns
      ],
    });
  });
});
```

---

## Metrics for Success

| Metric                          | Current     | Target       |
| ------------------------------- | ----------- | ------------ |
| Plugins with 100% rule coverage | 58% (11/19) | 100% (19/19) |
| Total rule tests                | ~340        | ~412         |
| Rules with FP/FN sections       | ~5%         | 50%+         |
| Integration test suites         | 2           | 5+           |
| Compatibility tests             | 6           | 19           |

---

_Report generated by Claude for the Interlace ESLint ecosystem_
