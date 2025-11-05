# Codecov Integration Setup Guide

## 🎯 Overview

This project uses **Codecov** for automated code coverage tracking and analysis. Coverage reports are automatically uploaded from CI/CD pipelines to provide:

- 📊 Real-time coverage metrics on every PR
- 🔄 Historical coverage trends
- 📈 Diff coverage (impact of new code)
- 🎯 PR comments with coverage summaries
- 📝 Integration with GitHub PR reviews

## ⚡ Quick Setup (5 minutes)

### Step 1: Sign up for Codecov

1. Visit [https://codecov.io/](https://codecov.io/)
2. Click "Sign up with GitHub"
3. Authorize the Codecov app on your GitHub account

### Step 2: Get Your Token

1. Go to [https://codecov.io/account/integration/github](https://codecov.io/account/integration/github)
2. Locate your repository in the list
3. Copy the **Repository Upload Token**

### Step 3: Add GitHub Secret

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. **Name:** `CODECOV_TOKEN`
4. **Value:** Paste the token from Step 2
5. Click "Add secret"

### Step 4: Done! ✅

The next time you push to a PR or merge to main, coverage reports will automatically upload to Codecov.

---

## 📊 What Happens Next

### On Every PR

```
1. Tests run in CI
   ↓
2. Coverage data collected
   ↓
3. Codecov receives report (parallel with other steps)
   ↓
4. Codecov comments on PR with:
   - Overall coverage %
   - Files affected
   - Coverage changes vs main
```

### PR Comment Example

```
📊 Coverage Report

Coverage: 85.2% (+2.1% vs main)

Files Coverage:
- src/core/engine.ts: 92% (+5%)
- src/utils/helpers.ts: 78% (-1%)
- src/api/client.ts: 88% (no change)

💡 Tip: Click the report link to see detailed diff coverage
```

---

## 🔍 Viewing Your Coverage

### Option 1: Codecov Dashboard

Navigate to: `https://codecov.io/gh/YOUR_ORG/forge-js`

Features:
- 📈 Historical coverage graphs
- 📊 Per-file coverage breakdown
- 🔄 Coverage trends over time
- 📋 Commit-by-commit analysis

### Option 2: GitHub PR Comments

Codecov automatically comments on every PR with:
- Coverage summary
- Changed files impact
- Link to full report

### Option 3: GitHub Status Checks

Coverage appears in PR status checks:
- ✅ Coverage check passed
- ⚠️ Coverage decreased
- ❌ Coverage below threshold

---

## 📝 Adding a Badge to README

Add this markdown to your `README.md` to display coverage badge:

```markdown
[![codecov](https://codecov.io/gh/YOUR_ORG/forge-js/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/forge-js)
```

Replace `YOUR_ORG` with your GitHub organization name.

---

## 🛠️ Workflow Configuration

### CI Workflow (`ci.yml`)

Codecov upload runs **in parallel** with cache diagnostics:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
  continue-on-error: true
```

**Timing:** ~2-5 seconds (doesn't block CI)

### Check Coverage Workflow (`check-coverage.yml`)

Codecov upload runs **in parallel** with PR comments:

```yaml
- name: 📤 Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/coverage-final.json,packages/*/coverage/coverage-final.json,apps/*/coverage/coverage-final.json
    flags: pr-checks
    name: codecov-pr-coverage
    fail_ci_if_error: false
    verbose: true
  continue-on-error: true
```

**Timing:** ~3-7 seconds (parallel with comments)

---

## 🎯 Configuration Options

| Option | Value | Purpose |
|--------|-------|---------|
| `token` | `${{ secrets.CODECOV_TOKEN }}` | Authentication |
| `files` | Coverage file paths | What to upload |
| `flags` | `unittests`, `pr-checks` | Categorize reports |
| `fail_ci_if_error` | `false` | Don't block CI on Codecov errors |
| `continue-on-error` | `true` | Graceful failure handling |
| `verbose` | `true` (check-coverage only) | Detailed logging for debugging |

---

## 🚀 Advanced Features (Optional)

### Codecov Pro

Codecov offers a free tier for open-source projects. Pro features include:

- 🎯 Coverage goals and thresholds
- 📧 Email notifications
- 🔍 Advanced filtering
- 🤖 AI-powered analysis

### Custom Thresholds

You can configure Codecov to enforce coverage thresholds in the Codecov dashboard:

1. Go to your repository settings on Codecov
2. Set minimum coverage requirements
3. Codecov will fail checks if thresholds aren't met

### Merge Blocking

Enable "Require status checks to pass before merging":

1. Go to GitHub repo → Settings → Branches
2. Select the main branch
3. Enable "Require status checks to pass"
4. Select "Codecov" checks
5. Now PRs can't be merged without passing coverage checks

---

## 📊 Coverage Report Format

### What Codecov Expects

Codecov requires **coverage reports in JSON format** (specifically `coverage-final.json` from Vitest):

```json
{
  "coverage": {
    "/path/to/file.ts": {
      "path": "/path/to/file.ts",
      "statementMap": { "1": { "start": {...}, "end": {...} } },
      "fnMap": { "1": { "name": "function", "decl": {...} } },
      "branchMap": { "1": { "type": "if", "locations": [...] } },
      "s": { "1": 5 },      // # times statement executed
      "f": { "1": 2 },      // # times function called
      "b": { "1": [5, 3] }  // branch counts
    }
  }
}
```

### Your Vitest Configuration

Your project uses **v8 coverage provider** with correct reporters:

```typescript
// packages/eslint-plugin/vitest.config.mts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  //                  ↑ Generates coverage-final.json ✅
  exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
}
```

**Why this works:**
- ✅ `json` reporter creates `coverage-final.json`
- ✅ v8 provider is production-ready
- ✅ Excludes test files and build artifacts

---

## 🏢 Monorepo Coverage Configuration

### Your Monorepo Structure

```
forge-js (monorepo)
├── packages/
│   ├── eslint-plugin/
│   │   └── coverage/coverage-final.json    ← Package 1
│   ├── cli/
│   │   └── coverage/coverage-final.json    ← Package 2
│   └── eslint-plugin-utils/
│       └── coverage/coverage-final.json    ← Package 3
└── apps/
    └── playground/
        └── coverage/coverage-final.json    ← App
```

### Challenge: Multiple Coverage Reports

**Problem:** Each package generates its own coverage report
- `packages/eslint-plugin/coverage/coverage-final.json`
- `packages/cli/coverage/coverage-final.json`
- `packages/eslint-plugin-utils/coverage/coverage-final.json`
- `apps/playground/coverage/coverage-final.json`

**Solution:** Upload all reports to Codecov using glob patterns

### Configuration in ci.yml

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: >-
      ./packages/*/coverage/coverage-final.json,
      ./apps/*/coverage/coverage-final.json
    flags: ${{ github.event_name == 'pull_request' && 'pr' || 'main' }}
    name: codecov-${{ github.event_name == 'pull_request' && 'pr' || 'main' }}
    fail_ci_if_error: false
  continue-on-error: true
```

### How It Works

1. **Test runs across all packages:**
   ```bash
   pnpm nx run-many -t test --all --coverage
   ```

2. **Vitest generates per-package reports:**
   ```
   packages/eslint-plugin/coverage/coverage-final.json
   packages/cli/coverage/coverage-final.json
   packages/eslint-plugin-utils/coverage/coverage-final.json
   apps/playground/coverage/coverage-final.json
   ```

3. **Codecov action collects all files:**
   ```yaml
   files: >-
     ./packages/*/coverage/coverage-final.json,
     ./apps/*/coverage/coverage-final.json
   ```

4. **Codecov merges and analyzes:**
   - Combines all reports
   - Creates unified dashboard
   - Shows per-file breakdowns
   - Tracks trends

---

## 📈 Codecov Dashboard for Monorepo

### What You'll See

**Overall Coverage:**
```
Repository Coverage: 85.2%

By Package:
├── eslint-plugin        92% ✅
├── cli                  78% ⚠️
├── eslint-plugin-utils  88% ✅
└── playground           72% ⚠️
```

**Coverage Details:**
- Line coverage per package
- Branch coverage per package
- Function coverage per package
- Changed file impact (PR only)

### PR Comments Example

Codecov will comment on PRs showing:

```
📊 Coverage Report

Overall: 85.2% (+2.1% from main)

Package Impact:
├── packages/eslint-plugin: 92% (+0.5%)
├── packages/cli: 78% (-1.2%)
├── packages/eslint-plugin-utils: 88% (no change)
└── apps/playground: 72% (+3.8%)

⚠️ cli package decreased coverage by 1.2%
```

---

## 🔧 Monorepo Best Practices

### 1. Flags for Package Separation

Use flags to separate per-package coverage:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./packages/eslint-plugin/coverage/coverage-final.json
    flags: eslint-plugin
    
- name: Upload CLI coverage
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./packages/cli/coverage/coverage-final.json
    flags: cli
    
- name: Upload utils coverage
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./packages/eslint-plugin-utils/coverage/coverage-final.json
    flags: utils
```

**Benefit:** Codecov dashboard shows per-package breakdowns

### 2. Check Coverage Per Package

In `check-coverage.yml`, verify each package meets thresholds:

```bash
for pkg in eslint-plugin cli eslint-plugin-utils; do
  COVERAGE=$(jq '.total.lines.pct' "packages/$pkg/coverage/coverage-summary.json")
  if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "❌ $pkg: Coverage ${COVERAGE}% (< 80%)"
    exit 1
  fi
done
```

### 3. Combined Coverage Report

Generate a merged coverage report locally:

```bash
# Install coverage merger
npm install --save-dev nyc

# Merge all reports
nyc merge packages coverage-merged.json
nyc report --reporter=json --report-dir=.

# Upload merged report
codecov -f coverage-merged.json
```

---

## 📋 Complete Codecov Configuration Summary

| Setting | Value | Purpose |
|---------|-------|---------|
| **Report Format** | `coverage-final.json` | Standard format ✅ |
| **Coverage Provider** | v8 | Industry standard ✅ |
| **Monorepo Upload** | Glob patterns | Collect all packages ✅ |
| **File Pattern** | `packages/*/coverage-final.json` | Match all packages ✅ |
| **Flags** | `pr` or `main` | Track PR vs main ✅ |
| **Error Handling** | `fail_ci_if_error: false` | Don't block on upload errors ✅ |

---

## 🚀 Monorepo Workflow

### When Tests Run

```
pnpm nx run-many -t test --all --coverage
    ↓
NX runs test in each package
    ├─ packages/eslint-plugin
    ├─ packages/cli
    ├─ packages/eslint-plugin-utils
    └─ apps/playground
    ↓
Each generates coverage-final.json
    ├─ packages/eslint-plugin/coverage/coverage-final.json
    ├─ packages/cli/coverage/coverage-final.json
    ├─ packages/eslint-plugin-utils/coverage/coverage-final.json
    └─ apps/playground/coverage/coverage-final.json
    ↓
Codecov action collects all
    ├─ files: ./packages/*/coverage/coverage-final.json
    └─ files: ./apps/*/coverage/coverage-final.json
    ↓
Codecov merges reports
    ↓
Dashboard shows combined coverage
```

---

## 📊 Troubleshooting Monorepo Coverage

### Coverage Files Not Found

**Problem:** Codecov says "No files found"

**Solution:**
1. Verify tests ran: `pnpm nx run-many -t test --coverage`
2. Check files exist: `ls packages/*/coverage/coverage-final.json`
3. Verify path pattern: `./packages/*/coverage/coverage-final.json`

### Some Packages Missing

**Problem:** Only some packages show in Codecov dashboard

**Solution:**
1. Check which packages have tests: `grep -r "test:" packages/*/project.json`
2. Packages without tests: Codecov won't show them
3. Add `passWithNoTests: true` to vitest config

### Coverage Decreased Unexpectedly

**Problem:** PR shows coverage decrease even though you added tests

**Solution:**
1. Check what changed: `git diff origin/main`
2. Verify all packages tested: `pnpm nx run-many -t test --all --coverage`
3. Look at per-package breakdown in Codecov dashboard
4. Find which package has lower coverage

---

## ✅ Monorepo Coverage Checklist

- [ ] ✅ Each package has `vitest.config.mts` with `reporter: ['json']`
- [ ] ✅ ci.yml includes all package patterns: `./packages/*/coverage/coverage-final.json`
- [ ] ✅ check-coverage.yml validates per-package thresholds
- [ ] ✅ Tests run with `--coverage` flag
- [ ] ✅ Coverage files generated at `packages/*/coverage/coverage-final.json`
- [ ] ✅ Codecov token set in environments
- [ ] ✅ PR comments show per-package impact
- [ ] ✅ Dashboard shows all packages
- [ ] ✅ Merge conflicts on coverage branches resolved

---

## 🎯 Codecov Components (Official Integration)

### Overview

**Codecov Components** allow you to isolate and categorize coverage data from your project with virtual filters. According to [Codecov's Components documentation](https://docs.codecov.com/docs/components), components are **particularly useful for monorepos** because:

1. ✅ No need for separate uploads per component (unlike Flags)
2. ✅ Path-based filters defined in `codecov.yml`
3. ✅ Per-component statuses in PR comments
4. ✅ Component-level coverage trends and analytics
5. ✅ Can filter coverage by multiple levels (package, folder, file pattern)

### Key Difference: Components vs Flags

| Aspect | Flags | Components |
|--------|-------|-----------|
| **Upload Required** | Yes, one upload per flag | No, single upload for all |
| **Configuration** | At upload time | In codecov.yml |
| **Monorepo Support** | Requires separate uploads | Works with single upload ✅ |
| **Use Case** | Testing environments (unit, integration) | Package/module boundaries |
| **UI Support** | Full | Growing |

**For your monorepo:** Components are ideal because you upload once and define filters in `codecov.yml`.

### Your Components Setup

Your `codecov.yml` defines these components:

#### 1. **Package-Level Components**

```yaml
# ESLint Plugin (most critical)
- component_id: eslint_plugin
  name: "ESLint Plugin"
  paths:
    - "packages/eslint-plugin/**"
  statuses:
    - type: project
      target: 85    # Require 85% coverage
    - type: patch
      target: 80    # Require 80% on changed code

# CLI (lower coverage, fewer tests)
- component_id: cli
  name: "CLI"
  paths:
    - "packages/cli/**"
  statuses:
    - type: project
      target: 75

# Utils (shared utilities)
- component_id: eslint_plugin_utils
  name: "ESLint Plugin Utils"
  paths:
    - "packages/eslint-plugin-utils/**"
  statuses:
    - type: project
      target: 80

# Playground (demo app, lower priority)
- component_id: playground
  name: "Playground App"
  paths:
    - "apps/playground/**"
  statuses:
    - type: project
      target: 60
```

#### 2. **Feature-Level Components** (Within packages)

```yaml
# Security rules (highest priority)
- component_id: security_rules
  name: "Security Rules"
  paths:
    - "packages/eslint-plugin/src/rules/security/**"
  statuses:
    - type: project
      target: 90    # Security code must have 90% coverage

# Architecture rules
- component_id: architecture_rules
  name: "Architecture Rules"
  paths:
    - "packages/eslint-plugin/src/rules/architecture/**"
  statuses:
    - type: project
      target: 85
```

### How Components Work with Your Monorepo

**Flow:**

```
1. Tests run across monorepo
   pnpm nx run-many -t test --all --coverage
   
2. Each package generates coverage-final.json
   ├─ packages/eslint-plugin/coverage/coverage-final.json
   ├─ packages/cli/coverage/coverage-final.json
   ├─ packages/eslint-plugin-utils/coverage/coverage-final.json
   └─ apps/playground/coverage/coverage-final.json

3. Single upload to Codecov (glob pattern)
   files: ./packages/*/coverage/coverage-final.json

4. Codecov reads codecov.yml
   ├─ Applies path filters
   ├─ Groups by component
   ├─ Creates per-component statuses
   └─ Shows in PR comments

5. PR shows component breakdown
   ✅ ESLint Plugin: 92% (target 85)
   ⚠️ CLI: 74% (target 75) ← Below target
   ✅ Security Rules: 95% (target 90)
   ...and more
```

### What You'll See in PR Comments

With components configured, Codecov will comment on PRs like:

```
📊 Coverage Report

Coverage: 85.2% (+2.1% from main)

📦 Components:
├─ ESLint Plugin: 92% ✅ (target 85%)
├─ CLI: 74% ⚠️ (target 75%, -1%)
├─ ESLint Plugin Utils: 88% ✅ (target 80%)
├─ Playground: 65% ✅ (target 60%)
├─ Security Rules: 95% ✅ (target 90%)
└─ Architecture Rules: 88% ✅ (target 85%)

💡 Action Items:
⚠️ CLI package decreased coverage by 1%
   Consider adding tests for: cli/src/commands/release.ts
```

### Component-Based Status Checks

Codecov creates a status check **per component**:

```
Checks:
✅ codecov/project: 85% coverage
✅ codecov/patch: 82% on changed files
✅ codecov/components/eslint_plugin
✅ codecov/components/cli ← This one might fail if below target
✅ codecov/components/security_rules
... and more per component
```

### Configuration Options Explained

```yaml
component_management:
  default_rules:           # Applied to all components
    statuses:
      - type: project      # Overall coverage
        target: auto       # Use repo default
        branches:
          - "!main"        # Don't require on main
      - type: patch        # Only changed files
        target: auto

  individual_components:   # Per-component overrides
    - component_id: eslint_plugin    # Unique identifier (don't change)
      name: "ESLint Plugin"          # Display name (can change)
      paths:                         # Which files belong to this component
        - "packages/eslint-plugin/**"
      statuses:            # Per-component targets (override defaults)
        - type: project
          target: 85       # This component must have 85% coverage
          branches:
            - "!main"      # Except on main branch
        - type: patch
          target: 80       # Changed code in this component: 80%
```

### Advanced: Cross-Pattern Components

You can create components that span multiple packages:

```yaml
# Example: All security-related code
- component_id: security_all
  name: "All Security Code"
  paths:
    - "packages/eslint-plugin/src/rules/security/**"
    - "packages/cli/src/security/**"
    - "packages/eslint-plugin-utils/src/security/**"
  statuses:
    - type: project
      target: 90
```

### Viewing Components in Codecov Dashboard

1. **PR Comments:** Codecov shows component breakdown
2. **Dashboard:** Filter by component in file browser
3. **Coverage Over Time:** Enable Component Analytics to see trends
   - Go to Codecov settings
   - Click "Enable Component Analytics"
   - Wait for backfill (depends on commit history)
   - View trends over time by component

### Component Analytics

Once enabled, you can:
- 📈 View coverage trends per component
- 📊 Compare components on specific dates
- 🔍 Filter and drill down into components
- 📝 Track which components are improving/declining

### Target Settings Explained

| Setting | Meaning | Your Monorepo |
|---------|---------|---------------|
| `target: 85` | Must have 85% coverage | ESLint Plugin (most critical) |
| `target: 75` | Must have 75% coverage | CLI (lower priority) |
| `type: project` | Overall repository coverage | Repository-wide metric |
| `type: patch` | Only changed files in PR | New code must meet target |
| `branches: ["!main"]` | Don't require on main | Allow merging to main |

### Testing Component Configuration

To verify your components are working:

1. Push a PR that changes code in one package
2. Check PR for component-based comments
3. Verify status checks appear per component
4. Check Codecov dashboard for component filtering

### Best Practices with Components

✅ **DO:**
- Set higher targets for critical code (security)
- Set lower targets for less critical code (playground app)
- Use realistic targets (80-90% for core packages)
- Enable component analytics for historical tracking
- Document why each target exists

❌ **DON'T:**
- Set targets too high (unrealistic 100%)
- Ignore component-specific failures in PRs
- Forget to enable component analytics
- Create too many nested components (keep it simple)

### Reference

- [Official Codecov Components Docs](https://docs.codecov.com/docs/components)
- [Example Components Repo](https://github.com/codecov/example-components)
- [Codecov YAML Configuration](https://docs.codecov.com/docs/codecov-yaml)

---

## ⚠️ Troubleshooting

### Codecov Comment Not Appearing on PR

**Solution:**
1. Verify `CODECOV_TOKEN` is set in GitHub Secrets
2. Check if the secret is accessible to the workflow
3. View workflow logs for errors
4. Try re-running the failed workflow

### Coverage Not Updating

**Solution:**
1. Verify tests are running with `--coverage` flag
2. Check if coverage files are being generated
3. Ensure `coverage-final.json` exists in the expected location
4. Check Codecov dashboard for upload status

### Codecov Service Unreachable

**Solution:**
This shouldn't block your CI because:
- Both workflows have `fail_ci_if_error: false`
- `continue-on-error: true` ensures other steps run
- Check Codecov status at [https://status.codecov.io/](https://status.codecov.io/)

---

## 📚 Documentation

- [Codecov GitHub Action Docs](https://github.com/codecov/codecov-action)
- [Codecov Configuration Options](https://docs.codecov.com/docs/codecov-yaml)
- [Codecov PR Comments](https://docs.codecov.com/docs/pull-request-comments)

---

## 🤝 Support

For issues:

1. Check this guide first
2. Review [Codecov docs](https://docs.codecov.com/)
3. Visit [CI/CD Pipeline documentation](./CI_CD_PIPELINE.md)
4. Open an issue in the repository
