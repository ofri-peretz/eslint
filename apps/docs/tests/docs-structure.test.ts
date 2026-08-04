// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const DOCS_DIR = dirname(fileURLToPath(import.meta.url)) + '/..';

/**
 * Documentation Structure Tests
 *
 * These tests ensure documentation pages have valid structure and required elements.
 * Catches issues like:
 * - Missing frontmatter
 * - Invalid component imports
 * - Broken internal links
 * - Empty pages
 *
 * Every check runs in ONE pass over the corpus (see `corpus()`), because the
 * previous shape re-globbed and re-read the same ~520 MDX files for each of
 * ten tests. Same pattern as tests/mermaid-syntax.test.ts.
 */

interface Corpus {
  mdxCount: number;
  ruleDocCount: number;
  metaCount: number;
  categoryDirs: string[];
  pluginDirs: string[];
  /** Absolute dirs (no trailing slash — `absolute: true` strips it) holding a meta.json. */
  metaDirs: Set<string>;
  /** Absolute dirs holding a README.mdx or index.mdx. */
  landingDirs: Set<string>;
  missingTitle: string[];
  missingDescription: string[];
  relativeComponentImports: string[];
  nearlyEmpty: string[];
  ruleDocsWithoutH2: string[];
  invalidMeta: string[];
}

let cached: Corpus | undefined;

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (content.charCodeAt(i) === 10) line++;
  return line;
}

/**
 * Build the corpus once, lazily. Lazy — not module scope — so the read cost
 * lands inside a test's timeout budget instead of during collection, where
 * vitest has no timeout to give it. Only matches are retained, never the file
 * contents: materializing every line of every file was the bulk of the old
 * runtime and no passing run ever read it.
 */
function corpus(): Corpus {
  if (cached) return cached;

  const glob = (pattern: string, nodir = true) =>
    globSync(pattern, { cwd: DOCS_DIR, absolute: true, nodir });

  const mdxFiles = glob('content/**/*.mdx');
  const metaFiles = glob('content/**/meta.json');
  const categoryDirs = glob('content/docs/*/', false);
  const pluginDirs = glob('content/docs/*/plugin-*/', false);

  const c: Corpus = {
    mdxCount: mdxFiles.length,
    ruleDocCount: 0,
    metaCount: metaFiles.length,
    categoryDirs,
    pluginDirs,
    metaDirs: new Set(metaFiles.map(f => dirname(f))),
    landingDirs: new Set(),
    missingTitle: [],
    missingDescription: [],
    relativeComponentImports: [],
    nearlyEmpty: [],
    ruleDocsWithoutH2: [],
    invalidMeta: [],
  };

  // Relative imports of components that should go through the @/ alias.
  const relativeComponentImport = /^import.*from\s+['"]\.\.\/[^'"]*components/gm;
  // Rule pages: content/docs/<category>/<plugin>/rules/<rule>.mdx
  const ruleDoc = /^content\/docs\/.+\/rules\/[^/]+\.mdx$/;

  for (const file of mdxFiles) {
    const rel = relative(DOCS_DIR, file);
    const content = readFileSync(file, 'utf-8');

    const base = rel.split('/').pop()!;
    if (base === 'README.mdx' || base === 'index.mdx') {
      c.landingDirs.add(dirname(file));
    }

    // --- frontmatter ---
    const endIndex = content.startsWith('---') ? content.indexOf('---', 3) : -1;
    if (!content.startsWith('---')) {
      c.missingTitle.push(`${rel}: Missing frontmatter block`);
    } else if (endIndex === -1) {
      c.missingTitle.push(`${rel}: Unclosed frontmatter block`);
    } else {
      const frontmatter = content.slice(3, endIndex);
      if (!frontmatter.includes('title:')) {
        c.missingTitle.push(`${rel}: Missing 'title' in frontmatter`);
      }
      if (!frontmatter.includes('description:')) {
        c.missingDescription.push(`${rel}: Missing 'description' in frontmatter`);
      }
    }

    // --- component imports ---
    relativeComponentImport.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = relativeComponentImport.exec(content)) !== null) {
      c.relativeComponentImports.push(
        `${rel}:${lineOf(content, match.index)}: Use @/components instead of relative import`
      );
    }

    // --- body length (only meaningful once frontmatter closes) ---
    if (endIndex !== -1 && content.slice(endIndex + 3).trim().length < 50) {
      c.nearlyEmpty.push(rel);
    }

    // --- rule page headings ---
    if (ruleDoc.test(rel) && base !== 'index.mdx') {
      c.ruleDocCount++;
      if (!content.includes('\n## ')) {
        c.ruleDocsWithoutH2.push(`${rel}: No h2 headings found`);
      }
    }
  }

  for (const file of metaFiles) {
    try {
      JSON.parse(readFileSync(file, 'utf-8'));
    } catch {
      c.invalidMeta.push(relative(DOCS_DIR, file));
    }
  }

  cached = c;
  return c;
}

describe('Corpus Integrity', () => {
  // Every check below asserts "no violations found", which a corpus of zero
  // files satisfies perfectly. This guard is the only thing standing between a
  // broken glob and a green, meaningless suite.
  it('should scan a non-empty corpus', () => {
    const c = corpus();
    expect(c.mdxCount).toBeGreaterThan(500); // 526 today
    expect(c.ruleDocCount).toBeGreaterThan(400); // 421 today
    expect(c.metaCount).toBeGreaterThan(40); // 48 today
    expect(c.categoryDirs.length).toBeGreaterThan(5); // 6 today
    expect(c.pluginDirs.length).toBeGreaterThan(17); // 19 today
  });
});

describe('Documentation Page Structure', () => {
  describe('Frontmatter Validation', () => {
    it('should have title in all MDX pages', () => {
      const { missingTitle } = corpus();
      if (missingTitle.length > 0) {
        console.log('\nViolations found:', missingTitle.join('\n'));
      }
      expect(missingTitle).toHaveLength(0);
    });

    it('should have description in all MDX pages', () => {
      const { missingDescription } = corpus();
      // Was `expect(true).toBe(true)` behind a console.warn — it read every file
      // and could not go red. Every page carries a description today, so lock it.
      if (missingDescription.length > 0) {
        console.log('\nViolations found:', missingDescription.join('\n'));
      }
      expect(missingDescription).toHaveLength(0);
    });
  });

  describe('Component Import Validation', () => {
    it('should use @/ alias for component imports', () => {
      expect(corpus().relativeComponentImports).toHaveLength(0);
    });
  });

  describe('Meta.json Validation', () => {
    it('should have meta.json in each plugin directory', () => {
      const { categoryDirs, metaDirs } = corpus();
      const missingMeta = categoryDirs.filter(dir => !metaDirs.has(dir));

      // Some directories might not need meta.json (like concepts/)
      // Just check that we don't have too many missing
      expect(missingMeta.length).toBeLessThan(5);
    });

    it('should have valid JSON in meta.json files', () => {
      expect(corpus().invalidMeta).toHaveLength(0);
    });
  });

  describe('Content Quality', () => {
    it('should not have empty MDX pages', () => {
      const { nearlyEmpty } = corpus();
      if (nearlyEmpty.length > 0) {
        console.warn(`\n⚠️  Nearly empty pages:\n${nearlyEmpty.join('\n')}`);
      }

      // Allow some index pages to be minimal
      expect(nearlyEmpty.length).toBeLessThan(20);
    });

    it('should have consistent heading structure', () => {
      const { ruleDocsWithoutH2 } = corpus();
      if (ruleDocsWithoutH2.length > 0) {
        console.warn(`\n⚠️  Pages with heading issues:\n${ruleDocsWithoutH2.slice(0, 5).join('\n')}`);
      }

      // Many rule pages now use RemoteRuleDoc for dynamic content from GitHub
      // These pages don't have local h2 headings since content is fetched remotely
      expect(ruleDocsWithoutH2.length).toBeLessThan(400);
    });
  });
});

describe('Plugin Documentation Coverage', () => {
  it('should have README.mdx for each plugin', () => {
    const { categoryDirs, landingDirs } = corpus();
    const missingReadme = categoryDirs.filter(
      dir =>
        !dir.endsWith('/concepts') &&
        !dir.endsWith('/getting-started') &&
        !landingDirs.has(dir)
    );

    expect(missingReadme.length).toBeLessThan(3);
  });

  it('should have rules directory for each plugin', () => {
    // Plugins live nested under category dirs in the docs structure:
    // content/docs/<category>/plugin-<name>/. Top-level dirs (security/,
    // quality/, benchmarks/, learn/, integrations/, design/, components/) are
    // categories or doc sections, not plugins — glob the actual plugin dirs.
    const missingRules = corpus().pluginDirs.filter(dir => !existsSync(join(dir, 'rules')));

    // Most plugins should have rules
    expect(missingRules.length).toBeLessThan(5);
  });
});
