# GitHub Workflow Maintenance Checklist

This checklist ensures consistency and best practices when working with GitHub Actions workflows in the forge-js monorepo.

## 🎯 When to Use This Checklist

- ✅ Adding a new GitHub Actions workflow
- ✅ Updating an existing workflow
- ✅ Changing workflow patterns/format (requires updating ALL workflows)
- ✅ Adding new error handling patterns
- ✅ Modifying Nx Cloud integration

---

## 📋 Checklist: Adding a New Workflow

### 1. Workflow Structure

- [ ] **File naming:** Use kebab-case (e.g., `my-new-workflow.yml`)
- [ ] **Location:** Place in `.github/workflows/` directory
- [ ] **Schema:** Include `# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json` at top
- [ ] **Name:** Use descriptive name in `name:` field
- [ ] **Documentation:** Add header comments explaining workflow purpose

### 2. Nx Cloud Integration (If Using Nx Commands)

- [ ] **Configure Nx Cloud step:** Add "🔗 Configure Nx Cloud (Optional)" step with:
  - `continue-on-error: true`
  - Checks for `NX_CLOUD_ACCESS_TOKEN` secret
  - Sets `NX_SKIP_NX_CLOUD=true` in `$GITHUB_ENV` if connection fails
- [ ] **Error handling:** Wrap ALL Nx commands with Nx Cloud error handling pattern
- [ ] **Environment variable:** Add `NX_SKIP_NX_CLOUD: ${{ env.NX_SKIP_NX_CLOUD || 'false' }}` to env section

### 3. Nx Cloud Error Handling Pattern (REQUIRED for all Nx commands)

Every Nx command MUST use this pattern:

```bash
# Function to run command with error handling for Nx Cloud failures
run_command() {
  CMD="pnpm nx <command>"
  
  # First attempt with Nx Cloud (if enabled)
  set +e  # Don't exit on error - we'll handle it
  eval "$CMD" 2>&1 | tee /tmp/command-output.log
  EXIT=${PIPESTATUS[0]}
  set -e  # Re-enable exit on error
  
  # If command failed, check if it's Nx Cloud related
  if [ "$EXIT" -ne 0 ]; then
    # Check for any Nx Cloud related errors
    if grep -qiE "(nx.?cloud|quota|rate limit|429|too many requests|exceeded|connection.*failed|authentication.*failed|unauthorized|NX_CLOUD.*quota|rate.*limit.*exceeded|429.*Too Many Requests)" /tmp/command-output.log; then
      echo ""
      echo "⚠️  Nx Cloud error detected - disabling Nx Cloud and retrying..."
      echo "   Error details:"
      grep -iE "(nx.?cloud|quota|rate limit|429|too many requests|exceeded|connection|authentication|unauthorized|NX_CLOUD)" /tmp/command-output.log | head -5 || true
      echo ""
      echo "NX_SKIP_NX_CLOUD=true" >> $GITHUB_ENV
      export NX_SKIP_NX_CLOUD=true
      
      # Retry without Nx Cloud
      echo "🔄 Retrying without Nx Cloud (using local cache only)..."
      set +e
      eval "$CMD"
      RETRY_EXIT=$?
      set -e
      
      if [ "$RETRY_EXIT" -ne 0 ]; then
        echo "❌ Command failed even without Nx Cloud - this is a real error"
        exit $RETRY_EXIT
      else
        echo "✅ Command succeeded without Nx Cloud"
      fi
    else
      # Not an Nx Cloud error - this is a real error
      echo "❌ Command failed with non-Nx Cloud error - exiting"
      exit $EXIT
    fi
  else
    echo "✅ Command succeeded with Nx Cloud"
  fi
}

run_command

# Cleanup temporary log files
rm -f /tmp/command-output.log 2>/dev/null || true
```

### 4. Error Pattern Matching

- [ ] **Enhanced patterns:** Use comprehensive error detection:
  ```bash
  grep -qiE "(nx.?cloud|quota|rate limit|429|too many requests|exceeded|connection.*failed|authentication.*failed|unauthorized|NX_CLOUD.*quota|rate.*limit.*exceeded|429.*Too Many Requests)"
  ```
- [ ] **Error details:** Include `NX_CLOUD` in error detail grep patterns

### 5. Cleanup

- [ ] **Log files:** Clean up temporary log files at end of step:
  ```bash
  rm -f /tmp/*-output.log 2>/dev/null || true
  ```

### 6. Diagnostics (Optional but Recommended)

- [ ] **Diagnostics step:** Add `if: always()` diagnostics step
- [ ] **Nx Cloud status:** Include Nx Cloud status in diagnostics:
  ```bash
  echo "Nx Cloud status:"
  if [ "${{ env.NX_SKIP_NX_CLOUD }}" == "true" ]; then
    echo "  ⚠️  Nx Cloud disabled (using local cache only)"
  else
    echo "  ✅ Nx Cloud enabled (if token configured)"
  fi
  ```

### 7. Consistency Checks

- [ ] **Node version:** Use `NODE_VERSION: "20"` (or reference from env)
- [ ] **pnpm version:** Use `PNPM_VERSION: "10.18.3"` (or reference from env)
- [ ] **Concurrency:** Set appropriate concurrency group
- [ ] **Permissions:** Set minimal required permissions
- [ ] **Timeout:** Set appropriate timeout for job

---

## 📋 Checklist: Updating an Existing Workflow

### 1. Before Making Changes

- [ ] **Review:** Check if change affects pattern used in other workflows
- [ ] **Impact analysis:** Determine if change requires updating ALL workflows
- [ ] **Documentation:** Update workflow comments if behavior changes

### 2. Nx Cloud Error Handling Updates

If updating Nx Cloud error handling pattern:

- [ ] **Pattern consistency:** Ensure pattern matches all other workflows
- [ ] **Error detection:** Verify enhanced error patterns are used
- [ ] **Cleanup:** Ensure log file cleanup is present
- [ ] **Environment:** Verify `NX_SKIP_NX_CLOUD` env variable is set

### 3. After Making Changes

- [ ] **Test locally:** Validate workflow syntax (if possible)
- [ ] **Review:** Check for consistency with other workflows
- [ ] **Documentation:** Update any related documentation

---

## 📋 Checklist: Format/Pattern Changes (Update ALL Workflows)

**⚠️ CRITICAL:** When changing a pattern used across workflows, you MUST update ALL workflows that use it.

### Workflows to Update

1. [ ] `.github/workflows/lint-pr.yml`
2. [ ] `.github/workflows/ci-pr.yml`
3. [ ] `.github/workflows/release.yml`
4. [ ] `.github/workflows/release-unscoped.yml`

### Common Patterns That Require Global Updates

#### 1. Nx Cloud Error Handling Pattern

**When:** Changing error detection logic, retry behavior, or cleanup

**Checklist:**
- [ ] Update error pattern regex in ALL workflows
- [ ] Update error detail grep patterns in ALL workflows
- [ ] Update cleanup commands in ALL workflows
- [ ] Verify `NX_SKIP_NX_CLOUD` env variable handling in ALL workflows

**Files to update:**
- All workflows with Nx commands

#### 2. Error Pattern Matching

**When:** Adding new error patterns or improving detection

**Checklist:**
- [ ] Update main error detection pattern in ALL workflows
- [ ] Update error detail extraction pattern in ALL workflows
- [ ] Test pattern matches expected error messages

**Current pattern:**
```bash
grep -qiE "(nx.?cloud|quota|rate limit|429|too many requests|exceeded|connection.*failed|authentication.*failed|unauthorized|NX_CLOUD.*quota|rate.*limit.*exceeded|429.*Too Many Requests)"
```

#### 3. Cleanup Patterns

**When:** Changing cleanup behavior or adding new cleanup

**Checklist:**
- [ ] Update cleanup commands in ALL workflows
- [ ] Ensure cleanup happens at end of each step
- [ ] Verify cleanup doesn't interfere with error handling

**Current pattern:**
```bash
# Cleanup temporary log files
rm -f /tmp/*-output.log 2>/dev/null || true
```

#### 4. Diagnostics Format

**When:** Changing diagnostics output format

**Checklist:**
- [ ] Update diagnostics step in ALL workflows
- [ ] Ensure Nx Cloud status is included
- [ ] Verify consistency across workflows

**Current pattern:**
```bash
echo "Nx Cloud status:"
if [ "${{ env.NX_SKIP_NX_CLOUD }}" == "true" ]; then
  echo "  ⚠️  Nx Cloud disabled (using local cache only)"
else
  echo "  ✅ Nx Cloud enabled (if token configured)"
fi
```

#### 5. Environment Variables

**When:** Adding/removing environment variables

**Checklist:**
- [ ] Update env sections in ALL relevant workflows
- [ ] Document variable purpose in comments
- [ ] Verify default values are consistent

---

## 🔍 Verification Steps

After making changes to workflows:

### 1. Syntax Validation

- [ ] **YAML syntax:** Validate YAML syntax (use yaml-language-server)
- [ ] **GitHub Actions:** Check for GitHub Actions syntax errors
- [ ] **Variable references:** Verify all `${{ }}` references are valid

### 2. Consistency Check

- [ ] **Pattern matching:** Verify error patterns match across workflows
- [ ] **Error handling:** Verify error handling logic is consistent
- [ ] **Cleanup:** Verify cleanup patterns match
- [ ] **Diagnostics:** Verify diagnostics format is consistent

### 3. Testing

- [ ] **Dry run:** Test workflow with `workflow_dispatch` if available
- [ ] **Error scenarios:** Test Nx Cloud error handling (if possible)
- [ ] **Success scenarios:** Verify normal execution works

---

## 📝 Standard Patterns Reference

### Nx Cloud Configuration Step

```yaml
- name: 🔗 Configure Nx Cloud (Optional)
  continue-on-error: true
  run: |
    if [ -n "${{ secrets.NX_CLOUD_ACCESS_TOKEN }}" ]; then
      echo "🔗 Connecting to Nx Cloud..."
      if npx nx connect-to-nx-cloud --quiet --no-interactive; then
        echo "✅ Nx Cloud connected successfully"
      else
        echo "⚠️  Nx Cloud connection failed, using local cache only"
        echo "NX_SKIP_NX_CLOUD=true" >> $GITHUB_ENV
      fi
    else
      echo "ℹ️  NX_CLOUD_ACCESS_TOKEN not set, using local cache only"
      echo "NX_SKIP_NX_CLOUD=true" >> $GITHUB_ENV
    fi
  env:
    NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
```

### Nx Cloud Error Detection Pattern

```bash
grep -qiE "(nx.?cloud|quota|rate limit|429|too many requests|exceeded|connection.*failed|authentication.*failed|unauthorized|NX_CLOUD.*quota|rate.*limit.*exceeded|429.*Too Many Requests)"
```

### Environment Variable Pattern

```yaml
env:
  # Skip Nx Cloud if connection failed or token not set (falls back to local cache)
  NX_SKIP_NX_CLOUD: ${{ env.NX_SKIP_NX_CLOUD || 'false' }}
```

### Cleanup Pattern

```bash
# Cleanup temporary log files
rm -f /tmp/*-output.log 2>/dev/null || true
```

---

## ⚠️ Common Mistakes to Avoid

1. **❌ Forgetting to add Nx Cloud error handling** to new Nx commands
2. **❌ Inconsistent error patterns** across workflows
3. **❌ Missing cleanup** of temporary log files
4. **❌ Not updating ALL workflows** when changing patterns
5. **❌ Missing `NX_SKIP_NX_CLOUD` env variable** in steps
6. **❌ Forgetting diagnostics** for troubleshooting
7. **❌ Inconsistent naming** of log files (`/tmp/*-output.log`)

---

## 📚 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nx Cloud Documentation](https://nx.dev/ci/intro/ci-with-nx)
- [Workflow Files](../.github/workflows/)

---

## 🎯 Quick Reference: All Workflows

| Workflow | Purpose | Nx Commands | Nx Cloud Handling |
|----------|---------|-------------|-------------------|
| `lint-pr.yml` | Lint on PR | `nx affected -t lint` | ✅ Required |
| `ci-pr.yml` | Full CI on PR | `nx affected -t test/build` | ✅ Required |
| `release.yml` | Release scoped packages | `nx release version/publish` | ✅ Required |
| `release-unscoped.yml` | Release unscoped packages | `nx release version/publish` | ✅ Required |

**Rule:** If a workflow uses ANY Nx command, it MUST have Nx Cloud error handling.

