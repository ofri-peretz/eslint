#!/usr/bin/env node
/**
 * refresh-rule-descriptions — pull canonical `meta.docs.description` from each
 * rule's TS source, write it into the matching rule MDX's frontmatter, and
 * strip the boilerplate lead paragraphs (`CWE: [...](...)`, `ESLint Rule: …`,
 * `OWASP: …`) that the original `sync-rules-docs.ts` heuristic accidentally
 * promoted to body intros.
 *
 * Why this exists, separate from `sync-rules-docs.ts`:
 *   - sync-rules-docs picks the description out of the first non-table/-list
 *     paragraph in the upstream `.md`. For rules whose md opens with a
 *     `CWE: [CWE-598](...)` line, that line wins — and the MDX renders the
 *     raw markdown as plain text under the page H1 (no link, looks broken).
 *   - The rule's TS source carries the canonical one-line description as
 *     `meta.docs.description` — it's what populates the badge tooltip and
 *     the ESLint config UI. It's also what we *want* in the MDX.
 *
 * The script is a one-shot repair (idempotent — re-running on a clean tree
 * is a no-op). Going forward, `sync-rules-docs.ts` should be taught to
 * prefer the TS-source description; this script is the back-fill until
 * that change lands.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const REPO_ROOT = join(ROOT, '..', '..');
const PACKAGES = join(REPO_ROOT, 'packages');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

// 1. Build (pluginShortName, ruleName) → description map from rule sources.
const ruleSourceFiles = execSync(
  `find ${PACKAGES} -maxdepth 6 -path '*/src/rules/*' -name '*.ts' ` +
    `-not -path '*/dist/*' -not -path '*/coverage/*' ` +
    `-not -path '*/node_modules/*' -not -name '*.test.ts' ` +
    `-not -name '*.spec.ts' -not -name '*.d.ts'`,
  { encoding: 'utf-8' },
).trim().split('\n').filter(Boolean);

const descriptionByRulePath = new Map();
const DESC_RE = /^\s*description:\s*(['"])([^'"]+)\1/m;
const DESC_RE_MULTILINE = /^\s*description:\s*\n\s*(['"])([^'"]+)\1/m;

for (const srcPath of ruleSourceFiles) {
  const src = readFileSync(srcPath, 'utf-8');

  // Try to scope to the meta.docs block specifically, but the simple regex
  // catches > 95% of files. Fall back to multiline form for files that put
  // the value on the next line.
  const match = src.match(DESC_RE) ?? src.match(DESC_RE_MULTILINE);
  if (!match) continue;
  const description = match[2].trim();
  if (!description) continue;

  // Derive (plugin, rule) key. Two layouts:
  //   .../<plugin>/src/rules/<rule>/index.ts
  //   .../<plugin>/src/rules/<plugin-suffix>/<rule>.ts
  const rel = srcPath.slice(PACKAGES.length + 1);
  // packages/eslint-plugin-browser-security/src/rules/no-credentials-in-query-params/index.ts
  // packages/eslint-plugin-conventions/src/rules/conventions/filename-case.ts
  const parts = rel.split('/');
  const pluginDir = parts[0]; // eslint-plugin-browser-security
  if (!pluginDir.startsWith('eslint-plugin-')) continue;
  const pluginShort = pluginDir.replace(/^eslint-plugin-/, '');

  let ruleName;
  if (basename(srcPath) === 'index.ts') {
    ruleName = parts[parts.length - 2];
  } else {
    ruleName = basename(srcPath, '.ts');
  }

  const key = `${pluginShort}/${ruleName}`;
  if (!descriptionByRulePath.has(key)) {
    descriptionByRulePath.set(key, description);
  }
}

console.log(`Indexed descriptions for ${descriptionByRulePath.size} rules`);

// 2. Find every rule MDX. Map MDX path → (pluginShort, ruleName).
const mdxFiles = execSync(
  `grep -rl 'from "@/components/RuleComponents"' ${join(ROOT, 'content/docs')}`,
  { encoding: 'utf-8' },
).trim().split('\n').filter(Boolean);

const PLUGIN_DIR_RE = /\/content\/docs\/(?:security|quality)\/plugin-([^/]+)\/rules\/([^/]+)\.mdx$/;

const stats = {
  scanned: 0,
  descriptionUpdated: 0,
  leadStripped: 0,
  noDescriptionFound: 0,
  noChange: 0,
  errored: 0,
};
const errors = [];

// Boilerplate lead patterns we strip if they appear as paragraph-leads.
const LEAD_BOILERPLATE_PATTERNS = [
  // `CWE: [CWE-598](url)` — orphan metadata, not prose.
  /^CWE:\s*\[CWE-\d+\][^\n]*$/,
  // `OWASP: [OWASP …](url)` — same shape, OWASP variant.
  /^OWASP[^:]*:\s*\[[^\]]+\][^\n]*$/,
  // `ESLint Rule: <name>. This rule is part of [`eslint-plugin-…`](…).`
  /^ESLint Rule:\s+[a-z0-9-]+\.\s+This rule is part of\s+\[`eslint-plugin-[^`]+`\][^\n]*$/,
  // Standalone `Type: …` / `Category: …` / `Recommended: …` / `Severity: …`
  // lines used as paragraphs (the *bottom* of the file uses the same labels
  // with **bold**, so we don't strip those — only the unbolded one-line form).
  /^(?:Type|Category|Recommended|Severity):\s+\S[^\n]*$/,
];

function isBoilerplateLead(paragraphText) {
  const normalized = paragraphText.replace(/\s+/g, ' ').trim();
  return LEAD_BOILERPLATE_PATTERNS.some((re) => re.test(normalized));
}

function updateFrontmatterDescription(src, newDescription) {
  // Replace the value of `description:` inside the leading `---…---` block.
  // Use JSON.stringify to safely double-quote and escape special chars.
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return null;
  const fmBody = fmMatch[1];
  if (!/^description:/m.test(fmBody)) return null;

  const newFmBody = fmBody.replace(
    /^description:.*$/m,
    `description: ${JSON.stringify(newDescription)}`,
  );
  if (newFmBody === fmBody) return null;
  return `---\n${newFmBody}\n---\n` + src.slice(fmMatch[0].length);
}

function extractDescription(fmBody) {
  const m = fmBody.match(/^description:\s*(.*)$/m);
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

function stripBoilerplateLeads(src) {
  // Walk the body after the frontmatter. For each top-level paragraph that
  // matches a boilerplate pattern *or* duplicates the frontmatter
  // description verbatim, drop it (and one trailing blank line). We stop
  // after the first heading — these only appear in the lead.
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return src;

  const description = extractDescription(fmMatch[1]);
  const normalizedDescription = description
    ? description.replace(/\s+/g, ' ').trim()
    : null;

  const before = src.slice(0, fmMatch[0].length);
  const body = src.slice(fmMatch[0].length);
  const lines = body.split(/\r?\n/);

  const dropRanges = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) break; // First heading ends the "lead".
    if (line.trim() === '') { i++; continue; }
    const start = i;
    // Skip MDX/JSX/blockquote/imports/code-fences/lists/tables — only act
    // on plain-prose paragraph leads.
    if (
      /^(?:import\s|<|>|\s*[-*+]\s|\|)/.test(line) ||
      line.startsWith('```')
    ) {
      // Advance past this paragraph block.
      while (i < lines.length && lines[i].trim() !== '') i++;
      continue;
    }
    // Capture the paragraph.
    while (i < lines.length && lines[i].trim() !== '') i++;
    const end = i;
    const paragraph = lines.slice(start, end).join('\n');
    const paragraphNormalized = paragraph.replace(/\s+/g, ' ').trim();

    const isDescriptionDup =
      normalizedDescription !== null &&
      normalizedDescription.length >= 20 &&
      paragraphNormalized === normalizedDescription;

    if (isBoilerplateLead(paragraph) || isDescriptionDup) {
      let dropEnd = end;
      if (dropEnd < lines.length && lines[dropEnd].trim() === '') dropEnd++;
      dropRanges.push([start, dropEnd]);
    }
  }

  if (dropRanges.length === 0) return src;

  const kept = [];
  let cursor = 0;
  for (const [s, e] of dropRanges) {
    for (let j = cursor; j < s; j++) kept.push(lines[j]);
    cursor = e;
  }
  for (let j = cursor; j < lines.length; j++) kept.push(lines[j]);
  return before + kept.join('\n');
}

for (const file of mdxFiles) {
  stats.scanned++;
  const match = file.match(PLUGIN_DIR_RE);
  if (!match) continue;
  const [, pluginShort, ruleName] = match;
  if (ruleName === 'index') continue; // plugin overview pages, not rules

  let src;
  try { src = readFileSync(file, 'utf-8'); }
  catch (e) {
    stats.errored++;
    errors.push({ file, message: e.message });
    continue;
  }

  let working = src;
  let touched = false;

  const canonical = descriptionByRulePath.get(`${pluginShort}/${ruleName}`);
  if (canonical) {
    const updated = updateFrontmatterDescription(working, canonical);
    if (updated && updated !== working) {
      working = updated;
      stats.descriptionUpdated++;
      touched = true;
    }
  } else {
    stats.noDescriptionFound++;
    if (verbose) console.log(`no description for: ${pluginShort}/${ruleName}`);
  }

  const stripped = stripBoilerplateLeads(working);
  if (stripped !== working) {
    working = stripped;
    stats.leadStripped++;
    touched = true;
  }

  if (!touched) {
    stats.noChange++;
    continue;
  }

  if (!dryRun) writeFileSync(file, working, 'utf-8');
  if (verbose) console.log(`updated: ${file}`);
}

console.log(`refresh-rule-descriptions${dryRun ? ' (dry run)' : ''}`);
console.log(`  scanned:              ${stats.scanned}`);
console.log(`  description-updated:  ${stats.descriptionUpdated}`);
console.log(`  lead-stripped:        ${stats.leadStripped}`);
console.log(`  no-description-found: ${stats.noDescriptionFound}`);
console.log(`  no-change:            ${stats.noChange}`);
console.log(`  errored:              ${stats.errored}`);
if (errors.length) {
  console.log('\nErrors:');
  for (const e of errors) console.log(`  ${e.file}: ${e.message}`);
}
