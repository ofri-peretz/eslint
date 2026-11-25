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

#### New package names

npm only lets you configure a Trusted Publisher on a package that already exists. To claim a new name, publish an empty
`0.0.0-stage` by hand, then configure the publisher. Let `release.yml` publish the first real version: it tags what it
publishes. `scripts/reconcile-tags.ts` ignores `0.0.0-*` versions. A real version published by hand gets no tag, and
it is reported as missing until a commit is tagged for it or it is recorded, with evidence, in
`.agent/release-untagged-versions.json`. That ledger exists because the 31 `oxlint-plugin-*` first versions were
published by hand (#1321).

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

### Step 4: No npm token

There is no `NPM_TOKEN` in this repo's CI. `release.yml` has no token fallback, and the weekly token health check that
watched one was removed in #1213. If an `NPM_TOKEN` repository secret still exists, nothing reads it and it can be
deleted (`gh secret delete NPM_TOKEN`).

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
# ❌ If you see E404 PUT / 403 errors, Trusted Publishing isn't configured for that package yet
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
- [x] `release.yml` reads no npm token (#1213)
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

**Cause:** The package has no Trusted Publisher configured on npmjs.com (or the name was never claimed), so npm
refuses the OIDC publish. There is no token fallback.

**Solution:**
1. If the package is not on npm at all, claim the name first (see "New package names" above).
2. On npmjs.com → the package → Settings → Trusted Publisher, add GitHub Actions: repository `ofri-peretz/eslint`,
   workflow `release.yml`.
3. Re-run the release; already-published siblings are skipped.

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

### Still seeing auth errors?

**Solution:**
1. Check the failing package's Trusted Publisher names `release.yml`, not another workflow file
2. Check the publish job still has `id-token: write`
3. `scripts/__tests__/release-oidc-only-lock.test.ts` fails if a token fallback is re-added

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
| 4 | No npm token in CI | ✅ Done (#1213) |
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

