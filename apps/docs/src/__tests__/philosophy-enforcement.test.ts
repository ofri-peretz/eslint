/**
 * Philosophy enforcement scans.
 *
 * These tests turn explicit feedback rules and philosophy contracts
 * into CI gates so they cannot regress silently in PRs.
 *
 * Coverage:
 *   - No inline `style={{...}}` props (feedback_no_inline_styles)
 *   - Every <img> tag has explicit width + height (MOTION_PHILOSOPHY CLS=0)
 *   - No deprecated Tailwind class names (Tailwind v4 canonical-names)
 *
 * Each scan walks `apps/docs/src/**` with a small set of exclusions
 * for test fixtures that intentionally contain forbidden strings.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { globSync } from 'glob';

const ROOT = join(process.cwd(), 'src');
const SCAN_GLOB = '**/*.{ts,tsx}';
// `__tests__` itself is excluded — these tests reference the forbidden
// patterns as string literals to assert their absence elsewhere.
// `components/play/snippets.ts` is also excluded — it intentionally
// contains forbidden patterns (`<img>` without alt/width/height, inline
// `style={{...}}`, deprecated Tailwind names) **as code-block content
// strings**, not as real JSX. The whole point of the playground snippets
// is to show what our rules flag.
const IGNORE = [
  '__tests__/**',
  '**/*.d.ts',
  'components/play/snippets.ts',
];

const files = globSync(SCAN_GLOB, { cwd: ROOT, ignore: IGNORE, absolute: true });

function relativeFromRoot(absolute: string): string {
  return relative(ROOT, absolute);
}

// ─────────────────────────────────────────────────────────────────────────
// 1. No inline `style={{...}}` props
// ─────────────────────────────────────────────────────────────────────────

describe('No inline style props (feedback_no_inline_styles)', () => {
  it('apps/docs/src is empty of `style={{...}}` JSX props', () => {
    // The forbidden pattern: `style={{` preceded by whitespace (so it's a
    // JSX prop, not a substring like `foo.style={{ x: 1 }}` in code).
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      if (/\sstyle=\{\{/.test(src)) {
        // Find each occurrence with line number.
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/\sstyle=\{\{/.test(lines[i])) {
            offenders.push(`${relativeFromRoot(file)}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      }
    }
    expect(
      offenders,
      `Use Tailwind classes (bracket-syntax for arbitrary values) instead of inline styles. Found:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Every <img> has explicit width + height (CLS=0 budget)
// ─────────────────────────────────────────────────────────────────────────

describe('Every <img> tag carries width + height (MOTION_PHILOSOPHY CLS=0)', () => {
  it('finds no <img> in apps/docs/src missing either attribute', () => {
    const offenders: string[] = [];
    // Match an entire <img ... /> tag, including multi-line.
    const imgTagRegex = /<img\b[^>]*?\/?>/gs;
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      const matches = src.match(imgTagRegex) ?? [];
      for (const tag of matches) {
        const hasWidth = /\swidth\s*=/.test(tag);
        const hasHeight = /\sheight\s*=/.test(tag);
        if (!hasWidth || !hasHeight) {
          // Locate the line number of the first `<img` of this tag.
          const idx = src.indexOf(tag);
          const line = src.slice(0, idx).split('\n').length;
          offenders.push(
            `${relativeFromRoot(file)}:${line}: <img is missing ${
              !hasWidth && !hasHeight ? 'width + height' : !hasWidth ? 'width' : 'height'
            } — ${tag.slice(0, 80)}${tag.length > 80 ? '…' : ''}`,
          );
        }
      }
    }
    expect(
      offenders,
      `Every <img> needs explicit width + height attrs to reserve layout space before decode. Found:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. No deprecated Tailwind class names
// ─────────────────────────────────────────────────────────────────────────

describe('No deprecated Tailwind class names (v4 canonical-name discipline)', () => {
  // Pairs: { deprecated → canonical replacement }
  // The scan checks for the deprecated name as a whole class token (i.e.
  // followed by a non-class-name character or end-of-line/quote).
  const DEPRECATED_PAIRS: Array<{ from: RegExp; deprecated: string; replacement: string }> = [
    { from: /\bbg-gradient-to-[trbl]{1,2}\b/g, deprecated: 'bg-gradient-to-*', replacement: 'bg-linear-to-*' },
    { from: /\bflex-grow(?!-)\b/g, deprecated: 'flex-grow', replacement: 'grow' },
    { from: /\bflex-shrink(?!-)\b/g, deprecated: 'flex-shrink', replacement: 'shrink' },
    { from: /\boverflow-ellipsis\b/g, deprecated: 'overflow-ellipsis', replacement: 'text-ellipsis' },
    { from: /\bdecoration-clone\b/g, deprecated: 'decoration-clone', replacement: 'box-decoration-clone' },
  ];

  it('finds no deprecated Tailwind class names in apps/docs/src', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      for (const { from, deprecated, replacement } of DEPRECATED_PAIRS) {
        const matches = src.matchAll(from);
        for (const match of matches) {
          const idx = match.index ?? 0;
          const line = src.slice(0, idx).split('\n').length;
          offenders.push(
            `${relativeFromRoot(file)}:${line}: \`${deprecated}\` is deprecated in Tailwind v4 — use \`${replacement}\``,
          );
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
