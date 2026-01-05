# ESLint Docs App - Deployment Status

> **Last Updated:** January 5, 2026 @ 01:31 CST
> **Session Status:** Paused - Continue later this week

---

## ✅ Completed

### Documentation Site (apps/docs)

- [x] Fumadocs site with Next.js 16 + Turbopack
- [x] 11 plugin documentation pages with badges
- [x] 272 individual rule documentation pages synced
- [x] Interactive BenchmarkCharts component with:
  - Animated stat counters
  - Radar chart with functional plugin toggles (5 plugins)
  - Bar chart for rule count comparison
  - Performance comparison bars
  - Feature matrix table
- [x] ComparisonSection with scroll animations
- [x] Examples page with LLM-optimized message demos
- [x] Mobile responsive design (no overflow)
- [x] AI compliance files (llms.txt, ai.txt, security.txt)
- [x] ESLint branding (logo, favicon, Space Grotesk font)

### Blog (ofriperetz.dev)

- [x] Committed and pushed AI compliance files
- [x] Auto-deploying via Vercel

---

## 🔄 In Progress - Blocking Issue

### Nx Build → dist/ Output

**Current Problem:** The build succeeds with `pnpm build` but we need proper Nx integration with output to `dist/apps/docs/`.

**Attempted Solutions:**

1. ❌ `@nx/devkit` workspaceRoot in next.config.mjs → Package not found at runtime
2. ❌ Node.js `path.resolve(__dirname, '../..')` → Build succeeds but output doesn't go to dist/
3. ❌ `@nx/next:build` executor → Causes Next.js 16 prerender error:
   ```
   Error [InvariantError]: Invariant: Expected workUnitAsyncStorage to have a store.
   This is a bug in Next.js.
   ```

**Current Configuration:**

```json
// apps/docs/project.json
{
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{workspaceRoot}/dist/apps/docs"],
      "options": {
        "commands": [
          "next build",
          "mkdir -p {workspaceRoot}/dist/apps/docs && cp -r .next/* {workspaceRoot}/dist/apps/docs/"
        ],
        "cwd": "{projectRoot}",
        "parallel": false
      }
    }
  }
}
```

```javascript
// apps/docs/next.config.mjs
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const config = {
  reactStrictMode: true,
  output: 'standalone',
};

export default withMDX(config);
```

---

## 🛠 Next Steps to Resolve

### Option A: Fix Nx Integration

1. Test the current `nx:run-commands` config with copy command
2. Verify `{workspaceRoot}` interpolation works in the commands array
3. If not, use absolute paths or shell script

### Option B: Simplified Approach

1. Keep build output in `.next/` (default location)
2. Update `project.json` outputs to `["{projectRoot}/.next"]`
3. Deploy directly from `.next/standalone/`

### Option C: @nx/next Executor Fix

1. Investigate the Next.js 16 + @nx/next compatibility issue
2. May need to upgrade @nx/next or await fix

---

## 📁 Key Files

| File                                           | Purpose                  |
| ---------------------------------------------- | ------------------------ |
| `apps/docs/project.json`                       | Nx project configuration |
| `apps/docs/next.config.mjs`                    | Next.js configuration    |
| `apps/docs/TODO.md`                            | Feature roadmap          |
| `apps/docs/src/components/BenchmarkCharts.tsx` | Interactive charts       |
| `apps/docs/src/app/global.css`                 | Theme styling            |

---

## 🚀 Deployment Checklist (Once Build Works)

```bash
# 1. Build with Nx
nx build docs

# 2. Verify output
ls -la dist/apps/docs/standalone/

# 3. Deploy to Vercel from dist
cd dist/apps/docs && npx vercel --prod --scope ofri-peretz

# 4. Commit and push
git add -A && git commit -m "feat(docs): fix nx build output" && git push
```

---

## 📝 Dependencies Added

- `@nx/next@^22.3.3` - Nx Next.js executor (may have compatibility issues with Next.js 16)
- `@nx/devkit@^22.3.3` - Nx devkit for workspace utilities

---

## ⚠️ Known Issues

1. **Nx Lockfile Parsing Bug** - Intermittent "Cannot read properties of undefined (reading 'forEach')" error. Fix: Regenerate lockfile with `rm pnpm-lock.yaml && pnpm install`.

2. **Flaky Tests** - `eslint-plugin-import-next:test` and `eslint-plugin-mongodb-security:test` marked as flaky by Nx.

3. **Next.js 16 Prerender Bug** - `@nx/next:build` executor causes `InvariantError: Expected workUnitAsyncStorage` during static page generation.

4. **Tailwind v4 Lint Warnings** - `bg-gradient-to-br` can be `bg-linear-to-br` (cosmetic, not blocking).

---

## 💡 Alternative: Vercel GitHub Integration

If CLI deployment continues to be problematic, connect via Vercel Dashboard:

1. Import `ofri-peretz/eslint` from GitHub
2. Set root directory: `apps/docs`
3. Framework: Next.js
4. Build command: `pnpm build`
5. Output: `.next`

This bypasses the Nx → dist complexity entirely.
