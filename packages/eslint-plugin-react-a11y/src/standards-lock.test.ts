/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An accessibility rule cites WCAG. It does not cite CWE, OWASP or CVSS.
 *
 * Every rule in this plugin used to declare `cwe: 'CWE-252'`. CWE-252 is
 * "Unchecked Return Value" — a security weakness about ignoring what a function
 * returns. It has nothing to do with a missing `alt` attribute, and CWE has no
 * accessibility entries at all, because it is a taxonomy of security weaknesses.
 *
 * The claim was not cosmetic. `formatLLMMessage` enriches from the CWE, so a
 * user with an image missing alt text was shown:
 *
 *   ♿ CWE-252 OWASP:A10-Mishandling CVSS:5.3 | Image missing alt text | CRITICAL
 *
 * Four assertions, all false, and two of them contradicting each other in the
 * same line — CVSS 5.3 is the MEDIUM band while the label says CRITICAL. A
 * third disagreed with `meta.docs.cvss`, which said 9.5. That string reaches
 * the docs site, SARIF output and any consumer's security dashboard.
 *
 * The plugin's own rule documentation had the right answer the whole time:
 * every `docs/rules/*.md` already names a WCAG success criterion. The
 * machine-readable metadata simply disagreed with the prose beside it.
 *
 * Now:
 *
 *   ♿ WCAG 1.1.1 | Image missing alt text | HIGH
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import plugin from './index';

const DOCS_DIR = path.resolve(__dirname, '..', 'docs', 'rules');

const rules = Object.entries(plugin.rules ?? {});

describe('react-a11y standards metadata', () => {
  it('has rules to check (sanity floor)', () => {
    expect(rules.length).toBeGreaterThanOrEqual(30);
  });

  it('no rule claims a CWE, a CVSS score or an OWASP category', () => {
    const claiming = rules
      .filter(([, rule]) => {
        const docs = rule.meta?.docs as
          | { cwe?: string; cvss?: number; owasp?: string }
          | undefined;
        // Each field tested for presence, not truthiness. `cvss` is a number
        // and the schema allows 0, so `docs?.cwe ?? docs?.cvss` would read a
        // declared `cvss: 0` as absent and let it through.
        return (
          docs?.cwe !== undefined || docs?.cvss !== undefined || docs?.owasp !== undefined
        );
      })
      .map(([name]) => name);
    expect(claiming).toEqual([]);
  });

  it('no security standard reaches the RENDERED message', () => {
    // `meta.docs` is one route. The message options are another, and they are
    // the one that reached users: `formatLLMMessage` enriches OWASP and CVSS
    // from whatever `cwe` it is handed, and the result is baked into the
    // message string at module load.
    //
    // Asserting on the rendered string rather than on the source covers every
    // way a claim can arrive — any CWE and not just 252, a hand-set `cvss`, an
    // explicit `owasp` — and it is the exact text a user sees.
    const offenders: string[] = [];
    for (const [name, rule] of rules) {
      for (const [messageId, template] of Object.entries(rule.meta?.messages ?? {})) {
        const found = [/CWE-\d+/, /CVSS:/, /OWASP:/].filter((re) => re.test(String(template)));
        if (found.length > 0) offenders.push(`${name}#${messageId}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('meta and docs agree on the WCAG criterion, in BOTH directions', () => {
    // The criterion has to come from somewhere checkable, and the docs stated
    // it first. One direction alone is not a lock: checking only that
    // `meta.wcag` appears in the doc lets a doc-only edit pass while the
    // metadata goes stale or missing, which is the drift this exists to stop.
    const mismatched: string[] = [];
    for (const [name, rule] of rules) {
      const wcag = (rule.meta?.docs as { wcag?: string } | undefined)?.wcag;
      const doc = path.join(DOCS_DIR, `${name}.md`);
      const text = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : null;
      const inDoc = new Set(
        (text?.match(/WCAG \d+\.\d+\.\d+/g) ?? []).map((m) => m.trim()),
      );

      // meta -> docs
      if (wcag !== undefined) {
        if (text === null) {
          mismatched.push(`${name}: declares ${wcag} and has no doc`);
        } else if (!inDoc.has(wcag)) {
          mismatched.push(
            `${name}: declares ${wcag}, doc names ${[...inDoc].join(', ') || 'none'}`,
          );
        }
      }

      // docs -> meta. A doc naming a criterion while the rule declares none is
      // the stale-metadata case, and it is how all 21 rules got here.
      if (wcag === undefined && inDoc.size > 0) {
        mismatched.push(`${name}: doc names ${[...inDoc].join(', ')}, meta declares none`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('no rule is labelled CRITICAL', () => {
    // CRITICAL belongs to the security severity vocabulary — the band that
    // means stop shipping. A WCAG Level A failure is serious and HIGH says so
    // without borrowing a word that means something else.
    const critical = rules
      .filter(([, rule]) =>
        Object.values(rule.meta?.messages ?? {}).some((m) => String(m).includes('CRITICAL')),
      )
      .map(([name]) => name);
    expect(critical).toEqual([]);
  });
});
