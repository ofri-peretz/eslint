/**
 * The one rule for `meta.interop.runtimes`, shared by the codemod that writes
 * it, the lock that holds every rule to it, and docs/oxlint-runtimes.md.
 *
 *   - type-aware (`.agent/type-awareness-scan.tsv` status ≠ unaware)
 *     → ['eslint']: oxlint has no parser services (intent decision 4);
 *   - every case of the rule's own suite passed on oxlint's RuleTester
 *     (`.agent/oxlint-runtime-survey.json`) → ['eslint', 'oxlint'];
 *   - otherwise → ['eslint'], with the evidence as the reason.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface SurveyEntry {
  cases: number;
  failed: number;
  examples: string[];
}

export interface Evidence {
  survey: { oxlint: string; rules: Record<string, SurveyEntry> };
  typeAware: Map<string, string>; // "<short>/<rule>" → TSV evidence
}

export function loadEvidence(root: string): Evidence {
  const survey = JSON.parse(
    fs.readFileSync(
      path.join(root, '.agent/oxlint-runtime-survey.json'),
      'utf8',
    ),
  ) as Evidence['survey'];
  const typeAware = new Map<string, string>();
  for (const line of fs
    .readFileSync(path.join(root, '.agent/type-awareness-scan.tsv'), 'utf8')
    .split('\n')
    .slice(1)) {
    const [plugin, rule, status, evidence = ''] = line.split('\t');
    if (plugin && rule && status && status.trim() !== 'unaware') {
      typeAware.set(`${plugin}/${rule}`, evidence.trim());
    }
  }
  return { survey, typeAware };
}

export type Runtimes = readonly ['eslint'] | readonly ['eslint', 'oxlint'];

/** `key` is `eslint-plugin-<short>/<rule>`. */
export function runtimesFor(
  evidence: Evidence,
  key: string,
): { runtimes: Runtimes; reason: string } {
  const [pkg, rule] = key.split('/');
  const short = pkg.replace(/^eslint-plugin-/, '');
  const aware = evidence.typeAware.get(`${short}/${rule}`);
  if (aware !== undefined) {
    return {
      runtimes: ['eslint'],
      reason: `Type-aware: reads TypeScript parser services, which oxlint does not provide${aware ? ` (${aware.replace(/\s+/g, ' ').replace(/,$/, '')})` : ''}.`,
    };
  }
  const s = evidence.survey.rules[key];
  if (!s || s.cases === 0) {
    return {
      runtimes: ['eslint'],
      reason: 'No RuleTester cases to measure it on oxlint with.',
    };
  }
  if (s.failed > 0) {
    return {
      runtimes: ['eslint'],
      reason: `${s.failed} of ${s.cases} of its test cases fail on oxlint, e.g. ${(s.examples[0] ?? '').replace(/\s+/g, ' ').trim()}`,
    };
  }
  return {
    runtimes: ['eslint', 'oxlint'],
    reason: `All ${s.cases} test cases pass on oxlint.`,
  };
}

/** Every `eslint-plugin-<short>/<rule>` exported by a plugin's `rules` map, read statically. */
export async function allRuleKeys(root: string): Promise<string[]> {
  const { default: ts } = await import('typescript');
  const keys: string[] = [];
  for (const dir of fs
    .readdirSync(path.join(root, 'packages'))
    .filter((d) => d.startsWith('eslint-plugin-'))) {
    const file = path.join(root, 'packages', dir, 'src/index.ts');
    const sf = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    sf.forEachChild((statement) => {
      if (!ts.isVariableStatement(statement)) return;
      for (const d of statement.declarationList.declarations) {
        let init = d.initializer;
        while (
          init &&
          (ts.isSatisfiesExpression(init) || ts.isAsExpression(init))
        )
          init = init.expression;
        if (
          !ts.isIdentifier(d.name) ||
          d.name.text !== 'rules' ||
          !init ||
          !ts.isObjectLiteralExpression(init)
        )
          continue;
        for (const p of init.properties) {
          if (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))
            keys.push(`${dir}/${p.name.text}`);
        }
      }
    });
  }
  return keys.sort();
}

/** `<short>/<rule>` → oxlint built-in ID, for overlaps triaged `equivalent`. */
export function nativeEquivalents(root: string): Map<string, string> {
  const overlap = JSON.parse(
    fs.readFileSync(
      path.join(root, 'docs/oxlint-builtin-overlap.json'),
      'utf8',
    ),
  ) as { overlap: { id: string; builtin: string; verdict: string }[] };
  return new Map(
    overlap.overlap
      .filter((o) => o.verdict === 'equivalent')
      .map((o) => [o.id, o.builtin]),
  );
}
