/**
 * Rule MDX format validator.
 *
 * Locks the structural invariants of every rule MDX page. The exact failure
 * modes this validator was written to prevent (each had a real-world
 * incident):
 *
 *   1. `description: "title: <rule>"` stub frontmatter — the sync script's
 *      heuristic occasionally fell back to a templating-leftover string. It
 *      showed up as the page's <meta name="description"> and the lead-paragraph
 *      under the H1, looking nonsensical.
 *
 *   2. An orphan second `---\ntitle: …\ndescription: …\n---` YAML block
 *      embedded in the body. MDX parsed it as a giant setext heading and the
 *      compiler crashed with "Element type is invalid. Received a promise
 *      that resolves to: undefined. Lazy element type must resolve to a
 *      class or function." on at least one page.
 *
 *   3. Raw markdown link syntax (`[CWE-598](url)`) inside the frontmatter
 *      description — meta tags and the page-lead render this as plain text,
 *      so the description reads as "CWE: [CWE-598](https://...)" instead
 *      of the rule's actual intent.
 *
 *   4. Boilerplate body leads: `CWE: [CWE-XXX](url)`, `OWASP …:`,
 *      `ESLint Rule: <name>. This rule is part of [eslint-plugin-…]` —
 *      metadata that leaked into prose as the first paragraph below the
 *      keywords blockquote.
 *
 *   5. Duplicated description paragraph — the description text appearing
 *      verbatim as the first prose paragraph in the body, immediately
 *      followed by the same or near-same paragraph as the canonical intro.
 *
 * Each surface fires its own finding, so a regression test names the exact
 * file and the exact invariant that broke. Re-running the repair scripts
 * (`apps/docs/scripts/fix-orphan-frontmatter.mjs`,
 * `apps/docs/scripts/refresh-rule-descriptions.mjs`) clears them.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginEntry } from './plugin-rule-source-drift';

export type RuleMdxFormatSurface =
  | 'frontmatter-description-missing'
  | 'frontmatter-description-stub'
  | 'frontmatter-description-markdown'
  | 'frontmatter-title-slug-mismatch'
  | 'body-orphan-frontmatter'
  | 'body-boilerplate-lead'
  | 'body-duplicated-description';

export interface Finding {
  plugin: string;
  rule: string;
  file: string;
  surface: RuleMdxFormatSurface;
  severity: 'error' | 'warning';
  message: string;
}

export interface RuleMdxFormatOptions {
  monorepoRoot: string;
  plugins: readonly PluginEntry[];
}

interface ParsedMdx {
  frontmatterBody: string;
  body: string;
  description: string | null;
  title: string | null;
}

function parseMdx(src: string): ParsedMdx | null {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const frontmatterBody = m[1];
  const body = src.slice(m[0].length);

  const description = readScalar(frontmatterBody, 'description');
  const title = readScalar(frontmatterBody, 'title');

  return { frontmatterBody, body, description, title };
}

function readScalar(frontmatterBody: string, key: string): string | null {
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`, 'm');
  const m = frontmatterBody.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

// `body-boilerplate-lead`: metadata-as-prose. Each pattern fired in the
// real-world regression we're locking out, so failure messages can name
// exactly which template leaked.
const BOILERPLATE_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'CWE-link-as-lead', re: /^CWE:\s*\[CWE-\d+\]/ },
  { name: 'OWASP-link-as-lead', re: /^OWASP[^:]*:\s*\[/ },
  {
    name: 'ESLint-Rule-blurb',
    re: /^ESLint Rule:\s+[a-z0-9-]+\.\s+This rule is part of/,
  },
];

function looksLikeOpaqueLine(line: string): boolean {
  // Skip non-prose paragraph leads — headings, lists, tables, blockquotes,
  // JSX/HTML, imports, code fences. Only prose paragraphs are candidates for
  // boilerplate-lead detection.
  return (
    /^\s*$/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^\s*[-*+]\s/.test(line) ||
    /^\s*\|/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*<[A-Za-z!/]/.test(line) ||
    /^\s*import\s/.test(line) ||
    /^\s*```/.test(line)
  );
}

function findFirstProseParagraphBeforeHeading(body: string): string | null {
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) return null; // first heading reached
    if (looksLikeOpaqueLine(line)) {
      // Advance past this block.
      while (i < lines.length && lines[i].trim() !== '') i++;
      i++; // skip the blank separator
      continue;
    }
    // Plain prose paragraph — collect lines until blank.
    const start = i;
    while (i < lines.length && lines[i].trim() !== '') i++;
    return lines.slice(start, i).join('\n').trim();
  }
  return null;
}

function bodyHasOrphanFrontmatter(body: string): boolean {
  // Match any `---\n…title:…description:…\n---` block — the specific shape
  // emitted by the dual-frontmatter regression. Plain `---` horizontal rules
  // (used as section dividers near EOF) don't match because they have no
  // `title:`+`description:` content.
  return /\n---\r?\n[\s\S]*?^\s*title\s*:[\s\S]*?^\s*description\s*:[\s\S]*?\n---\r?\n/m.test(
    body,
  );
}

function bodyDuplicatesDescription(body: string, description: string): boolean {
  if (!description) return false;
  const target = description.replace(/\s+/g, ' ').trim();
  if (target.length < 20) return false; // too short for confident match

  // Only scan the first 30 non-empty lines — duplication happens at the
  // lead, not in the middle of the doc.
  const lines = body.split(/\r?\n/).slice(0, 80);
  let i = 0;
  let prose = 0;
  while (i < lines.length && prose < 30) {
    if (lines[i].trim() === '') { i++; continue; }
    if (looksLikeOpaqueLine(lines[i])) {
      while (i < lines.length && lines[i].trim() !== '') i++;
      continue;
    }
    const start = i;
    while (i < lines.length && lines[i].trim() !== '') i++;
    const paragraph = lines.slice(start, i).join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph === target) return true;
    prose++;
  }
  return false;
}

export function validateRuleMdxFormat(opts: RuleMdxFormatOptions): Finding[] {
  const findings: Finding[] = [];

  for (const plugin of opts.plugins) {
    const mdxDir = join(
      opts.monorepoRoot,
      'apps',
      'docs',
      'content',
      'docs',
      plugin.pillar,
      `plugin-${plugin.slug}`,
      'rules',
    );
    if (!existsSync(mdxDir)) continue;

    const files = readdirSync(mdxDir)
      .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
      .toSorted();

    for (const f of files) {
      const rule = f.replace(/\.mdx$/, '');
      const filePath = join(mdxDir, f);
      const rel = `apps/docs/content/docs/${plugin.pillar}/plugin-${plugin.slug}/rules/${f}`;
      const src = readFileSync(filePath, 'utf-8');

      const parsed = parseMdx(src);
      if (!parsed) {
        findings.push({
          plugin: plugin.slug,
          rule,
          file: rel,
          surface: 'frontmatter-description-missing',
          severity: 'error',
          message: 'MDX has no leading `---…---` frontmatter block.',
        });
        continue;
      }

      const { body, description, title } = parsed;

      // 1. description present + non-empty
      if (description === null || description.length === 0) {
        findings.push({
          plugin: plugin.slug,
          rule,
          file: rel,
          surface: 'frontmatter-description-missing',
          severity: 'error',
          message:
            'Frontmatter `description:` is missing or empty. Run `node apps/docs/scripts/refresh-rule-descriptions.mjs`.',
        });
      } else {
        // 2. not the canonical stub
        if (/^title:\s*[\w-]+$/i.test(description.trim())) {
          findings.push({
            plugin: plugin.slug,
            rule,
            file: rel,
            surface: 'frontmatter-description-stub',
            severity: 'error',
            message: `Frontmatter \`description\` is the templating stub (\`${description}\`). Run \`node apps/docs/scripts/refresh-rule-descriptions.mjs\` to pull \`meta.docs.description\` from the rule source.`,
          });
        }

        // 3. no raw markdown link syntax (renders as plain text in meta tags)
        if (/\[[^\]]+\]\([^)]+\)/.test(description)) {
          findings.push({
            plugin: plugin.slug,
            rule,
            file: rel,
            surface: 'frontmatter-description-markdown',
            severity: 'error',
            message: `Frontmatter \`description\` contains raw markdown link syntax — meta tags and page leads render this as plain text. Strip the brackets/URL and keep prose only.`,
          });
        }

        // 7. duplicated description in body lead
        if (bodyDuplicatesDescription(body, description)) {
          findings.push({
            plugin: plugin.slug,
            rule,
            file: rel,
            surface: 'body-duplicated-description',
            severity: 'error',
            message:
              "Frontmatter `description` appears verbatim as a body paragraph in the lead. Remove the duplicate paragraph — fumadocs already renders the description under the H1.",
          });
        }
      }

      // 4. title matches slug
      if (title !== null && title !== rule) {
        findings.push({
          plugin: plugin.slug,
          rule,
          file: rel,
          surface: 'frontmatter-title-slug-mismatch',
          severity: 'error',
          message: `Frontmatter \`title: ${title}\` does not match file slug \`${rule}\`. The page H1, breadcrumbs, and sidebar all key off this — keep them aligned.`,
        });
      }

      // 5. orphan second frontmatter block in body
      if (bodyHasOrphanFrontmatter('\n' + body)) {
        findings.push({
          plugin: plugin.slug,
          rule,
          file: rel,
          surface: 'body-orphan-frontmatter',
          severity: 'error',
          message:
            'Body contains an orphan `---\\ntitle:…description:…\\n---` block (dual-frontmatter regression). Run `node apps/docs/scripts/fix-orphan-frontmatter.mjs` to collapse it.',
        });
      }

      // 6. boilerplate body lead
      const firstProse = findFirstProseParagraphBeforeHeading(body);
      if (firstProse) {
        for (const bp of BOILERPLATE_PATTERNS) {
          if (bp.re.test(firstProse)) {
            findings.push({
              plugin: plugin.slug,
              rule,
              file: rel,
              surface: 'body-boilerplate-lead',
              severity: 'error',
              message: `Body opens with metadata-as-prose (${bp.name}): \`${firstProse.slice(0, 80)}\`. Boilerplate leads belong in tables, not paragraphs. Run \`node apps/docs/scripts/refresh-rule-descriptions.mjs\` to strip.`,
            });
            break;
          }
        }
      }

    }
  }

  return findings;
}
