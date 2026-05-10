# 🔐 NPM Trusted Publishing Setup Guide

## Overview

**Trusted Publishing** (OIDC) is NPM's recommended way to authenticate in CI/CD pipelines. It's more secure than storing NPM tokens as secrets.

### ✅ Benefits Over NPM Tokens

| Feature | NPM Token | Trusted Publishing |
|---------|-----------|-------------------|
| **Secret Storage** | Required (security risk) | ❌ Not needed |
| **Token Expiration** | Manual rotation | ✅ Auto-renewed |
| **Leak Risk** | High (static token) | ✅ Low (one-time tokens) |
| **Setup** | Simple | Medium |
| **Maintenance** | High (token refresh) | Low (zero) |
| **NPM Recommendation** | ⚠️ Legacy | ✅ Recommended |

---

## 🚀 Setup Instructions

### Step 1: Verify Your Package on NPM

Trusted Publishing requires your packages to be properly configured on npmjs.com:

1. Go to https://npmjs.com
2. Login to your account
3. Verify you own/maintain the published `@interlace/*` scope and the unscoped `eslint-plugin-*` packages — see the full list in [`packages/`](../packages/).

### Step 2: Configure Trusted Publishing on NPM

#### For Organization Scope (Recommended)

If using `eslint-plugin/` scope:

1. Go to npmjs.com → Organizations → Your Organization
2. Navigate to **Publishing** settings
3. Click **Configure Trusted Publishers**
4. Add GitHub:
   ```
   Repository URL: https://github.com/ofri-peretz/eslint
   Repository Owner: ofriperetz
   Action: "Publish" or "All"
   Environment: (leave blank or use "production")
   ```

#### For Unscoped Packages

Contact npm support to enable for your specific packages.

### Step 3: Verify GitHub Actions Settings

Your workflow already has the correct permissions:

```yaml
permissions:
  id-token: write  # ← Required for OIDC
  contents: write
  pull-requests: write
```

This allows GitHub Actions to request an OIDC token from npm.

### Step 4: Remove NPM_TOKEN Secret

Since you don't need `NPM_TOKEN` anymore:

```bash
# (Optional) Remove old secret
gh secret delete NPM_TOKEN

# Verify it's gone
gh secret list
```

---

## 🔄 How Trusted Publishing Works

```
GitHub Actions Workflow
        │
        ├─ Requests OIDC token from GitHub
        │  (includes: repository, commit SHA, workflow info)
        │
        ├─ GitHub signs token with private key
        │
        ├─ Sends to npm registry
        │
        ├─ npm verifies GitHub's signature
        │
        ├─ npm checks if GitHub repo is trusted publisher
        │
        ├─ If trusted: generates temporary access token
        │  (one-time use, 10-15 minute expiry)
        │
        └─ Publishes packages
           (token auto-expires after publish)
```

**Result:** No static secrets stored, minimal attack surface

---

## ✅ Verification

### Test Trusted Publishing

1. Run your release workflow:
   ```bash
   gh workflow run release.yml -f dry-run=true
   ```

2. Check if it progresses to publish stage (in dry-run it won't actually publish)

3. For real publishing:
   ```bash
   gh workflow run release.yml
   ```

### Check Workflow Logs

```bash
# List runs
gh run list --workflow release.yml

# View logs
gh run view <run-id> --log

# Look for:
# ✅ "Successfully published to npm"
# ✅ No "403 Forbidden" errors
# ❌ If you see NPM_TOKEN errors, Trusted Publishing isn't configured yet
```

---

## 🔐 Security Model

### Attack Prevention

| Attack | NPM Token | Trusted Publishing |
|--------|-----------|-------------------|
| Token leak in logs | ❌ Risky | ✅ No token in logs |
| Token theft | ❌ Stolen once = forever | ✅ Token expires in 15 min |
| Unauthorized use | ❌ Anyone with token | ✅ Only GitHub Actions job |
| Accidental commit | ❌ Hard to detect | ✅ No token to commit |

### OIDC Claims Verification

npm verifies:
- ✅ Token signed by GitHub
- ✅ Comes from your repository
- ✅ Comes from correct workflow
- ✅ Comes from your organization
- ✅ Repository is trusted for this package

---

## 📋 Checklist

- [ ] Packages owned on npmjs.com
- [ ] Trusted Publisher configured on npm
- [ ] GitHub Actions has `id-token: write` permission
- [ ] `release.yml` workflow updated (removed NPM_TOKEN)
- [ ] NPM_TOKEN secret deleted from GitHub
- [ ] Test workflow runs successfully
- [ ] Real release works
- [ ] Verified packages published to npm

---

## ⚡ NPM Configuration File

Your `nx.json` should have correct publish configuration:

```json
{
  "release": {
    "publishTargets": {
      "npm": {
        "tag": "latest"
      }
    }
  }
}
```

No special configuration needed for Trusted Publishing - npm handles OIDC automatically.

---

## 🆘 Troubleshooting

### Error: "403 Forbidden"

**Cause:** Trusted Publisher not configured on npm

**Solution:**
1. Go to npmjs.com organization settings
2. Verify GitHub repository is added as trusted publisher
3. Ensure you own the package scope

### Error: "404 Not Found - PUT https://registry.npmjs.org/eslint-plugin-xxx - Not found"

**Cause:** Trusted Publishing (OIDC) doesn't work for unscoped packages without npm support approval

**Solution:**
1. **For unscoped packages** (e.g., `eslint-plugin-pg`, `eslint-plugin-secure-coding`):
   - Contact npm support to enable Trusted Publishing for your specific unscoped packages
   - OR use `NPM_TOKEN` secret as fallback (uncomment in workflow)
   - OR move packages to a scope (e.g., `@interlace/<name>`)

2. **For scoped packages** (`@interlace/*`):
   - Trusted Publishing works automatically if configured in npm organization settings
   - Verify GitHub repository is added as trusted publisher in npm organization settings

3. **Quick fix (temporary):**
   - Add `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` to workflow env for unscoped packages
   - Generate token at npmjs.com → Access Tokens → Generate New Token (Automation)
   - Add as GitHub secret: `NPM_TOKEN`

### Error: "npm ERR! Not Found" (Package doesn't exist)

**Cause:** Package not found on npm (private package?)

**Solution:**
1. Verify package is public on npmjs.com
2. Check package name matches in `package.json`
3. Ensure you have publish permissions

### Error: "Signature verification failed"

**Cause:** npm can't verify GitHub's OIDC token

**Solution:**
1. Verify GitHub repo URL in npm settings matches exactly
2. Check GitHub Actions permissions (`id-token: write`)
3. Try re-configuring trusted publisher

### Still seeing NPM_TOKEN errors?

**Solution:**
1. Ensure NPM_TOKEN secret was deleted
2. Check workflow doesn't reference `secrets.NPM_TOKEN`
3. Verify workflow is updated to latest version

---

## 📚 Resources

- [NPM Trusted Publishing Docs](https://docs.npmjs.com/generating-granular-access-tokens)
- [GitHub OIDC Docs](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/using-openid-connect-with-reusable-workflows)
- [npm org settings](https://www.npmjs.com/settings/YOUR-ORG/members)

---

## 🎯 Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Package on npmjs.com | ✅ Done |
| 2 | Configure Trusted Publisher | ⏳ Your action |
| 3 | Permissions in workflow | ✅ Done |
| 4 | Remove NPM_TOKEN secret | ⏳ Your action |
| 5 | Test release | ⏳ Your action |

---

## ✨ After Setup

**You get:**
- ✅ No token management needed
- ✅ Auto-renewed temporary tokens
- ✅ Better security
- ✅ Zero maintenance
- ✅ npm best practice

**Usage stays the same:**
```bash
gh workflow run release.yml
```

---

**Status:** Ready to configure
**Updated:** 2025-01-09

