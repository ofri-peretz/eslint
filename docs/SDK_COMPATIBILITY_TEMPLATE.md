# SDK Compatibility Testing Template

This document describes the pattern for implementing SDK compatibility testing for ESLint plugins in the Interlace ecosystem.

## Overview

SDK compatibility testing proactively detects breaking changes in third-party packages (MongoDB, Express, Vercel AI, etc.) that could affect our ESLint rules. This enables:

1. **Early Detection** - Weekly automated checks catch breaking changes before users report issues
2. **LLM-Friendly Reports** - Structured output enables AI-assisted debugging and fixes
3. **Clear Ownership** - One workflow per SDK ecosystem for clear tracking and isolation
4. **Automated Issue Creation** - GitHub Issues with detailed context for each breaking change

---

## File Structure

```
.github/
├── workflows/
│   └── sdk-{technology}.yml        # e.g., sdk-pg.yml, sdk-jwt.yml
│
packages/eslint-plugin-{name}/
└── src/
    └── __compatibility__/
        └── {sdk}-interface.spec.ts  # e.g., pg-interface.spec.ts
```

---

## 1. Create Interface Tests

Create `packages/eslint-plugin-{name}/src/__compatibility__/{sdk}-interface.spec.ts`:

```typescript
/**
 * {SDK Name} Interface Compatibility Tests
 *
 * PURPOSE:
 * Verify that the {sdk} package exports the interfaces our ESLint rules depend on.
 * If any tests fail after an SDK update, it indicates a breaking change.
 *
 * @sdk {package-name}
 * @version-tested {current-version}
 * @last-updated {YYYY-MM-DD}
 */

import { describe, it, expect, beforeAll } from 'vitest';

let sdk: typeof import('{package}');

beforeAll(async () => {
  try {
    sdk = await import('{package}');
  } catch {
    throw new Error(
      '{package} not installed. Run: npm add {package} --save-dev',
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('{SDK} Interface Compatibility', () => {
  describe('Core Exports', () => {
    it('exports {MainClass} class', () => {
      expect(sdk.MainClass).toBeDefined();
      expect(typeof sdk.MainClass).toBe('function');
    });

    it('exports {mainFunction} function', () => {
      expect(sdk.mainFunction).toBeDefined();
      expect(typeof sdk.mainFunction).toBe('function');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // INTERFACES CRITICAL FOR RULES
  // Document which rules depend on each interface
  // ═════════════════════════════════════════════════════════════════════════

  describe('{ClassName} Interface (Rules: rule-name-1, rule-name-2)', () => {
    it('{ClassName}.prototype.{method} exists', () => {
      expect(sdk.ClassName.prototype.method).toBeDefined();
      expect(typeof sdk.ClassName.prototype.method).toBe('function');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PACKAGE METADATA
  // ═════════════════════════════════════════════════════════════════════════

  describe('Package Metadata', () => {
    it('has discoverable version', async () => {
      const pkgPath = require.resolve('{package}/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default,
      );
      expect(pkg.version).toBeDefined();
      console.log(`📦 {package} version: ${pkg.version}`);
    });
  });
});

/**
 * Expected interfaces our rules depend on:
 *
 * - sdk.ClassName (class)
 *   - .prototype.method() -> ReturnType
 *
 * Config options we check for:
 *   - option1: description
 *   - option2: description
 */
```

### Test Design Principles

| Principle                        | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| **Test Existence, Not Behavior** | Only verify that exports exist; don't test SDK functionality |
| **Document Rule Dependencies**   | Comment which rules depend on each interface                 |
| **Group by Feature**             | Organize tests by SDK feature area                           |
| **Handle Missing Packages**      | Use try/catch for optional dependencies                      |
| **Log Versions**                 | Print package versions for debugging                         |

---

## 2. Create GitHub Workflow

Create `.github/workflows/sdk-{technology}.yml`:

```yaml
# ═══════════════════════════════════════════════════════════════════════════════
# SDK Compatibility: {Technology Name}
# ═══════════════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# Proactively detect breaking changes in {packages} that could affect
# eslint-plugin-{name} rules.
#
# MONITORED PACKAGES:
# - {package-1}
# - {package-2}
#
# SCHEDULE: Every Monday at 6 AM UTC
# ═══════════════════════════════════════════════════════════════════════════════

name: "SDK: {Technology Name}"

on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday at 6 AM UTC

  workflow_dispatch:
    inputs:
      create_issue:
        description: "Create GitHub issue on failure"
        type: boolean
        default: true

env:
  NODE_VERSION: "22"
  PNPM_VERSION: "10.18.3"
  PLUGIN_PATH: "packages/eslint-plugin-{name}"
  SDK_PACKAGE: "{primary-package}"

jobs:
  compatibility:
    name: {Technology} Compatibility Test
    runs-on: ubuntu-latest
    timeout-minutes: 10

    outputs:
      test_passed: ${{ steps.test.outputs.passed }}
      sdk_version: ${{ steps.versions.outputs.latest }}

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: ⚙️ Setup npm
        uses: npm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: ⚙️ Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🔍 Get version information
        id: versions
        run: |
          LATEST=$(npm view ${{ env.SDK_PACKAGE }} version)
          echo "latest=$LATEST" >> $GITHUB_OUTPUT
          echo "📦 Latest version: $LATEST"

      - name: 🔄 Install latest SDK version
        run: |
          cd ${{ env.PLUGIN_PATH }}
          npm add ${{ env.SDK_PACKAGE }}@latest --save-dev --ignore-workspace-root-check

      - name: 🧪 Run Interface Compatibility Tests
        id: test
        continue-on-error: true
        run: |
          cd ${{ env.PLUGIN_PATH }}
          mkdir -p .compatibility-results

          set +e
          npm vitest run \
            --reporter=verbose \
            --reporter=json \
            --outputFile=.compatibility-results/test-results.json \
            "src/__compatibility__/**/*.spec.ts" 2>&1 | tee .compatibility-results/test-output.txt

          TEST_EXIT_CODE=$?
          set -e

          if [ $TEST_EXIT_CODE -eq 0 ]; then
            echo "passed=true" >> $GITHUB_OUTPUT
          else
            echo "passed=false" >> $GITHUB_OUTPUT
          fi

      - name: 📝 Generate Compatibility Report
        if: steps.test.outputs.passed == 'false'
        run: |
          # Generate LLM-friendly markdown report
          # ... (see full example in existing workflows)

      - name: 📤 Upload Compatibility Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: {technology}-compatibility-results
          path: ${{ env.PLUGIN_PATH }}/.compatibility-results/
          retention-days: 30

      - name: 📊 Generate Workflow Summary
        if: always()
        run: |
          echo "## 🔬 {Technology} SDK Compatibility Report" >> $GITHUB_STEP_SUMMARY
          # ... summary generation

  create-issue:
    name: Create Issue for Breaking Changes
    needs: compatibility
    runs-on: ubuntu-latest
    if: needs.compatibility.outputs.test_passed == 'false'

    steps:
      - name: 🚨 Create GitHub Issue
        uses: actions/github-script@v7
        with:
          script: |
            // Create issue with sdk-compatibility label
            // ... (see full example in existing workflows)
```

---

## 3. Add SDK as DevDependency (Workspace Root)

Add the SDK package at the **workspace root** (proper monorepo pattern):

```bash
# From workspace root - use -w flag
npm add {package} --save-dev -w
```

This ensures:

- Dependencies are shared across the workspace
- Tests can run from any directory
- Consistent versions across all plugins

---

## 4. Required GitHub Labels

Ensure these labels exist in the repository:

| Label               | Color     | Description                     |
| ------------------- | --------- | ------------------------------- |
| `sdk-compatibility` | `#0E8A16` | SDK compatibility testing       |
| `{technology}`      | `#1D76DB` | Specific to {technology} plugin |
| `maintenance`       | `#FBCA04` | Maintenance task                |
| `breaking-change`   | `#D93F0B` | Breaking change detected        |

---

## Running Locally

```bash
# Run compatibility tests for a specific plugin
cd packages/eslint-plugin-pg
npm vitest run src/__compatibility__/**/*.spec.ts --reporter=verbose

# Install latest SDK and test
npm add pg@latest --save-dev
npm vitest run src/__compatibility__/**/*.spec.ts
```

---

## When Tests Fail

1. **Check the LLM-friendly report** in workflow artifacts
2. **Review SDK changelog** for the tested version
3. **Identify affected rules** using the report's mapping table
4. **Update interface tests** if the change is intentional
5. **Update ESLint rules** if the API has changed
6. **Update peerDependencies** if major version bump required

---

## Current Implementations

| Technology      | Workflow            | Interface Tests               | Status    |
| --------------- | ------------------- | ----------------------------- | --------- |
| PostgreSQL (pg) | `sdk-pg.yml`        | `pg-interface.spec.ts`        | ✅ Active |
| JWT Ecosystem   | `sdk-jwt.yml`       | `jwt-interface.spec.ts`       | ✅ Active |
| Vercel AI       | `sdk-vercel-ai.yml` | `vercel-ai-interface.spec.ts` | ✅ Active |
| Express         | `sdk-express.yml`   | `express-interface.spec.ts`   | ✅ Active |
| NestJS          | `sdk-nestjs.yml`    | `nestjs-interface.spec.ts`    | ✅ Active |
| Lambda/Middy    | `sdk-lambda.yml`    | `lambda-interface.spec.ts`    | ✅ Active |

---

## Future Enhancements

- [ ] Slack/Discord notifications on failure
- [ ] Auto-PR creation with suggested fixes
- [ ] Differential testing (compare old vs new SDK version)
- [ ] Coverage tracking for interface tests
- [ ] Multi-version matrix testing (LTS + Latest)

---

_Last Updated: 2026-01-02_
