/**
 * Regression lock: every rule with a Quint model agrees with that model.
 *
 * A model (`benchmarks/quint/models/<plugin>.<rule>.qnt`) enumerates the code
 * shapes a rule must judge as independent dimensions — where a value comes
 * from, how it is transformed, how it is bound, which sink receives it — and
 * computes `expected` from the rule's contract. `generate.mjs` samples it with
 * a fixed seed into `cases/<name>.json`; this test renders each case with the
 * matching renderer, lints it, and fails on any case where the rule and the
 * model disagree. A disagreement is a false positive (reported, model says
 * safe) or a false negative (silent, model says report).
 *
 * The point is combinations nobody writes by hand: a hand-written suite tests
 * `escapeLiteral(x)` and tests `let v = …`, rarely both together.
 *
 *   node benchmarks/quint/generate.mjs   # after editing a model
 *   npx vitest run --root benchmarks __tests__/quint-oracle.lock.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const QUINT = path.join(ROOT, 'benchmarks', 'quint');

interface CaseFile {
  dimensions: string[];
  cases: [string, boolean][];
}

const names = fs
  .readdirSync(path.join(QUINT, 'cases'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

describe('Quint oracle: rule verdicts match the model', () => {
  it('every model has generated cases and a renderer', () => {
    const models = fs
      .readdirSync(path.join(QUINT, 'models'))
      .filter((f) => f.endsWith('.qnt'))
      .map((f) => f.replace(/\.qnt$/, ''));
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(names, `${m} has no cases — run generate.mjs`).toContain(m);
      expect(
        fs.existsSync(path.join(QUINT, 'renderers', `${m}.mjs`)),
        `${m} has no renderer`,
      ).toBe(true);
    }
  });

  for (const name of names) {
    it(
      `${name}: no disagreement with the model`,
      { timeout: 120_000 },
      async () => {
        const file = JSON.parse(
          fs.readFileSync(path.join(QUINT, 'cases', `${name}.json`), 'utf8'),
        ) as CaseFile;
        const renderer = (await import(
          path.join(QUINT, 'renderers', `${name}.mjs`)
        )) as {
          plugin: string;
          rule: string;
          render: (c: Record<string, string>) => string;
        };
        const mod = await import(
          `${ROOT}/packages/eslint-plugin-${renderer.plugin}/src/index.ts`
        );
        const plugin = (mod.default ?? mod) as {
          rules: Record<string, unknown>;
        };
        const linter = new Linter({ configType: 'flat', cwd: '/' });
        const config = [
          {
            files: ['**/*.ts'],
            languageOptions: {
              parser,
              ecmaVersion: 'latest' as const,
              sourceType: 'module' as const,
            },
            plugins: { p: plugin as never },
            rules: { [`p/${renderer.rule}`]: 'error' as const },
          },
        ];
        // A non-empty set proves the renderer produced lintable code at all.
        expect(file.cases.length).toBeGreaterThan(0);
        const disagreements: string[] = [];
        for (const [key, expected] of file.cases) {
          const parts = key.split('/');
          const c = Object.fromEntries(
            file.dimensions.map((d, i) => [d, parts[i]!]),
          );
          const messages = linter.verify(
            renderer.render(c),
            config,
            '/virtual/case.ts',
          );
          const fatal = messages.find((m) => m.fatal);
          if (fatal) {
            disagreements.push(`PARSE ${key}: ${fatal.message}`);
            continue;
          }
          const reported = messages.some(
            (m) => m.ruleId === `p/${renderer.rule}`,
          );
          if (reported !== expected)
            disagreements.push(`${reported ? 'FP' : 'FN'} ${key}`);
        }
        expect(disagreements).toEqual([]);
      },
    );
  }
});
