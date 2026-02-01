# Interlace Docs App: Layout & Styling Architecture Recommendations

> **Document Purpose**: This document provides a comprehensive analysis of the current layout/styling issues in the Interlace ESLint documentation app and prescribes a scalable, maintainable architecture for state-of-the-art UI/UX.
>
> **Tech Stack**: Next.js 15 + Fumadocs UI + Tailwind CSS + React 19
>
> **Date**: January 30, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State: Critical Issues](#current-state-critical-issues)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Target Architecture](#target-architecture)
5. [Implementation Plan](#implementation-plan)
6. [Quick Fixes (Immediate)](#quick-fixes-immediate)
7. [Design Tokens Standard](#design-tokens-standard)
8. [File Structure Reference](#file-structure-reference)
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
10. [Validation Checklist](#validation-checklist)

---

## Executive Summary

The Interlace docs app has **critical layout issues** caused by architectural debt in the styling layer. The primary problems are:

1. **CSS/JS Layout Conflicts**: A React component (`LayoutFix.tsx`) fights against CSS rules for control of the same layout properties
2. **Specificity Wars**: 500+ `!important` declarations in a 1,947-line `global.css` file
3. **Framework Resistance**: Custom styles override Fumadocs' built-in responsive behavior instead of extending it
4. **Fragmented Responsive Logic**: Breakpoint definitions exist in 3 separate locations

**Result**: Content overlaps sidebar, TOC overlaps content, layout breaks at multiple viewport sizes.

**Solution**: Adopt a "Framework-First" approach where Fumadocs owns layout behavior, and custom styles only extend theming.

---

## Current State: Critical Issues

### Issue 1: Sidebar/Content Overlap

**Symptom**: The sidebar navigation renders on top of the main content, making 20-30% of text unreadable.

**Location in Code**:

```
src/app/global.css (lines 1530-1700) - Sidebar styling overrides
src/components/LayoutFix.tsx - JavaScript style mutations
```

**Visual Evidence**: At viewport widths between 768px-1280px, the sidebar and content columns overlap due to conflicting grid specifications.

---

### Issue 2: TOC Word-Breaking

**Symptom**: Table of Contents items break mid-word (e.g., "Vulnera bility and Risk").

**Cause**: Fixed width container with `overflow: hidden` and no `word-break` rules.

**Location in Code**:

```css
/* global.css line ~1730 */
.fd-toc-item {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
```

---

### Issue 3: Duplicate Component Mounting

**Symptom**: `LayoutFix` component applies styles twice, causing flash of unstyled content (FOUC).

**Location in Code**:

```tsx
// src/app/layout.tsx (line 152)
<LayoutFix />

// src/app/docs/layout.tsx (line 16)
<LayoutFix />
```

**Impact**: Two MutationObservers, two useEffect hooks, potential infinite style loops.

---

### Issue 4: Missing Footer

**Symptom**: Documentation pages end abruptly without navigation or metadata.

**Expected Elements**:

- "Edit this page on GitHub" link
- "Last updated" timestamp
- Previous/Next page navigation
- Copyright notice

---

### Issue 5: Mystery Floating Button

**Symptom**: A circular "N" button appears in the bottom-left corner with no label or tooltip.

**Impact**: Violates discoverability principle - users cannot understand its purpose.

---

## Root Cause Analysis

### RCA-1: Framework Resistance Pattern

**Current Pattern** (Anti-Pattern):

```
User Request → Custom CSS with !important → Breaks Fumadocs → LayoutFix.tsx patches JS → CSS reacts → Infinite cycle
```

**Target Pattern**:

```
User Request → Fumadocs Configuration API → CSS Variables for theming only → No JavaScript intervention
```

---

### RCA-2: Triple Source of Truth for Breakpoints

**Current State**:

| Source              | Mobile              | Tablet | Desktop   | Wide |
| ------------------- | ------------------- | ------ | --------- | ---- |
| `breakpoints.ts`    | 0                   | 768    | 1280      | 1536 |
| `global.css` @media | varies              | 768    | 1280/1279 | -    |
| `useResponsive.ts`  | uses breakpoints.ts | -      | -         | -    |

**Problem**: CSS uses `1279px` as max-width, JS uses `1280px` as min-width. At exactly 1280px width, behavior is undefined.

**Target State**: Single source in CSS custom properties, consumed by both CSS and JS.

---

### RCA-3: Monolithic CSS File

**Current**: `global.css` = 1,947 lines, 50KB

**Problems**:

- No separation of concerns
- Difficult to find specific rules
- Cannot tree-shake unused styles
- Merge conflicts frequent

**Target**: Modular CSS with clear responsibilities per file.

---

## Target Architecture

### Principle 1: Framework-First

Let Fumadocs own:

- Grid layout (sidebar, content, TOC columns)
- Responsive breakpoint behavior
- Sidebar collapse/expand on mobile
- TOC visibility toggling

Custom code owns:

- Color theming (CSS custom properties)
- Typography scale
- Component-specific styling (via CSS Modules)
- Animations and micro-interactions

---

### Principle 2: CSS Custom Properties as Single Source

```css
/* design-tokens.css */
:root {
  /* Layout Dimensions */
  --layout-sidebar-width: 260px;
  --layout-toc-width: 260px;
  --layout-header-height: 4rem;
  --layout-max-content-width: 900px;
  --layout-content-padding: 2rem;

  /* Spacing Scale (8px base) */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-12: 3rem; /* 48px */

  /* Typography Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Z-Index Scale */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 400;
}

/* Responsive Overrides - Pure CSS, No JS Required */
@media (max-width: 1279px) {
  :root {
    --layout-toc-width: 0px;
  }
}

@media (max-width: 767px) {
  :root {
    --layout-sidebar-width: 0px;
    --layout-content-padding: 1rem;
  }
}
```

---

### Principle 3: Component-Scoped Styles

For custom components, use CSS Modules:

```tsx
// components/QuickSummary/QuickSummary.tsx
import styles from './QuickSummary.module.css';

export function QuickSummary({ data }) {
  return (
    <table className={styles.table}>
      <thead className={styles.header}>{/* ... */}</thead>
    </table>
  );
}
```

```css
/* components/QuickSummary/QuickSummary.module.css */
.table {
  width: 100%;
  border-collapse: collapse;
  border-radius: var(--radius);
  overflow: hidden;
}

.header {
  background: hsl(var(--fd-accent));
}

.header th {
  padding: var(--space-3) var(--space-4);
  font-weight: 600;
  text-align: left;
}
```

**Benefits**:

- Scoped class names (no global conflicts)
- Dead code elimination at build time
- Co-located with component logic

---

### Principle 4: Minimal Fumadocs Patches

If Fumadocs has a bug that requires patching, isolate patches in a dedicated file with clear documentation:

```css
/* fumadocs-patches.css */
/**
 * FUMADOCS PATCHES
 * 
 * These are temporary fixes for Fumadocs bugs.
 * Each patch should reference a GitHub issue if filed.
 * Remove patches when upstream fixes are released.
 */

/**
 * Patch: Grid row collapse on hydration
 * Issue: https://github.com/fuma-nama/fumadocs/issues/XXX
 * Applied: 2026-01-30
 */
#nd-docs-layout {
  grid-template-rows: var(--layout-header-height) 0px 1fr;
}

/**
 * Patch: Breadcrumb vertical alignment
 * Issue: Internal - Fumadocs subnav height mismatch
 * Applied: 2026-01-30
 */
#nd-subnav {
  display: flex;
  align-items: center;
  min-height: var(--layout-header-height);
}
```

**Rules for Patches**:

- Maximum 50 lines total
- Each patch must have a comment explaining why
- Check quarterly if patches are still needed
- Never use `!important` unless absolutely required

---

## Implementation Plan

### Phase 1: Emergency Stabilization (1 hour)

**Goal**: Fix the critical overlap issue without refactoring.

1. Remove duplicate `<LayoutFix />` from `src/app/layout.tsx`
2. Add z-index stacking context to `#nd-docs-layout`
3. Add `overflow: hidden` to grid children

**Files Modified**:

- `src/app/layout.tsx`
- `src/app/global.css` (add 10 lines)

---

### Phase 2: Extract Design Tokens (30 min)

**Goal**: Create single source of truth for design values.

1. Create `src/app/styles/design-tokens.css`
2. Extract all hardcoded values from `global.css`
3. Import tokens at top of `global.css`

**Files Created**:

- `src/app/styles/design-tokens.css`

---

### Phase 3: Modularize CSS (2 hours)

**Goal**: Split monolithic CSS into focused modules.

**Before**:

```
src/app/global.css (1,947 lines)
```

**After**:

```
src/app/
├── global.css (50 lines - imports only)
├── styles/
│   ├── design-tokens.css (100 lines)
│   ├── fumadocs-theme.css (150 lines - colors, typography)
│   ├── fumadocs-patches.css (50 lines - documented bug fixes)
│   ├── components/
│   │   ├── code-blocks.css (80 lines)
│   │   ├── tables.css (50 lines)
│   │   ├── callouts.css (40 lines)
│   │   ├── toc.css (60 lines)
│   │   ├── sidebar.css (80 lines)
│   │   └── mermaid.css (100 lines)
│   └── utilities.css (50 lines - accessibility, responsive helpers)
```

---

### Phase 4: Eliminate LayoutFix (30 min)

**Goal**: Remove JavaScript layout manipulation entirely.

1. Delete `src/components/LayoutFix.tsx`
2. Delete `src/lib/useResponsive.ts`
3. Delete `src/lib/breakpoints.ts`
4. Remove imports from layout files
5. Ensure CSS handles all responsive behavior

**Files Deleted**:

- `src/components/LayoutFix.tsx`
- `src/lib/useResponsive.ts`
- `src/lib/breakpoints.ts`

**Files Modified**:

- `src/app/layout.tsx`
- `src/app/docs/layout.tsx`

---

### Phase 5: Add Missing UI Elements (1 hour)

**Goal**: Implement footer and fix mystery button.

1. Create `src/components/PageFooter/PageFooter.tsx`
2. Add "Edit on GitHub", "Last updated", pagination
3. Label or remove the "N" button
4. Add proper ARIA labels to icon-only buttons

---

## Quick Fixes (Immediate)

If you need to fix the layout immediately without the full refactor, apply these patches:

### Quick Fix 1: Remove Duplicate LayoutFix

```tsx
// src/app/layout.tsx
// REMOVE this line (approximately line 152):
// <LayoutFix />
```

Keep `<LayoutFix />` only in `src/app/docs/layout.tsx`.

---

### Quick Fix 2: Add Stacking Context

Add to `global.css`:

```css
/* === EMERGENCY LAYOUT FIX === */
#nd-docs-layout {
  isolation: isolate;
}

#nd-docs-layout > aside:first-child {
  z-index: 40;
  position: relative;
}

#nd-docs-layout > main {
  z-index: 30;
  position: relative;
}

#nd-docs-layout > aside:last-child {
  z-index: 20;
  position: relative;
}

/* Prevent grid blowout */
#nd-docs-layout > * {
  min-width: 0;
  overflow-x: hidden;
}
```

---

### Quick Fix 3: Fix TOC Word Breaking

Replace the existing TOC item styling:

```css
.fd-toc-item {
  white-space: normal; /* Allow wrapping */
  word-break: break-word;
  hyphens: auto;
  overflow: visible;
}
```

---

## Design Tokens Standard

### Color Tokens

Maintain Fumadocs compatibility by using their HSL format:

```css
:root {
  /* Primary Brand */
  --fd-primary: 263 80% 45%;
  --fd-primary-foreground: 0 0% 100%;

  /* Surfaces */
  --fd-background: 0 0% 100%;
  --fd-foreground: 0 0% 9%;
  --fd-card: 0 0% 100%;
  --fd-card-foreground: 0 0% 9%;

  /* Semantic */
  --fd-muted: 0 0% 96%;
  --fd-muted-foreground: 0 0% 25%; /* WCAG 7:1 on white */
  --fd-accent: 270 50% 97%;
  --fd-accent-foreground: 263 80% 30%;
  --fd-border: 0 0% 88%;
}

.dark {
  --fd-primary: 270 75% 75%;
  --fd-primary-foreground: 0 0% 5%;
  --fd-background: 222 22% 8%;
  --fd-foreground: 0 0% 95%;
  --fd-muted-foreground: 0 0% 72%; /* WCAG 7:1 on dark */
}
```

### Spacing Tokens

Use 4px base unit:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
}
```

### Typography Tokens

```css
:root {
  /* Font Families */
  --font-sans: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.8125rem; /* 13px */
  --text-base: 0.875rem; /* 14px */
  --text-md: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## File Structure Reference

### Target Directory Structure

```
apps/docs/src/
├── app/
│   ├── global.css              # Imports only (~50 lines)
│   ├── layout.tsx              # Root layout (NO LayoutFix)
│   ├── docs/
│   │   └── layout.tsx          # Docs layout (Fumadocs config only)
│   └── styles/
│       ├── design-tokens.css   # CSS custom properties
│       ├── fumadocs-theme.css  # Colors, typography
│       ├── fumadocs-patches.css # Documented bug fixes
│       ├── utilities.css       # Helpers, accessibility
│       └── components/
│           ├── code-blocks.css
│           ├── tables.css
│           ├── callouts.css
│           ├── toc.css
│           ├── sidebar.css
│           └── mermaid.css
├── components/
│   ├── QuickSummary/
│   │   ├── QuickSummary.tsx
│   │   └── QuickSummary.module.css
│   ├── PageFooter/
│   │   ├── PageFooter.tsx
│   │   └── PageFooter.module.css
│   └── ... (other components with co-located styles)
└── lib/
    └── source.ts               # Fumadocs source config
    # NOTE: breakpoints.ts, useResponsive.ts DELETED
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: JavaScript Layout Control

```tsx
// DON'T DO THIS
useEffect(() => {
  document.getElementById('layout').style.gridTemplateColumns =
    '260px 1fr 260px';
}, []);
```

**Why**: Creates race conditions with CSS, causes FOUC, adds bundle size.

**Do Instead**: Use CSS custom properties that cascade naturally.

---

### ❌ Anti-Pattern 2: Wildcard Class Selectors

```css
/* DON'T DO THIS */
[class*="sidebar"] a { ... }
button[data-state][class*="toc"] { ... }
```

**Why**: Matches unintended elements, breaks when framework updates class names.

**Do Instead**: Target specific Fumadocs classes or use CSS Modules.

---

### ❌ Anti-Pattern 3: !important Overuse

```css
/* DON'T DO THIS */
.fd-toc-item {
  font-size: 0.8125rem !important;
  padding: 0.5rem 0 !important;
  color: hsl(var(--fd-muted-foreground)) !important;
}
```

**Why**: Creates specificity debt, makes debugging impossible.

**Do Instead**: Increase selector specificity naturally or use CSS Layers.

---

### ❌ Anti-Pattern 4: Inline Responsive Logic

```tsx
// DON'T DO THIS
const isMobile = useResponsive().width < 768;
return isMobile ? <MobileComponent /> : <DesktopComponent />;
```

**Why**: Causes hydration mismatch, requires SSR-safe wrapper, adds complexity.

**Do Instead**: Use CSS media queries and show/hide with `display`.

---

### ❌ Anti-Pattern 5: Multiple Sources of Truth

```
breakpoints.ts  →  DESKTOP = 1280
global.css      →  @media (min-width: 1280px)
global.css      →  @media (max-width: 1279px)
useResponsive.ts → uses breakpoints.ts
```

**Why**: Values drift over time, edge cases at exact breakpoint.

**Do Instead**: Define breakpoints once in CSS custom properties.

---

## Validation Checklist

After implementing fixes, validate with this checklist:

### Layout Integrity

- [ ] Sidebar does not overlap main content at any viewport width
- [ ] TOC does not overlap main content at any viewport width
- [ ] Grid maintains proper column ratios from 320px to 2560px width
- [ ] No horizontal scrollbar appears at any viewport

### Responsive Behavior

- [ ] TOC panel visible at ≥1280px, hidden below
- [ ] TOC popover trigger visible at <1280px
- [ ] Sidebar collapsed to hamburger at <768px
- [ ] Content readable at 320px width (mobile)

### Typography

- [ ] No text truncation in TOC items
- [ ] No orphaned words in headings
- [ ] Consistent font sizes across components
- [ ] Proper line-height for readability

### Accessibility

- [ ] All interactive elements have visible focus states
- [ ] Skip-to-content link present and functional
- [ ] Touch targets ≥44x44px on mobile
- [ ] Color contrast ≥4.5:1 for body text

### Performance

- [ ] No JavaScript layout thrashing (check DevTools Performance)
- [ ] CSS file size <20KB gzipped
- [ ] No `!important` used except in `fumadocs-patches.css`
- [ ] No FOUC on page load

### Code Quality

- [ ] `global.css` <100 lines
- [ ] No `useEffect` for layout styling
- [ ] CSS Modules used for custom components
- [ ] Design tokens used for all hardcoded values

---

## Appendix: Current File Analysis

### Files to Modify

| File                      | Lines | Action             |
| ------------------------- | ----- | ------------------ |
| `src/app/global.css`      | 1,947 | Split into modules |
| `src/app/layout.tsx`      | 162   | Remove LayoutFix   |
| `src/app/docs/layout.tsx` | 22    | Remove LayoutFix   |

### Files to Delete

| File                           | Lines | Reason                 |
| ------------------------------ | ----- | ---------------------- |
| `src/components/LayoutFix.tsx` | 83    | Anti-pattern           |
| `src/lib/useResponsive.ts`     | 126   | Replaced by CSS        |
| `src/lib/breakpoints.ts`       | 101   | Replaced by CSS tokens |

### Files to Create

| File                                  | Purpose                   |
| ------------------------------------- | ------------------------- |
| `src/app/styles/design-tokens.css`    | CSS custom properties     |
| `src/app/styles/fumadocs-theme.css`   | Color/typography theming  |
| `src/app/styles/fumadocs-patches.css` | Documented bug fixes      |
| `src/app/styles/utilities.css`        | Accessibility, helpers    |
| `src/app/styles/components/*.css`     | Component-specific styles |
| `src/components/PageFooter/`          | Footer component          |

---

**Document Version**: 1.0  
**Author**: Architecture Review  
**Status**: Ready for Implementation
