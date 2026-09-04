/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Codecov's denominator is the code that ships.
 *
 * The published number answers "is the code you install tested", so it covers
 * `packages/` and nothing else. Internal tooling — scripts, benchmarks, the
 * docs site — is held to a correctness signal (scripts/__tests__ alone is 125
 * files and 2,505 tests) rather than to a percentage.
 *
 * Two ways that claim can rot, and both are pinned here:
 *
 *   the boundary moves   — someone uploads apps/ or scripts/ coverage and the
 *                          consumer-facing number silently starts averaging in
 *                          code no consumer receives
 *   a package goes dark  — a new plugin lands with no component, so it is
 *                          absent from the report rather than at 0%, and
 *                          absent reads as fine
 *
 * The second is not hypothetical. Eleven plugins had no component at all and
 * carried 38 rules between them; node-security wrote its lcov to a path the
 * uploader never read and sat at a fossilised 99.80% for months. Both looked
 * healthy from the outside.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(__dirname, '../..');

type CodecovConfig = {
  ignore?: string[];
  component_management?: {
    individual_components?: { component_id: string; paths?: string[] }[];
  };
};

const config = parse(
  readFileSync(join(ROOT, 'codecov.yml'), 'utf-8'),
) as CodecovConfig;

/** Packages that actually publish — `private: true` never reaches a consumer. */
function publishedPackages(): string[] {
  return readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => {
      const pkg = join(ROOT, 'packages', e.name, 'package.json');
      if (!existsSync(pkg)) return false;
      const json = JSON.parse(readFileSync(pkg, 'utf-8')) as {
        private?: boolean;
      };
      return json.private !== true;
    })
    .map((e) => e.name)
    .sort();
}

describe('codecov measures what ships', () => {
  it('every non-package tree is explicitly ignored', () => {
    const ignored = config.ignore ?? [];
    for (const tree of ['apps', 'scripts', 'benchmarks', 'tools']) {
      expect(
        ignored,
        `${tree}/ is not in codecov.yml \`ignore\`. It is internal tooling and ` +
          'must not enter the consumer-facing number — and being merely ' +
          'un-uploaded is not the same as being excluded on purpose.',
      ).toContain(`${tree}/**`);
    }
  });

  it('every PUBLISHED package has a component', () => {
    const components = (
      config.component_management?.individual_components ?? []
    ).map((c) => c.component_id);

    expect(
      components.length,
      'no components are defined, so this test would pass vacuously',
    ).toBeGreaterThan(20);

    const missing = publishedPackages().filter((p) => !components.includes(p));
    expect(
      missing,
      `Published package(s) with no Codecov component: ${missing.join(', ')}. ` +
        'A package with no component is ABSENT from the report rather than at ' +
        '0%, and absent reads as fine — that is how eleven plugins went ' +
        'unmeasured. Add a component, or mark the package private if it does ' +
        'not ship.',
    ).toEqual([]);
  });
});
