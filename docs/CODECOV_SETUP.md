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
