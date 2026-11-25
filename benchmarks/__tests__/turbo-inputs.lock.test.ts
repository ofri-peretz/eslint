/**
 * The benchmarks `test` task must re-run when a plugin's tests change.
 *
 * Several locks in this folder read files outside `benchmarks/`: the
 * sealed-vs-open lock regenerates `RULE_CASES.json` from every
 * `packages/*\/src` test, and the real-source lock walks `packages/*\/src/rules`.
 * Turbo only re-runs a task when one of its declared inputs changes, so with
 * inputs limited to this folder the task cache-hit on #1712, which added two FN
 * cases with no `@found` tag. Every gate was green and main was red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TURBO = path.join(HERE, '..', 'turbo.json');

function stripJsonc(raw: string): string {
  return raw.replace(/^\s*\/\/.*$/gm, '');
}

describe('benchmarks turbo inputs', () => {
  const config = JSON.parse(stripJsonc(fs.readFileSync(TURBO, 'utf8'))) as {
    tasks: { test: { inputs: string[] } };
  };
  const inputs = config.tasks.test.inputs;

  it.each([
    '$TURBO_ROOT$/packages/*/src/**',
    '$TURBO_ROOT$/scripts/rule-case-ledger.ts',
    '$TURBO_ROOT$/eslint.real-source.config.mjs',
  ])('re-runs when %s changes', (input) => {
    expect(inputs).toContain(input);
  });
});
