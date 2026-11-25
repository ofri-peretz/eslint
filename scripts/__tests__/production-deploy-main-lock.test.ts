/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @provenBy {"file":".github/workflows/deploy-docs.yml","find":"git merge-base --is-ancestor HEAD FETCH_HEAD ||","replace":"true ||"}
 *
 * Only main reaches production. Both manual deploy workflows can be dispatched from any branch
 * (and deploy-docs.yml takes any `ref`), so each must refuse a production deploy of anything not
 * on main before it checks out or builds. This replaced the "Only main deploys" line in CLAUDE.md.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const WORKFLOWS = resolve(__dirname, '../../.github/workflows');
const read = (file: string): string =>
  readFileSync(join(WORKFLOWS, file), 'utf8');

describe('production deploys only what is on main', () => {
  it('deploy-docs.yml fails a production deploy of a commit that is not on main', () => {
    const text = read('deploy-docs.yml');
    expect(text).toContain('git merge-base --is-ancestor HEAD FETCH_HEAD ||');
    expect(text.indexOf('git merge-base --is-ancestor')).toBeLessThan(
      text.indexOf('./.github/actions/setup'),
    );
  });

  it('deploy.yml fails a production deploy dispatched from another branch, before checkout', () => {
    const text = read('deploy.yml');
    const guard = text.indexOf(
      "if: inputs.target == 'production' && github.ref != 'refs/heads/main'",
    );
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(text.indexOf('actions/checkout@'));
    expect(text.slice(guard, text.indexOf('actions/checkout@'))).toContain(
      'exit 1',
    );
  });
});
