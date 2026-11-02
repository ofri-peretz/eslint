/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { createModuleEvidence } from '@interlace/eslint-devkit';

/**
 * Whether this file uses the SDK this plugin is about.
 *
 * Every rule in this plugin is gated on it. Measured over 107,382 files across 107 repositories, **22% of everything this
 * plugin reported (219 of 999 findings) was in a file importing no NestJS
 * package** — the rules key on decorator and method names that Angular, TypeORM
 * and plain TypeScript classes share.
 *
 * The probe itself lives in the devkit so the whole ecosystem shares one
 * implementation: package-root matching, rejection of relative specifiers,
 * TypeScript's `import =` form, Deno's `npm:` and `deno.land` specifiers,
 * dynamic `import()`, lexically-scoped `require` shadowing, and a per-`Program`
 * cache. Five plugins previously carried their own copy, so each
 * false-negative class had to be fixed five times.
 */
export const fileUsesNestjs: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({
    // Every NestJS file imports from the framework: the decorators that define
    // a controller, provider or module (`@Controller`, `@Injectable`, `@Module`)
    // are values imported from `@nestjs/common` or `@nestjs/core`. There is no
    // decorator-shaped convention that exists without the import, so unlike
    // Lambda and Express this gate needs no extra evidence arm.
    scopes: ['@nestjs'],
  });

/**
 * Whether this file defines a class NestJS serializes back to a client.
 *
 * An entity file is the place `no-exposed-private-fields` exists for, and it
 * usually imports only its ORM and `class-transformer` — never `@nestjs/*`.
 * Gating on `@nestjs` alone switched the rule off on exactly those files, its
 * own ❌ example among them. The serializer (`class-transformer`) and the
 * persistence layers whose classes are returned are evidence as direct as the
 * framework import.
 */
export const fileDefinesSerializedModel: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({
    scopes: ['@nestjs', '@mikro-orm', '@typegoose'],
    packages: [
      'class-transformer',
      'typeorm',
      'mongoose',
      'sequelize-typescript',
    ],
  });

/**
 * Whether this file uses NestJS or configures `multer` directly.
 *
 * Multer storage often lives in its own module that imports only `multer` —
 * the `diskStorage` in `no-unsafe-multer-filename`'s own ❌ example does. The
 * `multer` import is the evidence there that `diskStorage` is multer's.
 */
export const fileUsesNestjsOrMulter: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({ scopes: ['@nestjs'], packages: ['multer'] });
