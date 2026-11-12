/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The peer range must admit the NestJS this repo itself tests against.
 *
 * `@nestjs/common` is an optional peer, but npm still enforces the range when
 * the package is installed — which, in a NestJS project, it always is. With the
 * range stopping at `^11.0.0`, `npm install eslint-plugin-nestjs-security` in a
 * NestJS 12 project failed with ERESOLVE for two months after 12.0.0 shipped,
 * while this repo's own fixtures were already running on 12. Nothing compared
 * the two. This does: bump the root devDependency to a new major and this goes
 * red until the published range follows.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

const require = createRequire(import.meta.url);

/** Majors a `^9.0.0 || ^10.0.0` style range admits. */
function admittedMajors(range: string): number[] {
  return [...range.matchAll(/\^(\d+)\./g)].map((m) => Number(m[1]));
}

describe('peer range', () => {
  it.each(['@nestjs/common', '@nestjs/throttler'] as const)(
    'admits the installed %s major',
    (name) => {
      const installed = (require(`${name}/package.json`) as { version: string })
        .version;
      const major = Number(installed.split('.')[0]);
      expect(admittedMajors(pkg.peerDependencies[name])).toContain(major);
    },
  );

  it('reads a caret range as its major', () => {
    expect(admittedMajors('^9.0.0 || ^10.0.0')).toEqual([9, 10]);
  });
});
