# Debug Log

Tracking browser caching, HMR issues, and other bizarre inconsistent behavior during development.

---

## 1. Deep Browser Caching Despite Server Fresh Code

**Date**: 2026-01-10
**Issue Type**: Browser Cache / Dev Experience
**Severity**: High (blocks development iteration)

### Symptoms

- Browser DOM shows old CSS classes (`h-52`, `absolute bottom-4`)
- Server files and `curl` requests return NEW code (`aspect-video`, `h-10 px-3`)
- No 404s or CORS errors - scripts load but contain stale content
- Issue persists across multiple hard refreshes

### Diagnosis Commands

```bash
# Check if file on disk has new code
grep "aspect-video" apps/docs/.next/dev/static/chunks/_12c564f9._.js
# → Found ✅

# Check if server responds with new code
curl http://localhost:3000/_next/static/chunks/_12c564f9._.js | grep "aspect-video"
# → Found ✅

# But browser DevTools shows OLD code!
```

### Root Cause

Browser's aggressive memory/disk cache retaining stale JS bundles even after:

- Server restart (`nx dev:fresh docs`)
- Clearing `.next`, `.turbo`, `node_modules/.cache`, `.nx/cache`
- Standard hard refresh (Cmd+Shift+R)

The browser was pulling from bfcache (back-forward cache) or deep disk cache that isn't cleared by normal means.

### Verified Resolutions

1. **Close ALL browser tabs** for localhost:3000
2. Open **private/incognito window**
3. DevTools → Right-click Refresh → **"Empty Cache and Hard Reload"**
4. DevTools → Application → **Clear storage → Clear site data**

### Prevention

- Enable DevTools **"Disable cache"** checkbox (Network tab) during development
- Use incognito windows for testing major UI changes
- Consider adding aggressive cache-control headers in Next.js config for dev mode

---

## 2. Nx Daemon Serving Stale Module Cache

**Date**: 2026-01-10
**Issue Type**: Build Cache
**Related to**: Issue #1

### Symptoms

- `nx dev:fresh docs` clears `.next` but Nx daemon retains module info
- Component changes not reflected despite file save

### Resolution

```bash
# Stop Nx daemon
npx nx daemon --stop

# Full Nx reset
npx nx reset

# Clear all caches
rm -rf apps/docs/.next node_modules/.cache .nx/cache

# Restart dev server
npx nx dev docs
```

### Prevention

Updated `dev:fresh` command in `apps/docs/project.json`:

```json
"commands": [
    "npx nx daemon --stop 2>/dev/null || true",
    "rm -rf .next .turbo ../../.turbo ../../node_modules/.cache",
    "next dev -p 3000"
]
```

---

## Quick Reference: Nuclear Cache Clear

When experiencing unexplained stale code:

```bash
# 1. Stop everything
pkill -f "nx dev" 2>/dev/null || true
npx nx daemon --stop 2>/dev/null || true
npx nx reset

# 2. Clear all caches
rm -rf apps/docs/.next node_modules/.cache .nx/cache .turbo

# 3. Restart
npx nx dev docs

# 4. In browser
# - Close ALL localhost:3000 tabs
# - Open incognito window
# - Navigate to page
```
