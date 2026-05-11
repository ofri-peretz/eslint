/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Plugin-template conformance validator.
 *
 * Asserts that every plugin folder under `pluginsRoot` ships the canonical
 * page set defined in `templates/plugin/README.md`. Each missing required
 * page is one finding.
 *
 * Designed to be called from the consumer's `__tests__/` Vitest suite:
 *
 *   const findings = await validatePluginTemplateConformance({
 *     pluginsRoot: resolve(__dirname, '../../content/docs/plugins'),
 *   });
 *   expect(findings).toEqual([]);
 *
 * For multi-pillar consumers (eslint), pass each pillar root in turn or use
 * the `pillarRoots` shorthand:
 *
 *   const findings = await validatePluginTemplateConformance({
 *     pillarRoots: [
 *       resolve(__dirname, '../../content/docs/quality'),
 *       resolve(__dirname, '../../content/docs/security'),
 *     ],
 *     pluginPrefix: 'plugin-',
 *   });
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ValidationFinding } from './types';

export interface RequiredPage {
  /** Filename relative to the plugin folder, e.g. `index.mdx`. */
  file: string;
  /** Optional condition that decides if the page is required. */
  required: boolean;
  /** Human-readable note shown in the finding when missing. */
  rationale: string;
}

const DEFAULT_REQUIRED_PAGES: RequiredPage[] = [
  { file: 'index.mdx', required: true, rationale: 'Tutorial hub — the plugin landing page.' },
  { file: 'installation.mdx', required: true, rationale: 'Install + smoke test.' },
  { file: 'configuration.mdx', required: true, rationale: 'Reference for every config key.' },
  { file: 'migration.mdx', required: true, rationale: 'User-facing migration story (community → interlace).' },
  { file: 'changelog.mdx', required: true, rationale: 'Release history.' },
  { file: 'benchmark.mdx', required: true, rationale: 'Reproducible scorecard.' },
  { file: 'meta.json', required: true, rationale: 'Sidebar nav for the plugin folder.' },
];

const DEFAULT_OPTIONAL_PAGES = ['cli-commands.mdx', 'faq.mdx'];

export interface PluginTemplateConformanceOptions {
  /** Single root directory whose direct children are plugin folders. */
  pluginsRoot?: string;
  /** Multiple pillar roots (e.g. eslint's `quality/` and `security/`). */
  pillarRoots?: string[];
  /** Prefix that identifies a plugin folder (e.g. `plugin-`); skip non-matches. */
  pluginPrefix?: string;
  /** Override the required page list. */
  requiredPages?: RequiredPage[];
  /** Override the optional page list (used for hint findings, not failures). */
  optionalPages?: string[];
  /** Plugin folders to skip entirely (e.g. work-in-progress). */
  ignore?: string[];
}

export async function validatePluginTemplateConformance(
  options: PluginTemplateConformanceOptions,
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const requiredPages = options.requiredPages ?? DEFAULT_REQUIRED_PAGES;
  const ignore = new Set(options.ignore ?? []);

  const roots = options.pillarRoots ?? (options.pluginsRoot ? [options.pluginsRoot] : []);
  if (roots.length === 0) {
    throw new Error(
      'validatePluginTemplateConformance: provide `pluginsRoot` or `pillarRoots`.',
    );
  }

  for (const root of roots) {
    const pluginFolders = await listPluginFolders(root, options.pluginPrefix);
    for (const folder of pluginFolders) {
      if (ignore.has(folder)) continue;
      const folderPath = join(root, folder);
      for (const page of requiredPages) {
        if (!page.required) continue;
        const pagePath = join(folderPath, page.file);
        if (!(await fileExists(pagePath))) {
          findings.push({
            file: `${folder}/${page.file}`,
            severity: 'error',
            message: `Missing required page \`${page.file}\` for plugin \`${folder}\`. ${page.rationale}`,
          });
          continue;
        }
        if (page.file.endsWith('.mdx')) {
          const frontmatterFinding = await checkFrontmatter(pagePath, `${folder}/${page.file}`);
          if (frontmatterFinding) findings.push(frontmatterFinding);
        }
      }
    }
  }

  return findings;
}

async function listPluginFolders(root: string, prefix?: string): Promise<string[]> {
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkFrontmatter(
  pagePath: string,
  reportFile: string,
): Promise<ValidationFinding | null> {
  const raw = await readFile(pagePath, 'utf8');
  if (!raw.startsWith('---')) {
    return {
      file: reportFile,
      severity: 'error',
      message: 'Page is missing frontmatter (required for nav rendering).',
    };
  }
  const closeIdx = raw.indexOf('\n---', 3);
  if (closeIdx === -1) {
    return {
      file: reportFile,
      severity: 'error',
      message: 'Page frontmatter is unterminated.',
    };
  }
  const block = raw.slice(3, closeIdx);
  const hasTitle = /\btitle\s*:/.test(block);
  const hasDescription = /\bdescription\s*:/.test(block);
  if (!hasTitle || !hasDescription) {
    return {
      file: reportFile,
      severity: 'error',
      message: `Frontmatter must include \`title\` and \`description\`. Missing: ${[
        !hasTitle && 'title',
        !hasDescription && 'description',
      ]
        .filter(Boolean)
        .join(', ')}`,
    };
  }
  return null;
}

export const DEFAULTS = { DEFAULT_REQUIRED_PAGES, DEFAULT_OPTIONAL_PAGES } as const;
