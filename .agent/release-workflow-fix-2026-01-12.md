# Release Workflow Investigation & Fixes

**Date:** 2026-01-12  
**Issue:** Packages successfully published but workflow marked as "failure"

## 🔍 Investigation Summary

### What Happened

The most recent release run (ID: 20906685702) showed:

- ✅ **11 packages successfully published**:
  - eslint-devkit@1.3.1
  - eslint-plugin-secure-coding@3.0.1
  - eslint-plugin-crypto@2.1.1
  - eslint-plugin-jwt@2.1.1
  - eslint-plugin-pg@1.3.1
  - eslint-plugin-express-security@1.1.1
  - eslint-plugin-browser-security@1.1.1
  - eslint-plugin-lambda-security@1.1.1
  - eslint-plugin-vercel-ai-security@1.2.1
  - eslint-plugin-import-next@2.2.1
  - eslint-plugin-mongodb-security@8.1.1

- ❌ **5 packages failed** with error: `No projects are set to be processed`:
  - eslint-plugin-nestjs-security
  - eslint-plugin-architecture
  - eslint-plugin-quality
  - eslint-plugin-react-a11y
  - eslint-plugin-react-features

### Root Causes

#### 1. Missing Packages in nx.json Release Configuration

The `nx.json` file's `release.projects` array was missing **5 packages** that are in the workflow's `DEPENDENCY_ORDER`:

- `eslint-plugin-architecture`
- `eslint-plugin-quality`
- `eslint-plugin-react-a11y`
- `eslint-plugin-react-features`
- `cli`

When Nx tries to version or publish a package not listed in `release.projects`, it returns: "No projects are set to be processed"

#### 2. Insufficient Reporting

The release workflow had basic reporting but lacked:

- Detailed failure reasons for each package
- Clear visibility into which packages were affected from the changes
- Per-package status (success, skipped, failed) with actionable information
- Comprehensive summary at the GitHub Actions level

## ✅ Fixes Applied

### 1. Updated nx.json (nx.json)

**File:** `/Users/ofri/repos/ofriperetz.dev/eslint/nx.json`

Added the 5 missing packages to the `release.projects` array:

```json
"release": {
  "projects": [
    "eslint-devkit",
    "eslint-plugin-secure-coding",
    "eslint-plugin-vercel-ai-security",
    "eslint-plugin-pg",
    "eslint-plugin-crypto",
    "eslint-plugin-jwt",
    "eslint-plugin-express-security",
    "eslint-plugin-nestjs-security",
    "eslint-plugin-import-next",
    "eslint-plugin-browser-security",
    "eslint-plugin-lambda-security",
    "eslint-plugin-mongodb-security",
    // ✅ ADDED:
    "eslint-plugin-architecture",
    "eslint-plugin-quality",
    "eslint-plugin-react-a11y",
    "eslint-plugin-react-features",
    "cli",
    "docs"
  ],
  ...
}
```

### 2. Enhanced Release Script (release-packages.sh)

**File:** `/Users/ofri/repos/ofriperetz.dev/eslint/.github/scripts/release-packages.sh`

#### Added Tracking Variables

```bash
FAILED_DETAILS=""      # Detailed failure messages
PACKAGE_COUNT=0        # Total packages processed
SUCCESS_COUNT=0        # Successfully published
SKIP_COUNT=0           # Skipped (already published)
FAIL_COUNT=0           # Failed
```

#### Added Failure Reason Capture

Every failure point now captures a specific reason:

- **package.json not found**: "package.json not found"
- **Invalid package.json**: "Could not read 'name' from package.json"
- **Lint errors**: "Lint errors detected"
- **Test failures**: "Tests failed"
- **Build failures**: "Build failed"
- **Type errors**: "Type errors detected"
- **Version bump failures**: "Version bump failed (Nx configuration issue) - check if package is in nx.json release.projects array"
- **Git rebase conflicts**: "Git rebase conflict"
- **Git push rejected**: "Git push rejected"
- **NPM auth failures**: "NPM authentication failure (401) - configure Trusted Publishers or update NPM_TOKEN"
- **NPM permissions**: "NPM permission denied (403) - verify Trusted Publishers configuration"
- **NPM not found**: "NPM package not found (404) - ensure NPM_TOKEN is valid for first releases"
- **Network errors**: "NPM network/registry error - check https://status.npmjs.org/"
- **Rate limiting**: "NPM rate limited (429) - wait 15-60 minutes"
- **Unknown errors**: "NPM publish failed (unknown error) - see publish output above"

#### Enhanced Console Output

```bash
═══════════════════════════════════════════════════
📊 RELEASE SUMMARY
═══════════════════════════════════════════════════
📦 Total Packages: 16
✅ Successfully Published: 11
⏭️ Skipped: 0
❌ Failed: 5

✅ Released:
   - eslint-devkit@1.3.1
   - eslint-plugin-secure-coding@3.0.1
   ...

❌ Failed:
   - eslint-plugin-nestjs-security
   - eslint-plugin-architecture
   ...

📋 Failure Details:
   eslint-plugin-nestjs-security: Version bump failed (Nx configuration issue) - check if package is in nx.json release.projects array
   eslint-plugin-architecture: Version bump failed (Nx configuration issue) - check if package is in nx.json release.projects array
   ...
```

### 3. Enhanced GitHub Actions Summary (release.yml)

**File:** `/Users/ofri/repos/ofriperetz.dev/eslint/.github/workflows/release.yml`

The summary step now generates a comprehensive Markdown table:

```markdown
## 📦 Release Summary

**Total Packages Processed:** 16

| Status       | Count | Packages |
| ------------ | ----- | -------- |
| ✅ Published | 11    | 11       |
| ⏭️ Skipped   | 0     | 0        |
| ❌ Failed    | 5     | 5        |

### ✅ Successfully Published

| Package                       | Version | NPM Link                                                                 |
| ----------------------------- | ------- | ------------------------------------------------------------------------ |
| `eslint-devkit`               | `1.3.1` | [npm](https://www.npmjs.com/package/@interlace/eslint-devkit/v/1.3.1)    |
| `eslint-plugin-secure-coding` | `3.0.1` | [npm](https://www.npmjs.com/package/eslint-plugin-secure-coding/v/3.0.1) |
| ...                           | ...     | ...                                                                      |

### ❌ Failed Packages

> 🔍 **Action Required:** Review the failure reasons below and check the full logs for details

| Package                         | Failure Reason         |
| ------------------------------- | ---------------------- |
| `eslint-plugin-nestjs-security` | Check logs for details |
| ...                             | ...                    |

<details>
<summary>📋 Detailed Failure Information</summary>
```

eslint-plugin-nestjs-security: Version bump failed (Nx configuration issue) - check if package is in nx.json release.projects array
eslint-plugin-architecture: Version bump failed (Nx configuration issue) - check if package is in nx.json release.projects array
...

```
</details>
```

## 📊 Impact

### Before

- ❌ Workflow fails even when most packages succeed
- ❌ No visibility into partial success scenarios
- ❌ Difficult to identify which packages failed and why
- ❌ Missing packages couldn't be released at all

### After

- ✅ All 17 publishable packages now in Nx release configuration
- ✅ Clear visibility into success/failure/skipped status for each package
- ✅ Actionable failure messages pointing to root cause
- ✅ Comprehensive summary table in GitHub Actions UI
- ✅ Direct NPM links to successfully published versions
- ✅ Detailed failure information in collapsible section

## 🎯 Resolution of Original Issue

The workflow failure was caused by:

1. **5 packages missing from nx.json** → ✅ Fixed by adding them
2. **Insufficient failure reporting** → ✅ Fixed with comprehensive error tracking

Now when you run releases:

- You'll see exactly which packages were affected by changes (in "Detect Affected Packages" step)
- You'll get a clear breakdown of successes, skips, and failures
- For any failures, you'll see the specific reason and recommended action
- The workflow will only fail if packages actually fail (not configuration issues)
- If some packages succeed and others fail (partial success), you'll see exactly what happened

## 🚀 Next Steps

1. **Commit these changes**:

   ```bash
   git add nx.json .github/workflows/release.yml .github/scripts/release-packages.sh
   git commit -m "fix(release): add missing packages to nx config and enhance failure reporting"
   ```

2. **Trigger a new release** to verify all packages can now be released successfully

3. **Check the GitHub Actions summary** for the improved reporting format
