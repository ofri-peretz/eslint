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

const RULES_DIR = path.resolve(__dirname, 'rules');
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
        return Boolean(docs?.cwe ?? docs?.cvss ?? docs?.owasp);
      })
      .map(([name]) => name);
    expect(claiming).toEqual([]);
  });

  it('no rule SOURCE mentions CWE-252', () => {
    // meta is one route; a message option is another, and it is the one that
    // reached users through the CWE enrichment.
    const offenders = fs
      .readdirSync(RULES_DIR)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .filter((f) => fs.readFileSync(path.join(RULES_DIR, f), 'utf8').includes('CWE-252'));
    expect(offenders).toEqual([]);
  });

  it('every WCAG criterion a rule declares also appears in that rule doc', () => {
    // The criterion has to come from somewhere checkable. The docs stated it
    // first; this keeps the two from drifting apart again in either direction.
    const mismatched: string[] = [];
    for (const [name, rule] of rules) {
      const wcag = (rule.meta?.docs as { wcag?: string } | undefined)?.wcag;
      if (!wcag) continue;
      const doc = path.join(DOCS_DIR, `${name}.md`);
      if (!fs.existsSync(doc)) {
        mismatched.push(`${name} (no doc)`);
        continue;
      }
      if (!fs.readFileSync(doc, 'utf8').includes(wcag)) {
        mismatched.push(`${name} (doc does not mention ${wcag})`);
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
