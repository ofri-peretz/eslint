/**
 * @provenBy {"file":"packages/eslint-plugin-node-security/docs/rules/lock-file.md","find":"`npm`, `yarn`, or `pnpm`","replace":"`npm`, `yarn`, or `npm`"}
 */

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A rule's docs say what the rule's own `meta` says.
 *
 * The docs are rendered to Codacy users from the release tag
 * (codacy/codacy-eslint#5025), so a doc that contradicts its rule ships the
 * contradiction to a second audience. Codacy's reviewer found these on
 * eslint-plugin-node-security:
 *
 *   - `detect-child-process`, `detect-non-literal-fs-filename`,
 *     `no-buffer-overread` and `no-zip-slip` opened with a
 *     `**CWE:** [CWE-693]` line copied from a template — the rules are CWE-78,
 *     CWE-22, CWE-126 and CWE-22;
 *   - `no-zip-slip` said `severity: medium` in its front matter and "High" in
 *     its body;
 *   - `lock-file` listed "npm, yarn, or npm" where its schema enum is
 *     npm / yarn / pnpm.
 *
 * Four checks, each derived from the rule rather than from a list kept here:
 *
 *   1. node-security: front-matter `cwe` and the `**CWE:**` header name
 *      `meta.docs.cwe`;
 *   2. every security plugin: no doc claims CWE-693 for a rule whose meta
 *      CWE is something else (the template boilerplate);
 *   3. node-security: front-matter `severity` is the CVSS band of the rule's
 *      CVSS (`meta.docs.cvss`, else the CVSS its message renders);
 *   4. `lock-file`: every package manager the doc names is in the
 *      `packageManager` schema enum, and every enum value is named;
 *   5. node-security: every "✅ Correct" code block lints clean under the
 *      rule it documents.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import nodeSecurity from 'eslint-plugin-node-security';

type RuleModule = {
  meta?: {
    docs?: { cwe?: string; cvss?: number };
    messages?: Record<string, string>;
    schema?: unknown;
  };
};
type Plugin = { rules: Record<string, RuleModule> };

const PACKAGES = path.resolve(__dirname, '../../packages');
const NODE_SECURITY = 'eslint-plugin-node-security';

function docPath(pkg: string, rule: string): string {
  return path.join(PACKAGES, pkg, 'docs/rules', `${rule}.md`);
}

function readDoc(pkg: string, rule: string): string | null {
  const file = docPath(pkg, rule);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function frontMatter(md: string, key: string): string | null {
  const block = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? '';
  const value = new RegExp(`^${key}:\\s*['"]?([^'"\\n]+)`, 'm').exec(block);
  return value ? (value[1] as string).trim() : null;
}

/** The CWE a `**CWE:** [CWE-n](…)` header line names, if the doc has one. */
function headerCwe(md: string): string | null {
  return /^\*\*CWE:\*\*\s*\[(CWE-\d+)\]/m.exec(md)?.[1] ?? null;
}

/** CVSS v3 qualitative bands. */
function band(cvss: number): string {
  if (cvss >= 9) return 'critical';
  if (cvss >= 7) return 'high';
  if (cvss >= 4) return 'medium';
  return 'low';
}

/** `meta.docs.cvss`, else the first `CVSS:n` the rule's messages render. */
function ruleCvss(rule: RuleModule): number | null {
  if (typeof rule.meta?.docs?.cvss === 'number') return rule.meta.docs.cvss;
  const text = Object.values(rule.meta?.messages ?? {}).join('\n');
  const rendered = /CVSS:(\d+(?:\.\d+)?)/.exec(text);
  return rendered ? Number(rendered[1]) : null;
}

const nodeRules = (nodeSecurity as unknown as Plugin).rules;

/** Problems in node-security docs, as `rule: problem` lines. */
export function nodeSecurityMetaDrift(
  rules: Record<string, RuleModule>,
  read: (rule: string) => string | null,
): string[] {
  const problems: string[] = [];
  for (const [name, rule] of Object.entries(rules)) {
    const md = read(name);
    const cwe = rule.meta?.docs?.cwe;
    if (md === null || cwe === undefined) continue;
    const fmCwe = frontMatter(md, 'cwe');
    if (fmCwe !== cwe)
      problems.push(`${name}: front matter cwe ${fmCwe} ≠ meta ${cwe}`);
    const header = headerCwe(md);
    if (header !== null && header !== cwe)
      problems.push(`${name}: **CWE:** header ${header} ≠ meta ${cwe}`);
    const cvss = ruleCvss(rule);
    const severity = frontMatter(md, 'severity');
    if (cvss !== null && severity !== band(cvss))
      problems.push(
        `${name}: severity ${severity} ≠ CVSS ${cvss} (${band(cvss)})`,
      );
  }
  return problems;
}

describe('rule docs agree with rule meta', () => {
  it('node-security: front-matter cwe, the CWE header and severity match meta', () => {
    expect(
      nodeSecurityMetaDrift(nodeRules, (rule) => readDoc(NODE_SECURITY, rule)),
    ).toEqual([]);
  });

  it('no security plugin doc claims CWE-693 for a rule that is not CWE-693', async () => {
    const plugins = fs
      .readdirSync(PACKAGES)
      .filter(
        (dir) =>
          dir === 'eslint-plugin-secure-coding' ||
          (dir.startsWith('eslint-plugin-') && dir.endsWith('-security')),
      );
    const problems: string[] = [];
    for (const pkg of plugins) {
      const mod = (await import(pkg)) as { default?: Plugin } & Plugin;
      const rules = (mod.default ?? mod).rules;
      for (const [name, rule] of Object.entries(rules)) {
        const cwe = rule.meta?.docs?.cwe;
        const md = readDoc(pkg, name);
        if (md === null || cwe === undefined || cwe === 'CWE-693') continue;
        const claims = [frontMatter(md, 'cwe'), headerCwe(md)];
        if (claims.includes('CWE-693'))
          problems.push(`${pkg}/${name}: claims CWE-693, meta is ${cwe}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('lock-file: the managers the doc names are exactly the schema enum', () => {
    const schema = nodeRules['lock-file']?.meta?.schema as
      { properties?: { packageManager?: { enum?: string[] } } }[] | undefined;
    const managers = (
      schema?.[0]?.properties?.packageManager?.enum ?? []
    ).filter((value) => value !== 'any');
    expect(managers.length).toBeGreaterThan(0);
    const md = readDoc(NODE_SECURITY, 'lock-file') ?? '';
    // Every "a, b, or c" list of managers in the prose.
    // Quoted, backticked or bare: `"npm", "yarn", or "pnpm"`, `` `npm`, `yarn`, or `pnpm` ``.
    const name = '[`"\']?(npm|yarn|pnpm|bun)[`"\']?';
    const lists = [
      ...md.matchAll(new RegExp(`${name}, ${name},? or ${name}`, 'g')),
    ];
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      expect(list.slice(1).sort()).toEqual([...managers].sort());
    }
  });

  it('node-security: every "✅ Correct" code block lints clean under its own rule', () => {
    const linter = new Linter({ configType: 'flat' });
    const problems: string[] = [];
    let blocks = 0;
    for (const name of Object.keys(nodeRules)) {
      const md = readDoc(NODE_SECURITY, name);
      if (md === null) continue;
      for (const section of md.matchAll(
        /^#{2,4}[^\n]*✅[^\n]*\n([\s\S]*?)(?=^#{2,4} |$(?![\s\S]))/gm,
      )) {
        for (const block of (section[1] as string).matchAll(
          /```(?:js|javascript|ts|typescript)\n([\s\S]*?)```/g,
        )) {
          blocks += 1;
          const messages = linter.verify(
            block[1] as string,
            [
              {
                files: ['**/*.ts'],
                plugins: { ns: nodeSecurity as never },
                languageOptions: {
                  parser: tsParser,
                  ecmaVersion: 'latest',
                  sourceType: 'module',
                },
                rules: { [`ns/${name}`]: 'error' },
              },
            ],
            { filename: 'src/example.ts' },
          );
          for (const message of messages)
            problems.push(
              `${name}:${message.line} ${message.ruleId ?? 'parse'} ${message.message.slice(0, 80)}`,
            );
        }
      }
    }
    expect(blocks).toBeGreaterThan(30);
    expect(problems).toEqual([]);
  });
});
