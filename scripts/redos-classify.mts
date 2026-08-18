/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Classify a `no-redos-vulnerable-regex` finding by TIMING it, not by reading it.
 *
 * ## Why this exists
 *
 * The first sweep used six fixed attack strings ('a'*n, ' '*n, …). It confirmed
 * 2 of 22 sampled patterns as superlinear and left 18 unclassified — and two of
 * the patterns it called flat ran 167 ms and 956 ms once an input was crafted by
 * hand. A method that can only err in one direction cannot produce a precision
 * figure, so the rule stayed unscored against a bar that needs one.
 *
 * ## What is different
 *
 * The attack alphabet is drawn from THE PATTERN ITSELF rather than a fixed list:
 * every literal character, every character-class member, every shorthand class's
 * representative. Catastrophic backtracking needs an input that the ambiguous
 * quantifiers can BOTH consume, and those characters are, by construction, in
 * the pattern.
 *
 * Each candidate is tried with a failing suffix as well. Backtracking only
 * explodes when the overall match FAILS — a succeeding match short-circuits,
 * which is precisely why the naive sweep read the n8n log pattern as flat.
 *
 * ## Reading the verdict
 *
 * SUPERLINEAR is proof: an input exists, and the witness is printed.
 * UNREPRODUCED is NOT proof of safety — it means this generator found nothing,
 * and it is named that way so it can never be read as a clean bill of health.
 *
 *   npx tsx scripts/redos-classify.mts '<source>' '<flags>'
 *   npx tsx scripts/redos-classify.mts --file <patterns.txt>
 */
/**
 * The ladder starts SMALL on purpose.
 *
 * An exponential pattern at n=200 does not return in any useful time — the first
 * version of this file began there and hung on `^(a+)+$`, the canonical example.
 * A JS regex cannot be interrupted, so the only defence is never to hand it an
 * input it cannot finish: 12/16/20/24 settle the exponential case in
 * milliseconds, and 2k/20k are there for the polynomial one, which is fast at
 * small n and only shows up when pumped.
 */
const SIZES = [12, 16, 20, 24, 28, 32, 64, 128, 512, 2000, 8000, 20000];

/**
 * Wall-clock budget per PATTERN. A JS regex cannot be interrupted once started,
 * so the only protection is a dense ladder plus a hard stop between attempts:
 * the ladder guarantees an exponential pattern crosses the 100 ms break before
 * the next rung can hang, and the budget stops a pattern that is merely slow at
 * every rung from eating the run.
 */
const BUDGET_MS = 20_000;

/** Characters the pattern itself can consume — literals and class members. */
const alphabetOf = (source: string): string[] => {
  const chars = new Set<string>();
  for (const cls of source.matchAll(/\[([^\]\\]|\\.)*\]/g)) {
    const body = cls[0].slice(1, -1);
    for (const range of body.matchAll(/(\w)-(\w)/g)) chars.add(range[1]);
    for (const ch of body.replace(/\w-\w/g, '')) if (/[^\\^]/.test(ch)) chars.add(ch);
  }
  for (const ch of source.replace(/\[([^\]\\]|\\.)*\]/g, '').replace(/\\./g, '')) {
    if (/[A-Za-z0-9_ .@:/-]/.test(ch)) chars.add(ch);
  }
  if (/\\w/.test(source)) chars.add('a');
  if (/\\d/.test(source)) chars.add('1');
  if (/\\s/.test(source)) chars.add(' ');
  if (/\\S/.test(source)) chars.add('x');
  if (/\./.test(source)) chars.add('a');
  return [...chars].slice(0, 12);
};

/** Suffixes that make the overall match fail, which is when backtracking bites. */
const FAILING_SUFFIXES = [' ', '!', '\n', ''];

export const classify = (source: string, flags: string) => {
  let re: RegExp;
  try {
    re = new RegExp(source, flags.replace(/[gy]/g, ''));
  } catch {
    return { verdict: 'uncompilable' as const, ms: 0, nAtBlowUp: Infinity, curve: [] as number[], witness: '' };
  }
  const alphabet = alphabetOf(source);
  let worst = { ms: 0, witness: '', curve: [] as number[] };

  const startedAt = process.hrtime.bigint();
  const overBudget = () => Number(process.hrtime.bigint() - startedAt) / 1e6 > BUDGET_MS;

  for (const ch of alphabet.length ? alphabet : ['a']) {
    if (overBudget()) break;
    for (const suffix of FAILING_SUFFIXES) {
      if (overBudget()) break;
      const curve: number[] = [];
      for (const n of SIZES) {
        const input = ch.repeat(n) + suffix;
        const t = process.hrtime.bigint();
        try {
          re.test(input);
        } catch {
          /* engine limits */
        }
        const ms = Number(process.hrtime.bigint() - t) / 1e6;
        curve.push(ms);
        if (ms > 100 || overBudget()) break; // already superlinear, or out of time
      }
      const last = curve[curve.length - 1];
      if (last > worst.ms) {
        worst = {
          ms: last,
          witness: `${JSON.stringify(ch)} x ${SIZES[curve.length - 1]} + ${JSON.stringify(suffix)}`,
          curve,
        };
      }
    }
  }

  // EXPONENTIAL vs POLYNOMIAL, because they are not the same finding.
  //
  // Exponential blows up on a short input — 24 characters is enough — so any
  // endpoint that accepts the pattern is trivially deniable. Polynomial needs a
  // long one: `^\d+\.?\d*$` is 0.0 ms at n=30 and seconds at n=20,000, which is
  // a real availability concern and a much smaller one.
  //
  // This distinction is why three of the rule's own `safe` fixtures disagree
  // with this classifier. They were timed at a FIXED n=30, where a quadratic
  // pattern is indistinguishable from a linear one. Neither measurement is
  // wrong; they answer different questions.
  const blewUpSmall = worst.curve.findIndex((ms) => ms > 100);
  const nAtBlowUp = blewUpSmall >= 0 ? SIZES[blewUpSmall] : Infinity;
  const verdict =
    worst.ms <= 50
      ? ('unreproduced' as const)
      : nAtBlowUp <= 64
        ? ('exponential' as const)
        : ('polynomial' as const);

  return { verdict, ms: worst.ms, nAtBlowUp, curve: worst.curve, witness: worst.witness };
};

const args = process.argv.slice(2);
if (args[0] === '--file') {
  const { readFileSync } = await import('node:fs');
  for (const line of readFileSync(args[1], 'utf8').split('\n')) {
    const m = line.match(/^\/(.*)\/([dgimsuvy]*)$/);
    if (!m) continue;
    const r = classify(m[1], m[2]);
    console.log(`${r.verdict.toUpperCase().padEnd(13)} ${r.ms.toFixed(1).padStart(9)} ms  /${m[1].slice(0, 62)}/`);
  }
} else if (args.length) {
  console.log(JSON.stringify(classify(args[0], args[1] ?? ''), null, 2));
}
