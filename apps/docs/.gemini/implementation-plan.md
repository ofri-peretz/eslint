# Interlace ESLint Documentation Portal

## Implementation Plan & Architecture Recommendations

> **Generated:** 2026-01-31  
> **Framework:** Fumadocs (Next.js)  
> **Status:** Proposal - Awaiting Approval

---

## Executive Summary

This document outlines the architecture and implementation roadmap for the Interlace ESLint Documentation Portal using a **Fumadocs-first** approach. The strategy prioritizes native Fumadocs components, layouts, and patterns while reserving custom components (MagicUI) for specific homepage enhancements only.

**Core Principles:**

1. **Use Fumadocs Native** - Layouts, components, and styling from Fumadocs UI
2. **100% Remote Content** - All documentation fetched from GitHub at runtime via `@fumadocs/mdx-remote`
3. **Minimal Custom Code** - Only MagicUI components for homepage visual effects
4. **Framework Alignment** - Follow Fumadocs conventions for all configurations

---

## 🚀 Task Breakdown (Execution Order)

### Overview

```
PHASE 0: Theme Setup (Foundation) ─────────────────────────────────┐
                                                                    │
PHASE 1: Layout & Navigation ◄─────────────────────────────────────┤
         ├── 1.1 DocsLayout Configuration                          │
         ├── 1.2 Sidebar Tabs (3-pillar)                           │
         └── 1.3 TOC Clerk Style                                   │
                 │                                                  │
PHASE 2: Remote Content (Core Feature) ◄───────────────────────────┤
         ├── 2.1 GitHub Content Fetcher                            │
         ├── 2.2 MDX Remote Compiler                               │
         ├── 2.3 Plugin Overview Pages                             │
         ├── 2.4 Rule Documentation Pages                          │
         └── 2.5 Changelog Aggregation                             │
                 │                                                  │
PHASE 3: Search & Discovery ◄──────────────────────────────────────┤
         └── 3.1 Orama Search with Tags                            │
                 │                                                  │
PHASE 4: Enhanced Markdown ◄───────────────────────────────────────┤
         ├── 4.1 Mermaid Diagrams                                  │
         ├── 4.2 Twoslash TypeScript                               │
         └── 4.3 Math (KaTeX) [Optional]                           │
                 │                                                  │
PHASE 5: Homepage & MagicUI ◄──────────────────────────────────────┤
         ├── 5.1 Install MagicUI Components                        │
         ├── 5.2 Homepage Layout                                   │
         └── 5.3 Dev.to Articles Integration                       │
                 │                                                  │
PHASE 6: OG Images & SEO ◄─────────────────────────────────────────┤
         └── 6.1 Takumi OG Generation                              │
                 │                                                  │
PHASE 7: Quality Gates ◄───────────────────────────────────────────┘
         ├── 7.1 Link Validation
         └── 7.2 Revalidation Webhooks
```

---

### PHASE 0: Theme Setup (Foundation)

| Task    | Description                                   | Effort | Dependencies |
| ------- | --------------------------------------------- | ------ | ------------ |
| **0.1** | Update `global.css` with purple theme imports | 15 min | None         |
| **0.2** | Add Interlace brand color overrides           | 15 min | 0.1          |

**Files to modify:**

- `src/app/global.css`

**Acceptance Criteria:**

- [ ] Purple theme renders correctly
- [ ] Dark/light mode toggle works
- [ ] Brand purple (`hsl(271, 91%, 65%)`) visible on primary elements

---

### PHASE 1: Layout & Navigation

| Task    | Description                                                       | Effort | Dependencies |
| ------- | ----------------------------------------------------------------- | ------ | ------------ |
| **1.1** | Configure DocsLayout with base-options                            | 30 min | Phase 0      |
| **1.2** | Set up 3-pillar sidebar tabs (Security, Quality, Getting Started) | 30 min | 1.1          |
| **1.3** | Enable TOC clerk style                                            | 10 min | 1.1          |

**Files to modify:**

- `src/lib/base-options.ts` (create)
- `src/app/docs/layout.tsx`
- `content/docs/meta.json` (verify `root: true`)

**Acceptance Criteria:**

- [ ] Sidebar displays with 3 tabs
- [ ] Navigation expands/collapses correctly
- [ ] TOC shows vertical indicator (clerk style)
- [ ] Mobile hamburger menu works

---

### PHASE 2: Remote Content (Critical)

| Task    | Description                                                        | Effort | Dependencies |
| ------- | ------------------------------------------------------------------ | ------ | ------------ |
| **2.1** | Create GitHub content fetcher utility                              | 45 min | None         |
| **2.2** | Set up MDX Remote compiler                                         | 30 min | 2.1          |
| **2.3** | Implement plugin overview pages (`/docs/[plugin]`)                 | 1 hr   | 2.2          |
| **2.4** | Implement rule documentation pages (`/docs/[plugin]/rules/[rule]`) | 1 hr   | 2.3          |
| **2.5** | Implement aggregated changelog page                                | 30 min | 2.2          |
| **2.6** | Set up revalidation API route                                      | 30 min | 2.2          |

**Files to create:**

- `src/lib/github-content.ts`
- `src/lib/mdx-compiler.ts`
- `src/app/docs/(security)/[plugin]/page.tsx`
- `src/app/docs/(security)/[plugin]/rules/[rule]/page.tsx`
- `src/app/docs/changelog/page.tsx`
- `src/app/api/revalidate/route.ts`

**Acceptance Criteria:**

- [ ] Plugin README renders from GitHub
- [ ] Rule documentation renders from GitHub
- [ ] TOC extracts correctly from remote content
- [ ] Content caches with 1-hour ISR
- [ ] Webhook triggers cache invalidation

---

### PHASE 3: Search & Discovery

| Task    | Description                                    | Effort | Dependencies |
| ------- | ---------------------------------------------- | ------ | ------------ |
| **3.1** | Create custom search dialog with category tabs | 1.5 hr | Phase 1      |

**Files to create:**

- `src/components/search.tsx`

**Files to modify:**

- `src/app/layout.tsx` (integrate search provider)

**Acceptance Criteria:**

- [ ] Search dialog opens on Cmd+K
- [ ] Results filter by Security/Quality/Framework tabs
- [ ] Results link to correct pages

---

### PHASE 4: Enhanced Markdown

| Task    | Description                                    | Effort | Dependencies |
| ------- | ---------------------------------------------- | ------ | ------------ |
| **4.1** | Set up Mermaid diagram rendering               | 30 min | Phase 0      |
| **4.2** | Configure Twoslash for TypeScript IntelliSense | 45 min | Phase 0      |
| **4.3** | Add KaTeX for math equations (optional)        | 20 min | Phase 0      |

**Dependencies to install:**

```bash
npm install mermaid next-themes fumadocs-twoslash twoslash
npm install remark-math rehype-katex katex  # Optional
```

**Files to create/modify:**

- `src/components/mdx/mermaid.tsx`
- `source.config.ts` (add Twoslash transformer)
- `mdx-components.tsx` (register components)

**Acceptance Criteria:**

- [ ] Mermaid diagrams render in dark/light mode
- [ ] TypeScript code shows hover types
- [ ] Math equations render (if enabled)

---

### PHASE 5: Homepage & MagicUI

| Task    | Description                               | Effort | Dependencies |
| ------- | ----------------------------------------- | ------ | ------------ |
| **5.1** | Install MagicUI components via shadcn CLI | 20 min | None         |
| **5.2** | Build homepage with HomeLayout            | 1.5 hr | 5.1          |
| **5.3** | Integrate Dev.to articles API             | 1 hr   | Phase 2      |

**Commands:**

```bash
npx shadcn@latest init
npx shadcn@latest add "https://magicui.design/r/shimmer-button"
npx shadcn@latest add "https://magicui.design/r/number-ticker"
npx shadcn@latest add "https://magicui.design/r/border-beam"
```

**Files to create:**

- `src/app/(home)/page.tsx`
- `src/app/(home)/layout.tsx`
- `src/app/api/devto-articles/route.ts`

**Acceptance Criteria:**

- [ ] Homepage displays with MagicUI effects
- [ ] Statistics animate on scroll
- [ ] Dev.to articles load and filter by plugin relevance

---

### PHASE 6: OG Images & SEO

| Task    | Description                       | Effort | Dependencies |
| ------- | --------------------------------- | ------ | ------------ |
| **6.1** | Set up Takumi OG image generation | 1 hr   | Phase 2      |

**Dependencies to install:**

```bash
npm install @takumi-rs/image-response
```

**Files to create:**

- `src/app/og/docs/[...slug]/route.tsx`

**Files to modify:**

- `next.config.mjs` (add serverExternalPackages)

**Acceptance Criteria:**

- [ ] OG images generate for all doc pages
- [ ] Images use WebP format
- [ ] Social preview shows title + description

---

### PHASE 7: Quality Gates

| Task    | Description                                | Effort | Dependencies |
| ------- | ------------------------------------------ | ------ | ------------ |
| **7.1** | Create link validation script              | 30 min | Phase 2      |
| **7.2** | Configure GitHub webhooks for revalidation | 20 min | 2.6          |

**Dependencies to install:**

```bash
npm install next-validate-link
```

**Files to create:**

- `scripts/validate-links.ts`

**Acceptance Criteria:**

- [ ] Link validation runs in CI
- [ ] GitHub pushes trigger content refresh
- [ ] No broken links in production

---

### Priority Matrix

| Priority        | Tasks                     | Total Effort |
| --------------- | ------------------------- | ------------ |
| 🔴 **Critical** | Phase 0, Phase 1, Phase 2 | ~6 hours     |
| 🟡 **High**     | Phase 3, Phase 5          | ~4 hours     |
| 🟢 **Medium**   | Phase 4, Phase 6, Phase 7 | ~3.5 hours   |

**Recommended Sprint Plan:**

- **Day 1**: Phase 0 + Phase 1 + Phase 2 (Core functionality)
- **Day 2**: Phase 3 + Phase 4 (Search + Markdown)
- **Day 3**: Phase 5 + Phase 6 + Phase 7 (Polish + Quality)

---

## Component Strategy: Fumadocs-First

### Native Fumadocs Components (USE THESE)

| Component          | Import                               | Use Case                          |
| ------------------ | ------------------------------------ | --------------------------------- |
| **Accordion**      | `fumadocs-ui/components/accordion`   | FAQ sections, collapsible content |
| **Banner**         | `fumadocs-ui/components/banner`      | Site-wide announcements           |
| **Code Block**     | Auto via MDX                         | Syntax-highlighted code           |
| **Card / Cards**   | `fumadocs-ui/components/card`        | Link grids, feature showcases     |
| **Callout**        | Auto via MDX (`<Callout>`)           | Tips, warnings, notes             |
| **Files**          | `fumadocs-ui/components/files`       | Directory structure display       |
| **GitHub Info**    | `fumadocs-ui/components/github-info` | Repo stats display                |
| **Inline TOC**     | `fumadocs-ui/components/inline-toc`  | In-page navigation                |
| **Steps**          | `fumadocs-ui/components/steps`       | Step-by-step guides               |
| **Tabs**           | `fumadocs-ui/components/tabs`        | Tabbed content sections           |
| **Type Table**     | `fumadocs-ui/components/type-table`  | API documentation                 |
| **Zoomable Image** | `fumadocs-ui/components/image-zoom`  | Image enlargement                 |
| **Graph View**     | `fumadocs-ui/components/graph-view`  | Page relationship visualization   |

### Native Fumadocs Layouts (USE THESE)

| Layout             | Import                          | Use Case                            |
| ------------------ | ------------------------------- | ----------------------------------- |
| **DocsLayout**     | `fumadocs-ui/layouts/docs`      | Documentation pages (sidebar + TOC) |
| **HomeLayout**     | `fumadocs-ui/layouts/home`      | Landing page (full width)           |
| **NotebookLayout** | `fumadocs-ui/layouts/notebook`  | Blog, changelog, legal pages        |
| **DocsPage**       | `fumadocs-ui/layouts/docs/page` | Individual doc page wrapper         |
| **DocsBody**       | `fumadocs-ui/layouts/docs/page` | Content container                   |
| **RootProvider**   | `fumadocs-ui/provider/next`     | Theme, search, context provider     |

### Layout Configuration Pattern

```tsx
// src/lib/base-options.ts
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'ESLint Interlace',
      // logo: <InterlaceLogo />, // Optional
    },
    links: [
      { text: 'Documentation', url: '/docs' },
      {
        text: 'GitHub',
        url: 'https://github.com/interlacelabs',
        external: true,
      },
    ],
    githubUrl: 'https://github.com/interlacelabs',
  };
}
```

```tsx
// src/app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/base-options';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions()}
      tree={source.getPageTree()}
      sidebar={{
        tabs: true, // Enable 3-pillar tab navigation
        defaultOpenLevel: 1, // Expand first level
      }}
      tableOfContent={{
        style: 'clerk', // Vertical indicator style
      }}
    >
      {children}
    </DocsLayout>
  );
}
```

---

### Adding Custom Components (MagicUI) - Native Fumadocs Pattern

Reference: [fumadocs.dev/docs/ui/component-library](https://www.fumadocs.dev/docs/ui/component-library)

Fumadocs uses Radix UI by default. External component libraries like MagicUI can be integrated natively through the `mdx-components.tsx` pattern.

#### Step 1: Configure Component Library (Optional)

If using Fumadocs CLI for component customization, create a `cli.json`:

```json
// cli.json (project root)
{
  "uiLibrary": "radix-ui" // or "base-ui" for Base UI
}
```

#### Step 2: Install MagicUI Components via Shadcn CLI

MagicUI components are distributed via the Shadcn CLI registry:

```bash
# Initialize shadcn (if not already done)
npx shadcn@latest init

# Install MagicUI components
npx shadcn@latest add "https://magicui.design/r/shimmer-button"
npx shadcn@latest add "https://magicui.design/r/border-beam"
npx shadcn@latest add "https://magicui.design/r/number-ticker"
npx shadcn@latest add "https://magicui.design/r/flickering-grid"
```

This installs components to `src/components/ui/` following Shadcn conventions.

#### Step 3: Register in mdx-components.tsx

Make components available in MDX without per-file imports:

```tsx
// mdx-components.tsx (project root)
import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';

// MagicUI components (installed via shadcn CLI)
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { FlickeringGrid } from '@/components/ui/flickering-grid';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    // Spread Fumadocs default components first
    ...defaultComponents,

    // Register MagicUI components (available globally in MDX)
    ShimmerButton,
    BorderBeam,
    NumberTicker,
    FlickeringGrid,

    // Allow per-page overrides
    ...components,
  };
}

// Required export for Next.js MDX
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}
```

#### Step 4: Use in MDX Files

Components are now available without imports:

```mdx
---
title: Homepage
---

<FlickeringGrid className="absolute inset-0 -z-10" />

## Welcome to ESLint Interlace

<ShimmerButton>Get Started</ShimmerButton>

### 180+ Security Rules

<NumberTicker value={180} />
```

#### Step 5: Use in React Components (Homepage)

For tsx files, import directly:

```tsx
// src/app/(home)/page.tsx
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';

export default function HomePage() {
  return (
    <main>
      <h1>ESLint Interlace</h1>
      <p>
        <NumberTicker value={180} /> rules across <NumberTicker value={18} />{' '}
        plugins
      </p>
      <ShimmerButton>Get Started</ShimmerButton>
    </main>
  );
}
```

### MagicUI Components (Homepage Only)

| Component          | Source           | Use Case              | Install Command                                                    |
| ------------------ | ---------------- | --------------------- | ------------------------------------------------------------------ |
| **ShimmerButton**  | `magicui.design` | Primary CTA buttons   | `npx shadcn@latest add "https://magicui.design/r/shimmer-button"`  |
| **BorderBeam**     | `magicui.design` | Animated card borders | `npx shadcn@latest add "https://magicui.design/r/border-beam"`     |
| **NumberTicker**   | `magicui.design` | Animated statistics   | `npx shadcn@latest add "https://magicui.design/r/number-ticker"`   |
| **FlickeringGrid** | `magicui.design` | Hero background       | `npx shadcn@latest add "https://magicui.design/r/flickering-grid"` |
| **Particles**      | `magicui.design` | Ambient effects       | `npx shadcn@latest add "https://magicui.design/r/particles"`       |

### File Structure After Setup

```
src/
├── components/
│   ├── ui/                          # Shadcn + MagicUI components
│   │   ├── shimmer-button.tsx       # Installed via shadcn CLI
│   │   ├── border-beam.tsx
│   │   ├── number-ticker.tsx
│   │   └── flickering-grid.tsx
│   └── ...
├── ...
mdx-components.tsx                    # Register for global MDX use
```

### What NOT to Build Custom

| Feature            | Use Instead                         |
| ------------------ | ----------------------------------- |
| Sidebar navigation | `DocsLayout` with `tree` prop       |
| Table of Contents  | `DocsPage` with `toc` prop          |
| Search dialog      | `RootProvider` with built-in search |
| Breadcrumbs        | Automatic via Fumadocs              |
| Dark mode toggle   | Built into `RootProvider`           |
| Mobile menu        | Built into `DocsLayout`             |
| Code highlighting  | Built into Fumadocs MDX             |

---

## Theme Configuration (Fumadocs Purple)

Reference: [fumadocs.dev/docs/ui/theme](https://www.fumadocs.dev/docs/ui/theme)

### CSS Setup (global.css)

Use the Fumadocs **purple** theme as base, then customize for Interlace brand:

```css
/* src/app/global.css */
@import 'tailwindcss';
@import 'fumadocs-ui/css/purple.css'; /* Purple theme base */
@import 'fumadocs-ui/css/preset.css'; /* Fumadocs preset */

/* 
 * Interlace Brand Overrides (Optional)
 * The purple.css already provides a purple primary color.
 * Override only what's needed for Interlace brand alignment.
 */
@theme {
  /* Light mode overrides */
  --color-fd-primary: hsl(271, 91%, 65%); /* Interlace purple */
  --color-fd-primary-foreground: hsl(0, 0%, 100%);
  --color-fd-ring: hsl(271, 91%, 65%);
}

.dark {
  /* Dark mode overrides */
  --color-fd-primary: hsl(271, 91%, 70%); /* Lighter purple for dark mode */
  --color-fd-primary-foreground: hsl(0, 0%, 9%);
  --color-fd-ring: hsl(271, 91%, 70%);
}
```

### Available Theme Presets

| Theme       | Import                        | Description                 |
| ----------- | ----------------------------- | --------------------------- |
| **neutral** | `fumadocs-ui/css/neutral.css` | Grayscale, no accent        |
| **purple**  | `fumadocs-ui/css/purple.css`  | Purple accent (RECOMMENDED) |
| **blue**    | `fumadocs-ui/css/blue.css`    | Blue accent                 |
| **shadcn**  | `fumadocs-ui/css/shadcn.css`  | Adopts Shadcn UI theme      |

### CSS Variables Reference

All Fumadocs variables can be overridden:

```css
@theme {
  /* Background & Foreground */
  --color-fd-background: hsl(0, 0%, 96%);
  --color-fd-foreground: hsl(0, 0%, 3.9%);

  /* Muted (secondary text) */
  --color-fd-muted: hsl(0, 0%, 96.1%);
  --color-fd-muted-foreground: hsl(0, 0%, 45.1%);

  /* Popover (dropdowns, tooltips) */
  --color-fd-popover: hsl(0, 0%, 98%);
  --color-fd-popover-foreground: hsl(0, 0%, 15.1%);

  /* Card surfaces */
  --color-fd-card: hsl(0, 0%, 94.7%);
  --color-fd-card-foreground: hsl(0, 0%, 3.9%);

  /* Borders */
  --color-fd-border: hsla(0, 0%, 80%, 50%);

  /* Primary action color */
  --color-fd-primary: hsl(0, 0%, 9%);
  --color-fd-primary-foreground: hsl(0, 0%, 98%);

  /* Secondary elements */
  --color-fd-secondary: hsl(0, 0%, 93.1%);
  --color-fd-secondary-foreground: hsl(0, 0%, 9%);

  /* Accent (hover states) */
  --color-fd-accent: hsla(0, 0%, 82%, 50%);
  --color-fd-accent-foreground: hsl(0, 0%, 9%);

  /* Focus ring */
  --color-fd-ring: hsl(0, 0%, 63.9%);
}

.dark {
  --color-fd-background: hsl(0, 0%, 7.04%);
  --color-fd-foreground: hsl(0, 0%, 92%);
  --color-fd-muted: hsl(0, 0%, 12.9%);
  --color-fd-muted-foreground: hsla(0, 0%, 70%, 0.8);
  --color-fd-popover: hsl(0, 0%, 11.6%);
  --color-fd-popover-foreground: hsl(0, 0%, 86.9%);
  --color-fd-card: hsl(0, 0%, 9.8%);
  --color-fd-card-foreground: hsl(0, 0%, 98%);
  --color-fd-border: hsla(0, 0%, 40%, 20%);
  --color-fd-primary: hsl(0, 0%, 98%);
  --color-fd-primary-foreground: hsl(0, 0%, 9%);
  --color-fd-secondary: hsl(0, 0%, 12.9%);
  --color-fd-secondary-foreground: hsl(0, 0%, 92%);
  --color-fd-accent: hsla(0, 0%, 40.9%, 30%);
  --color-fd-accent-foreground: hsl(0, 0%, 90%);
  --color-fd-ring: hsl(0, 0%, 54.9%);
}
```

### Layout Width Customization

```css
:root {
  --fd-layout-width: 1400px; /* Default: 97rem (~1552px) */
}
```

### Fumadocs Core (Headless)

Reference: [fumadocs.dev/docs/headless](https://www.fumadocs.dev/docs/headless)

Fumadocs Core provides headless utilities for building custom UI:

- **Page Tree** utilities for navigation
- **Search** utilities for custom search implementations
- **Breadcrumb** generation utilities
- **MDX** processing tools (remark/rehype plugins)

**When to use Fumadocs Core:**

- Building completely custom layouts (rare)
- Integrating with non-React frameworks
- Advanced search customization

**For our use case:** Stick with `fumadocs-ui` - the pre-built components handle 99% of our needs.

---

## MDX Best Practices (Fumadocs Conventions)

Reference: [fumadocs.dev/docs/markdown](https://www.fumadocs.dev/docs/markdown)

### Frontmatter Standard

Use YAML frontmatter for page metadata. The `title` property renders as the page `<h1>` automatically.

```yaml
---
title: Rule Documentation
description: Prevent insecure URL usage in JavaScript applications
icon: Shield
---
Content starts here (no # heading needed - title is automatic)
```

**Available Frontmatter Properties:**

| Property      | Type                | Purpose                       |
| ------------- | ------------------- | ----------------------------- |
| `title`       | string              | Page title (renders as h1)    |
| `description` | string              | Page description (SEO, cards) |
| `icon`        | string or ReactNode | Sidebar icon                  |
| `full`        | boolean             | Full-width page (no TOC)      |

**⚠️ Important:** Do NOT use `# Heading` for the page title - Fumadocs renders `title` as h1 automatically. Start content with h2 (`##`) or prose.

### Built-in MDX Components

These are included by default via `fumadocs-ui/mdx` - no imports needed in MDX files:

#### Callouts

```mdx
<Callout>Default info callout</Callout>

<Callout type="warn" title="Security Warning">
  This rule prevents XSS vulnerabilities.
</Callout>

<Callout type="error" title="Breaking Change">
  This rule is now enabled by default.
</Callout>

<Callout type="success">Configuration valid!</Callout>

<Callout type="idea">Pro tip: Use with --fix for auto-correction.</Callout>
```

**Callout Types:** `info` (default), `warn`/`warning`, `error`, `success`, `idea`

#### Cards

```mdx
import { HomeIcon } from 'lucide-react';

<Cards>
  <Card href="/docs/browser-security" title="Browser Security">
    12 rules for client-side protection
  </Card>

  <Card
    icon={<HomeIcon />}
    href="/docs/getting-started"
    title="Getting Started"
  >
    Quick installation guide
  </Card>
</Cards>
```

#### Code Blocks (Auto-enhanced)

Fumadocs code blocks support:

````mdx
{/* Basic with title */}

```js title="eslint.config.js"
export default [{ plugins: { security } }];
```
````

{/_ Line highlighting _/}

```ts
const config = {
  rules: {
    'no-insecure-url': 'error', // [!code highlight]
  },
};
```

{/_ Diff styling _/}

```ts
import old from 'legacy'; // [!code --]
import secure from '@interlace/security'; // [!code ++]
```

{/_ Line numbers _/}

```ts lineNumbers
function validate() {
  return true;
}
```

{/_ Tab groups _/}

```bash tab="npm"
npm install eslint-plugin-security
```

```bash tab="pnpm"
pnpm add eslint-plugin-security
```

```bash tab="yarn"
yarn add eslint-plugin-security
```

````

#### Steps

```mdx
import { Steps, Step } from 'fumadocs-ui/components/steps';

<Steps>
  <Step>
    ### Install the plugin
    ```bash
    npm install eslint-plugin-security
    ```
  </Step>
  <Step>
    ### Add to config
    ```js
    import security from 'eslint-plugin-security';
    ```
  </Step>
  <Step>
    ### Run ESLint
    ```bash
    npx eslint .
    ```
  </Step>
</Steps>
````

#### Tabs

```mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={['ESLint 9.x', 'ESLint 8.x']}>
  <Tab value="ESLint 9.x">Flat config format (recommended)</Tab>
  <Tab value="ESLint 8.x">Legacy `.eslintrc` format</Tab>
</Tabs>
```

#### Files (Directory Structure)

```mdx
import { Files, File, Folder } from 'fumadocs-ui/components/files';

<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <Folder name="rules">
      <File name="no-insecure-url.ts" />
      <File name="no-document-cookie.ts" />
    </Folder>
  </Folder>
  <File name="package.json" />
</Files>
```

### source.config.ts (Collection Definition)

Fumadocs MDX uses collections to process content. Our configuration:

```ts
// source.config.ts
import { defineDocs, defineCollections } from 'fumadocs-mdx/config';

// Documentation collection (for /docs routes)
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // Frontmatter schema extensions go here
  },
});

// Optional: Separate blog collection
export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
});
```

### MDX Plugins (Built-in)

Fumadocs includes these plugins by default:

| Plugin               | Purpose                     |
| -------------------- | --------------------------- |
| **Remark Image**     | Optimizes images            |
| **Remark Heading**   | Extracts TOC                |
| **Remark Structure** | Generates search indexes    |
| **Rehype Code**      | Syntax highlighting (Shiki) |

**Adding Custom Plugins:**

```ts
// source.config.ts
import { defineConfig } from 'fumadocs-mdx/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
```

### Additional Features (Optional)

| Feature        | Setup Link                                                             | Use Case                        |
| -------------- | ---------------------------------------------------------------------- | ------------------------------- |
| **Math/KaTeX** | [/docs/markdown/math](https://fumadocs.dev/docs/markdown/math)         | Mathematical equations          |
| **Mermaid**    | [/docs/markdown/mermaid](https://fumadocs.dev/docs/markdown/mermaid)   | Diagrams & flowcharts           |
| **Twoslash**   | [/docs/markdown/twoslash](https://fumadocs.dev/docs/markdown/twoslash) | TypeScript IntelliSense in code |

### Include (Content Reuse)

Reuse content from other files:

```mdx
{/* Include another MDX file */}

<include>./shared/installation.mdx</include>

{/* Include a code file */}

<include>../../examples/config.ts</include>
```

---

## Appendix A: UI Breakpoints

### ✅ Recommendation: Follow Fumadocs Defaults

Fumadocs uses a **CSS-first responsive system** with CSS Grid and custom properties. We should **follow their defaults** rather than maintaining custom JavaScript breakpoints.

### Fumadocs Default Breakpoints

| Breakpoint  | Width             | Layout Behavior                             |
| ----------- | ----------------- | ------------------------------------------- |
| **Mobile**  | `< 768px`         | Sidebar hidden (hamburger), TOC as popover  |
| **Tablet**  | `768px - 1023px`  | Sidebar collapsible, TOC as popover         |
| **Laptop**  | `1024px - 1279px` | Sidebar visible, TOC as popover             |
| **Desktop** | `≥ 1280px`        | Full 3-column layout (sidebar + main + TOC) |
| **Wide**    | `≥ 1536px`        | Extra padding, wider content area           |

### Fumadocs CSS Variables

These are auto-set by Fumadocs components—**do not override unless necessary**:

```css
/* Fumadocs layout variables (auto-managed) */
--fd-sidebar-width: 260px; /* Desktop sidebar width */
--fd-toc-width: 260px; /* Desktop TOC width */
--fd-header-height: 64px; /* Navbar height */
--fd-layout-width: 97rem; /* Max content width */
--fd-toc-popover-height: 0px; /* Mobile TOC popover height */
```

### Migration from Archive

Your archived `breakpoints.ts` defined:

```ts
// _archive/lib/breakpoints.ts - TO BE DELETED
BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1280, // ← Matches Fumadocs
  wide: 1536,
};
```

**Action:** These values align with Fumadocs. Delete `breakpoints.ts` and `useResponsive.ts` from archive.

### Where Breakpoints Apply in Fumadocs

| Element     | Mobile (`<768`)    | Tablet (`768-1279`) | Desktop (`≥1280`) |
| ----------- | ------------------ | ------------------- | ----------------- |
| **Sidebar** | Hidden (hamburger) | Collapsible drawer  | Visible, sticky   |
| **TOC**     | Popover button     | Popover button      | Fixed right panel |
| **Navbar**  | Mobile menu        | Full navbar         | Full navbar       |
| **Content** | Full width         | Padded              | Constrained width |

### CSS Media Queries (if needed)

If you need custom responsive styles, use Tailwind's responsive prefixes which align with Fumadocs:

```css
/* Mobile-first approach */
.my-component {
  /* Mobile styles */
}

@media (min-width: 768px) {
  /* md: tablet+ */
}
@media (min-width: 1024px) {
  /* lg: laptop+ */
}
@media (min-width: 1280px) {
  /* xl: desktop+ - TOC appears */
}
@media (min-width: 1536px) {
  /* 2xl: wide+ */
}
```

---

## Appendix B: Sidebar Groups/Switcher Configuration

### Overview

Fumadocs sidebar tabs create a **dropdown switcher** at the top of the sidebar. When a tab is selected, it shows a **checkmark (✓)** next to the active option.

### 3-Pillar Structure

Your documentation should be organized into three main pillars:

| Pillar                     | Folder Group        | Icon | Description                                      |
| -------------------------- | ------------------- | ---- | ------------------------------------------------ |
| **Getting Started**        | `(getting-started)` | 🚀   | Installation, concepts, coverage, roadmap        |
| **Security**               | `(security)`        | 🔐   | Security plugins (browser, react, secure-coding) |
| **Quality & Architecture** | `(quality)`         | ✨   | Clean code, architecture, governance plugins     |

### Folder Structure

```
content/docs/
├── (getting-started)/
│   ├── meta.json
│   ├── index.mdx                 ← Tab landing page
│   ├── installation.mdx
│   ├── concepts/
│   │   ├── meta.json
│   │   ├── index.mdx
│   │   └── ...
│   ├── coverage.mdx
│   ├── roadmap.mdx
│   └── articles.mdx
│
├── (security)/
│   ├── meta.json
│   ├── index.mdx                 ← Tab landing page
│   ├── browser-security/
│   │   ├── meta.json
│   │   ├── index.mdx             ← Plugin overview
│   │   └── rules/
│   │       ├── meta.json
│   │       └── *.mdx             ← Individual rules
│   ├── react-security/
│   │   └── ...
│   └── secure-coding/
│       └── ...
│
└── (quality)/
    ├── meta.json
    ├── index.mdx                 ← Tab landing page
    ├── clean-code/
    │   └── ...
    ├── architecture/
    │   └── ...
    └── governance/
        └── ...
```

### meta.json Configuration

Each folder group requires a `meta.json` with `root: true`:

**`(getting-started)/meta.json`:**

```json
{
  "root": true,
  "title": "Getting Started",
  "description": "Installation and core concepts",
  "icon": "Rocket",
  "pages": [
    "index",
    "installation",
    "concepts",
    "coverage",
    "roadmap",
    "articles"
  ]
}
```

**`(security)/meta.json`:**

```json
{
  "root": true,
  "title": "Security",
  "description": "Security-focused ESLint plugins",
  "icon": "Shield",
  "pages": ["index", "browser-security", "react-security", "secure-coding"]
}
```

**`(quality)/meta.json`:**

```json
{
  "root": true,
  "title": "Quality & Architecture",
  "description": "Code quality and architecture plugins",
  "icon": "Sparkles",
  "pages": ["index", "clean-code", "architecture", "governance"]
}
```

### DocsLayout Configuration

Enable tabs in the sidebar:

```tsx
// src/app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{
        tabs: true, // ← Enable tab switcher
        defaultOpenLevel: 1, // ← Expand first level by default
      }}
    >
      {children}
    </DocsLayout>
  );
}
```

### How the Checkmark Works

Fumadocs automatically adds a **checkmark (✓)** next to the currently selected tab based on the URL path:

- When user visits `/docs/installation` → "Getting Started" tab is checked ✓
- When user visits `/docs/browser-security/rules/no-insecure-url` → "Security" tab is checked ✓
- When user visits `/docs/clean-code/rules/no-unused-vars` → "Quality & Architecture" tab is checked ✓

**No custom code is needed—Fumadocs handles this automatically via the `root: true` folder groups and URL matching.**

### Tab Items for Each Pillar

| Tab                        | Items Shown in Sidebar                                                     |
| -------------------------- | -------------------------------------------------------------------------- |
| **Getting Started**        | Installation, Concepts, Coverage, Roadmap, Articles                        |
| **Security**               | Browser Security (11 rules), React Security (rules), Secure Coding (rules) |
| **Quality & Architecture** | Clean Code (rules), Architecture (rules), Governance (rules)               |

### Nested Groups Within Tabs

For plugin rules, create sub-folders with their own `meta.json`:

**`(security)/browser-security/meta.json`:**

```json
{
  "title": "Browser Security",
  "description": "@interlacelabs/eslint-plugin-browser-security",
  "icon": "Globe",
  "defaultOpen": true,
  "pages": ["index", "rules"]
}
```

**`(security)/browser-security/rules/meta.json`:**

```json
{
  "title": "Rules",
  "pages": [
    "no-insecure-url",
    "no-document-cookie",
    "no-hardcoded-credentials",
    "..."
  ]
}
```

### Visual Reference

```
┌─────────────────────────────────────────┐
│  🔍 Search                              │
├─────────────────────────────────────────┤
│  ▼ Getting Started                      │ ← Tab Switcher
│    ✓ Getting Started                    │
│      Security                           │
│      Quality & Architecture             │
├─────────────────────────────────────────┤
│  📄 Overview                            │
│  📄 Installation                        │
│  📁 Concepts                            │
│     ├─ CWE Mappings                     │
│     ├─ OWASP Coverage                   │
│     └─ Plugin Categories                │
│  📄 Coverage                            │
│  📄 Roadmap                             │
│  📄 Articles                            │
└─────────────────────────────────────────┘
```

---

## Appendix C: Complete Project File Structure

### Target State Blueprint

This is the **complete file structure** the project should have after implementation:

```
apps/docs/
├── .gemini/
│   └── implementation-plan.md              ← This document
│
├── content/
│   └── docs/
│       ├── meta.json                       ← Root docs config
│       │
│       ├── (getting-started)/              ← TAB 1: Getting Started
│       │   ├── meta.json                   ← { "root": true, "title": "Getting Started" }
│       │   ├── index.mdx                   ← Landing page for tab
│       │   ├── installation.mdx            ← Quick start guide
│       │   ├── concepts/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx
│       │   │   ├── cwe-mappings.mdx
│       │   │   ├── owasp-coverage.mdx
│       │   │   ├── plugin-categories.mdx
│       │   │   └── agentic-linting.mdx
│       │   ├── coverage.mdx
│       │   ├── roadmap.mdx
│       │   └── articles.mdx
│       │
│       ├── (security)/                     ← TAB 2: Security
│       │   ├── meta.json                   ← { "root": true, "title": "Security" }
│       │   ├── index.mdx                   ← Security plugins overview
│       │   │
│       │   ├── browser-security/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx               ← Plugin README
│       │   │   └── rules/
│       │   │       ├── meta.json
│       │   │       ├── no-insecure-url.mdx
│       │   │       ├── no-document-cookie.mdx
│       │   │       └── ...                 ← All browser-security rules
│       │   │
│       │   ├── react-security/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx
│       │   │   └── rules/
│       │   │       ├── meta.json
│       │   │       └── ...                 ← All react-security rules
│       │   │
│       │   └── secure-coding/
│       │       ├── meta.json
│       │       ├── index.mdx
│       │       └── rules/
│       │           ├── meta.json
│       │           └── ...                 ← All secure-coding rules
│       │
│       └── (quality)/                      ← TAB 3: Quality & Architecture
│           ├── meta.json                   ← { "root": true, "title": "Quality & Architecture" }
│           ├── index.mdx                   ← Quality plugins overview
│           │
│           ├── clean-code/
│           │   ├── meta.json
│           │   ├── index.mdx
│           │   └── rules/
│           │       ├── meta.json
│           │       └── ...
│           │
│           ├── architecture/
│           │   ├── meta.json
│           │   ├── index.mdx
│           │   └── rules/
│           │       ├── meta.json
│           │       └── ...
│           │
│           └── governance/
│               ├── meta.json
│               ├── index.mdx
│               └── rules/
│                   ├── meta.json
│                   └── ...
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                        ← Default OG image
│   └── interlace-logo.svg                  ← Brand logo
│
├── src/
│   ├── app/
│   │   ├── global.css                      ← Main stylesheet (imports all)
│   │   ├── layout.tsx                      ← Root layout (RootProvider)
│   │   │
│   │   ├── styles/
│   │   │   ├── themes/
│   │   │   │   ├── interlace-light.css     ← Light theme tokens
│   │   │   │   └── interlace-dark.css      ← Dark theme tokens
│   │   │   ├── components/
│   │   │   │   ├── mermaid.css             ← Mermaid diagram styling
│   │   │   │   ├── tables.css              ← Table styling
│   │   │   │   └── code-blocks.css         ← Code block styling
│   │   │   └── utilities.css               ← Accessibility & badges
│   │   │
│   │   ├── (home)/
│   │   │   ├── page.tsx                    ← Homepage (HomeLayout)
│   │   │   └── layout.tsx                  ← Home layout wrapper
│   │   │
│   │   ├── docs/
│   │   │   ├── [[...slug]]/
│   │   │   │   └── page.tsx                ← Docs page renderer
│   │   │   └── layout.tsx                  ← DocsLayout with sidebar tabs
│   │   │
│   │   ├── og/
│   │   │   └── docs/
│   │   │       └── [...slug]/
│   │   │           └── route.tsx           ← Takumi OG image generation
│   │   │
│   │   └── api/
│   │       └── search/
│   │           └── route.ts                ← Orama search API
│   │
│   ├── components/
│   │   ├── mdx/
│   │   │   └── mermaid.tsx                 ← Mermaid component
│   │   │
│   │   ├── providers.tsx                   ← RootProvider with custom search
│   │   ├── search.tsx                      ← Custom search dialog with tags
│   │   │
│   │   ├── home/
│   │   │   ├── Hero.tsx                    ← Homepage hero section
│   │   │   ├── StatsBar.tsx                ← Animated stats
│   │   │   ├── ValueProps.tsx              ← 3-card grid
│   │   │   ├── SolutionsNavigator.tsx      ← Entry points
│   │   │   ├── LLMWorkflowDemo.tsx         ← Interactive demo
│   │   │   ├── EcosystemBeam.tsx           ← Visual ecosystem
│   │   │   ├── LatestArticles.tsx          ← Dev.to integration
│   │   │   ├── PluginGrid.tsx              ← Plugin cards
│   │   │   └── ResourcesFooter.tsx         ← Footer links
│   │   │
│   │   ├── plugin/
│   │   │   ├── PluginCard.tsx              ← Individual plugin card
│   │   │   ├── PluginCards.tsx             ← Grid of plugin cards
│   │   │   └── RuleCard.tsx                ← Individual rule card
│   │   │
│   │   └── ui/
│   │       ├── shimmer-button.tsx          ← Animated CTA button
│   │       ├── border-beam.tsx             ← Animated border
│   │       ├── flickering-grid.tsx         ← Background effect
│   │       ├── number-ticker.tsx           ← Animated counter
│   │       └── ...                         ← Other UI primitives
│   │
│   ├── lib/
│   │   ├── source.ts                       ← Fumadocs source config
│   │   └── metadata.ts                     ← SEO metadata helpers
│   │
│   └── data/
│       ├── plugin-stats.json               ← Plugin statistics
│       ├── cwe-names.json                  ← CWE ID → Name mapping
│       └── articles.json                   ← Dev.to article cache
│
├── scripts/
│   └── validate-links.ts                   ← CI link validation
│
├── mdx-components.tsx                      ← MDX component registration
├── source.config.ts                        ← Fumadocs MDX config
├── next.config.ts                          ← Next.js config
├── tailwind.config.ts                      ← Tailwind config
├── tsconfig.json
└── package.json
```

---

## Appendix D: Responsive Design Validation Checklist

### 🎯 Goal: Match Fumadocs Quality at ALL Screen Sizes

Every page MUST be validated at these breakpoints before deployment:

### Validation Matrix

| Breakpoint    | Width  | Sidebar        | TOC         | Content     | Status |
| ------------- | ------ | -------------- | ----------- | ----------- | ------ |
| **iPhone SE** | 375px  | Hamburger menu | Popover     | Full width  | ⬜     |
| **iPhone 14** | 390px  | Hamburger menu | Popover     | Full width  | ⬜     |
| **iPad Mini** | 768px  | Collapsible    | Popover     | Padded      | ⬜     |
| **iPad Pro**  | 1024px | Visible        | Popover     | Padded      | ⬜     |
| **Laptop**    | 1280px | Visible        | Fixed panel | Constrained | ⬜     |
| **Desktop**   | 1440px | Visible        | Fixed panel | Constrained | ⬜     |
| **Wide**      | 1920px | Visible        | Fixed panel | Centered    | ⬜     |

### Per-Breakpoint Checklist

#### Mobile (< 768px) ✅ Must Pass

- [ ] Hamburger menu opens/closes smoothly
- [ ] Sidebar slides in from left with overlay
- [ ] TOC popover button visible in header
- [ ] TOC popover opens correctly on tap
- [ ] Content uses full viewport width (with padding)
- [ ] Search dialog is centered and usable
- [ ] Code blocks scroll horizontally, not overflow
- [ ] Tables scroll horizontally
- [ ] Images are responsive (max-width: 100%)
- [ ] No horizontal scroll on page body
- [ ] Touch targets are at least 44×44px

#### Tablet (768px - 1279px) ✅ Must Pass

- [ ] Sidebar is collapsible (not hamburger on tablets 768px+)
- [ ] TOC shows as popover (not fixed panel)
- [ ] Content has appropriate padding
- [ ] Tab switcher dropdown works correctly
- [ ] Search overlay is appropriately sized
- [ ] All interactive elements are accessible

#### Desktop (1280px+) ✅ Must Pass

- [ ] 3-column layout: Sidebar | Content | TOC
- [ ] Sidebar is fixed/sticky on scroll
- [ ] TOC panel is fixed/sticky on scroll
- [ ] TOC highlights current section (clerk style)
- [ ] Content is constrained to readable width
- [ ] No excessive white space on wide screens
- [ ] Grid areas are correctly assigned:
  - `#nd-sidebar { grid-area: sidebar; }`
  - `#nd-page { grid-area: main; }`
  - `#nd-toc { grid-area: toc; }`

### CSS Grid Layout Rules

**CRITICAL:** The Fumadocs grid system MUST be respected:

```css
/* These rules ensure correct grid layout */
#nd-docs-layout {
  grid-template:
    'sidebar header toc'
    'sidebar toc-popover toc'
    'sidebar main toc' 1fr
    / minmax(var(--fd-sidebar-col), 1fr) minmax(0, var(--fd-page-col)) minmax(
      min-content,
      1fr
    );
}

/* Grid area assignments (handled by Fumadocs, but verify these exist) */
#nd-toc {
  grid-area: toc;
}
#nd-page {
  grid-area: main;
}
#nd-sidebar {
  grid-area: sidebar;
}
#nd-subnav {
  grid-area: header;
}
```

### Responsive Visibility Rules

```css
/* TOC: Desktop only (≥1280px) */
@media (max-width: 1279px) {
  #nd-toc {
    display: none !important;
  }
}

/* TOC Popover: Mobile/Tablet only (<1280px) */
@media (min-width: 1280px) {
  [grid-area='toc-popover'] {
    display: none !important;
  }
}
```

### Testing Workflow

1. **Dev Tools Responsive Mode**: Test at exact breakpoints
2. **Real Device Testing**: Verify touch interactions
3. **Visual Regression**: Compare with fumadocs.dev
4. **Performance**: Ensure smooth animations at all sizes

### Known Issues to Avoid

| Issue                    | Cause                              | Solution                                   |
| ------------------------ | ---------------------------------- | ------------------------------------------ |
| TOC visible on mobile    | Missing responsive CSS             | Add `@media (max-width: 1279px)` hide rule |
| Content too wide         | Missing `--fd-page-col` constraint | Verify grid template                       |
| Sidebar overlaps content | Grid area not assigned             | Ensure `grid-area: sidebar`                |
| White space on right     | TOC area still allocated           | Check `--fd-toc-width` is `0px` on mobile  |
| Search dialog cut off    | Fixed positioning issues           | Use Fumadocs default dialog                |

### Fumadocs Reference

Always compare your implementation with the official Fumadocs site:

- **Desktop**: https://fumadocs.dev/docs
- **Use DevTools** to inspect their grid layout, CSS variables, and responsive behavior

---

## Appendix E: Internationalization (i18n) with Next.js

### ✅ Recommendation: Use Fumadocs Next.js i18n

Since the docs app uses **Next.js**, the native choice is `fumadocs-core/i18n` with Next.js middleware. This provides the most seamless integration with the App Router.

### Setup Overview

#### 1. Define i18n Configuration

Create a central i18n configuration file:

```ts
// src/lib/i18n.ts
import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'es', 'zh', 'ja'], // Add languages as needed
});
```

#### 2. Create Middleware

Create a middleware that redirects users to the appropriate locale:

```ts
// middleware.ts
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  // Adjust to ignore static assets in `/public` folder
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

#### 3. App Directory Structure with `[lang]`

Create a `/app/[lang]` folder and move pages/layouts into it:

```
src/app/
├── [lang]/                        ← All pages go here
│   ├── layout.tsx                 ← Root layout with locale
│   ├── page.tsx                   ← Homepage
│   ├── (home)/
│   │   └── page.tsx
│   └── docs/
│       ├── layout.tsx             ← DocsLayout with locale
│       └── [[...slug]]/
│           └── page.tsx
├── api/
│   └── search/
│       └── route.ts               ← API routes stay outside [lang]
└── og/
    └── docs/
        └── [...slug]/
            └── route.tsx          ← OG image routes
```

#### 4. RootProvider with Translations

```tsx
// src/app/[lang]/layout.tsx
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    es: {
      displayName: 'Español',
      search: 'Buscar documentación',
    },
    zh: {
      displayName: '中文',
      search: '搜索文档',
    },
    ja: {
      displayName: '日本語',
      search: 'ドキュメントを検索',
    },
  },
});

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const lang = (await params).lang;

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <RootProvider i18n={provider(lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
```

#### 5. Source Loader with i18n

```ts
// src/lib/source.ts
import { i18n } from '@/lib/i18n';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  i18n,
  // other options...
});
```

#### 6. Pass Locale to Layouts

```ts
// src/lib/base-options.ts
import { i18n } from '@/lib/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    i18n,
    // different props based on `locale`
  };
}
```

### Writing Localized Documents

Fumadocs supports two i18n parsing modes:

| Mode              | File Pattern        | Example                                     |
| ----------------- | ------------------- | ------------------------------------------- |
| **Dot (default)** | `page.{locale}.mdx` | `index.mdx`, `index.es.mdx`, `index.zh.mdx` |
| **Directory**     | `{locale}/page.mdx` | `en/index.mdx`, `es/index.mdx`              |

**Dot Parser (Recommended):**

```
content/docs/
├── (getting-started)/
│   ├── meta.json               ← Default (en)
│   ├── meta.es.json            ← Spanish
│   ├── index.mdx               ← English (default)
│   ├── index.es.mdx            ← Spanish
│   ├── index.zh.mdx            ← Chinese
│   └── installation.mdx        ← Falls back to English if no locale file
```

### Search with i18n

Configure Orama search for i18n:

```ts
// source.config.ts
import { i18n } from '@/lib/i18n';

// Search indexes are automatically created per locale
```

See [Orama Internationalization](https://www.fumadocs.dev/docs/headless/search/orama#internationalization) for details.

### Navigation with Locale

For internal navigation outside Fumadocs layouts:

```tsx
import Link from 'next/link';
import { useParams } from 'next/navigation';

const { lang } = useParams();
return <Link href={`/${lang}/another-page`}>Link</Link>;
```

For MDX content, use `DynamicLink`:

```tsx
import { DynamicLink } from 'fumadocs-core/dynamic-link';

<DynamicLink href="/[lang]/another-page">Link</DynamicLink>;
```

---

## Appendix F: Versioning Strategy

### Overview

Fumadocs provides primitives for implementing versioning. Choose based on your needs:

| Strategy               | Best For                                        | Implementation                         |
| ---------------------- | ----------------------------------------------- | -------------------------------------- |
| **Partial Versioning** | Version only part of docs (e.g., API reference) | Folder-based separation + Sidebar Tabs |
| **Full Versioning**    | Version entire website (v2.docs.com)            | Git branches + separate deployments    |

### Recommended: Partial Versioning with Sidebar Tabs

For the Interlace ESLint ecosystem, **partial versioning** is recommended:

- Version individual plugin documentation when breaking changes occur
- Keep "Getting Started" and concept docs unversioned
- Use folder groups to separate versions

### Folder Structure for Versioned Plugins

```
content/docs/
├── (getting-started)/              ← NOT versioned
│   └── ...
│
├── (security)/                     ← Container for security plugins
│   ├── meta.json
│   │
│   ├── browser-security/           ← Current (latest) version
│   │   ├── meta.json
│   │   ├── index.mdx
│   │   └── rules/
│   │       └── ...
│   │
│   └── browser-security-v1/        ← Archived version
│       ├── meta.json               ← { "title": "Browser Security (v1)" }
│       ├── index.mdx
│       └── rules/
│           └── ...
│
└── (quality)/                      ← NOT versioned (yet)
    └── ...
```

### Version Selector in Sidebar

Display version selector using folder structure:

```json
// (security)/browser-security/meta.json
{
  "title": "Browser Security",
  "description": "v2.x (Latest)",
  "icon": "Globe",
  "defaultOpen": true,
  "pages": ["index", "rules"]
}
```

```json
// (security)/browser-security-v1/meta.json
{
  "title": "Browser Security (v1)",
  "description": "v1.x (Deprecated)",
  "icon": "Archive",
  "defaultOpen": false,
  "pages": ["index", "rules"]
}
```

### Full Versioning (For Major Releases)

When Interlace has a major ecosystem-wide upgrade:

1. **Create a Git branch** for the old version (e.g., `docs-v1`)
2. **Deploy to subdomain**: `v1.interlace.dev`
3. **Add version link** to navbar:

```tsx
// src/app/layout.tsx
<DocsLayout
  nav={{
    links: [{ text: 'v1 Docs', href: 'https://v1.interlace.dev/docs' }],
  }}
/>
```

### Version Badge Component

Create a version badge for deprecated docs:

```tsx
// src/components/VersionBadge.tsx
export function VersionBadge({
  version,
  status,
}: {
  version: string;
  status: 'latest' | 'deprecated' | 'beta';
}) {
  const colors = {
    latest: 'bg-green-500/10 text-green-600',
    deprecated: 'bg-amber-500/10 text-amber-600',
    beta: 'bg-purple-500/10 text-purple-600',
  };

  return (
    <span className={`px-2 py-1 rounded text-sm ${colors[status]}`}>
      {version} {status === 'deprecated' && '(Deprecated)'}
    </span>
  );
}
```

Use in MDX:

```mdx
<VersionBadge version="v1.x" status="deprecated" />

> **Note:** This documentation is for v1.x. See the [latest version](/docs/browser-security).
```

---

## Appendix G: Complete Website & Documentation Structure

### Page Conventions Reference

Fumadocs uses the following conventions:

| Pattern             | Description                   | Example                                  |
| ------------------- | ----------------------------- | ---------------------------------------- |
| `page.mdx`          | Standard page                 | `/docs/installation`                     |
| `index.mdx`         | Folder index                  | `/docs/concepts/`                        |
| `(folder-group)/`   | Group without affecting slugs | `(getting-started)/index.mdx` → `/docs/` |
| `meta.json`         | Folder configuration          | Ordering, titles, icons                  |
| `page.{locale}.mdx` | Localized page                | `index.es.mdx`                           |

### Slug Generation

| File Path                  | Generated Slugs                |
| -------------------------- | ------------------------------ |
| `./docs/page.mdx`          | `['page']`                     |
| `./docs/index.mdx`         | `[]`                           |
| `./docs/concepts/deep.mdx` | `['concepts', 'deep']`         |
| `./docs/(group)/page.mdx`  | `['page']` ← group not in slug |

### Complete File Structure Blueprint

```
apps/docs/
├── .gemini/
│   ├── implementation-plan.md              ← This document
│   └── fumadocs-markdown-reference.md      ← MDX reference
│
├── content/
│   └── docs/
│       ├── meta.json                       ← Root docs ordering
│       │
│       ├── (getting-started)/              ← TAB 1: Getting Started
│       │   ├── meta.json                   ← { "root": true, "title": "Getting Started" }
│       │   ├── meta.es.json                ← Spanish meta
│       │   ├── index.mdx                   ← Docs landing page
│       │   ├── index.es.mdx                ← Spanish landing
│       │   ├── installation.mdx
│       │   ├── installation.es.mdx
│       │   ├── concepts/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx
│       │   │   ├── cwe-mappings.mdx
│       │   │   ├── owasp-coverage.mdx
│       │   │   ├── plugin-categories.mdx
│       │   │   └── agentic-linting.mdx
│       │   ├── coverage.mdx
│       │   ├── roadmap.mdx
│       │   └── articles.mdx
│       │
│       ├── (security)/                     ← TAB 2: Security
│       │   ├── meta.json                   ← { "root": true, "title": "Security" }
│       │   ├── index.mdx                   ← Security overview
│       │   │
│       │   ├── browser-security/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx               ← Plugin README
│       │   │   └── rules/
│       │   │       ├── meta.json           ← { "pages": ["no-insecure-url", ...] }
│       │   │       ├── no-insecure-url.mdx
│       │   │       ├── no-document-cookie.mdx
│       │   │       ├── no-hardcoded-credentials.mdx
│       │   │       ├── no-insecure-crypto.mdx
│       │   │       ├── no-mixed-content.mdx
│       │   │       ├── no-inline-styles.mdx
│       │   │       ├── no-postmessage-origin-wildcard.mdx
│       │   │       ├── no-cors-fetch.mdx
│       │   │       ├── no-insecure-form-action.mdx
│       │   │       ├── no-sensitive-localstorage.mdx
│       │   │       └── no-eval-template-literals.mdx
│       │   │
│       │   ├── react-security/
│       │   │   ├── meta.json
│       │   │   ├── index.mdx
│       │   │   └── rules/
│       │   │       ├── meta.json
│       │   │       ├── no-dangerously-set-innerhtml.mdx
│       │   │       ├── no-dynamic-href.mdx
│       │   │       ├── no-unescaped-entities.mdx
│       │   │       └── ...
│       │   │
│       │   └── secure-coding/
│       │       ├── meta.json
│       │       ├── index.mdx
│       │       └── rules/
│       │           ├── meta.json
│       │           ├── no-hardcoded-secrets.mdx
│       │           ├── no-sql-injection.mdx
│       │           ├── no-path-traversal.mdx
│       │           └── ...
│       │
│       └── (quality)/                      ← TAB 3: Quality & Architecture
│           ├── meta.json                   ← { "root": true, "title": "Quality & Architecture" }
│           ├── index.mdx                   ← Quality overview
│           │
│           ├── clean-code/
│           │   ├── meta.json
│           │   ├── index.mdx
│           │   └── rules/
│           │       ├── meta.json
│           │       ├── max-function-length.mdx
│           │       ├── no-magic-numbers.mdx
│           │       └── ...
│           │
│           ├── architecture/
│           │   ├── meta.json
│           │   ├── index.mdx
│           │   └── rules/
│           │       ├── meta.json
│           │       ├── no-circular-dependencies.mdx
│           │       ├── enforce-layer-boundaries.mdx
│           │       └── ...
│           │
│           └── governance/
│               ├── meta.json
│               ├── index.mdx
│               └── rules/
│                   ├── meta.json
│                   ├── require-license-header.mdx
│                   ├── enforce-naming-convention.mdx
│                   └── ...
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                        ← Default OG image
│   ├── interlace-logo.svg                  ← Brand logo
│   └── interlace-logo-dark.svg             ← Dark mode logo
│
├── src/
│   ├── app/
│   │   ├── global.css                      ← Main stylesheet
│   │   │
│   │   ├── [lang]/                         ← i18n root
│   │   │   ├── layout.tsx                  ← RootProvider with locale
│   │   │   ├── page.tsx                    ← Redirect to /docs or homepage
│   │   │   │
│   │   │   ├── (home)/
│   │   │   │   ├── page.tsx                ← Homepage (HomeLayout)
│   │   │   │   └── layout.tsx              ← Home layout wrapper
│   │   │   │
│   │   │   └── docs/
│   │   │       ├── layout.tsx              ← DocsLayout with sidebar tabs
│   │   │       └── [[...slug]]/
│   │   │           └── page.tsx            ← Docs page renderer
│   │   │
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts                ← Orama search API
│   │   │
│   │   └── og/
│   │       └── docs/
│   │           └── [...slug]/
│   │               └── route.tsx           ← Takumi OG image generation
│   │
│   ├── components/
│   │   ├── mdx/
│   │   │   └── mermaid.tsx                 ← Mermaid component
│   │   │
│   │   ├── providers.tsx                   ← RootProvider with custom search
│   │   ├── search.tsx                      ← Custom search dialog with tags
│   │   │
│   │   ├── home/
│   │   │   ├── Hero.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── ValueProps.tsx
│   │   │   └── ...
│   │   │
│   │   ├── plugin/
│   │   │   ├── PluginCard.tsx
│   │   │   ├── PluginCards.tsx
│   │   │   └── RuleCard.tsx
│   │   │
│   │   ├── versioning/
│   │   │   └── VersionBadge.tsx            ← Version status badge
│   │   │
│   │   └── ui/
│   │       ├── shimmer-button.tsx
│   │       ├── border-beam.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── source.ts                       ← Fumadocs source config with i18n
│   │   ├── i18n.ts                         ← i18n configuration
│   │   ├── base-options.ts                 ← Shared layout options
│   │   └── metadata.ts                     ← SEO metadata helpers
│   │
│   └── data/
│       ├── plugin-stats.json
│       ├── cwe-names.json
│       └── articles.json
│
├── scripts/
│   └── validate-links.ts                   ← CI link validation
│
├── middleware.ts                           ← i18n middleware
├── mdx-components.tsx                      ← MDX component registration
├── source.config.ts                        ← Fumadocs MDX config
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### meta.json Examples

**Root `/content/docs/meta.json`:**

```json
{
  "pages": ["(getting-started)", "(security)", "(quality)"]
}
```

**`(getting-started)/meta.json`:**

```json
{
  "root": true,
  "title": "Getting Started",
  "description": "Installation and core concepts",
  "icon": "Rocket",
  "pages": [
    "index",
    "installation",
    "concepts",
    "---Resources---",
    "coverage",
    "roadmap",
    "articles"
  ]
}
```

**`(security)/meta.json`:**

```json
{
  "root": true,
  "title": "Security",
  "description": "Security-focused ESLint plugins",
  "icon": "Shield",
  "pages": ["index", "browser-security", "react-security", "secure-coding"]
}
```

**`(security)/browser-security/meta.json`:**

```json
{
  "title": "Browser Security",
  "description": "@interlacelabs/eslint-plugin-browser-security",
  "icon": "Globe",
  "defaultOpen": true,
  "pages": ["index", "rules"]
}
```

**`(security)/browser-security/rules/meta.json`:**

```json
{
  "title": "Rules",
  "pages": [
    "no-insecure-url",
    "no-document-cookie",
    "no-hardcoded-credentials",
    "no-insecure-crypto",
    "no-mixed-content",
    "no-inline-styles",
    "no-postmessage-origin-wildcard",
    "no-cors-fetch",
    "no-insecure-form-action",
    "no-sensitive-localstorage",
    "no-eval-template-literals"
  ]
}
```

### Pages Syntax Reference

The `pages` array in `meta.json` supports special syntax:

| Syntax                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `"page-name"`         | Include page (without `.mdx`)                  |
| `"./path/to/page"`    | Include page from relative path                |
| `"---Label---"`       | Separator with label                           |
| `"---[Icon]Label---"` | Separator with icon                            |
| `"[Text](url)"`       | External link                                  |
| `"[Icon][Text](url)"` | External link with icon                        |
| `"..."`               | Include remaining pages alphabetically         |
| `"z...a"`             | Include remaining pages reverse alphabetically |
| `"...folder"`         | Include all pages from folder                  |
| `"!item"`             | Exclude specific item from `...`               |

**Example with all syntax:**

```json
{
  "pages": [
    "index",
    "installation",
    "---Getting Started---",
    "concepts",
    "...concepts",
    "---External Links---",
    "[Shield][OWASP](https://owasp.org)",
    "[GitHub](https://github.com/interlacelabs)",
    "---",
    "...",
    "!deprecated-page"
  ]
}
```

---

## Appendix H: OG Image Generation with next/og

### Overview

Fumadocs provides built-in OG image generation using `next/og` (Satori-based). This generates dynamic preview images for social sharing.

### Setup

#### 1. Define Image Helper

Add to your source loader:

```ts
// src/lib/source.ts
import { type InferPageType } from 'fumadocs-core/source';

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];
  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}
```

#### 2. Create Route Handler

```tsx
// src/app/og/docs/[...slug]/route.tsx
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/og/docs/[...slug]'>,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <DefaultImage
        title={page.data.title}
        description={page.data.description}
        site="ESLint Interlace"
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
```

#### 3. Use in Page Metadata

```tsx
// src/app/[lang]/docs/[[...slug]]/page.tsx
import { getPageImage, source } from '@/lib/source';

export async function generateMetadata({ params }) {
  const page = source.getPage(params.slug);
  if (!page) return {};

  const image = getPageImage(page);
  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: [{ url: image.url }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [image.url],
    },
  };
}
```

### Alternative Presets

Use Fumadocs CLI for other OG styles:

```bash
# Mono style (minimal)
npx @fumadocs/cli@latest add og/mono
```

### Takumi Alternative (Faster)

For faster WebP-based generation, use Takumi instead:

```bash
npm install @takumi-rs/image-response
```

```ts
// next.config.ts
serverExternalPackages: ['@takumi-rs/image-response'],
```

```tsx
import { ImageResponse } from '@takumi-rs/image-response';

return new ImageResponse(
  <DefaultImage ... />,
  { width: 1200, height: 630, format: 'webp' }
);
```

---

## Appendix I: Dynamic Content from GitHub (MDX Remote)

### Use Case

Fetch content dynamically from GitHub to avoid redeployment when updating:

- Plugin README.md files
- Changelog entries
- Rule documentation maintained in plugin packages

### ✅ Recommendation: MDX Remote + GitHub Raw Content

Use `@fumadocs/mdx-remote` to compile markdown from GitHub on-demand.

### Setup

```bash
npm install @fumadocs/mdx-remote
```

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Request   │────▶│  Next.js Page    │────▶│  MDX Remote     │
└─────────────────┘     │  (SSR or ISR)    │     │  Compiler       │
                        └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────▼─────────┐
                        │          GitHub Raw Content API            │
                        │  raw.githubusercontent.com/interlacelabs  │
                        └───────────────────────────────────────────┘
```

### Implementation

#### 1. Create GitHub Content Fetcher

```ts
// src/lib/github-content.ts
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/interlacelabs';

export interface GitHubSource {
  repo: string;
  branch?: string;
  path: string;
}

export async function fetchGitHubContent(
  source: GitHubSource,
): Promise<string> {
  const branch = source.branch ?? 'main';
  const url = `${GITHUB_RAW_BASE}/${source.repo}/${branch}/${source.path}`;

  const response = await fetch(url, {
    next: {
      revalidate: 3600, // Revalidate every hour
      tags: [`github-${source.repo}`],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

// Predefined sources for plugins
export const PLUGIN_SOURCES = {
  'browser-security': {
    readme: { repo: 'eslint-plugin-browser-security', path: 'README.md' },
    changelog: { repo: 'eslint-plugin-browser-security', path: 'CHANGELOG.md' },
  },
  'react-security': {
    readme: { repo: 'eslint-plugin-react-security', path: 'README.md' },
    changelog: { repo: 'eslint-plugin-react-security', path: 'CHANGELOG.md' },
  },
  // ... other plugins
} as const;
```

#### 2. Create MDX Compiler

```ts
// src/lib/mdx-compiler.ts
import { createCompiler } from '@fumadocs/mdx-remote';

export const compiler = createCompiler({
  // Fumadocs MDX plugins are included by default
});
```

#### 3. Create Dynamic Page

```tsx
// src/app/[lang]/docs/changelog/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import { fetchGitHubContent, PLUGIN_SOURCES } from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';

// Revalidate every hour (ISR)
export const revalidate = 3600;

export default async function ChangelogPage() {
  // Fetch all changelogs in parallel
  const changelogs = await Promise.all(
    Object.entries(PLUGIN_SOURCES).map(async ([name, sources]) => {
      const content = await fetchGitHubContent(sources.changelog);
      return { name, content };
    }),
  );

  // Compile the combined changelog
  const combinedContent = changelogs
    .map(({ name, content }) => `## ${name}\n\n${content}`)
    .join('\n\n---\n\n');

  const compiled = await compiler.compile({
    source: combinedContent,
  });

  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <h1>Changelog</h1>
        <p className="text-muted-foreground">
          Auto-synced from GitHub. Last updated: {new Date().toISOString()}
        </p>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
```

#### 4. Dynamic Plugin README Page

```tsx
// src/app/[lang]/docs/(security)/[plugin]/readme/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import { fetchGitHubContent, PLUGIN_SOURCES } from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

interface PageProps {
  params: { plugin: string };
}

export default async function PluginReadmePage({ params }: PageProps) {
  const source = PLUGIN_SOURCES[params.plugin as keyof typeof PLUGIN_SOURCES];
  if (!source) notFound();

  const content = await fetchGitHubContent(source.readme);
  const compiled = await compiler.compile({ source: content });
  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(PLUGIN_SOURCES).map((plugin) => ({ plugin }));
}
```

### On-Demand Revalidation (Optional)

Trigger revalidation via webhook when GitHub content changes:

```ts
// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const { repo } = await request.json();
  revalidateTag(`github-${repo}`);

  return NextResponse.json({ revalidated: true, repo });
}
```

Configure a GitHub webhook to call this endpoint on push events.

### Best Practices

| Concern           | Solution                                                         |
| ----------------- | ---------------------------------------------------------------- |
| **Rate Limiting** | Use ISR with `revalidate: 3600` to cache for 1 hour              |
| **Build Time**    | Pre-render with `generateStaticParams` to avoid fetch during SSG |
| **Fallback**      | Keep local MDX copies as fallback if GitHub is unavailable       |
| **Images**        | Use absolute URLs for images (GitHub raw URLs)                   |
| **Security**      | ⚠️ Only use trusted MDX content (allows code execution)          |

### Hybrid Approach: Static + Dynamic

Combine static MDX files with dynamic GitHub content:

```
content/docs/
├── (getting-started)/          ← Static MDX (local files)
│   └── ...
├── (security)/
│   ├── browser-security/
│   │   ├── index.mdx           ← Static plugin overview
│   │   ├── readme/             ← Dynamic from GitHub
│   │   │   └── page.tsx        ← SSR/ISR page
│   │   └── rules/              ← Static rule docs
│   │       └── ...
```

This gives you:

- ✅ Fast builds (static content pre-rendered)
- ✅ Live updates (README/changelog synced hourly)
- ✅ No redeployment needed for plugin updates

---

## Phase 1: Foundation (Critical Infrastructure)

### 1.1 Theme Architecture

**Priority:** 🔴 Critical  
**Effort:** 1-2 hours

Create dedicated theme files with Interlace purple branding:

```
src/app/styles/
├── themes/
│   ├── interlace-light.css   ← Light mode color tokens
│   └── interlace-dark.css    ← Dark mode color tokens
├── components/
│   ├── mermaid.css           ← Theme-aware diagrams (from archive)
│   ├── tables.css            ← Premium table styling (from archive)
│   └── code-blocks.css       ← Correct/incorrect examples (from archive)
└── utilities.css             ← Accessibility & badge styling (from archive)
```

**Key Tokens:**
| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--color-fd-primary` | `hsl(263 80% 45%)` | `hsl(270 75% 75%)` |
| `--color-fd-background` | `hsl(270 20% 98%)` | `hsl(270 15% 7%)` |
| `--interlace-security` | `hsl(270 75% 55%)` | `hsl(270 80% 70%)` |
| `--interlace-framework` | `hsl(195 85% 45%)` | `hsl(195 90% 55%)` |
| `--interlace-architecture` | `hsl(160 75% 40%)` | `hsl(160 80% 50%)` |
| `--interlace-quality` | `hsl(40 85% 50%)` | `hsl(40 90% 60%)` |

---

### 1.2 Sidebar Tabs (3-Pillar Navigation)

**Priority:** 🔴 Critical  
**Effort:** 30 minutes

Verify folder structure with `root: true` in meta.json:

```
content/docs/
├── (getting-started)/
│   └── meta.json  → { "root": true, "title": "Getting Started", "description": "..." }
├── (security)/
│   └── meta.json  → { "root": true, "title": "Security", "description": "..." }
└── (quality)/
    └── meta.json  → { "root": true, "title": "Quality & Architecture", "description": "..." }
```

**DocsLayout Configuration:**

```tsx
<DocsLayout
  tree={source.getPageTree()}
  sidebar={{
    tabs: true,
    defaultOpenLevel: 1,
  }}
/>
```

---

### 1.3 TOC Styling (Clerk Style)

**Priority:** 🟡 High  
**Effort:** 15 minutes

Enable the vertical indicator line style:

```tsx
<DocsPage
  toc={page.data.toc}
  tableOfContent={{
    style: 'clerk',
  }}
/>
```

---

## Phase 2: Search & Discovery

### 2.1 Orama Search with Tag Filtering

**Priority:** 🔴 Critical  
**Effort:** 1-2 hours

**Installation:**

```bash
# Already included with Fumadocs, but for static export:
npm install @orama/orama
```

**Custom Search Dialog with Category Tabs:**

```tsx
// src/components/search.tsx
'use client';
import { useState } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';

export default function InterlaceSearchDialog(props: SharedProps) {
  const [tag, setTag] = useState<string | undefined>();

  const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    tag,
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter className="flex flex-row gap-2">
          <TagsList tag={tag} onTagChange={setTag}>
            <TagsListItem value={undefined}>All</TagsListItem>
            <TagsListItem value="security">🔐 Security</TagsListItem>
            <TagsListItem value="quality">✨ Quality</TagsListItem>
            <TagsListItem value="framework">⚡ Framework</TagsListItem>
          </TagsList>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
```

**Provider Integration:**

```tsx
// src/components/providers.tsx
'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import SearchDialog from '@/components/search';

export function Provider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}
```

---

## Phase 3: Markdown Features

### 3.1 Mermaid Diagrams (Theme-Aware)

**Priority:** 🟡 High  
**Effort:** 30 minutes

**Installation:**

```bash
npm install mermaid next-themes
```

**Component:** Port from archive `_archive/components/Mermaid.tsx` + `_archive/components/MermaidContent.tsx`

**Styling:** Port from archive `_archive/app/styles/components/mermaid.css`

**MDX Registration:**

```tsx
import { Mermaid } from '@/components/mdx/mermaid';
export function getMDXComponents() {
  return { ...defaultComponents, Mermaid };
}
```

---

### 3.2 Twoslash (TypeScript IntelliSense)

**Priority:** 🟡 High  
**Effort:** 45 minutes

**Installation:**

```bash
npm install fumadocs-twoslash twoslash
```

**Next.js Config:**

```ts
// next.config.ts
serverExternalPackages: ['typescript', 'twoslash'],
```

**MDX Config:**

```ts
// source.config.ts
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';

mdxOptions: {
  rehypeCodeOptions: {
    themes: { light: 'github-light', dark: 'github-dark' },
    transformers: [...(rehypeCodeDefaultOptions.transformers ?? []), transformerTwoslash()],
    langs: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
},
```

**Stylesheet:**

```css
/* global.css */
@import 'fumadocs-twoslash/twoslash.css';
```

**MDX Components:**

```tsx
import * as Twoslash from 'fumadocs-twoslash/ui';
export function getMDXComponents() {
  return { ...defaultComponents, ...Twoslash };
}
```

---

### 3.3 Math (KaTeX)

**Priority:** 🟢 Low  
**Effort:** 20 minutes

**Installation:**

```bash
npm install remark-math rehype-katex katex
```

**MDX Config:**

```ts
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

mdxOptions: {
  remarkPlugins: [remarkMath],
  rehypePlugins: (v) => [rehypeKatex, ...v],
},
```

**Layout Import:**

```tsx
import 'katex/dist/katex.css';
```

---

## Phase 4: OG Images & SEO

### 4.1 Takumi OG Image Generation

**Priority:** 🟡 High  
**Effort:** 1 hour

**Why Takumi over next/og:**

- WebP format = smaller images
- Pre-bundled Geist fonts
- Rust-based = faster for 890+ pages

**Installation:**

```bash
npm install @takumi-rs/image-response
```

**Next.js Config:**

```ts
serverExternalPackages: ['@takumi-rs/image-response'],
```

**Route Handler:** (`app/og/docs/[...slug]/route.tsx`)

```tsx
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from '@takumi-rs/image-response';
import { generate as DefaultImage } from 'fumadocs-ui/og';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/og/docs/[...slug]'>,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <DefaultImage
        title={page.data.title}
        description={page.data.description}
        site="ESLint Interlace"
      />
    ),
    { width: 1200, height: 630, format: 'webp' },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
```

---

## Phase 5: Homepage (Fumadocs Native)

### 5.1 HomeLayout Configuration

**Priority:** 🟡 High  
**Effort:** 1-2 hours

**Layout:** Use `fumadocs-ui/layouts/home` with native components.

```tsx
// src/app/(home)/page.tsx
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import Link from 'next/link';

export default function HomePage() {
  return (
    <HomeLayout>
      <main className="container py-12">
        <h1 className="text-4xl font-bold">ESLint Interlace</h1>
        <p className="text-fd-muted-foreground mt-4">
          Security-first ESLint ecosystem with 180+ rules across 18 plugins.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/docs"
            className="bg-fd-primary text-fd-primary-foreground px-6 py-3 rounded-lg"
          >
            Get Started
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
```

**Use Fumadocs native features:**

- `<Card>` components for feature grids
- `<Cards>` for plugin catalogs
- Native CSS with Interlace brand colors
- Simple, clean design without custom animations

---

## Phase 6: Quality Gates & CI

### 6.1 Link Validation

**Priority:** 🟢 Medium  
**Effort:** 30 minutes

**Installation:**

```bash
npm install next-validate-link
```

**Script:** (`scripts/validate-links.ts`)

```ts
import {
  printErrors,
  scanURLs,
  validateFiles,
  type FileObject,
} from 'next-validate-link';
import { source } from '@/lib/source';

async function checkLinks() {
  const scanned = await scanURLs({
    preset: 'next',
    populate: {
      'docs/[[...slug]]': source.getPages().map((page) => ({
        value: { slug: page.slugs },
        hashes: page.data.toc.map((item) => item.url.slice(1)),
      })),
    },
  });

  const files = await Promise.all(
    source.getPages().map(
      async (page): Promise<FileObject> => ({
        path: page.absolutePath,
        content: await page.data.getText('raw'),
        url: page.url,
        data: page.data,
      }),
    ),
  );

  printErrors(
    await validateFiles(files, {
      scanned,
      markdown: { components: { Card: { attributes: ['href'] } } },
      checkRelativePaths: 'as-url',
    }),
    true,
  );
}

void checkLinks();
```

**CI Integration:**

```yaml
# .github/workflows/validate-links.yml
- name: Validate Links
  run: bun ./scripts/validate-links.ts
```

---

## Phase 7: Optional Enhancements

### 7.1 Notebook Layout

**Priority:** 🟢 Low  
**Use Cases:** Changelogs, Blog, Privacy/Terms, Roadmap

```tsx
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
```

---

## Implementation Order Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundation (Day 1)                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1.1 Theme Architecture (interlace-light.css, interlace-dark.css)            │
│ 1.2 Sidebar Tabs (verify meta.json root: true)                              │
│ 1.3 TOC Styling (style: 'clerk')                                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Search & Discovery (Day 1-2)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2.1 Orama Search with Tag Filtering (Security/Quality/Framework)            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Markdown Features (Day 2)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3.1 Mermaid Diagrams (fumadocs-twoslash)                                    │
│ 3.2 Twoslash TypeScript (IDE annotations)                                   │
│ 3.3 Math/KaTeX (optional)                                                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: OG Images & SEO (Day 2-3)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4.1 Takumi OG Image Generation (WebP, fast builds)                          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Homepage (Day 3)                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5.1 HomeLayout with native Fumadocs components                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Quality Gates (Day 4)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6.1 Link Validation Script + CI Integration                                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: Optional (Future)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7.1 Notebook Layout for Changelogs/Blog                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Matrix

| Feature                  | Phase | Priority    | Effort | Status     |
| ------------------------ | ----- | ----------- | ------ | ---------- |
| Theme Files (Light/Dark) | 1     | 🔴 Critical | 1-2h   | ⏳ Pending |
| Sidebar Tabs             | 1     | 🔴 Critical | 30m    | ⏳ Pending |
| TOC Clerk Style          | 1     | 🟡 High     | 15m    | ⏳ Pending |
| Orama Search + Tags      | 2     | 🔴 Critical | 1-2h   | ⏳ Pending |
| Mermaid Diagrams         | 3     | 🟡 High     | 30m    | ⏳ Pending |
| Twoslash TypeScript      | 3     | 🟡 High     | 45m    | ⏳ Pending |
| Math (KaTeX)             | 3     | 🟢 Low      | 20m    | ⏳ Pending |
| Takumi OG Images         | 4     | 🟡 High     | 1h     | ⏳ Pending |
| Homepage (Native)        | 5     | 🟡 High     | 1h     | ⏳ Pending |
| Link Validation          | 6     | 🟢 Medium   | 30m    | ⏳ Pending |
| Notebook Layout          | 7     | 🟢 Low      | 30m    | ⏳ Pending |
| **Remote Content**       | —     | 🔴 Critical | 2h     | ⏳ Pending |

---

## Dependencies to Install

```bash
# Phase 1: Foundation
# (No new deps - uses Fumadocs defaults)

# Phase 2: Search
npm install @orama/orama  # Only for static export

# Phase 3: Markdown
npm install mermaid next-themes
npm install fumadocs-twoslash twoslash
npm install remark-math rehype-katex katex

# Phase 4: OG Images
npm install @takumi-rs/image-response

# Phase 6: Quality
npm install next-validate-link
```

---

## Appendix J: 100% Remote Content Architecture

### Overview

**Strategy:** All documentation content is fetched remotely at runtime (SSR/ISR), eliminating the need for redeployment when content updates. This includes:

- Plugin READMEs and overviews from GitHub
- Rule documentation from GitHub
- Changelogs from GitHub
- Getting started guides from GitHub
- Articles from Dev.to API

---

### How .md/.mdx Files Flow from GitHub to the Docs Site

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           GITHUB REPOSITORIES (Source of Truth)                           │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐              │
│  │  eslint-plugin-browser-security │    │  eslint-plugin-secure-coding    │              │
│  │  ├── README.md                  │    │  ├── README.md                  │              │
│  │  ├── CHANGELOG.md               │    │  ├── CHANGELOG.md               │              │
│  │  └── docs/rules/                │    │  └── docs/rules/                │              │
│  │      ├── no-insecure-url.md     │    │      ├── no-hardcoded-secrets.md│              │
│  │      ├── no-document-cookie.md  │    │      ├── no-sql-injection.md    │              │
│  │      └── ...                    │    │      └── ...                    │              │
│  └─────────────────────────────────┘    └─────────────────────────────────┘              │
│                                                                                           │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐              │
│  │  eslint-docs (central docs)     │    │  eslint-plugin-jwt              │              │
│  │  ├── getting-started/           │    │  ├── README.md                  │   ... 18+   │
│  │  │   ├── index.md               │    │  ├── CHANGELOG.md               │   plugins   │
│  │  │   └── installation.md        │    │  └── docs/rules/                │              │
│  │  ├── concepts/                  │    │      ├── no-weak-algorithm.md   │              │
│  │  │   ├── cwe-mappings.md        │    │      └── ...                    │              │
│  │  │   └── owasp-coverage.md      │    └─────────────────────────────────┘              │
│  │  └── ROADMAP.md                 │                                                      │
│  └─────────────────────────────────┘                                                      │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTP GET (raw.githubusercontent.com)
                                          │ Cached with ISR (1 hour)
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              INTERLACE DOCS APP (Next.js SSR)                             │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  src/lib/github-content.ts                                                          │ │
│  │  ─────────────────────────────                                                      │ │
│  │  fetchGitHubContent({ repo, path }) → raw markdown string                           │ │
│  │                                                                                     │ │
│  │  Example:                                                                           │ │
│  │  fetchGitHubContent({                                                               │ │
│  │    repo: 'eslint-plugin-browser-security',                                          │ │
│  │    path: 'docs/rules/no-insecure-url.md'                                            │ │
│  │  })                                                                                 │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                               │
│                                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  @fumadocs/mdx-remote                                                               │ │
│  │  ─────────────────────────                                                          │ │
│  │  compiler.compile({ source: markdownString })                                       │ │
│  │                                                                                     │ │
│  │  Returns:                                                                           │ │
│  │  {                                                                                  │ │
│  │    body: ReactComponent,    // Rendered MDX                                         │ │
│  │    toc: TableOfContents[],  // Extracted headings                                   │ │
│  │    frontmatter: {...}       // Parsed YAML frontmatter                              │ │
│  │  }                                                                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                               │
│                                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Fumadocs Page Components                                                           │ │
│  │  ─────────────────────────                                                          │ │
│  │  <DocsPage toc={compiled.toc}>                                                      │ │
│  │    <DocsBody>                                                                       │ │
│  │      <MdxContent components={getMDXComponents()} />                                 │ │
│  │    </DocsBody>                                                                      │ │
│  │  </DocsPage>                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 RENDERED DOCUMENTATION                                    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  /docs/browser-security              → README.md from eslint-plugin-browser-security      │
│  /docs/browser-security/rules/no-insecure-url → docs/rules/no-insecure-url.md            │
│  /docs/getting-started               → eslint-docs/getting-started/index.md              │
│  /docs/concepts/cwe-mappings         → eslint-docs/concepts/cwe-mappings.md              │
│  /docs/changelog                     → Aggregated CHANGELOG.md from all plugins          │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Request Flow: User visits `/docs/browser-security/rules/no-insecure-url`

```
┌─────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User   │────▶│   Next.js       │────▶│  fetchGitHub     │────▶│   GitHub Raw    │
│ Browser │     │   Page (SSR)    │     │  Content()       │     │   Content API   │
└─────────┘     └─────────────────┘     └──────────────────┘     └─────────────────┘
                       │                        │                        │
                       │                        │    HTTP GET            │
                       │                        │◀───────────────────────│
                       │                        │   "# no-insecure-url   │
                       │                        │    Prevents..."        │
                       │                        │                        │
                       │   ┌────────────────────▼────────────────────┐   │
                       │   │  @fumadocs/mdx-remote                   │   │
                       │   │  compiler.compile({ source })           │   │
                       │   │  → { body: <Component/>, toc: [...] }   │   │
                       │   └────────────────────┬────────────────────┘   │
                       │                        │                        │
                       │◀───────────────────────│                        │
                       │   <DocsPage>           │                        │
                       │     <DocsBody>         │                        │
                       │       <MdxContent/>    │                        │
                       │     </DocsBody>        │                        │
                       │   </DocsPage>          │                        │
                       │                        │                        │
┌─────────┐◀───────────┘                        │                        │
│  User   │   Rendered HTML                     │                        │
│ Browser │   with TOC + content                │                        │
└─────────┘                                     │                        │
```

---

### Caching & Revalidation Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          ISR CACHING LAYERS                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: Next.js Data Cache (fetch with revalidate: 3600)                 │
│  ─────────────────────────────────────────────────────────                 │
│  • GitHub raw content cached for 1 hour                                    │
│  • After 1 hour: stale-while-revalidate (serves cached, fetches new)       │
│  • Tagged with: `github-${repo}`, `github-${path}`                         │
│                                                                             │
│  LAYER 2: On-Demand Revalidation (GitHub Webhooks)                         │
│  ─────────────────────────────────────────────────                         │
│  • Push to plugin repo → webhook → /api/revalidate                         │
│  • revalidateTag(`github-eslint-plugin-browser-security`)                  │
│  • Instant cache invalidation → next request fetches fresh                 │
│                                                                             │
│  LAYER 3: Static Params (Build Time)                                       │
│  ─────────────────────────────────────                                     │
│  • generateStaticParams() pre-renders known pages                          │
│  • First request → instant (already rendered)                              │
│  • Unknown pages → SSR on demand                                           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Interlace Docs App (100% Remote SSR)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Page Tree (Static)                            │    │
│  │  Defines navigation structure only - NO content                      │    │
│  │  Located in: content/docs/**/meta.json                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    @fumadocs/mdx-remote                              │    │
│  │                    createCompiler()                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │                    │                              │
│                          ▼                    ▼                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐         │
│  │      GitHub Raw Content      │  │       Dev.to API             │         │
│  │  raw.githubusercontent.com   │  │   dev.to/api/articles        │         │
│  │                              │  │                              │         │
│  │  • Plugin READMEs (.md)      │  │  • Technical articles        │         │
│  │  • Rule documentation (.md)  │  │  • Plugin relevance scoring  │         │
│  │  • Changelogs (.md)          │  │  • Tag-based filtering       │         │
│  │  • Getting started (.md)     │  │                              │         │
│  │  • Concept pages (.mdx)      │  │                              │         │
│  └──────────────────────────────┘  └──────────────────────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content Source Mapping

| Content Type        | Source                          | Path Pattern                         | Revalidation |
| ------------------- | ------------------------------- | ------------------------------------ | ------------ |
| **Getting Started** | GitHub: `eslint-docs` repo      | `docs/getting-started/*.md`          | 1 hour       |
| **Concepts**        | GitHub: `eslint-docs` repo      | `docs/concepts/*.md`                 | 1 hour       |
| **Coverage Matrix** | GitHub: `eslint-docs` repo      | `docs/coverage.md`                   | 1 hour       |
| **Roadmap**         | GitHub: `eslint-docs` repo      | `ROADMAP.md`                         | 1 hour       |
| **Plugin READMEs**  | GitHub: `eslint-plugin-*` repos | `README.md`                          | 1 hour       |
| **Rule Docs**       | GitHub: `eslint-plugin-*` repos | `docs/rules/*.md`                    | 1 hour       |
| **Changelogs**      | GitHub: `eslint-plugin-*` repos | `CHANGELOG.md`                       | 1 hour       |
| **Articles**        | Dev.to API                      | `/api/articles?username=ofri-peretz` | 1 hour       |

---

### Implementation Files

#### 1. GitHub Content Fetcher

```typescript
// src/lib/github-content.ts
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/interlacelabs';

export interface GitHubSource {
  repo: string;
  branch?: string;
  path: string;
}

export async function fetchGitHubContent(
  source: GitHubSource,
): Promise<string> {
  const branch = source.branch ?? 'main';
  const url = `${GITHUB_RAW_BASE}/${source.repo}/${branch}/${source.path}`;

  const response = await fetch(url, {
    next: {
      revalidate: 3600, // Revalidate every hour (ISR)
      tags: [`github-${source.repo}`, `github-${source.path}`],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

// Predefined sources for all plugins (20+ plugins)
export const PLUGIN_SOURCES = {
  'browser-security': {
    repo: 'eslint-plugin-browser-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'node-security': {
    repo: 'eslint-plugin-node-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'secure-coding': {
    repo: 'eslint-plugin-secure-coding',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  jwt: {
    repo: 'eslint-plugin-jwt',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'mongodb-security': {
    repo: 'eslint-plugin-mongodb-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  pg: {
    repo: 'eslint-plugin-pg',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'vercel-ai-security': {
    repo: 'eslint-plugin-vercel-ai-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'lambda-security': {
    repo: 'eslint-plugin-lambda-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'express-security': {
    repo: 'eslint-plugin-express-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'nestjs-security': {
    repo: 'eslint-plugin-nestjs-security',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  'import-next': {
    repo: 'eslint-plugin-import-next',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  conventions: {
    repo: 'eslint-plugin-conventions',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  maintainability: {
    repo: 'eslint-plugin-maintainability',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  reliability: {
    repo: 'eslint-plugin-reliability',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  modularity: {
    repo: 'eslint-plugin-modularity',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  operability: {
    repo: 'eslint-plugin-operability',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
  modernization: {
    repo: 'eslint-plugin-modernization',
    readme: 'README.md',
    changelog: 'CHANGELOG.md',
    rulesDir: 'docs/rules',
  },
} as const;

export type PluginKey = keyof typeof PLUGIN_SOURCES;

// Getting Started docs source (from dedicated docs repo)
export const DOCS_REPO = 'eslint-docs';
export const DOCS_SOURCES = {
  'getting-started': {
    index: 'docs/getting-started/index.md',
    installation: 'docs/getting-started/installation.md',
  },
  concepts: {
    index: 'docs/concepts/index.md',
    'agentic-linting': 'docs/concepts/agentic-linting.md',
    'cwe-mappings': 'docs/concepts/cwe-mappings.md',
    'owasp-coverage': 'docs/concepts/owasp-coverage.md',
    'plugin-categories': 'docs/concepts/plugin-categories.md',
  },
  coverage: 'docs/coverage.md',
  roadmap: 'ROADMAP.md',
} as const;
```

#### 2. MDX Compiler Setup

```typescript
// src/lib/mdx-compiler.ts
import { createCompiler } from '@fumadocs/mdx-remote';

export const compiler = createCompiler({
  // Fumadocs MDX plugins included by default
  // Custom plugins can be added here
});
```

#### 3. Dev.to API Route (Port from Archive)

```typescript
// src/app/api/devto-articles/route.ts
import { NextResponse } from 'next/server';

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image: string;
  published_at: string;
  reading_time_minutes: number;
  positive_reactions_count: number;
  comments_count: number;
  page_views_count?: number;
  tag_list: string[];
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

interface TagMapping {
  primaryTags: string[];
  secondaryTags: string[];
}

const PLUGIN_TAG_MAPPING: Record<string, TagMapping> = {
  'secure-coding': {
    primaryTags: ['owasp', 'secure-coding', 'cwe'],
    secondaryTags: ['eslint', 'security', 'javascript', 'typescript'],
  },
  pg: {
    primaryTags: ['postgres', 'postgresql', 'pg'],
    secondaryTags: ['sql', 'database', 'security'],
  },
  jwt: {
    primaryTags: ['jwt', 'jsonwebtoken', 'jose'],
    secondaryTags: ['authentication', 'security', 'token'],
  },
  crypto: {
    primaryTags: ['crypto', 'cryptography', 'encryption'],
    secondaryTags: ['security', 'hashing'],
  },
  'express-security': {
    primaryTags: ['express'],
    secondaryTags: ['security', 'nodejs', 'cors', 'helmet', 'middleware'],
  },
  'nestjs-security': {
    primaryTags: ['nestjs', 'nest'],
    secondaryTags: ['security', 'typescript', 'decorators'],
  },
  'lambda-security': {
    primaryTags: ['lambda', 'aws-lambda', 'serverless'],
    secondaryTags: ['aws', 'security', 'cloud'],
  },
  'browser-security': {
    primaryTags: ['xss', 'browser', 'dom', 'postmessage'],
    secondaryTags: ['security', 'javascript', 'webapi'],
  },
  'mongodb-security': {
    primaryTags: ['mongodb', 'mongo', 'nosql'],
    secondaryTags: ['database', 'security', 'injection'],
  },
  'vercel-ai-security': {
    primaryTags: ['ai', 'llm', 'vercel-ai', 'openai', 'genai', 'gpt'],
    secondaryTags: ['security', 'prompt', 'injection'],
  },
  'import-next': {
    primaryTags: ['import', 'imports', 'modules', 'esm'],
    secondaryTags: ['eslint', 'architecture', 'bundling'],
  },
};

function calculateRelevanceScore(
  article: DevToArticle,
  mapping: TagMapping,
): number {
  const articleTags = article.tag_list.map((t) => t.toLowerCase());
  const titleLower = article.title.toLowerCase();
  let score = 0;

  for (const primaryTag of mapping.primaryTags) {
    const tagLower = primaryTag.toLowerCase();
    if (articleTags.some((t) => t.includes(tagLower) || tagLower.includes(t))) {
      score += 10;
    }
    if (titleLower.includes(tagLower)) {
      score += 5;
    }
  }

  for (const secondaryTag of mapping.secondaryTags) {
    const tagLower = secondaryTag.toLowerCase();
    if (articleTags.some((t) => t.includes(tagLower))) {
      score += 2;
    }
  }

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plugin = searchParams.get('plugin');
  const limit = parseInt(searchParams.get('limit') || '6', 10);

  try {
    const apiKey = process.env.DEVTO_API_KEY;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;

    const endpoint = apiKey
      ? 'https://dev.to/api/articles/me/all?per_page=100'
      : 'https://dev.to/api/articles?username=ofri-peretz&per_page=100';

    const response = await fetch(endpoint, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Dev.to API error: ${response.status}`);
    }

    let articles: DevToArticle[] = await response.json();

    // Filter by plugin relevance if specified
    if (plugin && PLUGIN_TAG_MAPPING[plugin]) {
      const mapping = PLUGIN_TAG_MAPPING[plugin];
      const scoredArticles = articles
        .map((article) => ({
          article,
          score: calculateRelevanceScore(article, mapping),
        }))
        .filter(({ score }) => score >= 10)
        .sort((a, b) => b.score - a.score);
      articles = scoredArticles.map(({ article }) => article);
    } else if (!plugin || plugin === 'all') {
      articles = articles.filter((article) => {
        const hasEslintTag = article.tag_list.some((tag) =>
          tag.toLowerCase().includes('eslint'),
        );
        const hasEslintTitle = article.title.toLowerCase().includes('eslint');
        return hasEslintTag || hasEslintTitle;
      });
    }

    return NextResponse.json({
      articles: articles.slice(0, limit),
      total: articles.length,
      plugin: plugin || 'all',
    });
  } catch (error) {
    console.error('Dev.to API error:', error);
    return NextResponse.json(
      { articles: [], total: 0, error: 'Failed to fetch articles' },
      { status: 500 },
    );
  }
}
```

#### 4. Remote Getting Started Page

```tsx
// src/app/docs/(getting-started)/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import {
  fetchGitHubContent,
  DOCS_REPO,
  DOCS_SOURCES,
} from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';

export const revalidate = 3600;

export default async function GettingStartedPage() {
  const content = await fetchGitHubContent({
    repo: DOCS_REPO,
    path: DOCS_SOURCES['getting-started'].index,
  });

  const compiled = await compiler.compile({ source: content });
  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
```

#### 5. Remote Plugin Overview Page

```tsx
// src/app/docs/(security)/[plugin]/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import {
  fetchGitHubContent,
  PLUGIN_SOURCES,
  type PluginKey,
} from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ plugin: string }>;
}

export default async function PluginOverviewPage({ params }: PageProps) {
  const { plugin } = await params;

  const source = PLUGIN_SOURCES[plugin as PluginKey];
  if (!source) notFound();

  const content = await fetchGitHubContent({
    repo: source.repo,
    path: source.readme,
  });

  const compiled = await compiler.compile({ source: content });
  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(PLUGIN_SOURCES).map((plugin) => ({ plugin }));
}
```

#### 6. Remote Rule Documentation Page

```tsx
// src/app/docs/(security)/[plugin]/rules/[rule]/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import {
  fetchGitHubContent,
  PLUGIN_SOURCES,
  type PluginKey,
} from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ plugin: string; rule: string }>;
}

export default async function RulePage({ params }: PageProps) {
  const { plugin, rule } = await params;

  const source = PLUGIN_SOURCES[plugin as PluginKey];
  if (!source) notFound();

  try {
    const content = await fetchGitHubContent({
      repo: source.repo,
      path: `${source.rulesDir}/${rule}.md`,
    });

    const compiled = await compiler.compile({ source: content });
    const MdxContent = compiled.body;

    return (
      <DocsPage toc={compiled.toc}>
        <DocsBody>
          <MdxContent components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  } catch {
    notFound();
  }
}

// Pre-render known rules at build time (from local JSON data)
export async function generateStaticParams() {
  // Import rule lists from local JSON files
  const allRules: { plugin: string; rule: string }[] = [];

  // This can be expanded to dynamically import all plugin rule files
  const browserSecurityRules = await import(
    '@/data/plugin-rules/browser-security.json'
  );
  browserSecurityRules.rules?.forEach((r: { name: string }) => {
    allRules.push({ plugin: 'browser-security', rule: r.name });
  });

  return allRules;
}
```

#### 7. Articles Page with Dev.to Integration

```tsx
// src/app/docs/(getting-started)/articles/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { ArticlesPageContent } from '@/components/articles/ArticlesPageContent';

export const revalidate = 3600;

export const metadata = {
  title: 'Technical Articles',
  description:
    'Deep dives into ESLint internals, security patterns, and high-performance engineering.',
};

export default function ArticlesPage() {
  return (
    <DocsPage>
      <DocsBody>
        <ArticlesPageContent />
      </DocsBody>
    </DocsPage>
  );
}
```

#### 8. Aggregated Changelog Page

```tsx
// src/app/docs/changelog/page.tsx
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/mdx-components';
import { fetchGitHubContent, PLUGIN_SOURCES } from '@/lib/github-content';
import { compiler } from '@/lib/mdx-compiler';

export const revalidate = 3600;

export default async function ChangelogPage() {
  const changelogs = await Promise.all(
    Object.entries(PLUGIN_SOURCES).map(async ([name, source]) => {
      try {
        const content = await fetchGitHubContent({
          repo: source.repo,
          path: source.changelog,
        });
        return { name, content };
      } catch {
        return { name, content: `_No changelog available for ${name}_` };
      }
    }),
  );

  const combinedContent = changelogs
    .map(({ name, content }) => `## ${name}\n\n${content}`)
    .join('\n\n---\n\n');

  const compiled = await compiler.compile({ source: combinedContent });
  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <h1>Changelog</h1>
        <p className="text-fd-muted-foreground">
          Auto-synced from GitHub. Last updated: {new Date().toISOString()}
        </p>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
```

#### 9. On-Demand Revalidation Webhook

```typescript
// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const { repo, path } = await request.json();

    if (repo) revalidateTag(`github-${repo}`);
    if (path) revalidateTag(`github-${path}`);

    return NextResponse.json({
      revalidated: true,
      repo,
      path,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
```

---

### Minimal Static Structure (Navigation Only)

With 100% remote content, the `content/docs/` folder only defines **navigation structure** via `meta.json` files:

```
content/docs/
├── meta.json                           ← Root ordering
│
├── (getting-started)/
│   └── meta.json                       ← { "root": true, "title": "Getting Started", "pages": [...] }
│
├── (security)/
│   ├── meta.json                       ← { "root": true, "title": "Security" }
│   ├── browser-security/
│   │   └── meta.json                   ← { "title": "Browser Security", "pages": ["index", "rules"] }
│   ├── node-security/
│   │   └── meta.json
│   └── ... (other security plugins)
│
├── (framework)/
│   ├── meta.json                       ← { "root": true, "title": "Framework" }
│   └── ... (framework plugins)
│
└── (quality)/
    ├── meta.json                       ← { "root": true, "title": "Quality & Architecture" }
    └── ... (quality plugins)
```

**Key Insight:** The `meta.json` files define the **sidebar structure**, while all actual content is fetched from GitHub/Dev.to at runtime.

---

### Benefits of 100% Remote Architecture

| Benefit                       | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| ✅ **Zero Redeploy**          | Content updates via ISR (1-hour cache)         |
| ✅ **Single Source of Truth** | Docs live in plugin repos                      |
| ✅ **Instant Updates**        | GitHub webhooks trigger revalidation           |
| ✅ **SEO Friendly**           | SSR ensures content is indexed                 |
| ✅ **Fast Initial Load**      | `generateStaticParams` pre-renders known pages |
| ✅ **Resilient**              | ISR serves cached content if GitHub is down    |
| ✅ **Articles Integration**   | Dev.to API provides real-time article feed     |
| ✅ **Plugin Relevance**       | Tag-based scoring for related articles         |

---

### Required Dependencies

```bash
# Remote content compilation
npm install @fumadocs/mdx-remote

# Client-side data fetching (for articles page)
npm install @tanstack/react-query
```

---

### Environment Variables

```env
# Optional: Dev.to API key for authenticated requests (includes page_views_count)
DEVTO_API_KEY=your_api_key_here

# Webhook secret for on-demand revalidation
REVALIDATE_SECRET=your_secret_here
```

---

### GitHub Webhook Setup

To enable instant updates when plugin repos are updated:

1. In each plugin repo, go to **Settings → Webhooks**
2. Add webhook:
   - **URL**: `https://your-docs-site.com/api/revalidate`
   - **Content type**: `application/json`
   - **Secret**: Your `REVALIDATE_SECRET`
   - **Events**: `push`
3. Payload: `{ "repo": "eslint-plugin-browser-security" }`

---

## API Infrastructure (Required for Remote Content)

### Dev.to API Route

| File                                  | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `src/app/api/devto-articles/route.ts` | Fetches articles with plugin relevance scoring |
| `src/lib/api.ts`                      | React Query hooks for client-side fetching     |

### Data Files

| File                           | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `src/data/plugin-rules/*.json` | Rule metadata for generateStaticParams |

---

## Next Steps

1. **Approve this plan** or request modifications
2. **Start Phase 1** - Create theme files and verify sidebar tabs
3. **Implement Remote Content** - Set up GitHub fetching with @fumadocs/mdx-remote
4. **Iterate** - Move through phases sequentially

---

_This plan focuses on Fumadocs-native features with 100% remote content from GitHub._
