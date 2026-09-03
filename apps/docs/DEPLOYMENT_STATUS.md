# ESLint Docs App - Deployment Status

> **Last Updated:** January 6, 2026 @ 00:00 CST
> **Session Status:** Rate-limited - Use Vercel Dashboard or wait 24 hours

---

## ✅ Completed

### Documentation Site (apps/docs)

- [x] Fumadocs site with Next.js 16 + Turbopack
- [x] 11 plugin documentation pages with badges
- [x] 272 individual rule documentation pages synced
- [x] Interactive BenchmarkCharts component with functional plugin toggles
- [x] Mobile responsive design
- [x] AI compliance files (llms.txt, ai.txt, security.txt)
- [x] Nx project configuration with build/dev/deploy targets
- [x] Local build working: `nx build docs`
- [x] Standalone output configured with `outputFileTracingRoot`

---

## 🚫 Current Blocker: Vercel Rate Limit

**Error:** `Too many requests - try again in 24 hours (more than 5000, code: "api-upload-free")`

This is from multiple upload attempts during debugging. Two solutions:

### Option A: Wait 24 Hours

After the rate limit resets, run:

```bash
nx deploy docs
```

### Option B: Use Vercel Dashboard (Recommended)

This bypasses CLI rate limits entirely:

1. Go to: https://vercel.com/new
2. Import `ofri-peretz/eslint` from GitHub
3. Configure:
   - **Root Directory:** `apps/docs`
   - **Framework:** Next.js
   - **Build Command:** `pnpm build`
   - **Output Directory:** `.next`
   - **Install Command:** `pnpm install`
4. Deploy

This sets up **automatic deployments** on every push to main!

---

## 📁 Project Configuration

### apps/docs/project.json

```json
{
  "targets": {
    "build": {
      "command": "next build",
      "outputs": ["{projectRoot}/.next"]
    },
    "vercel-build": {
      "command": "npx vercel build --prod",
      "dependsOn": ["build"]
    },
    "deploy": {
      "command": "npx vercel deploy --prebuilt --prod --yes",
      "dependsOn": ["vercel-build"]
    },
    "dev": { "command": "next dev" },
    "start": { "command": "node .next/standalone/server.js" }
  }
}
```

### apps/docs/next.config.mjs

```javascript
const config = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot, // Required for monorepo
};
```

---

## 🎯 Nx Commands

| Command          | Description              |
| ---------------- | ------------------------ |
| `nx build docs`  | Build Next.js app        |
| `nx dev docs`    | Start dev server         |
| `nx deploy docs` | Build + deploy to Vercel |
| `nx start docs`  | Start standalone server  |

---

## 📊 Build Output

```
✓ 583 static pages generated
├── /docs (272 rule pages)
├── /docs/benchmarks
├── /docs/examples
├── /llms.txt, /ai.txt, /robots.txt
└── /sitemap.xml
```

Build size: ~341MB standalone output

---

## ✅ After Deployment

Once deployed, update this file with:

- Production URL
- Custom domain (if configured)
- Remove rate limit section
