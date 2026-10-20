/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The ILB-Corpus-Truth SDK probe: which import specifiers count as a package.
 */
import { describe, expect, it } from 'vitest';
import {
  fileHasSdk,
  packageRoot,
  specifiersIn,
} from '../suites/ilb-corpus-truth/sdk-map.ts';

describe('packageRoot', () => {
  it('rejects relative and absolute paths', () => {
    for (const specifier of ['.', '..', './db', '../db/pool', '/abs/x']) {
      expect(packageRoot(specifier), specifier).toBeNull();
    }
  });

  it('reads scoped, bare and dotted package roots', () => {
    expect(packageRoot('@prisma/client/runtime')).toBe('@prisma/client');
    expect(packageRoot('pg/lib/client')).toBe('pg');
    expect(packageRoot('.prisma/client')).toBe('.prisma');
  });
});

describe('fileHasSdk', () => {
  it('counts Prisma’s generated client as Prisma', () => {
    // @found ILB-Corpus-Truth off-SDK regression, 2026-10-19
    // nestjs-jwts/src/prisma/prisma.service.ts — `class PrismaService extends
    // PrismaClient` imported from '.prisma/client' was scored off-SDK.
    const source = "import { PrismaClient } from '.prisma/client';";
    expect(fileHasSdk(specifiersIn(source), 'prisma-security')).toBe(true);
  });
});
