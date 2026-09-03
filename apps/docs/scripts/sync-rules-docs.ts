/**
 * Sync Rules MD to MDX
 * 
 * This script treats the individual rule documentation in packages as the 
 * "Single Source of Truth" (SSOT) and converts them to MDX for the docs site.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGINS, type PluginEntry } from '../src/lib/plugins';
// The generator must emit exactly what the format validator accepts, so both
// share one definition of "duplicated lead" and "boilerplate lead" rather than
// each carrying its own copy (which is how they drifted apart before).
import {
  BOILERPLATE_PATTERNS,
  findDuplicatedDescriptionParagraph,
  findFirstProseParagraphBeforeHeading,
} from '../src/lib/eslint-validators/rule-mdx-format';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');
const packagesDir = path.join(rootDir, 'packages');
const contentDir = path.resolve(__dirname, '../content/docs');

// Plugin slug → { package, pillar } mapping. Derived from the canonical
// registry at `src/lib/plugins.ts` so the script + the API routes + the
// content can never drift apart. Adding a plugin = appending one row to
// `src/lib/plugins.ts`; this script picks it up automatically.
//
// The pillar field controls write path: rule MDX shells land at
// `content/docs/<pillar>/plugin-<slug>/rules/`. Earlier versions of this
// script wrote to `content/docs/<slug>/rules/` (orphan path that the sidebar
// never references) — fixed 2026-05 alongside the canonical-registry refactor.
export interface PluginMapping {
  package: string;
  pillar: 'security' | 'quality';
}

export const PLUGIN_MAPPINGS: Record<string, PluginMapping> = Object.fromEntries(
  PLUGINS.map((p: PluginEntry) => [p.slug, { package: p.package, pillar: p.pillar }]),
) as Record<string, PluginMapping>;

const MDX_TEMPLATE_IMPORTS = `
import { FalseNegativeCTA, WhenNotToUse, RuleBadges } from "@/components/RuleComponents";
`;

export type TypeStatus = 'unaware' | 'optional' | 'aware';

export interface ConvertOptions {
  /**
   * Type-awareness classification for this rule, sourced from
   * `.agent/type-awareness-scan.tsv`. When provided, the script writes a
   * `type_aware` frontmatter field and emits `<RuleBadges typeAware={...} />`
   * directly under the imports so the rule MDX page surfaces the indicator.
   */
  typeStatus?: TypeStatus;
}

/**
 * Load the per-rule type-awareness classification from
 * `.agent/type-awareness-scan.tsv`. The TSV is the single source of truth
 * (see `.agent/type-awareness-audit.md`). Returns `null` when the file is
 * missing — the generator stays runnable, but every rule renders as 🟢.
 */
export function loadTypeAwarenessMap(tsvPath: string): Map<string, TypeStatus> | null {
  if (!fs.existsSync(tsvPath)) return null;
  const map = new Map<string, TypeStatus>();
  const lines = fs.readFileSync(tsvPath, 'utf-8').split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const [plugin, rule, status] = line.split('\t');
    if (!plugin || !rule || !status) continue;
    const normalized = status.trim();
    if (normalized !== 'unaware' && normalized !== 'optional' && normalized !== 'aware') continue;
    map.set(`${plugin}/${rule}`, normalized);
  }
  return map;
}

// Badge / icon glyphs that mark non-prose lines in source rule docs (legend
// rows, callout headers, etc.). Kept as a non-class alternation so duplicate
// glyphs and combining variation selectors don't form a malformed character
// class (CodeQL: "Duplicate character in character class" on the prior
// `[💼💡🔧🚨⚠️✅📊🔍🔧📝⏱️🔗]` form, where 🔧 appeared twice and U+FE0F
// repeated across ⚠️ / ⏱️).
const DOC_ICON_ALT = '💼|💡|🔧|🚨|⚠️|✅|📊|🔍|📝|⏱️|🔗';
const ICON_HEADER_LINE_RE = new RegExp(`^(?:${DOC_ICON_ALT}).*$\\n?`, 'gmu');
const ICON_INLINE_RE = new RegExp(`(?:${DOC_ICON_ALT})`, 'gu');

// Strip HTML comments until the input is stable. A single pass leaves
// adversarial nesting (e.g. `<!-- a <!-- b --> c -->`) partially intact —
// CodeQL flags this as "Incomplete multi-character sanitization", and rule
// authors do occasionally nest comments in source `.md` files.
function stripHtmlComments(input: string): string {
  let prev: string;
  let out = input;
  do {
    prev = out;
    out = out.replace(/<!--[\s\S]*?-->/g, '');
  } while (out !== prev);
  return out;
}

/**
 * Split a source `.md` into its own frontmatter block and the body below it.
 *
 * Rule `.md` sources already carry canonical frontmatter (`title`,
 * `description`, `tags`, `category`, `severity`, `cwe`, `autofix`). The
 * generator's job is to pass that through and append the two type-awareness
 * fields — NOT to invent a second block. Emitting a fresh frontmatter while
 * leaving the source block in the body is what produced the dual-frontmatter
 * regression (`body-orphan-frontmatter`), which MDX parsed as a giant setext
 * heading and which crashed the compiler on some pages.
 */
function splitFrontmatter(md: string): { frontmatter: string | null; body: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: null, body: md };
  return { frontmatter: m[1], body: md.slice(m[0].length) };
}

function readFrontmatterScalar(frontmatter: string, key: string): string | null {
  const m = frontmatter.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, 'm'));
  if (!m) return null;
  const v = m[1].trim();
  // A double-quoted scalar must be *unescaped*, not merely unwrapped. Slicing
  // the outer quotes off `"a \"b\" c"` leaves the backslashes in the value, and
  // re-emitting it through JSON.stringify then doubles them on every pass —
  // descriptions containing quotes grew a new layer of `\\` each time.
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
    // YAML single-quoted scalars escape a quote by doubling it.
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

/**
 * `description` lands in `<meta>` tags and the page lead, both of which render
 * markdown as literal characters. Strip link syntax and bare-URL wrappers, drop
 * a leading `CWE: ` prefix (it duplicates the Quick Summary badge), and
 * collapse whitespace. Mirrors the `frontmatter-description-markdown` surface
 * in `rule-mdx-format.ts`.
 */
function cleanDescription(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/^CWE:\s*/i, '')
    .replace(ICON_INLINE_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function convertMdToMdx(
  mdContent: string,
  fileName: string,
  opts: ConvertOptions = {},
): string {
  const slug = fileName.replace(/\.md$/, '');
  const { frontmatter: sourceFm, body: sourceBody } = splitFrontmatter(mdContent);

  // `title` keys the page H1, breadcrumbs and the sidebar, and the format lock
  // requires it to equal the file slug — so derive it from the filename rather
  // than the H1, which is free to drift.
  const title = slug;

  // Prefer the source frontmatter's description. The old heuristic — "first
  // paragraph longer than 20 chars that isn't a heading/table/list" — picked up
  // whatever the .md happened to open with, which for many rules was a
  // `CWE: [CWE-598](…)` line. That is the `body-boilerplate-lead` /
  // `frontmatter-description-markdown` regression the repair scripts existed to
  // undo. Fall back to the heuristic only when the source has no frontmatter.
  let description = '';
  const fmDescription = sourceFm ? readFrontmatterScalar(sourceFm, 'description') : null;
  if (fmDescription) {
    description = cleanDescription(fmDescription);
  } else {
    const contentFiltered = stripHtmlComments(sourceBody)
      .replace(ICON_HEADER_LINE_RE, '')
      .replace(/^>\s+\*\*Keywords:\*\*.*$\n?/gm, '')
      .trim();
    const descRows = contentFiltered.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const firstParagraph = descRows.find(row =>
      !row.startsWith('#') &&
      !row.startsWith('|') &&
      !row.startsWith('-') &&
      !row.startsWith('>') &&
      row.length > 20
    );
    if (firstParagraph) description = cleanDescription(firstParagraph).slice(0, 160);
  }

  // Build ONE frontmatter: the source's own fields (minus title/description,
  // which we normalise above) plus the type-awareness pair. `type_aware` is the
  // structured form of the badge (true when the rule needs the TS program in
  // any mode); `type_aware_status` keeps the finer-grained classification for
  // tests/validators that want to distinguish refining vs graceful.
  const isTypeAware = opts.typeStatus === 'optional' || opts.typeStatus === 'aware';
  const typeStatusForFm = opts.typeStatus ?? 'unaware';

  const passthrough = (sourceFm ?? '')
    .split('\n')
    .filter((line) => {
      const key = line.match(/^([A-Za-z_][\w-]*)\s*:/)?.[1];
      // Drop the keys we own; keep everything else (tags, category, severity,
      // cwe, autofix, …) verbatim so the .md stays the source of truth.
      return !key || !['title', 'description', 'type_aware', 'type_aware_status'].includes(key);
    })
    .filter((line) => line.trim().length > 0);

  // Always emit the description as a JSON-quoted scalar. Passing it through
  // bare is not safe: plenty of rule descriptions contain `: ` (e.g.
  // "ESLint Rule: no-commented-code with …") or open with a YAML indicator
  // character, either of which makes the frontmatter unparseable and takes the
  // whole page down. JSON string syntax is a valid YAML double-quoted scalar.
  let mdx = `---\ntitle: ${title}\ndescription: ${JSON.stringify(description)}\n`;
  if (passthrough.length) mdx += passthrough.join('\n') + '\n';
  mdx += `type_aware: ${isTypeAware}\ntype_aware_status: ${typeStatusForFm}\n---\n`;

  // Add Imports
  mdx += MDX_TEMPLATE_IMPORTS + '\n';

  // Render the badge immediately under the imports so it sits at the very
  // top of the rule page above the description. The `<RuleBadges>` component
  // owns the visual treatment; the props mirror frontmatter so the same data
  // is reachable via fumadocs frontmatter when rendering elsewhere.
  mdx += `<RuleBadges typeAware={${isTypeAware}} typeAwareStatus=${JSON.stringify(typeStatusForFm)} />\n\n`;

  // Process Content — the body BELOW the source frontmatter. Passing the whole
  // file here is what left the source block embedded in the output.
  let finalContent = sourceBody;

  // Remove the main title (handled by frontmatter)
  finalContent = finalContent.replace(/^#\s+.+$/m, '');

  // Strip all HTML comments (Markdown markers) entirely for MDX. Loop until
  // stable — single-pass replace leaves nested `<!-- a <!-- b --> c -->`
  // partially intact (CodeQL: "Incomplete multi-character sanitization").
  finalContent = stripHtmlComments(finalContent);

  // ── Emit final form, not a draft the repair scripts have to clean up ──────
  // Each transform below corresponds 1:1 to a surface in
  // `src/lib/eslint-validators/rule-mdx-format.ts`. They used to live in
  // one-shot scripts (clean-rule-page-chrome / dedupe-body-description /
  // strip-markdown-from-description / refresh-rule-descriptions) that had to be
  // run in an undocumented order after this generator — so in practice nobody
  // ran them and the published pages drifted.

  // SEO-keyword chrome duplicating the Quick Summary table.
  finalContent = finalContent
    .replace(/^>\s+\*\*Keywords:\*\*.*$\n?/gm, '')
    .replace(/^>\s+\*\*CWE:\*\*.*$\n?/gm, '')
    .replace(/^>\s+\*\*OWASP[^:]*:\*\*.*$\n?/gm, '');

  finalContent = finalContent.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
  // `related-rule-md-links`: rule .md sources link sibling rules as
  // `./other-rule.md` — correct when browsed on GitHub, a guaranteed 404 once
  // copied onto the site, which serves extensionless routes. 447 such links
  // across 228 published pages made every "Related Rules" section — the natural
  // next click for an engaged reader — a dead end, which is exactly what the
  // analytics show (sessions ≈ pageviews; almost nobody reaches a second page).
  // Rewrite at sync time so the source keeps working on GitHub and the site
  // keeps working here. Only relative same-directory links are touched;
  // absolute URLs (https://…/foo.md) are left alone.
  finalContent = finalContent.replace(
    /\]\(\s*(?:\.\/)?([a-z0-9][a-z0-9-]*)\.md\s*\)/g,
    '](./$1)',
  );


  // `body-boilerplate-lead`: metadata-as-prose opening the page. Loop, because
  // removing one boilerplate lead can expose another behind it (several rule
  // docs open with an `ESLint Rule: …` blurb *and* a `CWE: […]` line).
  for (let guard = 0; guard < 10; guard++) {
    const lead = findFirstProseParagraphBeforeHeading(finalContent);
    if (!lead || !BOILERPLATE_PATTERNS.some((bp) => bp.re.test(lead))) break;
    finalContent = finalContent.replace(lead, '').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  }

  // `body-duplicated-description`: fumadocs already renders the description
  // under the H1, so repeating it in the lead shows the same sentence twice.
  // Loop as well — a good number of rule docs carry the summary sentence twice
  // in the lead (once as the `@rule-summary` block, once as the intro
  // paragraph), and removing only the first leaves the page still duplicated.
  for (let guard = 0; guard < 10; guard++) {
    const dup = findDuplicatedDescriptionParagraph(finalContent, description);
    if (!dup) break;
    const lines = finalContent.split('\n');
    lines.splice(dup.start, dup.end - dup.start);
    finalContent = lines.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  }

  // Inject WhenNotToUse before Known False Negatives
  if (finalContent.includes('## Known False Negatives')) {
    finalContent = finalContent.replace('## Known False Negatives', '<WhenNotToUse />\n\n## Known False Negatives');
  }

  // Wrap Known False Negatives with CTA
  if (finalContent.includes('## Known False Negatives')) {
    finalContent = finalContent.replace('## Known False Negatives', '<FalseNegativeCTA />\n\n## Known False Negatives');
  }

  // Cleanup: Ensure double newlines for MDX compatibility
  finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim();

  // Fix Mermaid charts: quote labels with special characters (like emojis)
  // Example: A[📝 Detect eval() Call] -> A["📝 Detect eval() Call"]
  // This prevents Mermaid parsing errors in MDX/Turbopack
  finalContent = finalContent.replace(/```mermaid\n([\s\S]*?)```/g, (_match: string, chart: string) => {
    const lines = chart.split('\n');
    // Each character class lists the closer it must reject *and* a quote so we
    // don't double-quote already-quoted labels. The quote appeared twice in the
    // earlier form (CodeQL: "Duplicate character in character class").
    const fixedLines = lines.map((line: string) => {
      // Handle nodes: A[label], A{label}, A(label), A((label)), A[[label]], A>label]
      // Replace with A["label"], A{"label"}, etc.
      return line.replace(/([A-Z0-9_-]+)\[([^\]"]+)\]/g, '$1["$2"]')
                 .replace(/([A-Z0-9_-]+)\{([^}"]+)\}/g, '$1{"$2"}')
                 .replace(/([A-Z0-9_-]+)\((?!\()([^)"]+)\)/g, '$1("$2")')
                 .replace(/([A-Z0-9_-]+)\(\(([^)"]+)\)\)/g, '$1(("$2"))')
                 .replace(/([A-Z0-9_-]+)\[\[([^\]"]+)\]\]/g, '$1[["$2"]]')
                 // The `A>shape]` asymmetric-node regex must NOT match arrows
                 // (`-->`, `==>`, `-.->`). A bare `>` immediately after an
                 // identifier with no preceding arrow glyph is a node; with
                 // one, it's an edge head. Negative lookbehind on the arrow
                 // glyphs `-`, `=`, `.` prevents the converter from mangling
                 // `App -->|label| Node[...]` into `App-->"|label| Node[...]"`.
                 .replace(/(?<![-=.])([A-Z0-9_]+)>([^\]"]+)\]/g, '$1>"$2"]');
    });
    return '```mermaid\n' + fixedLines.join('\n') + '\n```\n';
  });

  return mdx + finalContent;
}

export function updateMetaJson(pluginRulesDir: string, ruleSlugs: string[]) {
  const metaPath = path.join(pluginRulesDir, 'meta.json');
  let meta: { title?: string; icon?: string; defaultOpen?: boolean; pages?: string[]; [k: string]: unknown } = {
    title: 'Rules',
    pages: [],
  };

  // Read directly and catch ENOENT instead of `existsSync()` + `readFileSync()`,
  // which is a TOCTOU race (CodeQL: "Potential file system race condition" —
  // the file could be removed between the two calls). The catch absorbs both
  // missing-file and parse failures into the default `meta`.
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {}

  // Defensive: existing meta.json files may not declare `pages` (the convention
  // is to omit it when the directory is auto-listed). Merge against [] in that
  // case rather than crashing on a non-iterable.
  const existingPages = Array.isArray(meta.pages) ? meta.pages : [];
  meta.pages = Array.from(new Set([...existingPages, ...ruleSlugs])).toSorted();

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

async function main() {
  console.log('Syncing Rule MD to MDX...');

  const tsvPath = path.resolve(rootDir, '.agent', 'type-awareness-scan.tsv');
  const typeMap = loadTypeAwarenessMap(tsvPath);
  if (!typeMap) {
    console.warn(`(type-awareness TSV missing at ${tsvPath} — every rule renders as 🟢)`);
  }

  for (const [pluginSlug, { package: packageName, pillar }] of Object.entries(PLUGIN_MAPPINGS)) {
    const pkgRulesDir = path.join(packagesDir, packageName, 'docs/rules');
    const docsRulesDir = path.join(contentDir, pillar, `plugin-${pluginSlug}`, 'rules');

    if (!fs.existsSync(pkgRulesDir)) {
      console.warn(`Rules dir not found for ${packageName}`);
      continue;
    }

    if (!fs.existsSync(docsRulesDir)) {
      fs.mkdirSync(docsRulesDir, { recursive: true });
    }

    const files = fs.readdirSync(pkgRulesDir).filter(f => f.endsWith('.md'));
    const ruleSlugs = [];

    for (const file of files) {
      const mdPath = path.join(pkgRulesDir, file);
      const mdxPath = path.join(docsRulesDir, file + 'x');
      const slug = file.replace('.md', '');
      ruleSlugs.push(slug);

      const content = fs.readFileSync(mdPath, 'utf8');
      const typeStatus = typeMap?.get(`${pluginSlug}/${slug}`);
      const mdxContent = convertMdToMdx(content, file, { typeStatus });

      fs.writeFileSync(mdxPath, mdxContent);
    }

    updateMetaJson(docsRulesDir, ruleSlugs);
    console.log(`✓ ${pluginSlug}: ${files.length} rules synced`);
  }

  console.log('\nRule sync complete.');
}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
