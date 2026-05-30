/**
 * sync-philosophies.ts
 *
 * Projects the 23 `*_PHILOSOPHY.md` documents at the repo root into two
 * consumer surfaces:
 *
 *   1. Fumadocs MDX pages under `apps/docs/content/docs/design/`
 *   2. Storybook MDX pages under `apps/storybook/src/stories/philosophy/`
 *
 * The repo-root `.md` files remain the single source of truth. The
 * generated MDX files carry a hash of their source in the header so a
 * vitest drift-lock can refuse to ship if a `.md` is edited without
 * re-running this script.
 *
 * Usage:
 *   npm run sync:philosophies            — regenerate (writes both surfaces)
 *   npm run sync:philosophies -- --check — exits non-zero if any output drifts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_OUT = path.join(REPO_ROOT, 'apps/docs/content/docs/design');
const SB_OUT = path.join(REPO_ROOT, 'apps/storybook/src/stories/philosophy');

const CHECK_MODE = process.argv.includes('--check');

// Slug → lucide-react icon name. Used by Fumadocs frontmatter so each
// sidebar entry gets a glyph. Order in the meta.json `pages` array is
// independent from this map.
const ICON_BY_SLUG: Record<string, string> = {
  ux: 'Sparkles',
  layout: 'Layout',
  typography: 'Type',
  color: 'Palette',
  motion: 'Wand2',
  loading: 'Loader',
  cta: 'MousePointerClick',
  form: 'ClipboardList',
  error: 'AlertTriangle',
  keyboard: 'Keyboard',
  a11y: 'Accessibility',
  pagination: 'ListOrdered',
  'data-table': 'Table',
  search: 'Search',
  'code-example': 'Code2',
  docs: 'BookOpen',
  url: 'Link2',
  'deep-linking': 'Link',
  seo: 'Globe',
  i18n: 'Languages',
  interop: 'Plug',
  auth: 'Lock',
  security: 'Shield',
  analytics: 'BarChart3',
  utm: 'Tag',
};

// 8 named clusters that organise the philosophies for both surfaces.
// The order within each cluster is curated; the order of clusters mirrors
// the path a component author traverses when designing a primitive:
// look → behaviour → content → navigation → reach → trust → observe →
// record.
//
// Adding a new philosophy: assign it to a cluster here. The generator's
// rendering (docs sidebar separators, docs landing card groups,
// Storybook nested title) all derive from this single map.
interface Category {
  label: string;
  /** Short hint shown under the category heading on the landing page. */
  hint: string;
  slugs: string[];
}

const CATEGORIES: Category[] = [
  {
    label: 'Foundations',
    hint: 'The visual contract. Every primitive consumes these tokens and rhythms.',
    slugs: ['ux', 'layout', 'typography', 'color', 'motion'],
  },
  {
    label: 'Interaction & States',
    hint: 'How a primitive responds to a person — focus, loading, error, conversion.',
    slugs: ['cta', 'loading', 'keyboard', 'a11y', 'error'],
  },
  {
    label: 'Content Patterns',
    hint: 'How information is presented inside the surface.',
    slugs: ['code-example', 'search', 'pagination', 'data-table', 'form'],
  },
  {
    label: 'Navigation & Routing',
    hint: 'How URLs, anchors, and shared links behave.',
    slugs: ['url', 'deep-linking', 'seo'],
  },
  {
    label: 'Reach',
    hint: 'How a component travels across languages and tooling.',
    slugs: ['i18n', 'interop'],
  },
  {
    label: 'Trust',
    hint: 'Auth, app-layer security, and the UI surface of secure-by-default.',
    slugs: ['auth', 'security'],
  },
  {
    label: 'Observability',
    hint: 'How a deployed surface measures itself — pageviews, funnels, identity, cross-property journeys.',
    slugs: ['analytics', 'utm'],
  },
  {
    label: 'Documentation',
    hint: 'How the design system explains itself to consumers.',
    slugs: ['docs'],
  },
];

const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.slugs.map((s) => [s, c])),
);

const DOCS_ORDER: string[] = [
  'index',
  ...CATEGORIES.flatMap((c) => c.slugs),
];

interface Philosophy {
  /** Absolute path to the source `.md`. */
  sourcePath: string;
  /** Slug derived from filename, e.g. `layout`, `code-example`. */
  slug: string;
  /** Display title — first `# Heading` line. */
  title: string;
  /** One-line description for the landing card grid. */
  description: string;
  /** Full body, with the first `# Heading` stripped. */
  body: string;
  /** First 12 hex chars of SHA-256 over source content. */
  hash: string;
  /** Lucide icon name. */
  icon: string;
}

function slugFromFilename(file: string): string {
  // A11Y_PHILOSOPHY.md → a11y
  // CODE_EXAMPLE_PHILOSOPHY.md → code-example
  return file
    .replace(/_PHILOSOPHY\.md$/, '')
    .toLowerCase()
    .replace(/_/g, '-');
}

function titleCase(slug: string): string {
  // 'code-example' → 'Code Example', 'cta' → 'CTA', 'a11y' → 'A11y'
  const acronyms = new Set(['cta', 'ux', 'url', 'seo', 'a11y', 'i18n', 'auth']);
  if (acronyms.has(slug)) return slug.toUpperCase();
  return slug
    .split('-')
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

function deriveDescription(body: string): string {
  // First paragraph after the title that isn't a callout, table, or list.
  for (const para of body.split(/\n\s*\n/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('```')) continue;
    // Strip markdown link syntax and inline code; collapse whitespace.
    const flat = trimmed
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s+/g, ' ');
    // First sentence, ≤160 chars.
    const sentence = flat.split(/(?<=[.!?])\s/)[0];
    return sentence.length > 160 ? sentence.slice(0, 157) + '…' : sentence;
  }
  return 'Design philosophy.';
}

function rewriteCrossLinks(
  markdown: string,
  surface: 'docs' | 'storybook',
): string {
  // Match `[label](FOO_PHILOSOPHY.md)` / `[label](./FOO_PHILOSOPHY.md)`
  // including optional `#anchor`.
  return markdown.replace(
    /\[([^\]]+)\]\(\.?\/?([A-Z][A-Z0-9_]*)_PHILOSOPHY\.md(#[^)]+)?\)/g,
    (_match, label, name, anchor = '') => {
      const targetSlug = slugFromFilename(`${name}_PHILOSOPHY.md`);
      if (surface === 'docs') {
        return `[${label}](/docs/design/${targetSlug}${anchor})`;
      }
      // Storybook MDX page IDs follow `philosophy-<slug>--docs`.
      return `[${label}](?path=/docs/philosophy-${targetSlug}--docs)`;
    },
  );
}

function escapeForMdx(markdown: string): string {
  // MDX2+ parses `<` followed by an identifier-start char as JSX. Most
  // philosophy docs are safe (they use words like "less than 5 min" with
  // spaces), but defensive: escape any standalone `<` that doesn't open
  // a known HTML/JSX tag. The pattern targets `<` followed by anything
  // that isn't an alphabetic char (which would be a real tag).
  //
  // Pass through fenced code blocks unchanged.
  const lines = markdown.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (line.trim().startsWith('```')) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // Escape `<` when followed by a space, digit, or operator — those
      // are content, not tags. Leaves `<Component>` and `</tag>` alone.
      return line.replace(/<(?=[\s\d=!])/g, '&lt;');
    })
    .join('\n');
}

function loadPhilosophy(sourcePath: string): Philosophy {
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 12);
  const slug = slugFromFilename(path.basename(sourcePath));

  // First `# Heading` line is the title.
  const lines = raw.split('\n');
  const titleIdx = lines.findIndex((l) => /^#\s+\S/.test(l));
  const title =
    titleIdx >= 0
      ? lines[titleIdx].replace(/^#\s+/, '').trim()
      : titleCase(slug);
  const bodyLines = titleIdx >= 0 ? lines.slice(titleIdx + 1) : lines;
  const body = bodyLines.join('\n').trimStart();
  const description = deriveDescription(body);
  const icon = ICON_BY_SLUG[slug] ?? 'BookText';

  return { sourcePath, slug, title, description, body, hash, icon };
}

function renderDocsMdx(p: Philosophy): string {
  const safeBody = escapeForMdx(rewriteCrossLinks(p.body, 'docs'));
  // Fumadocs uses YAML frontmatter for title/description/icon. The
  // hash header lives in an MDX comment so the renderer ignores it but
  // the drift test can grep for it.
  return `---
title: ${JSON.stringify(p.title)}
description: ${JSON.stringify(p.description)}
icon: ${p.icon}
---
{/* AUTO-GENERATED — run \`npm run sync:philosophies\` after editing the source.
    source: ${path.relative(REPO_ROOT, p.sourcePath)}
    hash: ${p.hash} */}

${safeBody.trimEnd()}
`;
}

function renderStorybookMdx(p: Philosophy): string {
  const safeBody = escapeForMdx(rewriteCrossLinks(p.body, 'storybook'));
  const cat = CATEGORY_BY_SLUG[p.slug];
  // Storybook nests by `/` in the title — so "Philosophy/Foundations/UX"
  // becomes Philosophy → Foundations → UX in the sidebar. Falls back to
  // a flat Philosophy/<Title> if the slug has no category (defensive).
  const nestedTitle = cat
    ? `Philosophy/${cat.label}/${titleCase(p.slug)}`
    : `Philosophy/${titleCase(p.slug)}`;
  return `import { Meta } from '@storybook/addon-docs/blocks';

<Meta title=${JSON.stringify(nestedTitle)} />

{/* AUTO-GENERATED — run \`npm run sync:philosophies\` after editing the source.
    source: ${path.relative(REPO_ROOT, p.sourcePath)}
    hash: ${p.hash} */}

# ${p.title}

${safeBody.trimEnd()}
`;
}

function renderDocsLanding(philosophies: Philosophy[]): string {
  const bySlug = new Map(philosophies.map((p) => [p.slug, p]));
  const icons = Array.from(
    new Set(philosophies.map((p) => p.icon).filter(Boolean)),
  ).sort();
  const importLine = `import { ${icons.join(', ')} } from 'lucide-react';`;

  // Render one `## <Category>` block per cluster, each with its own
  // Cards grid. Philosophies that are mapped to a category but missing
  // from the source set are skipped silently (defensive); philosophies
  // that exist but have no category fall into a final "Other" block.
  const seen = new Set<string>();
  const categoryBlocks: string[] = [];

  for (const cat of CATEGORIES) {
    const members = cat.slugs
      .map((s) => bySlug.get(s))
      .filter((p): p is Philosophy => !!p);
    if (members.length === 0) continue;
    const cards = members
      .map((p) => {
        seen.add(p.slug);
        return (
          `  <Card title=${JSON.stringify(p.title)} icon={<${p.icon} />} href="/docs/design/${p.slug}">\n` +
          `    ${escapeMdxInline(p.description)}\n` +
          `  </Card>`
        );
      })
      .join('\n');
    categoryBlocks.push(
      `## ${cat.label}\n\n${cat.hint}\n\n<Cards>\n${cards}\n</Cards>`,
    );
  }

  const orphans = philosophies.filter((p) => !seen.has(p.slug));
  if (orphans.length > 0) {
    const cards = orphans
      .map(
        (p) =>
          `  <Card title=${JSON.stringify(p.title)} icon={<${p.icon} />} href="/docs/design/${p.slug}">\n` +
          `    ${escapeMdxInline(p.description)}\n` +
          `  </Card>`,
      )
      .join('\n');
    categoryBlocks.push(
      `## Other\n\nUncategorised — add to a cluster in \`scripts/sync-philosophies.ts\`.\n\n<Cards>\n${cards}\n</Cards>`,
    );
  }

  return `---
title: Design
description: The ${philosophies.length} contracts that govern look-and-feel across every Interlace surface.
icon: Palette
---

${importLine}

# Design philosophies

The Interlace design system is governed by **${philosophies.length} contracts**,
grouped into ${CATEGORIES.length} clusters. Each contract lives at the
monorepo root as a Markdown file and is the single source of truth; this
section projects them so they're discoverable from inside the docs.

If you're shipping a component change and can't point to the principle
behind it, reconsider.

${categoryBlocks.join('\n\n')}
`;
}

function escapeMdxInline(s: string): string {
  // Inline text inside <Card> — escape `<` and `{` to be safe.
  return s.replace(/</g, '&lt;').replace(/\{/g, '&#123;');
}

function renderDocsMeta(philosophies: Philosophy[]): string {
  const slugSet = new Set(philosophies.map((p) => p.slug));
  // Fumadocs accepts `"---Header---"` entries in the `pages` array as
  // sticky section separators in the sidebar (precedent: the
  // `getting-started` meta.json already uses this pattern). We emit one
  // separator per cluster header, then the cluster's slugs.
  const pages: string[] = ['index'];
  const placed = new Set<string>();
  for (const cat of CATEGORIES) {
    const members = cat.slugs.filter((s) => slugSet.has(s));
    if (members.length === 0) continue;
    pages.push(`---${cat.label}---`);
    for (const s of members) {
      pages.push(s);
      placed.add(s);
    }
  }
  // Append any orphans (new philosophy added without a category).
  const orphans = philosophies
    .map((p) => p.slug)
    .filter((s) => !placed.has(s));
  if (orphans.length > 0) {
    pages.push('---Other---');
    for (const s of orphans) pages.push(s);
  }
  return (
    JSON.stringify(
      {
        title: 'Design',
        description: 'Look-and-feel contracts',
        icon: 'Palette',
        root: true,
        defaultOpen: false,
        pages,
      },
      null,
      4,
    ) + '\n'
  );
}

function renderStorybookIndex(philosophies: Philosophy[]): string {
  const bySlug = new Map(philosophies.map((p) => [p.slug, p]));
  // Mirror the docs landing: one section per cluster, with hint + list.
  // Storybook URLs follow `philosophy-<category>-<slug>--docs` once a
  // story's title is nested as Philosophy/Cat/Title; the slugifier is
  // Storybook's own (lowercase, hyphen-separated).
  const sbSlug = (cat: string, slug: string) =>
    `philosophy-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slug}--docs`;

  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const cat of CATEGORIES) {
    const members = cat.slugs
      .map((s) => bySlug.get(s))
      .filter((p): p is Philosophy => !!p);
    if (members.length === 0) continue;
    const list = members
      .map((p) => {
        seen.add(p.slug);
        return `- **[${p.title}](?path=/docs/${sbSlug(cat.label, p.slug)})** — ${p.description}`;
      })
      .join('\n');
    blocks.push(`## ${cat.label}\n\n${cat.hint}\n\n${list}`);
  }
  const orphans = philosophies.filter((p) => !seen.has(p.slug));
  if (orphans.length > 0) {
    const list = orphans
      .map((p) => `- **${p.title}** — ${p.description}`)
      .join('\n');
    blocks.push(`## Other\n\nUncategorised.\n\n${list}`);
  }
  return `import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Philosophy" />

# Design philosophies

The Interlace design system ships **${philosophies.length} look-and-feel contracts**,
grouped into ${CATEGORIES.length} clusters. Each lives at the monorepo root
and is the single source of truth; this section projects them so they're
discoverable from inside Storybook alongside the live components they
govern.

If you're shipping a component change and can't point to the principle
behind it, reconsider.

${blocks.join('\n\n')}
`;
}

function writeIfChanged(file: string, content: string): boolean {
  const existing = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf-8')
    : null;
  if (existing === content) return false;
  if (CHECK_MODE) {
    process.stderr.write(`drift: ${path.relative(REPO_ROOT, file)}\n`);
    return true;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  process.stdout.write(`wrote: ${path.relative(REPO_ROOT, file)}\n`);
  return true;
}

function main(): void {
  const sources = fs
    .readdirSync(REPO_ROOT)
    .filter((f) => /^[A-Z][A-Z0-9_]*_PHILOSOPHY\.md$/.test(f))
    .map((f) => path.join(REPO_ROOT, f))
    .sort();

  if (sources.length === 0) {
    process.stderr.write('error: no *_PHILOSOPHY.md files found at repo root\n');
    process.exit(1);
  }

  const philosophies = sources.map(loadPhilosophy);
  // Order philosophies by DOCS_ORDER so landing-card grid and Storybook
  // index list both render in the curated priority sequence.
  const orderIdx = (s: string) => {
    const i = DOCS_ORDER.indexOf(s);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  philosophies.sort((a, b) => orderIdx(a.slug) - orderIdx(b.slug));

  let drift = 0;

  for (const p of philosophies) {
    if (writeIfChanged(path.join(DOCS_OUT, `${p.slug}.mdx`), renderDocsMdx(p))) drift++;
    if (writeIfChanged(path.join(SB_OUT, `${p.slug}.mdx`), renderStorybookMdx(p))) drift++;
  }

  if (writeIfChanged(path.join(DOCS_OUT, 'index.mdx'), renderDocsLanding(philosophies))) drift++;
  if (writeIfChanged(path.join(DOCS_OUT, 'meta.json'), renderDocsMeta(philosophies))) drift++;
  if (writeIfChanged(path.join(SB_OUT, 'Index.mdx'), renderStorybookIndex(philosophies))) drift++;

  if (CHECK_MODE && drift > 0) {
    process.stderr.write(`\n${drift} projection(s) drifted. Run \`npm run sync:philosophies\` to update.\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\nsynced ${philosophies.length} philosophies → docs + storybook (${drift} changed)\n`,
  );
}

main();
