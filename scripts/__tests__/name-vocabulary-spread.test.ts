/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `check:name-vocabulary` has to see options a rule gets from a SHARED schema
 * fragment.
 *
 * The gate reads the `properties` object of a rule's schema and collected only
 * `PropertyAssignment` names. A rule that writes `...HANDLER_PARAM_SCHEMA`
 * contributes every option that object holds through a `SpreadAssignment`, and
 * those were invisible.
 *
 * That inverted the gate's own advice. Pulling a guessed vocabulary into one
 * shared, replaceable option is the fix it exists to encourage, and doing it
 * made a rule look WORSE: `lambda-security/no-unbounded-batch-processing` had
 * been given a replaceable `eventParamNames` and was still counted as having
 * no way to replace anything. Three rules were listed as offenders on the
 * strength of a syntax the reader could not have guessed mattered.
 *
 * Run as a subprocess rather than imported: the gate is top-level code that
 * calls `process.exit`, which would take the test runner with it.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

/** The rules the gate currently reports as having no replaceable vocabulary. */
function offenders(): string[] {
  const result = spawnSync(
    'tsx',
    [join(ROOT, 'scripts', 'check-name-vocabulary.ts'), '--list'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`,
      },
    },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return [...output.matchAll(/^ {4}([a-z0-9-]+\/[a-z0-9-]+)$/gm)].map(
    (match) => match[1],
  );
}

describe('the gate sees options contributed by a shared schema fragment', () => {
  it('finds offenders at all', () => {
    // A gate that stopped listing anything would make the assertion below
    // pass against an empty list, which is the failure this file is about.
    const listed = offenders();
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.length).toBeLessThan(20);
  });

  it('a rule whose only replaceable option comes from a spread is compliant', () => {
    // This rule's schema has no vocabulary option written out in its own
    // `properties` — `eventParamNames` reaches it only through
    // `...HANDLER_PARAM_SCHEMA`.
    const rule = 'lambda-security/no-unbounded-batch-processing';
    const source = readFileSync(
      join(
        ROOT,
        'packages',
        'eslint-plugin-lambda-security',
        'src',
        'rules',
        'no-unbounded-batch-processing',
        'index.ts',
      ),
      'utf8',
    );

    // The premise: the option really is only reachable through the spread.
    expect(source).toContain('...HANDLER_PARAM_SCHEMA');
    expect(source).not.toMatch(/^\s+eventParamNames: \{/m);

    expect(offenders()).not.toContain(rule);
  });
});
