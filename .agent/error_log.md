# Error Log & Lessons Learned

## 2026-01-10

### 1. Hydration Mismatch in `EcosystemStats.tsx`

- **Error**: `Hydration failed because the server rendered HTML didn't match the client.`
- **Cause**: The component was rendering dynamic stats (fetched via `useQuery`) during SSR, but the initial client render had different state or classes (e.g., `tracking-tighter` vs `tracking-tight`).
- **Lesson**: Always use a `mounted` guard (`useEffect` + `useState`) for components that render dynamic data or complex animations to ensure the server-rendered "skeleton" matches the first client pass.
- **Fix**: Added `mounted` state and a matching loading skeleton.

### 2. Module Not Found: `framer-motion`

- **Error**: `Module not found: Can't resolve 'framer-motion'`
- **Cause**: Attempted to use `'framer-motion'` as an import source when only `'motion'` was listed in `package.json`.
- **Lesson**: Always verify `package.json` dependencies before switching import sources.
- **Fix**: Reverted to `'motion/react'`.

### 3. Build Error: `ssr: false` in Server Component

- **Error**: `ssr: false is not allowed with next/dynamic in Server Components.`
- **Cause**: Used `dynamic(..., { ssr: false })` in `mdx-components.tsx`, which is evaluated in a server context for docs rendering.
- **Lesson**: `mdx-components.tsx` is shared and can be called on the server. Do not use client-only dynamic imports there; instead, use dynamic imports or mounted guards _within_ the components themselves.
- **Fix**: Moved hydration safety logic into the individual components.

- **BenchmarkCharts Module Evaluation Error**: Resolved by moving `recharts` usage to `BenchmarkChartsContent.tsx` and dynamically importing it with `ssr: false`.
- **API Fetch Failure**: Added logging and improved error handling in `src/lib/api.ts` to debug network issues. Refactored `EcosystemStats.tsx` to handle fetching errors gracefully using React Query states.
- **Branding Consistency**: Synchronized ecosystem name to "ESLint Interlace" and applied brand purple gradient across the UI.

### 4. Turbopack Runtime Error: `enqueueModel` / `Module factory not available`

- **Error**: `TypeError: chunk.reason.enqueueModel is not a function` or `Module factory is not available`.
- **Cause**: Persistent issue with Turbopack, HMR, and `motion/react` version 12 imports. Static imports of `motion/react` at the top level can trigger module evaluation issues in Turbopack during HMR updates.
- **Lesson**: Even `next/dynamic` can sometimes fail to isolate the evaluation if Turbopack's HMR state is corrupted or if it aggressively analyzes the dynamic path.
- **Fix (Attempted)**: Moved `motion` imports to a separate component and used `next/dynamic`.
- **New Error (Persistent)**: `AnimatePresence/index.mjs ... module factory is not available` required from `LLMWorkflowDemo.tsx`. Also `src/components/ui/animated-beam.tsx (4:1) @ module evaluation` failing on `import { motion } from "motion/react"`.
- **Lesson**: Turbopack + `motion/react` 12 has severe HMR evaluation issues. Top-level imports of `motion` in any file that is part of the initial HMR tree can crash the instantiation if factory state is lost.
- **Refined Fix (Full Isolation)**: Every single component that uses `motion` MUST be imported dynamically with `ssr: false`, and NONE of the parent components in the static tree should import any file that has a top-level `motion` import. I have moved all motion-dependent logic into strictly isolated leaf-node files (e.g., `*Content.tsx`).
- **Resolution**: Resolved by systematically removing all static `motion/react` imports from the main component tree and using dynamic boundaries to prevent Turbopack from evaluating the package during the initial HMR/SSR phase.

### 5. Persistent Runtime Error: `chunk.reason.enqueueModel is not a function`

- **Error**: `TypeError: chunk.reason.enqueueModel is not a function` (Next.js 16.1.1 + Turbopack).
- **Context**: Occurs when modifying or hot-reloading components that use `framer-motion` (or `motion/react`), even if partially isolated.
- **Cause**: Turbopack's incremental compilation graph gets corrupted when handling updates to modules that rely on complex client-side factories (like `motion`) if they are anywhere in the static import chain of a currently rendering page.
- **Immediate Fix**:
  1.  **Stop the dev server**.
  2.  **Ensure Full Isolation**: Verify that _every_ component importing `motion/react` is imported via `next/dynamic` with `{ ssr: false }` from its parent.
  3.  **Restart dev server**.
- **Prevention Strategy**:
  - **ISOLATE**: Never import `motion` in top-level layout or page files directly.
  - **WRAP**: Create dedicated `*Content.tsx` or `*Anim.tsx` components for anything with `motion`.
  - **DYNAMIC**: Always import those wrappers dynamically with `ssr: false`.
  - **RESTART**: If the error appears, it is often a "poisoned" HMR cache state; a hard restart is the only way to clear the invalid module graph.

### 6. Turbopack Runtime Error: `lucide-react` Module Factory

- **Error**: `Module ... was instantiated ... but the module factory is not available. It might have been deleted in an HMR update.`
- **Context**: Specifically affecting `lucide-react` icons (e.g., `Eye`) in `DevToArticles.tsx`.
- **Cause**: Similar to the `motion` issue, Turbopack's HMR can fail to track module factories for certain barrel-export-heavy libraries like `lucide-react` if they are evaluated during a "dirty" state or complex module graph update.
- **Fix**: Apply the "Full Isolation" pattern. Ensure components using problematic libraries are isolated into leaf-node files and imported exclusively via `next/dynamic` with `ssr: false`. If the error persists, a dev server restart is required to clear the HMR cache.
- **Lesson**: Barrel imports (like `import { Eye } from 'lucide-react'`) are particularly vulnerable in Turbopack HMR. Prefer direct imports if possible, or strict dynamic isolation.

### 7. Build Error: `Module not found` during Refactoring Gaps

- **Error**: `Module not found: Can't resolve '@/components/RuleComponents'`
- **Context**: Occurs during the sequence of renaming a component to `*Content.tsx` and creating a new proxy file.
- **Cause**: Next.js/Turbopack's fast refresh or initial build scans for the file immediately after it's moved/deleted. If the new file isn't created within the same filesystem tick or very shortly after, the build crashes.
- **Fix**: Re-create the missing proxy file and ensure all imports are pointing to the correct proxy.
- **Prevention Strategy**: When refactoring to the "Full Isolation" pattern, try to create the new _Content_ file FIRST by copying, then modify the original to be the proxy, then delete the old source. This minimizes the "missing file" window.

### 8. Homepage Crash: `Module factory is not available` in `ESLintEcosystemBeam`

- **Error**: `Module ... bot.js was instantiated ... but the module factory is not available.`
- **Context**: Affecting the homepage which uses `ESLintEcosystemBeam`.
- **Cause**: Turbopack HMR corruption with `lucide-react` icons inside a component that was recently refactored or moved.
- **Fix**: Systematic isolation of the component. Moved `ESLintEcosystemBeam` to `ESLintEcosystemBeamContent.tsx` and verified that the proxy `ESLintEcosystemBeam.tsx` is only using `dynamic` imports with `ssr: false`.
- **Critical Action**: **Restarted the dev server** to clear the "poisoned" HMR cache.

### 9. Build Error: `Expected unicode escape` due to corrupted file write

- **Error**: `Parsing ecmascript source code failed: Expected unicode escape` in `LLMErrorDemo.tsx`.
- **Cause**: The file was written with literal `\n` character escape sequences (newline characters escaped as backslash-n) appearing as plain text in the file, causing a syntax error. This likely happened during an automated file rewrite where newlines were interpreted as literal characters.
- **Fix**: Re-wrote the file with clean source code containing actual newlines instead of literal `\n` sequences.
- **Lesson**: Be extremely careful with automated file writes that involve cross-environment string processing. Always verify the written file content if the build suddenly fails with syntax errors related to unexpected characters.

### 9. Turbopack Runtime Error: `lucide-react` Module Factory in `ESLintEcosystemBeam`

- **Error**: `Module ... <export default as Bot> ... required from module ESLintEcosystemBeam.tsx ..., but the module factory is not available.`
- **Context**: Persistent Turbopack HMR instability affecting barrel imports from `lucide-react`.
- **Cause**: Even with `next/dynamic` isolation, Turbopack can fail to retrieve the module factory for individual icon exports during hot reloads if the module graph is complex or if the library is evaluated in a specific HMR sequence.
- **Fix**: Apply the "Full Isolation" pattern more aggressively. In this case, ensuring the parent is also dynamically imported and potentially moving icons to dynamic imports if necessary.
- **Resolution**: Refactored `page.tsx` to dynamically import `ESLintEcosystemWithLabels`.

### 10. Turbopack Runtime Error: `framer-motion` Module Factory in `AnimatedBeam`

- **Error**: `Module ... was instantiated because it was required from module animated-beam.tsx ..., but the module factory is not available.`
- **Cause**: Similar to previous HMR issues. The `dynamic(() => import('motion/react')...)` call inside `animated-beam.tsx` is being reached during an HMR update where the `framer-motion` factory is missing.
- **Fix**: Move the entire `AnimatedBeam` implementation into a `*Content.tsx` file to ensure the proxy file has absolutely no references to `motion/react` or `framer-motion` at evaluation time.
- **Resolution**: Refactored `AnimatedBeam` to use a separate content file for isolation.

### 11. Runtime Error: `TypeError: Failed to fetch` in `api.ts`

- **Error**: `Failed to fetch` at `src/lib/api.ts (55:28) @ fetcher` when calling `getRepo`.
- **Context**: Occurs when fetching Codecov stats from the client side.
- **Cause**: Cross-Origin Resource Sharing (CORS) restriction. `codecov.io` APIs do not permit direct browser requests from foreign origins (like `localhost:3000`).
- **Fix**: Implement a server-side API route (Proxy) in Next.js to fetch the data. The server can make the request without CORS limitations, then relay the result to the client.
- **Resolution**: Created `src/app/api/stats/route.ts` and updated `src/lib/api.ts` to use this local endpoint.

### 12. Runtime Error: `ReferenceError: useState is not defined` in `docs/layout.tsx`

- **Error**: `useState is not defined` at `src/app/docs/layout.tsx (13:10) @ TeamSwitcher`.
- **Stack Trace**:
  ```
  useState is not defined
  src/app/docs/layout.tsx (13:10) @ TeamSwitcher
  > 13 | function TeamSwitcher() {
       |          ^
    14 |   const pathname = usePathname();
    15 |   const [isOpen, setIsOpen] = useState(false);
  ```
- **Context**: Persists across HMR updates.
- **Cause**: Turbopack likely has a corrupted module record for `layout.tsx` where the `useState` import is recognized as a statement but not bound to the scope, or the file has hidden control characters.
- **Fix**: Perform a "Clean Rewrite" of the file content to flush the HMR cache for this specific module.

### 13. Turbopack Runtime Error: `recharts` Module Factory Missing

- **Error**: `Module ... react/index.js ... was instantiated ... but the module factory is not available.`
- **Stack Trace**:
  ```
  Module [project]/node_modules/.../react/index.js [app-client] (ecmascript) was instantiated because it was required from module [project]/node_modules/.../recharts/es6/chart/BarChart.js [app-client] (ecmascript), but the module factory is not available.
  src/components/BenchmarkChartsContent.tsx (5:1) @ module evaluation
  > 5 | import {
      | ^
    6 |   BarChart,
  ```
- **Context**: Occurred in `src/components/BenchmarkChartsContent.tsx` inside a dynamic import chain (`LoadableComponent` -> `BenchmarkCharts` -> `BenchmarkChartsContent`).
- **Cause**: Turbopack HMR graph corruption. When `recharts` (or its dependencies like `react`) are re-evaluated during a hot update, the module factory is sometimes lost, specifically in dynamic import chains.
- **Fix**: This is a persistent Turbopack/Next.js 16.1.1 issue. The immediate resolution is to **restart the development server** to clear the invalid module graph. If that fails, **touching the file** (adding a comment/whitespace) can force a specific module recompilation.
- **Permanent Fix (Recommended)**: Refactor big dependencies like `recharts` into their own "leaf" components (e.g., `ChartsOnly.tsx`) that are dynamically imported, minimizing the re-evaluation surface area in the parent `Content` component.

### 12. Dev.to Article Views & Mobile Layout

- **Issue**: "Dev.to Article Views Not Showing"
  - **Cause**: The public Dev.to API (`/api/articles`) does not return the `page_views_count` field. This is only available to the authenticated author via the `/api/articles/me` endpoint.
  - **Fix**: The UI conditionally renders the views count only if available. Currently, it remains hidden. To enable this, we would need to switch to an authenticated API call using a stored API key, which is out of scope.
- **Issue**: "Mobile Layout Cramped"
  - **Cause**: The CSS Grid layout was defaulting to 2 columns on small screens because the `md:grid-cols-3` class (and implicit behaviors) didn't explicitly force `grid-cols-1` for mobile breakpoints.
  - **Fix**: Explicitly added `grid-cols-1` to the grid container in `DevToArticlesContent.tsx` and `ArticlesPageContent.tsx` to ensure a single-column layout on mobile devices (< 768px). Verified code change.

### 14. Hydration Mismatch in `ScrollProgress.tsx` (Portal Component)

- **Error**: `Hydration failed because the server rendered HTML didn't match the client.`
- **Stack Trace**:
  ```
  +  <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none">
  -  <Suspense>
  src/components/ui/ScrollProgress.tsx (25:5) @ ScrollProgress
  ```
- **Context**: The `ScrollProgress` component uses `createPortal(document.body)` but returns `null` during SSR.
- **Cause**: The component was calling `createPortal(element, document.body)` directly. During hydration, React sees a structural mismatch between server HTML and client render.
- **Long-Term Fix**:
  1. Use a `useRef` to store the portal target **after** mount.
  2. Return `null` both during SSR **and** until the ref is populated.
  3. This ensures `server HTML === first client render === null`, preventing mismatch.
  4. Add `{ passive: true }` to scroll listeners for better performance.
- **Resolution**: Rewrote the component with `portalTarget = useRef<HTMLElement | null>(null)` and double-guard: `if (!mounted || !portalTarget.current) return null;`

### 15. `useState is not defined` in `docs/layout.tsx` (Turbopack Scope Corruption)

- **Error**: `ReferenceError: useState is not defined` at `TeamSwitcher` function.
- **Context**: Import `import React, { useState } from 'react';` was present and correct.
- **Cause**: Turbopack HMR cache corruption where import bindings become "undefined" even when syntactically correct.
- **Long-Term Prevention Strategy**:
  1. **Component Isolation**: Move stateful components to separate files (e.g., `TeamSwitcher` -> `@/components/TeamSwitcher`).
  2. **Explicit React Import**: Always use `import React, { useState, useEffect } from 'react';`.
  3. **Restart Protocol**: The only guaranteed fix is restarting the dev server.
- **Resolution**: Extracted `TeamSwitcher` to a dedicated component file for isolation.

### 16. Turbopack HMR Cache Corruption - `recharts` Module Factory (Recurring)

> **Prevention Workflow Created**: See `.agent/workflows/docs-app.md` for architectural rules that prevent this class of errors. Use `/docs-app` slash command before working on the docs app.

- **Error**: `Module ... react/index.js was instantiated ... but the module factory is not available.`
- **Stack Trace**:
  ```
  Module ... was instantiated because it was required from module ... recharts/es6/chart/BarChart.js ..., but the module factory is not available.
  src/components/BenchmarkChartsContent.tsx (5:1) @ module evaluation
  > 5 | import {
      | ^
    6 |   BarChart,
  ```
- **Context**: Recurring Turbopack bug in Next.js 16.1.1 affecting heavy client libraries.
- **Affected Libraries**: `recharts`, `motion/react`, `lucide-react`, and their transitive dependencies.
- **Cause**: The module factory cache becomes "poisoned" when:
  1. Files are rapidly edited during HMR.
  2. Dynamic imports fail to properly isolate heavy dependencies.
  3. The module graph gets out of sync with the actual file system.
- **Long-Term Prevention Strategy**:
  1. **Leaf-Node Architecture**: All components using heavy client libraries MUST be in isolated `*Content.tsx` files.
  2. **Dynamic Import Boundaries**: Parent components import via `next/dynamic` with `{ ssr: false }`.
  3. **Restart Protocol**: When this error appears, **immediately restart the dev server** - no code-level fix exists for corrupted HMR cache.
  4. **Minimal Edits**: Avoid rapid file changes in components that import these libraries.
- **Immediate Fix**: Run `pkill -f "next-server" && npx nx dev docs` to restart with clean HMR state.

### 17. Turbopack HMR Cache Corruption - `recharts` Module Factory (Recurring #2)

- **Error**: `Module ... BarChart.js was instantiated ... but the module factory is not available.`
- **Stack Trace**:
  ```
  Module [project]/node_modules/.pnpm/recharts@3.6.0_@types+react@19.2.7_react-dom@19.2.3_react@19.2.3__react-is@18.3.1_react@19.2.3_redux@5.0.1/node_modules/recharts/es6/chart/BarChart.js [app-client] (ecmascript) was instantiated because it was required from module [project]/apps/docs/src/components/BenchmarkChartsContent.tsx [app-client] (ecmascript), but the module factory is not available.
  src/components/BenchmarkChartsContent.tsx (4:1) @ module evaluation
  > 4 | import { useSearchParams } from 'next/navigation';
      | ^
    5 |
    6 | // TEMPORARY: Recharts removed due to persistent Turbopack HMR bug
    7 | // See: .agent/error_log.md entry #16
  ```
- **Context**: Next.js 16.1.1 + Turbopack. Error occurred after navigating to `/docs/benchmarks`. Full call stack includes `BenchmarkChartsContent.tsx` → `BenchmarkCharts.tsx` → `benchmarks.mdx.js` → `page.tsx`.
- **Client-Side Exception**: `Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).`
- **Cause**: Same root cause as entries #13 and #16. The `recharts` library's module factory becomes unavailable during HMR updates due to Turbopack cache corruption.
- **Note**: This error recurred despite the `// TEMPORARY: Recharts removed` comment being present in the file, suggesting the recharts import may have been re-added or the HMR cache was still poisoned from a previous state.
- **Related**: See entry #16 for prevention workflow (`.agent/workflows/docs-app.md`).

### 18. Runtime Error: `initialStats is not defined` in `EcosystemStatsContent.tsx`

- **Error**: `ReferenceError: initialStats is not defined`
- **Stack Trace**:
  ```
  at EcosystemStats (src/components/EcosystemStatsContent.tsx:33:3)
  at EcosystemStats (src/components/EcosystemStats.tsx:21:10)
  at HomePage (src/app/(home)/page.tsx:153:11)
  ```
- **Context**: Next.js 16.1.1 + Turbopack. Error occurs on landing page load.
- **Cause**: **Turbopack HMR Cache Corruption**. The source code does NOT contain any reference to `initialStats`. The browser is running a stale/corrupted cached version of the module from a previous HMR state. Grep search confirms the variable doesn't exist in the codebase.
- **Fix**: **Restart the development server** to clear the poisoned HMR cache:
  ```bash
  # Stop dev server (Ctrl+C) then:
  npx nx reset && npx nx dev docs
  ```
- **Alternative**: Hard refresh the browser (`Cmd+Shift+R` / `Ctrl+Shift+R`) to bypass browser cache.
- **Prevention**: See entry #16 for Turbopack HMR prevention workflow.

---

## 19. JSX Parse Error - Expression Expected (DevToArticlesContent.tsx)

**Date**: 2026-01-10
**Error Type**: Build Error (Turbopack)
**File**: `apps/docs/src/components/DevToArticlesContent.tsx`

**Error Message**:

```
Parsing ecmascript source code failed
> 135 |     </a>
      |     ^
Expression expected
```

**Root Cause**: Duplicate closing `</div>` tag in the JSX structure. During a multi-line edit, an extra `</div>` was accidentally left in the metadata row section, causing JSX structure imbalance.

**Resolution**: Removed the extra `</div>` tag on line 132.

**Prevention**: Always verify JSX tag balance after complex edits. Use IDE's bracket matching feature.

---

## 20. Persistent Turbopack HMR Cache Corruption (DevToArticlesContent.tsx)

**Date**: 2026-01-10
**Error Type**: HMR Cache Corruption
**File**: `apps/docs/src/components/DevToArticlesContent.tsx`

**Symptoms**:

- Code changes in file not reflected in browser despite multiple restarts
- Browser subagent confirmed stale component structure (author row overlaid on image instead of separate section)
- `nx dev:fresh` did not resolve the issue

**Root Cause**: Turbopack's incremental compilation cache retained stale compiled artifacts despite file changes. Dynamic imports through `DevToArticles.tsx` wrapper may have contributed to cache invalidation failures.

**Resolution**: Full cache clear required:

```bash
rm -rf apps/docs/.next && rm -rf node_modules/.cache
npx nx dev docs  # Restart dev server
```

**Prevention**:

- Use `nx reset` before `nx dev` when experiencing HMR issues
- Add cache-buster comments with timestamps to force module invalidation
- For persistent issues, clear `.next` directory manually

---

## 21. Browser Cache Serving Stale JS Despite Fresh Server Files

**Date**: 2026-01-10
**Error Type**: Deep Browser Caching
**Symptoms**: Browser DOM showing old classes (`h-52`, `absolute bottom-4`) while server files and curl requests return new code (`aspect-video`, `h-10 px-3`)

**Diagnosis Steps**:

1. `grep "aspect-video" apps/docs/.next/dev/static/chunks/_12c564f9._.js` → Found ✅
2. `curl http://localhost:3000/_next/static/chunks/_12c564f9._.js | grep "aspect-video"` → Found ✅
3. Browser DevTools JS bundle search → Shows OLD `h-52` code ❌

**Root Cause**: Browser's aggressive memory/disk cache retaining stale JS bundles even after server restart and basic cache clear. The browser was pulling from bfcache (back-forward cache) or deep disk cache.

**Resolution**:

1. Close ALL browser tabs for localhost:3000
2. Open private/incognito window
3. Or: DevTools → Right-click Refresh → "Empty Cache and Hard Reload"

**Prevention**:

- During development, enable DevTools "Disable cache" checkbox (Network tab)
- Use incognito windows for testing major changes
- Consider adding cache-control headers in Next.js config for dev mode

---

## 22. MDX Evaluation Error: HTML Comments from Sync Script

**Date**: 2026-01-10
**Error Type**: Build Error (MDX Evaluation)
**File**: `./apps/docs/content/docs/[plugin]/rules/[rule].mdx`

**Error Message**:

```
Error evaluating Node.js code
11:2: Unexpected character `!` (U+0021) before name, expected a character that can start a name, such as a letter, `$`, or `_` (note: to create a comment in MDX, use `{/* text */}`)
```

**Root Cause**:
The `sync-rules-docs.mjs` script was migrating rule documentation from `.md` to `.mdx`. The source Markdown files contained HTML comments (`<!-- end auto-generated rule header -->`). While valid in standard Markdown, HTML comments are not valid in MDX because MDX follows JSX syntax where `<!--` is an invalid tag start.

**Resolution**:
Updated the `convertMdToMdx` function in `apps/docs/scripts/sync-rules-docs.mjs` to:

1.  **Strip HTML comments** entirely: `<!--[\s\S]*?-->` → `""`. This removes potential JSX syntax violations and marker-related confusion.
2.  **Refine metadata extraction**: Stripped emojis (💼, 💡, 🔧) from the description to ensure clean frontmatter.
3.  **Perform "Nuclear Cache Clear"**: Executed `npx nx reset && rm -rf apps/docs/.next` to flush poisoned Turbopack HMR caches that were still serving the invalid `<!--` syntax even after the files on disk were updated.

**Lesson**:
When programmatically converting from Markdown to MDX, automated transformation of HTML entities and comments is required. Furthermore, Turbopack's HMR cache is extremely persistent; syntax errors in MDX can "poison" the cache, requiring a full reset even after the source file is corrected.

---

## 23. JSX Parse Error - Expression Expected (BenchmarkChartsContent.tsx)

**Date**: 2026-01-11
**Error Type**: Build Error (Turbopack)
**File**: `apps/docs/src/components/BenchmarkChartsContent.tsx`

**Error Message**:

```
Parsing ecmascript source code failed
> 33 |     <div className="space-y-10 my-8">
     |     ^
Expression expected
```

**Root Cause**: The error occurred because inside the `BenchmarkChartsContent` component, the `return` statement was preceded by an incomplete `useState` definition (`const [visiblePlugins, setVisiblePlugins] = useState({`) that was never closed. This syntax error (missing closing brace/parenthesis) caused the parser to fail when it encountered the JSX block immediately following it.

**Resolution**: Removed the incomplete `useState` definition and cleaned up the `BenchmarkChartsContent.tsx` file to ensure valid syntax before the `return` statement.

**Prevention**: Always ensure that React hooks and component logic are fully defined and syntactically correct before returning JSX. Use ESLint or Typescript checks to catch these syntax errors early.

---

## 24. Invalid `RuleMetaDataDocs` Properties in ESLint Rules

**Date**: 2026-01-11
**Error Type**: TypeScript Build Error
**Affected Package**: `eslint-plugin-secure-coding` (75+ rule files)

**Error Message**:

```
error TS2353: Object literal may only specify known properties, and 'category' does not exist in type 'RuleMetaDataDocs'.
error TS2353: Object literal may only specify known properties, and 'recommended' does not exist in type 'RuleMetaDataDocs'.
error TS2353: Object literal may only specify known properties, and 'owaspMobile' does not exist in type 'RuleMetaDataDocs'.
```

**Root Cause**:

The `@typescript-eslint/utils@8.46.2` version of `RuleMetaDataDocs` type does not include the following properties that were used in rule definitions:

1. `category: 'Security'` - Not part of the official ESLint rule metadata schema
2. `recommended: true` - This is typically handled at the plugin config level, not in individual rule `docs`
3. `owaspMobile: ['M1', ...]` - Custom extension property not recognized by the type

These properties were likely added as custom metadata extensions but were not properly typed with a custom `PluginDocs` type.

**Resolution**:

Removed all three invalid properties from the `docs` object in all 75+ rule files using batch `sed` commands:

```bash
find packages/eslint-plugin-secure-coding/src/rules -name "index.ts" -exec sed -i '' '/category.*Security/d' {} \;
find packages/eslint-plugin-secure-coding/src/rules -name "index.ts" -exec sed -i '' '/recommended.*true/d' {} \;
find packages/eslint-plugin-secure-coding/src/rules -name "index.ts" -exec sed -i '' '/owaspMobile:/d' {} \;
```

**Future Consideration**:

If `owaspMobile` and `category` metadata is needed, define a custom `PluginDocs` interface in `@interlace/eslint-devkit` and use it with `createRule`:

```typescript
interface InterlacePluginDocs {
  category?: 'Security' | 'Performance' | 'BestPractice';
  owaspMobile?: string[];
}

// Then use: createRule<RuleOptions, MessageIds, InterlacePluginDocs>(...)
```

---

## 25. TypeScript Error TS18047: `'item' is possibly 'null'` in Type Guard

**Date**: 2026-01-11
**Error Type**: TypeScript Build Error
**Affected Package**: `eslint-plugin-lambda-security`
**Affected File**: `src/rules/no-error-swallowing/index.ts`

**Error Message**:

```
packages/eslint-plugin-lambda-security/src/rules/no-error-swallowing/index.ts:138:68 - error TS18047: 'item' is possibly 'null'.

138               if (!item || typeof item !== 'object' || !('type' in item)) continue;
                                                                       ~~~~
```

**Root Cause**:

TypeScript's control flow analysis loses narrowing when using the `in` operator check on a variable that was previously checked for null. The sequence of checks:

```typescript
if (!item) continue; // item could still be null
if (typeof item !== 'object') continue; // item is object | null
if (!('type' in item)) continue; // TS error: item may be null
```

TypeScript correctly flags this because after `typeof item !== 'object'` check, the type is still `object | null` (since `typeof null === 'object'`).

**Resolution**:

The `'type' in item` check still fails because TypeScript doesn't trust `item != null && typeof item === 'object'` to exclude `null` (since `typeof null === 'object'`).

The working fix uses `Object.prototype.hasOwnProperty.call()` which TypeScript accepts:

```typescript
for (const item of child) {
  // Use Object.prototype.hasOwnProperty to verify it's a real object with 'type'
  if (
    item != null &&
    typeof item === 'object' &&
    Object.prototype.hasOwnProperty.call(item, 'type')
  ) {
    checkNode(item as TSESTree.Node);
  }
}
```

**Lesson**:

When checking for property existence on potentially-null array items:

1. The `in` operator triggers TS18047 even after null checks because `typeof null === 'object'`
2. Use `Object.prototype.hasOwnProperty.call(item, 'prop')` instead - TypeScript accepts this pattern
3. Alternatively, use a user-defined type guard function that returns `item is T`

---

## 26. TypeScript Error TS2339: Property Access on AST Union Types

**Date**: 2026-01-11
**Error Type**: TypeScript Build Error
**Affected Package**: `eslint-plugin-secure-coding`
**Affected Files**: Multiple rule files (`require-network-timeout`, `require-https-only`, `require-secure-credential-storage`, `no-debug-code-in-production`, `require-data-minimization`)

**Error Messages**:

```
Property 'name' does not exist on type 'Expression'.
Property 'object' does not exist on type 'Expression'.
Property 'property' does not exist on type 'Expression'.
Property 'key' does not exist on type 'ObjectLiteralElement'.
  Property 'key' does not exist on type 'SpreadElement'.
Property 'name' does not exist on type 'PrivateIdentifier | Expression'.
```

**Root Cause**:

When accessing properties on AST nodes in ESLint rules, the types are often **union types**. For example:

- `CallExpression.callee` is of type `Expression`, which includes `Identifier`, `MemberExpression`, `CallExpression`, etc.
- `ObjectExpression.properties[n]` is of type `ObjectLiteralElement`, which includes `Property` and `SpreadElement`
- `MemberExpression.property` is of type `Expression | PrivateIdentifier`

TypeScript correctly complains when you try to access `.name`, `.object`, `.property`, or `.key` without first narrowing the type.

**Resolution**:

Add **type guards** before accessing type-specific properties:

```typescript
// ❌ WRONG - TypeScript error
if (node.callee.name === 'fetch') { ... }

// ✅ CORRECT - Type guard first
if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') { ... }

// ❌ WRONG - SpreadElement doesn't have .key
node.properties.some(p => p.key?.name === 'timeout');

// ✅ CORRECT - Exclude SpreadElement, check key type
node.properties.some(p =>
  p.type !== 'SpreadElement' &&
  p.key.type === 'Identifier' &&
  p.key.name === 'timeout'
);

// ❌ WRONG - MemberExpression.property could be PrivateIdentifier
if (node.callee.property.name === 'log') { ... }

// ✅ CORRECT - Check property is Identifier
if (node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'log') { ... }
```

**Pattern Summary**:

| Property Access          | Required Type Guard                  |
| ------------------------ | ------------------------------------ |
| `callee.name`            | `callee.type === 'Identifier'`       |
| `callee.object`          | `callee.type === 'MemberExpression'` |
| `callee.property.name`   | `property.type === 'Identifier'`     |
| `properties[n].key`      | `p.type !== 'SpreadElement'`         |
| `properties[n].key.name` | `p.key.type === 'Identifier'`        |

**Lesson**:

Always check the AST node `type` property before accessing type-specific properties. Use `AST_NODE_TYPES` enum from `@typescript-eslint/utils` for consistent type checking.
