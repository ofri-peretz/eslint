/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Rule-doc conformance validator.
 *
 * Asserts that every rule documentation Markdown file under the given
 * `rulesRoot(s)` ships the canonical four-section template prescribed by
 * the line-wide docs quality contract:
 *
 *   1. Quick Summary table    (`## Quick Summary`)
 *   2. Examples (incorrect + correct fixtures)
 *   3. Error Message Format
 *   4. Known False Negatives
 *
 * Each missing required section is one finding. Intentional exceptions
 * (rules that can never produce an error message because they only suggest,
 * for example) belong in the `ignore` list with a comment explaining why.
 *
 * Designed to be called from the consumer's `__tests__/` Vitest suite:
 *
 *   const findings = await validateRuleDocConformance({
 *     rulesRoot: resolve(__dirname, '../../../../packages/eslint-plugin-pg/docs/rules'),
 *   });
 *   expect(findings).toEqual([]);
 *
 * For monorepos with many plugins (eslint), pass each plugin's rules dir
 * via `rulesRoots`, or use `pluginsRoot` + `pluginRulesSubpath` to enumerate:
 *
 *   const findings = await validateRuleDocConformance({
 *     pluginsRoot: resolve(__dirname, '../../../../packages'),
 *     pluginPrefix: 'eslint-plugin-',
 *     pluginRulesSubpath: 'docs/rules',
 *   });
 *
 * Severity policy: warnings by default so the validator can be wired into
 * CI without immediately failing on existing drift; ratchet sections to
 * 'error' as the rule fleet conforms.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ValidationFinding } from './types';

export interface RequiredSection {
  /** Stable identifier used in findings + ignore lists. */
  id: string;
  /** Heading text (case-insensitive) or regex that must appear at any `##`/`###` level. */
  heading: string | RegExp;
  /** Why this section is required — surfaced in the finding. */
  rationale: string;
  /** Severity when missing. Default: `'warning'`. */
  severity?: 'error' | 'warning';
}

export const DEFAULT_REQUIRED_SECTIONS: RequiredSection[] = [
  {
    id: 'quick-summary',
    heading: /^Quick Summary$/i,
    rationale: 'Quick Summary table (CWE / Severity / Auto-Fix / Category) lets reviewers triage the rule in 10 seconds.',
    severity: 'warning',
  },
  {
    id: 'examples',
    heading: /^Examples?$|^Rule Details$/i,
    rationale: 'Examples section with ❌ Incorrect / ✅ Correct fixtures shows what the rule actually catches.',
    severity: 'warning',
  },
  {
    id: 'error-message',
    heading: /^Error Message( Format)?$/i,
    rationale: 'Error Message Format section shows the exact LLM-optimized message a developer (or AI agent) will see.',
    severity: 'warning',
  },
  {
    id: 'known-false-negatives',
    heading: /^Known False Negatives$/i,
    rationale: 'Known False Negatives section sets honest expectations about what the static analyzer cannot catch.',
    severity: 'warning',
  },
];

export interface RuleDocConformanceOptions {
  /** Single directory whose direct children are rule-doc Markdown files. */
  rulesRoot?: string;
  /** Multiple rules directories (e.g. one per plugin in a monorepo). */
  rulesRoots?: string[];
  /** Walk under `pluginsRoot` looking for `<plugin>/<pluginRulesSubpath>` directories. */
  pluginsRoot?: string;
  /** Prefix that identifies a plugin folder under `pluginsRoot` (e.g. `eslint-plugin-`). */
  pluginPrefix?: string;
  /** Subpath inside each plugin folder where rule docs live. Default: `'docs/rules'`. */
  pluginRulesSubpath?: string;
  /** Required sections to assert. Default: the four canonical sections. */
  requiredSections?: RequiredSection[];
  /** Rule-doc files (relative to their `rulesRoot`) to skip entirely. */
  ignore?: string[];
  /** Per-rule section ignore: `{ 'pg/no-unsafe-query.md': ['known-false-negatives'] }`. */
  ignoreSections?: Record<string, string[]>;
  /** Files NOT to treat as rule docs even if they end in `.md`. Default: index.md, README.md, meta.json. */
  excludeFilenames?: string[];
}

const DEFAULT_EXCLUDE_FILENAMES = new Set(['index.md', 'README.md', 'meta.json']);

export async function validateRuleDocConformance(
  options: RuleDocConformanceOptions,
): Promise<ValidationFinding[]> {
  const requiredSections = options.requiredSections ?? DEFAULT_REQUIRED_SECTIONS;
  const ignore = new Set(options.ignore ?? []);
  const ignoreSections = options.ignoreSections ?? {};
  const excludeFilenames = new Set(
    options.excludeFilenames ?? Array.from(DEFAULT_EXCLUDE_FILENAMES),
  );

  const roots = await resolveRulesRoots(options);
  if (roots.length === 0) {
    throw new Error(
      'validateRuleDocConformance: provide `rulesRoot`, `rulesRoots`, or `pluginsRoot`.',
    );
  }

  const findings: ValidationFinding[] = [];

  for (const { displayPrefix, rulesRoot } of roots) {
    const ruleFiles = await listRuleDocFiles(rulesRoot, excludeFilenames);
    for (const fileRel of ruleFiles) {
      const reportFile = displayPrefix
        ? `${displayPrefix}/${fileRel}`
        : fileRel;
      if (ignore.has(reportFile) || ignore.has(fileRel)) continue;

      const fullPath = join(rulesRoot, fileRel);
      let raw: string;
      try {
        raw = await readFile(fullPath, 'utf8');
      } catch (err) {
        findings.push({
          file: reportFile,
          severity: 'error',
          message: `Could not read rule doc: ${(err as Error).message}`,
        });
        continue;
      }

      const headings = extractHeadings(raw);
      const perRuleIgnored = new Set(
        ignoreSections[reportFile] ?? ignoreSections[fileRel] ?? [],
      );

      for (const section of requiredSections) {
        if (perRuleIgnored.has(section.id)) continue;
        if (!hasMatchingHeading(headings, section.heading)) {
          findings.push({
            file: reportFile,
            severity: section.severity ?? 'warning',
            message: `Missing required section \`${section.id}\`. ${section.rationale}`,
          });
        }
      }
    }
  }

  return findings;
}

async function resolveRulesRoots(
  options: RuleDocConformanceOptions,
): Promise<Array<{ rulesRoot: string; displayPrefix: string }>> {
  if (options.rulesRoot) {
    return [{ rulesRoot: options.rulesRoot, displayPrefix: '' }];
  }
  if (options.rulesRoots && options.rulesRoots.length > 0) {
    return options.rulesRoots.map((rulesRoot) => ({
      rulesRoot,
      displayPrefix: '',
    }));
  }
  if (options.pluginsRoot) {
    const subpath = options.pluginRulesSubpath ?? 'docs/rules';
    const pluginFolders = await listPluginFolders(
      options.pluginsRoot,
      options.pluginPrefix,
    );
    const results: Array<{ rulesRoot: string; displayPrefix: string }> = [];
    for (const folder of pluginFolders) {
      const rulesRoot = join(options.pluginsRoot, folder, subpath);
      try {
        const info = await stat(rulesRoot);
        if (info.isDirectory()) {
          results.push({ rulesRoot, displayPrefix: folder });
        }
      } catch {
        // Plugin without docs/rules — skip silently; plugin-template-conformance
        // covers "missing folder" findings.
      }
    }
    return results;
  }
  return [];
}

async function listPluginFolders(
  root: string,
  prefix?: string,
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }
  const folders: string[] = [];
  for (const entry of entries) {
    const info = await stat(join(root, entry));
    if (!info.isDirectory()) continue;
    if (prefix && !entry.startsWith(prefix)) continue;
    folders.push(entry);
  }
  return folders.toSorted();
}

async function listRuleDocFiles(
  rulesRoot: string,
  excludeFilenames: Set<string>,
): Promise<string[]> {
  const results: string[] = [];

  async function visit(dir: string) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let info;
      try {
        info = await stat(fullPath);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        await visit(fullPath);
      } else if (info.isFile() && entry.endsWith('.md')) {
        if (excludeFilenames.has(entry)) continue;
        results.push(relative(rulesRoot, fullPath));
      }
    }
  }

  await visit(rulesRoot);
  return results.toSorted();
}

interface Heading {
  level: number;
  text: string;
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of lines) {
    // Track fenced code blocks so `## Foo` inside a code sample doesn't count.
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    headings.push({
      level: match[1].length,
      text: stripFormatting(match[2]),
    });
  }
  return headings;
}

function stripFormatting(text: string): string {
  // Strip leading/trailing emoji + whitespace + bold/italic markers so
  // `## ❌ Incorrect Examples` matches `Incorrect Examples`.
  return text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^_+|_+$/g, '')
    .trim();
}

function hasMatchingHeading(
  headings: Heading[],
  pattern: string | RegExp,
): boolean {
  if (typeof pattern === 'string') {
    const target = pattern.toLowerCase();
    return headings.some((h) => h.text.toLowerCase() === target);
  }
  return headings.some((h) => pattern.test(h.text));
}
