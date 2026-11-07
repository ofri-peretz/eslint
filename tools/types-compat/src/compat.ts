/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every plugin is still a typescript-eslint plugin.
 *
 * Devkit publishes its own vendored copy of the AST and rule types
 * (scripts/vendor-estree-types.ts) instead of importing
 * `@typescript-eslint/utils`. That only works while the copy stays compatible
 * where consumers meet it: a plugin placed in a typescript-eslint config. This
 * file assigns every plugin to the real upstream `TSESLint.FlatConfig.Plugin`;
 * the whole-graph typecheck (`npm run typecheck`) fails on the first one a
 * typescript-eslint config could not accept. It is never built or published.
 *
 * Not ESLint's own `ESLint.Plugin`: upstream typescript-eslint's
 * `FlatConfig.Plugin` is not assignable to it either, so that mismatch
 * predates and is independent of the vendored types.
 *
 * docs/intents/2026-11-03-our-code-owns-the-tree (phase 1.3)
 */

import type { TSESLint } from '@typescript-eslint/utils';
import { plugin as p0 } from '../../../packages/eslint-plugin-anthropic-security/src/index';
import { plugin as p1 } from '../../../packages/eslint-plugin-browser-security/src/index';
import { plugin as p2 } from '../../../packages/eslint-plugin-cli-floor/src/index';
import { plugin as p3 } from '../../../packages/eslint-plugin-conventions/src/index';
import { plugin as p4 } from '../../../packages/eslint-plugin-drizzle-security/src/index';
import { plugin as p5 } from '../../../packages/eslint-plugin-express-security/src/index';
import { plugin as p6 } from '../../../packages/eslint-plugin-gemini-security/src/index';
import { plugin as p7 } from '../../../packages/eslint-plugin-import-next/src/index';
import { plugin as p8 } from '../../../packages/eslint-plugin-jwt-security/src/index';
import { plugin as p9 } from '../../../packages/eslint-plugin-knex-security/src/index';
import { plugin as p10 } from '../../../packages/eslint-plugin-lambda-security/src/index';
import { plugin as p11 } from '../../../packages/eslint-plugin-maintainability/src/index';
import { plugin as p12 } from '../../../packages/eslint-plugin-mcp-sdk-security/src/index';
import { plugin as p13 } from '../../../packages/eslint-plugin-modernization/src/index';
import { plugin as p14 } from '../../../packages/eslint-plugin-modularity/src/index';
import { plugin as p15 } from '../../../packages/eslint-plugin-mongodb-security/src/index';
import { plugin as p16 } from '../../../packages/eslint-plugin-mysql-security/src/index';
import { plugin as p17 } from '../../../packages/eslint-plugin-nestjs-security/src/index';
import { plugin as p18 } from '../../../packages/eslint-plugin-node-security/src/index';
import { plugin as p19 } from '../../../packages/eslint-plugin-openai-security/src/index';
import { plugin as p20 } from '../../../packages/eslint-plugin-operability/src/index';
import { plugin as p21 } from '../../../packages/eslint-plugin-postgresql-security/src/index';
import { plugin as p22 } from '../../../packages/eslint-plugin-prisma-security/src/index';
import { plugin as p23 } from '../../../packages/eslint-plugin-react-a11y/src/index';
import { plugin as p24 } from '../../../packages/eslint-plugin-react-features/src/index';
import { plugin as p25 } from '../../../packages/eslint-plugin-reliability/src/index';
import { plugin as p26 } from '../../../packages/eslint-plugin-secure-coding/src/index';
import { plugin as p27 } from '../../../packages/eslint-plugin-sequelize-security/src/index';
import { plugin as p28 } from '../../../packages/eslint-plugin-sqlite-security/src/index';
import { plugin as p29 } from '../../../packages/eslint-plugin-supabase-security/src/index';
import { plugin as p30 } from '../../../packages/eslint-plugin-typeorm-security/src/index';
import { plugin as p31 } from '../../../packages/eslint-plugin-vercel-ai-security/src/index';

export const plugins: TSESLint.FlatConfig.Plugin[] = [
  p0,
  p1,
  p2,
  p3,
  p4,
  p5,
  p6,
  p7,
  p8,
  p9,
  p10,
  p11,
  p12,
  p13,
  p14,
  p15,
  p16,
  p17,
  p18,
  p19,
  p20,
  p21,
  p22,
  p23,
  p24,
  p25,
  p26,
  p27,
  p28,
  p29,
  p30,
  p31,
];
