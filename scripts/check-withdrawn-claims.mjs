#!/usr/bin/env node
/**
 * Fails if a claim withdrawn in CLAIMS.md reappears on a marketing surface.
 *
 * The "100x faster" figure for eslint-plugin-import-next was never measured
 * (largest real number: 3.1x end-to-end / 8x rule time; largest synthetic:
 * 54.9x at 5K files) yet had spread to 15 files before the 2026-08-02 audit.
 * Nothing checked, so nothing stopped it. This is the check.
 *
 * ponytail: plain regex over tracked files, no AST, no config file. If the
 * withdrawn-claim list outgrows a handful of entries, move PATTERNS into
 * CLAIMS.md front-matter and parse it instead of hand-syncing the two.
 *
 * Usage: node scripts/check-withdrawn-claims.mjs [--selftest]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

/**
 * Each pattern targets the *claim*, not the bare number — "100x" alone is a
 * legitimate figure elsewhere in this repo (bug-cost ratios, feedback-loop
 * leverage, oxlint's own marketing, download-estimate divisors).
 */
const PATTERNS = [
  {
    id: 'import-next-100x',
    // "100x faster cycle detection" / "100x faster no-cycle" / "100x faster ... import"
    regex:
      /100\s*[x×]\s*faster\s+(?:no-cycle|cycle|circular|dependency|depend\w*|import)/i,
    replacement: '3.1x faster end-to-end / 8x faster in pure rule time',
  },
  {
    id: 'import-next-100x-reversed',
    // "no-cycle ... 100x faster" / "import-next ... 100x faster"
    regex:
      /(?:no-cycle|cycle detection|circular dep\w*|import-next)[^.\n]{0,40}?100\s*[x×]\s*faster/i,
    replacement: '3.1x faster end-to-end / 8x faster in pure rule time',
  },
  {
    id: 'import-next-sub-second',
    // The 100x sweep missed a second fabrication that travelled with it:
    // "45s → 0.4s", "<1s (100x faster)". No run in benchmarks/results/ is
    // sub-second — the floor is 1.05s (synthetic, 1K files) and the real
    // codebase is 4.9s rule time / 16.7s end-to-end. A sub-second lint
    // figure in this repo is unmeasured by construction.
    // The lookbehind is load-bearing: without it, the `.59s` inside a measured
    // `148.59s` reads as a sub-second figure and the guard flags its own
    // evidence. Window spans sentences (`[^\n]`) because the fabrication was
    // written as two: "…takes 45s to lint. Our replacement takes 0.4s."
    regex:
      /(?:eslint-plugin-import|import-next|no-cycle|cycle detection|lint time|linting)[^\n]{0,80}?(?:(?<![\d.])0?\.\d+\s*s(?:ec|econds)?\b|<\s*1\s*s\b|\bsub-second\b)/i,
    replacement:
      '2.71s at 5K files (synthetic, no-cycle only) or 4.9s rule time (real codebase)',
  },
  {
    id: 'unmeasured-sub-second-transition',
    // Context-free form of the same fabrication: any "Ns → 0.Xs" pairing.
    // Catches it in a diagram or table cell where the subject sits on a
    // different line than the number, out of reach of the pair window.
    regex: /\b\d+(?:\.\d+)?\s*s\b\s*(?:→|->|to)\s*(?<![\d.])0?\.\d+\s*s\b/i,
    replacement:
      '148.6s → 2.71s at 5K files (synthetic, no-cycle only), citing the result JSON',
  },
];

/**
 * Files allowed to contain the withdrawn phrasing, each for a stated reason.
 * Adding a path here is a deliberate act — say why.
 *
 * Whole-file exemptions are only for records that are *about* the withdrawal or
 * are generated elsewhere. A living marketing surface never belongs here — it
 * would let a fresh uncorrected claim in under cover of an old one.
 */
const ALLOWLIST = new Map([
  ['CLAIMS.md', 'the registry documenting the withdrawal itself'],
  ['distribution/PUBLISHING_QUEUE.md', 'log of already-published article titles (marked †)'],
  [
    'apps/docs/src/data/articles.json',
    'generated mirror of the Dev.to API — fix upstream on Dev.to, not here',
  ],
  ['scripts/check-withdrawn-claims.mjs', 'this file — the patterns and their test fixtures'],
]);

/**
 * Per-line escape hatch, for files that must keep a historical claim verbatim
 * *next to* its correction (changelog entries). Narrower than an ALLOWLIST
 * entry: a new uncorrected claim elsewhere in the same file still fails.
 */
const CORRECTION_MARKER =
  /\(Corrected \d{4}-\d{2}-\d{2}:|originally (?:read|claimed)|\bclaimed ["'“]/i;

const TEXT_FILE = /\.(md|mdx|json|ts|tsx|js|jsx|mjs|cjs|yml|yaml|html)$/i;

/**
 * Strip Markdown emphasis and collapse whitespace so `**100x faster** cycle`
 * and `100x faster cycle` normalize to the same text. Without this the scanner
 * only catches unformatted prose — which is not how docs are written.
 */
function normalize(line) {
  return line
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((f) => f && TEXT_FILE.test(f) && !ALLOWLIST.has(f));
}

function scan(files) {
  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // deleted-but-tracked, or binary mislabelled by extension
    }
    const lines = text.split('\n');
    const norm = lines.map(normalize);

    for (const { id, regex, replacement } of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const next = i + 1 < norm.length ? norm[i + 1] : '';
        const onThisLine = regex.test(norm[i]);
        // A claim wrapped across two Markdown lines matches only when joined.
        // Guard on !onThisLine && !onNextLine so a self-contained claim on the
        // next line is reported once, at its own index, not twice.
        const wrapped =
          !onThisLine && next !== '' && !regex.test(next) && regex.test(`${norm[i]} ${next}`);
        if (!onThisLine && !wrapped) continue;

        // A historical claim sitting next to its own correction is fine.
        if (CORRECTION_MARKER.test(lines[i])) continue;

        hits.push({ file, line: i + 1, id, replacement, text: lines[i].trim() });
      }
    }
  }
  return hits;
}

function selftest() {
  const bad = [
    'Drop-in replacement with 100x faster cycle detection',
    '| `no-cycle` | **100x faster** circular deps |',
    'Optimized: 100× faster dependency analysis',
    '<Card title="⚡ 100x Faster no-cycle">',
    // Emphasis must not hide the claim — `**100x faster**` puts `**` between
    // "faster" and the subject, which a naive \s+ would refuse to cross.
    '**100x faster** cycle detection in `import-next`',
    '_100x faster_ circular dependency analysis',
    // The sub-second fabrication that rode along with the 100x claim.
    '├── Tactic: "45s → 0.4s" benchmark viral content',
    '| **Performance benchmarks** | "10K files: import took 45s, import-next took 0.4s" |',
    '- "Reduced lint time from 45s to 0.4s in production"',
    '| `no-cycle` | 45s+ on large monorepos | <1s (100x faster) |',
    'eslint-plugin-import takes 45s to lint. Our replacement takes 0.4s.',
    'Docs surfaces carried a supporting table: 15.0s → 0.15s',
  ];
  const good = [
    'Catching vulnerabilities during code review is 100x cheaper than fixing them',
    '| Native Rust ports in oxlint | ~50–100× faster |',
    'Divide total downloads by 50-100x for a conservative estimate',
    'each roughly 100×–1,000× slower than the one inside it',
    'Vite and esbuild offer 10-100x faster builds.',
    '8x faster cycle detection',
    'Scaled APIs 100x',
    // Measured figures must survive — the floor is 1.05s, never sub-second.
    'no-cycle rule time: 148.59s vs 2.71s at 5,000 files (synthetic)',
    'import-next finishes the 1K-file corpus in 1.05s',
    '| `docs.yml` | ~45s | docs structure validation |',
    'Cut no-cycle rule time 8x on a 5,736-file React codebase',
    'p95 budget per rule is 0.4s',
  ];
  // Claim split across two Markdown lines — caught via the pair window.
  const badPair = ['Cycle detection is now', '100x faster than the official plugin'];

  const matches = (s) => PATTERNS.some((p) => p.regex.test(normalize(s)));

  for (const s of bad) assert.equal(matches(s), true, `should flag: ${s}`);
  for (const s of good) assert.equal(matches(s), false, `should NOT flag: ${s}`);

  assert.equal(
    matches(badPair.join(' ')),
    true,
    'should flag a claim wrapped across two lines'
  );
  assert.equal(
    CORRECTION_MARKER.test('- **Performance**: faster. _(Corrected 2026-08-02: originally read "up to 100x faster")_'),
    true,
    'correction marker should exempt a documented historical claim'
  );
  assert.equal(
    CORRECTION_MARKER.test('- **Performance**: now 100x faster.'),
    false,
    'correction marker must not exempt an ordinary claim'
  );

  console.log(
    `✅ selftest passed (${bad.length} flagged, ${good.length} ignored, ` +
      '1 wrapped-line, 2 correction-marker)'
  );
}

if (process.argv.includes('--selftest')) {
  selftest();
  process.exit(0);
}

const hits = scan(trackedFiles());

if (hits.length === 0) {
  console.log('✅ No withdrawn claims found on marketing surfaces.');
  process.exit(0);
}

console.error(`\n❌ ${hits.length} withdrawn claim(s) found — see CLAIMS.md § Withdrawn claims:\n`);
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  [${h.id}]`);
  console.error(`    ${h.text}`);
  console.error(`    → use instead: ${h.replacement}\n`);
}
console.error(
  'If a hit is a legitimate use of the number, add the path to ALLOWLIST in\n' +
    'scripts/check-withdrawn-claims.mjs with a one-line reason.\n'
);
process.exit(1);
