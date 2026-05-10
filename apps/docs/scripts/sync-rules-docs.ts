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
import { FalseNegativeCTA, WhenNotToUse } from "@/components/RuleComponents";
`;

export function convertMdToMdx(mdContent, fileName) {
  // Extract Title (usually first # header)
  const titleMatch = mdContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');
  
  // Extract Description (first paragraph after title)
  let description = "";
  // Strip comments, icons, and keyword markers before extracting description
  const contentFiltered = mdContent
    .replace(/<!--[\s\S]*?-->/g, '') // Strip comments
    .replace(/^([💼💡🔧🚨⚠️✅📊🔍🔧📝⏱️🔗].*$\n?)/gmu, '') // Strip icon header lines and formatting
    .replace(/^>\s+\*\*Keywords:\*\*.*$\n?/gm, '') // Strip keyword lines
    .trim();
    
  // Extract first meaningful paragraph after title
  // We look for the first block of text that isn't a header or special marker
  const descRows = contentFiltered.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Find the first row that doesn't start with # and isn't a table/list
  const firstParagraph = descRows.find(row => 
    !row.startsWith('#') && 
    !row.startsWith('|') && 
    !row.startsWith('-') && 
    !row.startsWith('>') && 
    row.length > 20
  );

  if (firstParagraph) {
    description = firstParagraph
      .replace(/[💼💡🔧🚨⚠️✅📊🔍🔧📝⏱️🔗]/g, '') 
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
  }

  // Build Frontmatter with safe escaping
  let mdx = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---
`;

  // Add Imports
  mdx += MDX_TEMPLATE_IMPORTS + '\n';

  // Process Content
  let finalContent = mdContent;

  // Remove the main title (handled by frontmatter)
  finalContent = finalContent.replace(/^#\s+.+$/m, '');

  // Strip all HTML comments (Markdown markers) entirely for MDX
  finalContent = finalContent.replace(/<!--[\s\S]*?-->/g, '');

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
  finalContent = finalContent.replace(/```mermaid\n([\s\S]*?)```/g, (match, chart) => {
    const lines = chart.split('\n');
    const fixedLines = lines.map(line => {
      // Handle nodes: A[label], A{label}, A(label), A((label)), A[[label]], A>label]
      // Replace with A["label"], A{"label"}, etc.
      return line.replace(/([A-Z0-9_-]+)\[([^\]"]+)\]/g, '$1["$2"]')
                 .replace(/([A-Z0-9_-]+)\{([^\}""]+)\}/g, '$1{"$2"}')
                 .replace(/([A-Z0-9_-]+)\((?!\()([^)""]+)\)/g, '$1("$2")')
                 .replace(/([A-Z0-9_-]+)\(\(([^)""]+)\)\)/g, '$1(("$2"))')
                 .replace(/([A-Z0-9_-]+)\[\[([^\]""]+)\]\]/g, '$1[["$2"]]')
                 .replace(/([A-Z0-9_-]+)>([^\]""]+)\]/g, '$1>"$2"]');
    });
    return '```mermaid\n' + fixedLines.join('\n') + '\n```\n';
  });

  return mdx + finalContent;
}

export function updateMetaJson(pluginRulesDir, ruleSlugs) {
  const metaPath = path.join(pluginRulesDir, 'meta.json');
  let meta: { title?: string; icon?: string; defaultOpen?: boolean; pages?: string[]; [k: string]: unknown } = {
    title: 'Rules',
    pages: [],
  };

  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {}
  }

  // Defensive: existing meta.json files may not declare `pages` (the convention
  // is to omit it when the directory is auto-listed). Merge against [] in that
  // case rather than crashing on a non-iterable.
  const existingPages = Array.isArray(meta.pages) ? meta.pages : [];
  meta.pages = Array.from(new Set([...existingPages, ...ruleSlugs])).sort();

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

async function main() {
  console.log('Syncing Rule MD to MDX...');

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
      const mdxContent = convertMdToMdx(content, file);
      
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
