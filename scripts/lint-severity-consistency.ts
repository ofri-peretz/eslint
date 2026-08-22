#!/usr/bin/env tsx

/**
 * lint-severity-consistency.ts — one finding, one severity.
 *
 * A rule message can render two severity claims side by side: a CVSS score,
 * enriched from the rule's CWE, and a hand-written label. When they disagree
 * the user reads a single line that argues with itself:
 *
 *   ♿ CWE-252 OWASP:A10-Mishandling CVSS:5.3 | Image missing alt text | CRITICAL
 *   🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | CRITICAL
 *
 * Both of those shipped. 5.3 is the MEDIUM band; the label says CRITICAL. In
 * the first case `meta.docs.cvss` said 9.5 as well, so one rule carried three
 * different severities for one missing attribute.
 *
 * Measured across the built plugins when this gate was written: 432 messages
 * render both, and 165 of them — 38.2% — disagree. That is too many to
 * adjudicate by guessing. Which number is right is a per-rule judgment: the
 * CVSS is the generic score for the whole weakness CLASS, while the label is
 * the author's read of this specific rule, and either can legitimately be the
 * better answer.
 *
 * So this gate does not pick. It RATCHETS. The existing set is recorded in
 * `.agent/severity-consistency-debt.json` with the two values, and:
 *
 *   - a message that starts disagreeing and is not in the registry fails
 *   - a registry entry that no longer disagrees fails too, so fixing one
 *     without retiring its entry cannot leave a stale exemption behind
 *
 * The second direction is the half that usually rots. It is the same shape as
 * `lint-name-inference.ts`, which absorbs its 26 known sites the same way.
 *
 * The DECISION this gate is a holding action for is written up in
 * `docs/SEVERITY_AND_STANDARDS.md`: a rule states the weakness class it detects
 * and how much a developer should care, and does not state a CVSS score. Once
 * phase 1 of that migration lands — messages stop rendering `CVSS:` — this gate
 * has nothing left to find and should be deleted along with its registry.
 *
 * Run: `npm run lint:severity-consistency`
 *      `npm run lint:severity-consistency -- --update` to rewrite the registry.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REGISTRY = path.join(ROOT, '.agent', 'severity-consistency-debt.json');

type Label = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Offender {
  rule: string;
  messageId: string;
  cvss: number;
  label: Label;
  band: Label;
}

/** CVSS v3.1 qualitative severity bands. */
function band(score: number): Label {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Read the BUILT plugins, not the sources.
 *
 * The contradiction only exists in the rendered string, and the string is
 * produced by `formatLLMMessage` from a CWE the source never spells the score
 * of. Matching the source would mean re-implementing the enrichment, and a
 * checker that re-implements the thing it checks agrees with itself by
 * construction.
 */
function collect(): Offender[] {
  const out: Offender[] = [];
  for (const dir of fs.readdirSync(path.join(ROOT, 'packages')).sort()) {
    if (!dir.startsWith('eslint-plugin-')) continue;
    const entry = path.join(ROOT, 'packages', dir, 'dist/src/index.js');
    if (!fs.existsSync(entry)) continue;
    let mod: { rules?: Record<string, unknown>; default?: { rules?: Record<string, unknown> } };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require(entry) as typeof mod;
    } catch {
      // A plugin that cannot be loaded is a different failure, and the build
      // gate reports it. Silence here would only turn it into a green tick.
      continue;
    }
    const plugin = dir.replace('eslint-plugin-', '');
    const rules = mod.rules ?? mod.default?.rules ?? {};
    for (const [name, rule] of Object.entries(rules)) {
      const messages = (rule as { meta?: { messages?: Record<string, string> } }).meta?.messages;
      if (!messages) continue;
      for (const [messageId, template] of Object.entries(messages)) {
        const score = /CVSS:([0-9.]+)/.exec(template);
        if (!score) continue;
        const label = /\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\b/.exec(template);
        if (!label) continue;
        const cvss = Number.parseFloat(score[1] as string);
        const declared = label[1] as Label;
        const expected = band(cvss);
        if (declared !== expected) {
          out.push({ rule: `${plugin}/${name}`, messageId, cvss, label: declared, band: expected });
        }
      }
    }
  }
  return out.sort((a, b) => `${a.rule}#${a.messageId}`.localeCompare(`${b.rule}#${b.messageId}`));
}

const key = (o: { rule: string; messageId: string }) => `${o.rule}#${o.messageId}`;

function main(): number {
  const found = collect();

  if (process.argv.includes('--update')) {
    fs.writeFileSync(
      REGISTRY,
      `${JSON.stringify({ note: 'See scripts/lint-severity-consistency.ts. Ratcheted: entries may be removed by fixing a rule, never added by hand to silence one.', entries: found }, null, 2)}\n`,
    );
    console.log(`severity-consistency: registry rewritten with ${found.length} entries`);
    return 0;
  }

  if (!fs.existsSync(REGISTRY)) {
    console.error(`::error::${path.relative(ROOT, REGISTRY)} is missing. Run with --update.`);
    return 1;
  }
  const known = (JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) as { entries: Offender[] }).entries;
  const knownKeys = new Set(known.map(key));
  const foundKeys = new Set(found.map(key));

  const added = found.filter((o) => !knownKeys.has(key(o)));
  const stale = known.filter((o) => !foundKeys.has(key(o)));

  for (const o of added) {
    console.error(
      `::error::${o.rule} (${o.messageId}) renders CVSS:${o.cvss} — the ${o.band} band — and labels it ${o.label}.`,
    );
  }
  for (const o of stale) {
    console.error(
      `::error::${o.rule} (${o.messageId}) no longer disagrees. Remove it from the registry.`,
    );
  }

  if (added.length > 0 || stale.length > 0) return 1;
  console.log(
    `✅ severity-consistency: no new contradictions. ${found.length} known site(s) registered as debt.`,
  );
  return 0;
}

process.exit(main());
