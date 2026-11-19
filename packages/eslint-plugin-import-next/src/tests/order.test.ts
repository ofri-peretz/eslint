/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `order` is eslint-plugin-import's `import/order`, defaults included: with no
 * options, groups `builtin, external, parent, sibling, index`, no
 * alphabetizing and no blank-line policy. Until 4.0 it was an alias of
 * `enforce-import-order`, whose own defaults (alphabetized, a blank line
 * between groups) reported 57 of eslint-plugin-import's own valid-or-other-
 * count cases (benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 * import-next's opinionated reading stays available as
 * `enforce-import-order`, which the presets use.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it, afterAll } from 'vitest';
import { order } from '../rules/order';
import { enforceImportOrder } from '../rules/enforce-import-order';
import { configs, rules } from '../index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

describe('order — eslint-plugin-import defaults', () => {
  ruleTester.run('order', order, {
    valid: [
      {
        name: 'the default groups, in order',
        code: "import fs from 'fs';\nimport a from 'some-pkg';\nimport p from '../p';\nimport s from './s';\nimport i from './';",
      },
      {
        name: 'no alphabetizing by default',
        code: "import b from 'b-pkg';\nimport a from 'a-pkg';",
      },
      {
        name: 'no blank-line policy by default',
        code: "import fs from 'fs';\n\n\nimport a from 'a-pkg';\nimport s from './s';",
      },
      {
        name: 'import =, re-exports and CommonJS exports are read too',
        code: "import fs = require('fs');\nimport s from './s';\nexport { a } from './a';\nmodule.exports = s;",
      },
      {
        name: 'an option object with eslint-plugin-import keys',
        code: "import a from 'a-pkg';\nimport b from 'b-pkg';",
        options: [{ alphabetize: { order: 'asc' } }],
      },
    ],
    invalid: [
      {
        name: 'a sibling before a builtin: one report, at the import out of place',
        code: "import s from './s';\nimport fs from 'fs';",
        output: "import fs from 'fs';\nimport s from './s';\n",
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'alphabetize, when asked',
        code: "import b from 'b-pkg';\nimport a from 'a-pkg';",
        options: [{ alphabetize: { order: 'asc' } }],
        output: "import a from 'a-pkg';\nimport b from 'b-pkg';\n",
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'a top-level require is ordered too',
        code: "const s = require('./s');\nconst fs = require('fs');",
        output: "const fs = require('fs');\nconst s = require('./s');\n",
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
    ],
  });
});

describe('order — the options it accepts', () => {
  const linter = new Linter({ configType: 'flat' });
  const verify = (rule: unknown, options: unknown) =>
    linter.verify("import a from 'a-pkg';", {
      plugins: { import: { rules: { order: rule as never } } },
      rules: { 'import/order': ['error', options as never] },
    });

  it("refuses import-next's own keys, which it would ignore", () => {
    expect(() => verify(order, { newlinesBetween: 'always' })).toThrow(
      /newlinesBetween/,
    );
    expect(() => verify(order, { internalPatterns: ['^@/'] })).toThrow(
      /internalPatterns/,
    );
  });

  it("names eslint-plugin-import's groups only", () => {
    expect(() => verify(order, { groups: ['side-effect'] })).toThrow();
    expect(
      verify(order, { groups: [['builtin', 'external'], 'type'] }),
    ).toEqual([]);
  });

  it('enforce-import-order keeps both keys', () => {
    expect(verify(enforceImportOrder, { newlinesBetween: 'always' })).toEqual(
      [],
    );
  });
});

describe('order — what the plugin exports under each name', () => {
  it("`order` is eslint-plugin-import's rule, not an alias of enforce-import-order", () => {
    expect(rules.order).toBe(order);
    expect(rules['enforce-import-order']).toBe(enforceImportOrder);
  });

  it("the presets keep import-next's own ordering", () => {
    for (const name of ['strict', 'typescript', 'import-style'] as const) {
      const preset = configs[name].rules as Record<string, unknown>;
      expect(preset['import-next/enforce-import-order'], name).toBeDefined();
      expect(preset['import-next/order'], name).toBeUndefined();
    }
  });
});
