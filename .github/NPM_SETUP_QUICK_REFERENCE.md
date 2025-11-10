# 🔐 NPM Authentication Quick Reference

## Choose Your Path

### Option A: ✅ Trusted Publishing (RECOMMENDED)
```
🔐 More Secure
✨ Zero Maintenance
📚 NPM Best Practice
```

**Setup:** 5 minutes
**Maintenance:** 0 (automatic)

**Steps:**
1. Configure Trusted Publisher on npmjs.com
2. Done! (workflow already configured)

**Check:** 
```bash
gh workflow run release.yml
# Should work immediately
```

---

### Option B: ⚠️ NPM Token (Legacy)
```
⚠️ Less Secure
🔄 Manual Rotation
📛 Deprecated by NPM
```

**Setup:** 2 minutes
**Maintenance:** Annual token rotation

**Steps:**
1. Generate token at npmjs.com
2. `gh secret set NPM_TOKEN --body "token"`
3. Update workflow (add NPM_TOKEN env var)

**Note:** Our workflow is already configured for Trusted Publishing (recommended)

---

## Current Status

Your `release.yml` is **configured for Trusted Publishing** ✅

```yaml
# Already has correct permissions:
permissions:
  id-token: write  # ← For OIDC

# Already removed NPM_TOKEN from env
```

---

## What You Need to Do

### If Using Trusted Publishing:

1. Go to npmjs.com
2. Organizations → Your Org → Publishing
3. Add GitHub as Trusted Publisher:
   ```
   Repository: ofriperetz/forge-js
   ```
4. Done! 🎉

### If Using NPM Token (Legacy):

1. Generate at npmjs.com
2. Add secret: `gh secret set NPM_TOKEN --body "token"`
3. Update workflow (uncomment NPM_TOKEN line)

---

## Quick Comparison

| Need | Trusted Publishing | NPM Token |
|------|-------------------|-----------|
| **Secure** | ✅ Yes | ⚠️ Less |
| **Maintenance** | ✅ None | ⚠️ Annual |
| **Setup** | 5 min | 2 min |
| **Token Storage** | ✅ None | ⚠️ GitHub secret |
| **NPM Recommendation** | ✅ Yes | ❌ No |
| **Cost** | Free | Free |

---

## Troubleshooting

### "403 Forbidden" Error
→ Configure Trusted Publisher on npmjs.com

### "Cannot find token"
→ If using token: `gh secret set NPM_TOKEN --body "token"`

### "Signature verification failed"
→ Re-verify GitHub repo URL in npm settings

---

## Resources

- **Trusted Publishing:** `.github/TRUSTED_PUBLISHING_SETUP.md`
- **Release Guide:** `.github/FINAL_ARCHITECTURE.md`
- **Quick Start:** `.github/RELEASE_QUICK_START.md`

---

## 🎯 Recommendation

**Use Trusted Publishing** ✅

Why:
- More secure
- Zero maintenance
- NPM best practice
- One-time setup
- Already configured in your workflow

**What to do:**
1. Visit npmjs.com
2. Add GitHub as trusted publisher
3. Run: `gh workflow run release.yml`
4. Done! 🚀

---

**Status:** Ready to set up authentication

