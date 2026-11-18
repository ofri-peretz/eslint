/**
 * @provenBy {"file": "tools/types-compat/src/compat.ts", "find": "import { plugin as p0 } from '../../../packages/eslint-plugin-anthropic-security/src/index';\n", "replace": ""}
 *
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * tools/types-compat/src/compat.ts holds every plugin to typescript-eslint's
 * `FlatConfig.Plugin` through the whole-graph typecheck. A plugin it does not
 * import is a plugin nobody checked, so adding one without listing it here
 * fails.
 *
 * docs/intents/2026-11-03-our-code-owns-the-tree (phase 1.3)
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

describe('types-compat covers every plugin', () => {
  it('imports each plugin package that has a src/index.ts', () => {
    const compat = fs.readFileSync(
      path.join(ROOT, 'tools', 'types-compat', 'src', 'compat.ts'),
      'utf8',
    );
    const plugins = fs
      .readdirSync(path.join(ROOT, 'packages'))
      .filter((d) => d.startsWith('eslint-plugin-'))
      .filter((d) =>
        fs.existsSync(path.join(ROOT, 'packages', d, 'src', 'index.ts')),
      );
    expect(plugins.length).toBeGreaterThan(25);
    const missing = plugins.filter(
      (d) => !compat.includes(`'../../../packages/${d}/src/index'`),
    );
    expect(missing).toEqual([]);
  });
});
