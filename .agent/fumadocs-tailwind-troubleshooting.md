# Fumadocs + Tailwind v4 Troubleshooting Guide

## Critical Issue: Tailwind v4 Arbitrary Property Classes Not Being Compiled

### Symptoms

- **Broken layout**: Huge blank gap at top of pages, content pushed down by ~900px
- **Grid areas not working**: Classes like `[grid-area:toc]` computed as `grid-area: auto`
- **Responsive classes ignored**: `xl:hidden` not hiding elements on large screens
- **Typography not matching**: H1 and other text elements have wrong spacing/size
- **TOC popover visible on desktop**: Should only show on mobile

### Root Cause

Tailwind CSS v4 uses automatic content detection but does **NOT** scan `node_modules` by default. Fumadocs-ui uses many arbitrary property classes (e.g., `[grid-area:toc]`, `[grid-area:sidebar]`, `w-(--fd-toc-width)`) that need to be compiled.

### Solution

**Good news:** The `fumadocs-ui/css/preset.css` file **already includes `@source` directives** for scanning its own dist folder. So in most cases, you just need:

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

/* fumadocs-ui/css/preset.css already includes @source directives */
```

This works correctly in an Nx monorepo with pnpm because:

1. `@import` uses PostCSS resolution which finds packages from workspace root `node_modules`
2. The `preset.css` file contains relative `@source` directives that point to its sibling `dist/` folder

**Only add manual `@source` if:** you have custom components in your project that use Tailwind classes and aren't being scanned.

### Verification Steps

1. Clear build cache: `rm -rf .next .source node_modules/.cache`
2. Restart dev server: `npm run dev`
3. Hard refresh browser (Cmd+Shift+R)
4. Check that `grid-area: toc` is applied (not `grid-area: auto`)

### Quick Diagnostic

Run this in browser console to check if classes are compiled:

```javascript
// Should return 'toc' not 'auto'
getComputedStyle(document.getElementById('nd-toc')).gridArea;
```

## Other Common Issues

### TOC Popover Visible on Desktop

If the TOC popover (circle + text) shows on xl+ screens, Fumadocs' default `xl:hidden` class isn't being applied. Add this to `global.css`:

```css
@layer components {
  @media (min-width: 1280px) {
    button[data-toc-popover-trigger],
    div[data-toc-popover-content] {
      display: none !important;
    }
  }
}
```

### Side TOC Visible on Mobile

If the sidebar TOC shows on small screens, add:

```css
@layer components {
  @media (max-width: 1279px) {
    #nd-toc {
      display: none !important;
    }
  }
}
```

### Clerk-Style TOC Not Showing Vertical Lines

Ensure `tableOfContent={{ style: 'clerk' }}` is set in `DocsPage`:

```tsx
<DocsPage
  toc={page.data.toc}
  tableOfContent={{ style: 'clerk' }}
>
```

## Related Files

- `apps/docs/src/app/global.css` - Main CSS file
- `apps/docs/postcss.config.mjs` - PostCSS config (should use `@tailwindcss/postcss`)
- `apps/docs/src/app/docs/[[...slug]]/page.tsx` - DocsPage component with TOC config
