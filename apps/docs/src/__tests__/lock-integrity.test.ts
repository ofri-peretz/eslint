/**
 * A lock on the locks.
 *
 * This app guards its invariants with ~220 source-string assertions: read a
 * file, assert it matches a pattern. That works right up until the pattern's
 * only occurrence is a *comment* — then the assertion passes even after the
 * behaviour it guards is deleted. It becomes a spellchecker for documentation,
 * and it fails silently, which is the worst way for a safety net to fail.
 *
 * This is not hypothetical. Two locks written on 2026-08-22 had exactly this
 * flaw, both caught only by deliberately mutating the source:
 *   - `persistence: 'memory'` — the comment explaining what it replaced
 *     satisfied the assertion meant to prove it was gone.
 *   - `is_synthetic: true` — the docstring above the option satisfied the
 *     assertion meant to prove the option was set.
 *
 * The whole existing suite audits clean (101 resolvable assertions, 0 vacuous),
 * so this test starts green and exists to keep it that way.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', '..');

/**
 * Blank out comments while preserving offsets — and skip string literals.
 *
 * The naive version treats the `//` in `https://` as a line comment and blanks
 * the rest of the line, which reports every URL-bearing assertion as vacuous.
 * That false positive is the same class of bug this test hunts, so the helper
 * has to be string-aware to be worth trusting. It was wrong on the first
 * attempt for exactly this reason.
 */
export function blankComments(text: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < text.length) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (text.startsWith('//', i)) {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    if (text.startsWith('/*', i)) {
      const found = text.indexOf('*/', i + 2);
      const stop = found === -1 ? text.length : found + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Resolve a lock's target path against the roots these tests read from. */
function resolveTarget(rel: string): string | null {
  for (const root of [APP, join(APP, 'src')]) {
    const p = join(root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

interface Assertion {
  test: string;
  target: string;
  pattern: string;
}

/** Extract (target file, regex) pairs from a lock test's source. */
function assertionsIn(testFile: string, src: string): Assertion[] {
  const paths = new Map<string, string>();
  const contents = new Map<string, string>();
  const found: Assertion[] = [];

  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:join|resolve)\(([^;]+?)\);/gs)) {
    const literals = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (literals.length) paths.set(m[1], literals.join('/'));
  }
  for (const m of src.matchAll(/(\w+)\s*=\s*readFileSync\(\s*([^,)]+)/g)) {
    const arg = m[2].trim();
    const literal = [...arg.matchAll(/'([^']+)'/g)].map((x) => x[1]).pop();
    const rel = literal ?? paths.get(arg);
    if (rel) contents.set(m[1], rel);
  }
  for (const m of src.matchAll(/expect\(\s*(\w+)\s*\)\s*\.toMatch\(\s*\/(.+?)\/[gimsuy]*\s*\)/gs)) {
    const rel = contents.get(m[1]);
    if (rel) found.push({ test: testFile, target: rel, pattern: m[2] });
  }
  for (const m of src.matchAll(
    /expect\(\s*read\(\s*'([^']+)'\s*\)\s*\)\s*\.toMatch\(\s*\/(.+?)\/[gimsuy]*\s*\)/gs,
  )) {
    found.push({ test: testFile, target: m[1], pattern: m[2] });
  }
  return found;
}

describe('lock integrity: no assertion is satisfied only by a comment', () => {
  const lockFiles = globSync('src/__tests__/*lock*.ts*', { cwd: APP })
    // Skip this file: its own prose necessarily contains the phrases it hunts.
    .filter((f) => !f.endsWith('lock-integrity.test.ts'));

  it('finds lock files to audit', () => {
    expect(lockFiles.length).toBeGreaterThan(10);
  });

  it('every resolvable assertion matches real code, not just documentation', () => {
    const vacuous: string[] = [];
    let checked = 0;

    for (const rel of lockFiles) {
      const src = readFileSync(join(APP, rel), 'utf-8');
      for (const a of assertionsIn(rel, src)) {
        const target = resolveTarget(a.target);
        if (!target) continue;
        let rx: RegExp;
        try {
          rx = new RegExp(a.pattern, 'm');
        } catch {
          continue; // not translatable; not this test's business
        }
        const body = readFileSync(target, 'utf-8');
        checked += 1;
        if (rx.test(body) && !rx.test(blankComments(body))) {
          vacuous.push(`${a.test} → ${a.target}  /${a.pattern}/`);
        }
      }
    }

    // A guard that resolves nothing would pass forever while proving nothing.
    expect(checked).toBeGreaterThan(50);
    expect(vacuous, `Vacuous lock assertions:\n${vacuous.join('\n')}`).toEqual([]);
  });
});

describe('lock integrity: the detector itself works', () => {
  it('treats a comment-only occurrence as vacuous', () => {
    const source = `// capture_heatmaps: true\nconst x = 1;\n`;
    expect(/capture_heatmaps: true/.test(source)).toBe(true);
    expect(/capture_heatmaps: true/.test(blankComments(source))).toBe(false);
  });

  it('does not mistake a URL for a comment', () => {
    // The bug that made the first version of this report false positives.
    const source = `const u = 'https://us.i.posthog.com/decide';\n`;
    expect(/us\.i\.posthog\.com/.test(blankComments(source))).toBe(true);
  });

  it('keeps real code that sits after a comment on the same line', () => {
    const source = `const a = 1; // capture_dead_clicks: true\nconst capture_dead_clicks = true;\n`;
    expect(/const capture_dead_clicks/.test(blankComments(source))).toBe(true);
  });
});
