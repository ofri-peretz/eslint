// @vitest-environment node
/**
 * Rule Documentation MDX Compatibility Tests
 *
 * These tests validate that rule documentation in packages/ is compatible
 * with MDX parsing used by RemoteRuleDoc component in production builds.
 *
 * Catches issues BEFORE Vercel build fails, including:
 * - CVSS calculator URLs with problematic query strings
 * - External image references that may 404
 * - Self-closing tag syntax errors
 * - Other MDX-incompatible markdown patterns
 *
 * CRITICAL: These tests lock documentation format to prevent build failures.
 *
 * Every check runs in ONE pass over the corpus (see `corpus()`). The previous
 * shape hand-walked all of packages/ twice — descending into every dist/ and
 * src/ with a statSync per entry — then re-read all ~415 rule docs five times.
 * Same pattern as tests/mermaid-syntax.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// Configuration
// ============================================================================

// Resolve relative to this test file rather than process.cwd() so the test
// works under both vitest (cwd=apps/docs) and turbo (cwd=workspace root).
const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGES_ROOT = join(DOCS_ROOT, '..', '..', 'packages');

// Patterns that break MDX parsing in RemoteRuleDoc
const PROBLEMATIC_PATTERNS = [
  {
    name: 'CVSS Calculator URL with UN-ENCODED query string',
    // Detects: ?vector=AV:N/AC:L (un-encoded chars that break MDX)
    // Allows: ?vector=AV%3AN%2FAC%3AL (properly URL-encoded)
    pattern: /nvd\.nist\.gov\/vuln-metrics\/cvss\/v3-calculator\?vector=[^)]*[/:][^)]*\)/,
    description: 'CVSS calculator URLs must have URL-encoded vector query strings. Use %3A for : and %2F for /',
    severity: 'error',
  },

  {
    name: 'Unescaped angle bracket in text',
    pattern: /[^`\n]<(?!\/|[a-zA-Z!]|--|$)/,
    description: 'Unescaped < in text content may be interpreted as JSX. Use &lt; or wrap in backticks.',
    severity: 'warning',
  },
];

// Known problematic external images (404s or unreliable)
const BLOCKED_IMAGE_DOMAINS = [
  'blog.filippo.io', // Known 404
];

// ============================================================================
// Corpus
// ============================================================================

interface Located {
  file: string;
  line: number;
}

interface Corpus {
  fileCount: number;
  /** Keyed by pattern name. */
  patternViolations: Map<string, (Located & { content: string })[]>;
  blockedImages: (Located & { url: string })[];
  malformedTables: (Located & { issue: string })[];
  missingFrontmatter: string[];
  invalidFrontmatter: { file: string; issue: string }[];
}

let cached: Corpus | undefined;

/**
 * Build the corpus once, lazily. Lazy — not module scope — so the read cost
 * lands inside a test's timeout budget instead of during collection, where
 * vitest has no timeout to give it. Only matches are retained; each file's
 * lines are split once and dropped, never accumulated.
 */
function corpus(): Corpus {
  if (cached) return cached;

  // Bounded glob instead of a recursive walk: every rule doc lives at
  // packages/<plugin>/docs/rules/*.md, so there is no reason to descend into
  // dist/, src/ or coverage/ at all.
  const files = globSync('*/docs/rules/*.md', {
    cwd: PACKAGES_ROOT,
    absolute: true,
    nodir: true,
    ignore: '**/node_modules/**',
  });

  const c: Corpus = {
    fileCount: files.length,
    patternViolations: new Map(PROBLEMATIC_PATTERNS.map(p => [p.name, []])),
    blockedImages: [],
    malformedTables: [],
    missingFrontmatter: [],
    invalidFrontmatter: [],
  };

  const imageRef = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;

  for (const file of files) {
    const rel = file.replace(PACKAGES_ROOT + '/', '');
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    let inTable = false;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      for (const { name, pattern } of PROBLEMATIC_PATTERNS) {
        if (pattern.test(line)) {
          c.patternViolations.get(name)!.push({
            file: rel,
            line: index + 1,
            content: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
          });
        }
      }

      // Match markdown images: ![alt](url)
      imageRef.lastIndex = 0;
      for (const match of line.matchAll(imageRef)) {
        const url = match[1];
        for (const domain of BLOCKED_IMAGE_DOMAINS) {
          if (url.includes(domain)) {
            c.blockedImages.push({ file: rel, line: index + 1, url });
          }
        }
      }

      // Detect table rows
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;

        // Check for unbalanced pipes (rough check)
        const pipeCount = (line.match(/\|/g) || []).length;
        if (pipeCount < 2) {
          c.malformedTables.push({
            file: rel,
            line: index + 1,
            issue: 'Table row has less than 2 pipe characters',
          });
        }

        // Check for problematic URLs in tables (common MDX issue)
        if (line.includes('?') && line.includes('=') && line.includes('http')) {
          // URLs with query strings in tables can break MDX
          if (/\?[^)]*[|<>]/.test(line)) {
            c.malformedTables.push({
              file: rel,
              line: index + 1,
              issue: 'Table contains URL with problematic query string characters',
            });
          }
        }
      } else if (inTable && trimmed !== '') {
        inTable = false;
      }
    }

    // --- frontmatter ---
    // Skip eslint-plugin-import-next - uses different doc format
    if (rel.includes('eslint-plugin-import-next')) continue;

    if (!content.startsWith('---')) {
      c.missingFrontmatter.push(rel);
      continue;
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
      c.invalidFrontmatter.push({
        file: rel,
        issue: 'Frontmatter not closed (missing ending ---)',
      });
      continue;
    }

    // Required fields
    if (!content.substring(3, endIndex).includes('title:')) {
      c.invalidFrontmatter.push({ file: rel, issue: 'Missing required field: title' });
    }
  }

  cached = c;
  return c;
}

// ============================================================================
// Tests: MDX Compatibility Patterns
// ============================================================================

describe('Rule Documentation - MDX Compatibility', () => {
  // Every check below asserts "no violations found", which a corpus of zero
  // files satisfies perfectly. This guard is the only thing standing between a
  // broken glob and a green, meaningless suite.
  it('should find rule documentation files', () => {
    const { fileCount } = corpus();
    console.log(`Found ${fileCount} rule documentation files`);
    expect(fileCount).toBeGreaterThan(400); // 415 today
  });

  describe('Problematic MDX Patterns', () => {
    for (const { name, description, severity } of PROBLEMATIC_PATTERNS) {
      it(`should not contain: ${name}`, () => {
        const violations = corpus().patternViolations.get(name)!;

        if (severity === 'error') {
          expect(
            violations,
            `MDX compatibility error: ${name}\n${description}\nViolations:\n${violations.map(v => `  ${v.file}:${v.line}`).join('\n')}`
          ).toHaveLength(0);
        } else if (violations.length > 0) {
          console.warn(
            `MDX compatibility warning: ${name}\n${description}\nFiles: ${violations.map(v => v.file).join(', ')}`
          );
        }
      });
    }
  });

  describe('External Image References', () => {
    it('should not reference blocked/unreliable image domains', () => {
      const { blockedImages } = corpus();

      expect(
        blockedImages,
        `Blocked image domains found (known 404s or unreliable):\n${blockedImages.map(i => `  ${i.file}:${i.line} - ${i.url}`).join('\n')}\n\nUse Wikipedia or other reliable sources for images.`
      ).toHaveLength(0);
    });
  });

  describe('Table Markdown Syntax', () => {
    it('should have properly formatted markdown tables', () => {
      const { malformedTables } = corpus();

      // Only warn - tables are complex and may have false positives
      if (malformedTables.length > 0) {
        console.warn(
          `Potentially malformed tables found:\n${malformedTables.map(t => `  ${t.file}:${t.line} - ${t.issue}`).join('\n')}`
        );
      }
    });
  });
});

// ============================================================================
// Tests: Frontmatter Validation
// ============================================================================

describe('Rule Documentation - Frontmatter', () => {
  it('all rule docs should have valid frontmatter', () => {
    const { missingFrontmatter, invalidFrontmatter } = corpus();

    expect(
      missingFrontmatter,
      `Rule docs missing frontmatter:\n${missingFrontmatter.join('\n')}`
    ).toHaveLength(0);

    expect(
      invalidFrontmatter,
      `Rule docs with invalid frontmatter:\n${invalidFrontmatter.map(f => `  ${f.file}: ${f.issue}`).join('\n')}`
    ).toHaveLength(0);
  });
});
