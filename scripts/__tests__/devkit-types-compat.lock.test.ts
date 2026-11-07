/**
 * @provenBy {"file":"packages/eslint-devkit/src/types/estree/utils/ts-eslint/Config.d.ts","find":"        processors?: Partial<Record<string, Processor>> | undefined;","replace":"        processors?: Partial<Record<string, number>> | undefined;"}
 *
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Consumers using typescript-eslint still type-check against our rules.
 *
 * Devkit's published declarations use its own vendored copy of the AST and
 * rule types (scripts/vendor-estree-types.ts) instead of importing
 * `@typescript-eslint/utils`. That only works while the two stay structurally
 * compatible where a consumer meets them: a plugin placed in a config. This
 * compiles one program that assigns EVERY plugin to the real upstream
 * `TSESLint.FlatConfig.Plugin`, and fails on the first plugin a
 * typescript-eslint config could not accept.
 *
 * Not ESLint's own `ESLint.Plugin`: upstream typescript-eslint's
 * `FlatConfig.Plugin` is not assignable to it either (its `configs` and rule
 * context types differ from @eslint/core's), so that mismatch predates and is
 * independent of the vendored types.
 *
 * Not `TSESLint.RuleModule` itself: two declarations of a generic conditional
 * type (`SourceCode`'s `ReturnTypeFromOptions<T>`) never compare equal in
 * TypeScript, so that would fail for any copy, however exact. Config types
 * take rules loosely, which is the surface consumers actually use.
 *
 * docs/intents/2026-11-03-our-code-owns-the-tree (phase 1.3)
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..', '..');
const PACKAGES = path.join(ROOT, 'packages');

describe('devkit plugin types stay usable from typescript-eslint configs', () => {
  it('every plugin is a typescript-eslint FlatConfig plugin', () => {
    const plugins = fs
      .readdirSync(PACKAGES)
      .filter((d) => d.startsWith('eslint-plugin-'))
      .filter((d) => fs.existsSync(path.join(PACKAGES, d, 'src', 'index.ts')))
      .sort();
    expect(plugins.length).toBeGreaterThan(25);

    const probe = path.join(
      ROOT,
      'scripts',
      '__tests__',
      `.types-compat-probe-${process.pid}.ts`,
    );
    const lines = [
      "import type { TSESLint } from '@typescript-eslint/utils';",
      ...plugins.map(
        (p, i) =>
          `import { plugin as p${i} } from '../../packages/${p}/src/index';\n` +
          `export const _ts${i}: TSESLint.FlatConfig.Plugin = p${i};`,
      ),
    ];
    fs.writeFileSync(probe, `${lines.join('\n')}\n`);
    try {
      const program = ts.createProgram([probe], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
        types: [],
        // Source, not dist: the check must not depend on a prior build.
        baseUrl: ROOT,
        paths: {
          '@interlace/eslint-devkit': ['packages/eslint-devkit/src/index.ts'],
        },
      });
      const errors = ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.file?.fileName === probe)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      expect(errors).toEqual([]);
    } finally {
      fs.rmSync(probe, { force: true });
    }
  }, 300_000);
});
