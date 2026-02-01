# Layout Audit Report: ESLint Interlace Documentation

**Date:** 2026-01-30  
**Page Tested:** `/docs/secure-coding/rules/detect-non-literal-regexp`  
**Status:** 🔴 **CRITICAL ISSUES DETECTED**

---

## Executive Summary

A comprehensive responsive layout test was performed across 6 standard breakpoints. The audit revealed **critical layout violations** that prevent users from viewing documentation content. The main issues stem from:

1. **Content rendering failure** - Main content area is completely blank/black
2. **TOC visibility breach** - Table of Contents visible on mobile/tablet (should be hidden <1280px)
3. **100vh offset void** - Large empty space requiring scroll before content appears
4. **Anti-pattern violations** - JavaScript-controlled layout conflicting with CSS rules

---

## Breakpoint Test Results

| Viewport             | Size     | Sidebar    | TOC                | Content  | Status   |
| :------------------- | :------- | :--------- | :----------------- | :------- | :------- |
| **Mobile Portrait**  | 375×667  | ✅ Hidden  | ❌ Visible         | ❌ Blank | **FAIL** |
| **Mobile Landscape** | 667×375  | ✅ Hidden  | ❌ Visible         | ❌ Blank | **FAIL** |
| **Tablet Portrait**  | 768×1024 | ✅ Visible | ❌ Visible (269px) | ❌ Blank | **FAIL** |
| **Tablet Landscape** | 1024×768 | ✅ Visible | ❌ Visible (269px) | ❌ Blank | **FAIL** |
| **Desktop**          | 1280×800 | ✅ Visible | ✅ Visible (200px) | ❌ Blank | **FAIL** |
| **Wide Desktop**     | 1536×900 | ✅ Visible | ✅ Visible (200px) | ❌ Blank | **FAIL** |

### Expected Behavior per Standards

| Viewport            | Sidebar | TOC Panel | TOC Popover |
| :------------------ | :------ | :-------- | :---------- |
| Mobile (<768px)     | Hidden  | Hidden    | Visible     |
| Tablet (768-1279px) | Visible | Hidden    | Visible     |
| Desktop (≥1280px)   | Visible | Visible   | Hidden      |

---

## Critical Issues Detected

### 🔴 CRITICAL-1: Main Content Not Rendering

**Severity:** Critical  
**Impact:** Users cannot read any documentation content  
**Observed:** All breakpoints show completely blank/black main content area

**Evidence:**

- JavaScript DOM analysis confirms `<article>` element exists but renders at ~713px Y offset
- Content is pushed below the fold by exactly 100vh, requiring full scroll to view

**Root Cause Analysis:**

- The `grid-template-rows` property in `fumadocs-patches.css` may be conflicting with Fumadocs' internal grid
- `LayoutFix.tsx` JavaScript is fighting with CSS media queries causing race conditions

**Recommendation:**

```css
/* In fumadocs-patches.css - Ensure rows don't create void */
#nd-docs-layout {
  grid-template-rows: auto 1fr; /* Remove the 0px middle row */
  min-height: 100dvh;
}
```

---

### 🔴 CRITICAL-2: TOC Visibility at Wrong Breakpoints

**Severity:** Critical  
**Impact:** Mobile/Tablet layouts have unusable content width (~239px on tablet)  
**Observed:** TOC panel (269px) visible at 768px and 1024px widths

**Evidence:**

- TOC visible at tablet portrait showing width of 269px
- TOC visible at tablet landscape showing width of 269px
- Per standards: TOC should be hidden at all viewports <1280px

**Root Cause Analysis:**

- Fumadocs uses Tailwind utility classes like `xl:layout:[--fd-toc-width:268px]`
- CSS specificity war: Fumadocs' compiled utilities override `:root` declarations
- `LayoutFix.tsx` attempts to hide TOC via JS but runs too late or gets overridden

**Current Anti-Pattern in `LayoutFix.tsx`:**

```tsx
// This creates a race condition with CSS
if (toc) {
  toc.style.setProperty('display', 'none', 'important');
}
```

**Fumadocs Best Practice:**
The proper approach is to use Fumadocs' configuration API, not fight its output:

```tsx
// In layout.tsx - Use framework configuration
<DocsLayout
  tree={source.getPageTree()}
  {...baseOptions()}
  sidebar={{ tabs: false }}
  // Configure TOC via Fumadocs API if available
  toc={{
    enabled: true,
    // Or use responsive props if Fumadocs supports them
  }}
>
```

**CSS-Only Fix (if JS must be eliminated):**

```css
/* In toc.css - Higher specificity targeting */
@media (max-width: 1279px) {
  /* Target the actual TOC container element */
  [id='nd-toc'],
  [data-toc],
  aside[class*='toc']:not(.fd-toc-popover),
  #nd-docs-layout > aside:last-of-type:not(:first-of-type) {
    display: none !important;
    width: 0 !important;
    visibility: hidden !important;
    flex: 0 0 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;
    overflow: hidden !important;
  }

  /* Ensure grid doesn't allocate space */
  #nd-docs-layout {
    --fd-toc-width: 0px !important;
  }
}
```

---

### 🟠 HIGH-3: TOC Width Inconsistency

**Severity:** High  
**Impact:** Layout instability, inconsistent spacing across breakpoints  
**Observed:** TOC = 269px on tablet, 200px on desktop (should be 260px or 280px per design tokens)

**Evidence:**

- Tablet shows TOC at 269px (should be hidden, but also this is not a token value)
- Desktop shows TOC at 200px instead of `--layout-toc-width: 260px`

**Root Cause:**

- Multiple sources of truth for TOC width:
  - `design-tokens.css`: `--layout-toc-width: 260px`
  - `LayoutFix.tsx`: hardcoded `260px`
  - Fumadocs internals: `[--fd-toc-width:268px]`

**Recommendation:**
Consolidate all width definitions to `design-tokens.css` and ensure only CSS controls this:

```css
/* In design-tokens.css - Single Source of Truth */
:root {
  --layout-toc-width: 260px;
  --fd-toc-width: var(--layout-toc-width);
}

@media (min-width: 1536px) {
  :root {
    --layout-toc-width: 280px;
    --fd-toc-width: var(--layout-toc-width);
  }
}
```

---

### 🟠 HIGH-4: 100vh Content Offset / Void

**Severity:** High  
**Impact:** Users must scroll a full screen height to see any content  
**Observed:** Mobile portrait shows ~713px of blank space before content

**Evidence:**

- Article element's bounding rect shows Y offset of ~713px (approximately 100vh)
- No visual content appears "above the fold" at page load

**Root Cause:**

- `grid-template-rows: 4rem 0px 1fr` may be collapsing or creating unexpected behavior
- The `0px` middle row might be forcing content into a position that requires scroll

**Current Code in `fumadocs-patches.css`:**

```css
#nd-docs-layout {
  grid-template-rows: var(--layout-grid-rows, 4rem 0px 1fr);
}
```

**Recommendation:**

```css
/* Simplified grid rows without the void-creating middle row */
#nd-docs-layout {
  grid-template-rows: var(--layout-header-height) 1fr;
  /* Or let Fumadocs handle rows entirely */
}
```

---

### 🟡 MEDIUM-5: TOC Popover Trigger Broken on Mobile

**Severity:** Medium  
**Impact:** Mobile users cannot access table of contents via popover  
**Observed:** TOC trigger button only 32px wide, text truncated

**Evidence:**

- Button visible but too narrow to display "On this page" label
- Touch target may be below 44×44px minimum

**Root Cause:**

- CSS in `toc.css` may be applying tablet/desktop widths to mobile trigger
- Competing visibility rules between TOC panel hiding and popover display

**Current CSS in `toc.css`:**

```css
@media (max-width: 767px) {
  .fd-toc-popover,
  button[data-state] {
    padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem) !important;
    min-height: 2rem !important;
    font-size: var(--font-size-sm, 0.75rem) !important;
  }
}
```

**Recommendation:**

```css
@media (max-width: 767px) {
  /* TOC Popover trigger - ensure proper sizing */
  .fd-toc-popover,
  button[aria-expanded][class*='toc'] {
    min-width: auto !important;
    width: auto !important;
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem) !important;
    min-height: 44px !important; /* WCAG touch target */
    font-size: var(--font-size-base, 0.8125rem) !important;
  }

  /* Ensure icon + text layout */
  .fd-toc-popover svg,
  button[class*='toc'] svg {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }
}
```

---

## Anti-Patterns Identified

### ❌ AP-1: JavaScript Layout Control (VIOLATION)

**File:** `LayoutFix.tsx`  
**Lines:** 42-95

The component uses `setProperty()` with `!important` to control grid columns and element visibility. Per the Modern Layout Architecture standard, this is an explicit anti-pattern that causes:

- Race conditions with CSS media queries
- Hydration mismatches in SSR
- Flash of unstyled content (FOUC)

**Recommended Action:** Eliminate JavaScript layout control entirely. Use pure CSS media queries in `fumadocs-patches.css`.

---

### ❌ AP-5: Multiple Sources of Truth (VIOLATION)

**Files:** `design-tokens.css`, `LayoutFix.tsx`, Fumadocs internals

Breakpoint and dimension values are defined in:

1. `BREAKPOINTS` constant in TypeScript
2. CSS custom properties in `design-tokens.css`
3. Fumadocs compiled Tailwind utilities

**Recommended Action:** Define all breakpoints and dimensions ONLY in `design-tokens.css`. Remove JavaScript constants.

---

### ❌ AP-8: MutationObserver for Styling (VIOLATION)

**File:** `LayoutFix.tsx`  
**Lines:** 124-134

Using `MutationObserver` to re-apply styles indicates architectural debt.

**Recommended Action:** Remove the observer. If Fumadocs applies inline styles, override them via CSS specificity rather than JS.

---

## Recommended Remediation Plan

### Phase 1: Emergency Content Fix (Immediate)

1. **Investigate grid rows** - Check if `grid-template-rows: 4rem 0px 1fr` is causing the void
2. **Temporarily simplify** - Set `grid-template-rows: auto 1fr` to restore content visibility
3. **Test at all breakpoints** after change

### Phase 2: TOC Responsiveness Fix (Priority)

1. **Remove TOC logic from LayoutFix.tsx**
2. **Add robust CSS hiding rules** in `toc.css` with high specificity
3. **Ensure popover trigger remains visible** when TOC panel is hidden

### Phase 3: Eliminate JavaScript Layout Control (Standard)

1. **Migrate all responsive logic to CSS**
2. **Remove `LayoutFix.tsx`** or reduce to minimal subnav centering only
3. **Use Fumadocs configuration API** where available

### Phase 4: Consolidate Design Tokens (Best Practice)

1. **Single source of truth** in `design-tokens.css`
2. **Remove hardcoded values** from TypeScript
3. **Document token usage** in code comments

---

## Files Requiring Changes

| File                   | Priority | Changes Needed                                         |
| :--------------------- | :------- | :----------------------------------------------------- |
| `fumadocs-patches.css` | P0       | Fix grid rows, enhance TOC hiding rules                |
| `LayoutFix.tsx`        | P1       | Remove all layout control, or delete entirely          |
| `toc.css`              | P1       | Add breakpoint-specific hiding with higher specificity |
| `design-tokens.css`    | P2       | Consolidate all dimension/breakpoint values            |
| `sidebar.css`          | P3       | Verify mobile hiding works correctly                   |

---

## Appendix: Screenshots

| Breakpoint       | File Path                                      |
| :--------------- | :--------------------------------------------- |
| Mobile Portrait  | `~/.gemini/.../mobile_portrait_layout_*.png`   |
| Mobile Scrolled  | `~/.gemini/.../mobile_portrait_scrolled_*.png` |
| Tablet Landscape | `~/.gemini/.../tablet_landscape_layout_*.png`  |
| Desktop          | `~/.gemini/.../desktop_layout_*.png`           |
| Wide Desktop     | `~/.gemini/.../wide_desktop_layout_*.png`      |

---

**Auditor:** Antigravity AI Agent  
**Standards Reference:** `.agent/workflows/layout-test.md`, `modern_layout_architecture.md`
