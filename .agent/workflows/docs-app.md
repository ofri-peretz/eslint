---
description: Architectural rules for docs app to prevent Turbopack HMR errors
---

# Docs App Development Standards

This workflow codifies critical patterns discovered through production debugging. **Violating these rules will cause runtime crashes.**

## 1. The Full Isolation Pattern (MANDATORY for Heavy Libraries)

Libraries that **MUST** be isolated via dynamic imports with `ssr: false`:

- `recharts` (all chart components)
- `motion/react` or `framer-motion` (all animation)
- `lucide-react` (when used in complex components)

### Architecture:

```
ParentPage.tsx          → imports → ChartWrapper.tsx (dynamic, ssr:false)
                                            ↓
                                    ChartContent.tsx (contains actual recharts imports)
```

### Rules:

1. **NEVER** import `recharts`, `motion/react`, or heavy libraries in files that are statically imported
2. **ALWAYS** create a `*Content.tsx` file for the actual implementation
3. **ALWAYS** use `next/dynamic` with `{ ssr: false }` in the wrapper
4. The parent of the dynamic import **MUST NOT** have any static imports of these libraries

### Example Pattern:

```tsx
// BenchmarkCharts.tsx (the wrapper - clean imports only)
'use client';
import dynamic from 'next/dynamic';

const BenchmarkChartsContent = dynamic(
  () =>
    import('./BenchmarkChartsContent').then((m) => m.BenchmarkChartsContent),
  { ssr: false, loading: () => <Skeleton /> },
);

export function BenchmarkCharts() {
  return <BenchmarkChartsContent />;
}
```

```tsx
// BenchmarkChartsContent.tsx (contains heavy imports)
'use client';
import { BarChart, Bar, XAxis } from 'recharts';  // ← OK here

export function BenchmarkChartsContent() { ... }
```

## 2. Portal Components (ScrollProgress, BackToTop)

### Hydration-Safe Portal Pattern:

```tsx
const portalTarget = useRef<HTMLElement | null>(null);
const [mounted, setMounted] = useState(false);

useEffect(() => {
  portalTarget.current = document.body;
  setMounted(true);
}, []);

// Double-gate ensures server HTML === first client render === null
if (!mounted || !portalTarget.current) return null;

return createPortal(content, portalTarget.current);
```

### Positioning (Avoid Top-Left Bug):

Always use **inline styles** for fixed positioning in portals:

```tsx
style={{
  position: 'fixed',
  bottom: '2rem',
  right: '2rem',
  left: 'auto',   // Force override globals
  top: 'auto',    // Force override globals
  zIndex: 99999
}}
```

## 3. Hook Imports (useState/useEffect)

When Turbopack shows `ReferenceError: useState is not defined`:

1. **Use explicit React import**: `import React, { useState, useEffect } from 'react';`
2. **Extract to separate file**: Move stateful components to dedicated files (e.g., `TeamSwitcher.tsx`)
3. **Touch protocol**: Add dated comment to force re-evaluation: `// HMR-REFRESH: 2026-01-10`

## 4. MDX Components Registry

**NEVER** use `ssr: false` in `mdx-components.tsx` - it's evaluated in a server context.

If a component needs client isolation:

1. Create a wrapper component in `src/components/`
2. Handle hydration inside the component itself (mounted guard)
3. Import the wrapper normally in `mdx-components.tsx`

## 5. Atomic Reset Protocol

When HMR corruption occurs (Module Factory errors):

```bash
# Full reset
rm -rf apps/docs/.next && nx reset && nx dev docs
```

// turbo-all

## 6. CORS/API Issues

External APIs (like Codecov) often block client requests. Use API routes as proxies:

```tsx
// src/app/api/stats/route.ts
export async function GET() {
  const data = await fetch('https://external-api.com/data');
  return Response.json(await data.json());
}

// Client calls /api/stats instead of external URL
```

## 7. Grid Responsiveness (Mobile)

Always specify mobile-first grid columns:

```tsx
// ✓ Correct
className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';

// ✗ Wrong (no base grid-cols-1)
className = 'grid md:grid-cols-3 gap-6';
```

## Quick Reference: Error → Fix

| Error                             | Fix                                                |
| --------------------------------- | -------------------------------------------------- |
| `Module factory is not available` | Restart dev server (`nx reset && nx dev docs`)     |
| `useState is not defined`         | Explicit React import + extract to separate file   |
| `Hydration mismatch` (portal)     | Use ref-based portal pattern with double-gate      |
| `Failed to fetch` (CORS)          | Create API route proxy                             |
| `ssr: false not allowed`          | Move to separate component, not mdx-components.tsx |
