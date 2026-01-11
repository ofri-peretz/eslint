# ESLint Interlace Documentation UX Improvement Plan

## Overview

This implementation plan addresses UI/UX issues across the ESLint Interlace documentation site, organized by priority and complexity.

---

## ✅ COMPLETED

### Article Cards - Core Layout (P1)

- [x] Author information moved BELOW the thumbnail image
- [x] Calendar icon added next to release date
- [x] Reading time displayed on right side of author section
- [x] Dev.to badge margin improved (top-5 left-5 instead of top-4 left-4)
- [x] Reactions and comments count in footer
- [x] Views count placeholder (API limitation - requires authenticated Dev.to API key)

**Status**: Verified working via screenshot

---

## IN PROGRESS

### Article Cards - Remaining Issues (P1)

- [ ] **Hashtags/Metadata Layout** - Need to verify spacing between hashtags and engagement stats
- [ ] **Missing Views Count** - Dev.to public API doesn't return `page_views_count` - needs investigation

---

## PENDING TASKS - Priority 1 (Critical UX Issues)

### 1. Menu Transparency & Z-Index Issues

**Description**: Menu is partially transparent and has z-index issues causing content to overlap (e.g., secure coding appearing on top of main menu)
**Files to modify**:

- `apps/docs/src/styles/global.css` or relevant layout components
- Investigate header/navbar component z-index values
  **Estimated complexity**: Medium
  **Recommended model**: Sonnet 4

### 2. Mobile Responsive Design Fixes

**Description**: Multiple mobile layout issues identified:

- Cinematic showcase section - secure cards partially off-screen
- IDE-like environment layout broken on mobile
- Support leading agents section layout issues
- AST Explorer building blocks missing on mobile
  **Files to investigate**:
- All showcase/hero components
- IDE preview components
- Mobile breakpoint configurations
  **Estimated complexity**: High
  **Recommended model**: Opus 4.5

### 3. Technical Articles Pagination

**Description**: Add pagination to the technical articles page for better UX with many articles
**Files to modify**: `apps/docs/src/components/DevToArticlesContent.tsx`
**Estimated complexity**: Medium
**Recommended model**: Sonnet 4

### 4. Sequence Diagrams Dark Mode Contrast

**Description**: Gray text overlaps with background in dark mode, making diagrams unreadable
**Files to investigate**:

- Mermaid diagram styling
- Dark mode theme variables
  **Estimated complexity**: Low
  **Recommended model**: Gemini Flash

---

## PENDING TASKS - Priority 2 (Important Improvements)

### 5. ESLint Tag Filtering for Articles

**Description**: Filter articles to show only those with ESLint tag for documentation context
**Implementation approach**: Add tag filter to API query or client-side filtering
**Files to modify**:

- `apps/docs/src/lib/api.ts`
- `apps/docs/src/components/DevToArticlesContent.tsx`
  **Estimated complexity**: Low
  **Recommended model**: Gemini Flash

### 6. Table of Contents Modernization

**Description**: Layout needs modernization and better UX
**Files to investigate**: TOC component in fumadocs configuration
**Estimated complexity**: Medium
**Recommended model**: Sonnet 4

### 7. Mobile Side Menu Direction

**Description**: Currently opens from right - assess if left opening is more state-of-the-art
**Research needed**: UX best practices for mobile navigation
**Estimated complexity**: Medium  
**Recommended model**: Sonnet 4

### 8. Navigation Cards Consolidation

**Description**: Multiple navigation card types exist - need consistent look and feel
**Consider**: Magic UI interactive effects
**Files to investigate**: All card components across the site
**Estimated complexity**: High
**Recommended model**: Opus 4.5

### 9. Broken Links Audit & Fix

**Description**: Several broken links identified:

- "Further reading" pages returning 404
- "How ESLint tool traversal works" → wrong page
- SAST vs DAST → non-existent OWASP page
  **Approach**: Automated link checker + manual review
  **Estimated complexity**: Medium
  **Recommended model**: Gemini Pro 3

---

## PENDING TASKS - Priority 3 (Polish & Enhancements)

### 10. Plugin Overview Page Badges

**Description**:

- Badges should be on one line (currently two-line layout)
- Badge sizing inconsistent when rate limits reached
  **Estimated complexity**: Low
  **Recommended model**: Gemini Flash

### 11. Dynamic Rule Count

**Description**: Number of rules should be dynamically pulled from package data
**Files to modify**: Plugin overview components
**Estimated complexity**: Low
**Recommended model**: Gemini Flash

### 12. Changelog Link Corrections

**Description**: Links currently go to wrong location
**Current**: `github.com/ofri-peretz/eslint/releases/tag`
**Should be**: `github.com/ofri-peretz/eslint/tree/main/packages/[plugin-name]/changelog`
**Estimated complexity**: Low
**Recommended model**: Gemini Flash

### 13. Magic UI File Tree for Plugin Overview

**Description**: Implement file tree component from magicui.design for plugin file structure display
**External dependency**: Magic UI library
**Estimated complexity**: Medium
**Recommended model**: Sonnet 4

### 14. Rule Documentation Spacing

**Description**: "When not to use it" section needs spacing fixes
**Estimated complexity**: Low
**Recommended model**: Gemini Flash

### 15. Benchmarks Page Error Log Removal

**Description**: Remove error_log file error display from benchmarks page
**Files to modify**: `apps/docs/src/components/BenchmarkChartsContent.tsx`
**Estimated complexity**: Low
**Recommended model**: Gemini Flash

### 16. AST Explorer Title Layout

**Description**: "Interactive AST Explorer" title should be one line with tags below
**Estimated complexity**: Low
**Recommended model**: Gemini Flash

---

## PENDING TASKS - Priority 4 (Internal Tooling)

### 17. Changelog Validation ESLint Rules

**Description**: Create internal ESLint rules to validate changelog markdown files
**Requirements**:

- Check changelog files exist
- Validate consistent formatting
  **Files to create**: New ESLint rule package or addition to existing
  **Estimated complexity**: High
  **Recommended model**: Opus 4.5

---

## PENDING REVIEW

### Top Menu Articles Placement

**Description**: Articles were added to top menu, left of ESLint interface menu
**Action needed**: User to review and confirm if placement makes sense
**No code changes needed until user feedback**

---

## Execution Order Recommendation

### Sprint 1 - Critical Fixes

1. Menu z-index issues (blocks usability)
2. Sequence diagrams dark mode contrast
3. Benchmarks error log removal

### Sprint 2 - Mobile Experience

4. Mobile responsive fixes (all components)
5. Mobile side menu direction assessment

### Sprint 3 - Articles Enhancement

6. Technical articles pagination
7. ESLint tag filtering
8. Broken links audit

### Sprint 4 - Polish

9. Navigation cards consolidation
10. Table of contents modernization
11. Plugin page improvements (badges, dynamic counts, file tree)

### Sprint 5 - Tooling

12. Changelog link fixes
13. Internal ESLint rules for changelog validation

---

## Notes

- **Views Count Limitation**: The Dev.to public API doesn't return `page_views_count` without authentication. To enable this, you would need to use an authenticated API key with proper scope.
- **Magic UI Integration**: Will require adding the `@magicui/react` package as a dependency.
- **Model Recommendations**: Based on task complexity - use Gemini Flash for simple fixes, Sonnet 4 for medium complexity, Opus 4.5 for complex refactoring.
