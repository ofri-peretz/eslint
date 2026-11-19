/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The rules that read other modules, without type information: each parses
 * the imported module (src/utils/export-map.ts) the way eslint-plugin-import
 * does. Before 4.0 they reported nothing at all without a TypeScript program,
 * which failed 96 of eslint-plugin-import's own cases
 * (benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 *
 * ESLint's Linter, not RuleTester: oxlint exposes no parser a plugin can call,
 * so on oxlint these rules do not read other modules, and the dual-engine
 * RuleTester would hold them to a result only ESLint can produce.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { named } from '../rules/named';
import { defaultRule } from '../rules/default';
import { namespace } from '../rules/namespace';
import { noDeprecated } from '../rules/no-deprecated';
import { noNamedAsDefault } from '../rules/no-named-as-default';
import { noNamedAsDefaultMember } from '../rules/no-named-as-default-member';
import { exportRule } from '../rules/export';
import { clearExportMapCache } from '../utils/export-map';

const DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), 'import-next-export-map-rules-'),
);
afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));
beforeEach(() => clearExportMapCache());

const FIXTURES: Record<string, string> = {
  'm.js': [
    'export const a = 1, b = 2;',
    'export function fn() {}',
    'export default function main() {}',
  ].join('\n'),
  'no-default.js': 'export const only = 1;',
  'empty.js': 'export {};',
  'bad.js': 'export const = ;',
  'cjs.js': 'module.exports = { a: 1 };',
  'dyn.js': "module.exports = () => import('./m');",
  'deep.js': [
    "import * as m from './m';",
    'export { m };',
    'export default m;',
    "export { q } from './missing';",
    'export const plain = 1;',
  ].join('\n'),
  'deprecated.js': [
    '/** @deprecated use b */',
    'export const old = 1;',
    'export const fresh = 2;',
    '/** @deprecated gone */',
    'export default function legacy() {}',
  ].join('\n'),
  'depmod.js':
    '/**\n * @module depmod\n * @deprecated the whole module\n */\nconst one = 1;\nexport const x = one;',
  'deep-deprecated.js': [
    "import * as dep from './deprecated';",
    'export { dep };',
    "export * from './missing';",
  ].join('\n'),
  'reexport-same.js': "export { main as default, main } from './m-main';",
  'm-main.js': 'export function main() {}',
  'reexport-other.js': [
    "export { main as default } from './m-main';",
    "export { main } from './m-main-2';",
  ].join('\n'),
  'm-main-2.js': 'export function main() {}',
  'reexport-renamed.js': [
    "export { main as default } from './m-main';",
    "export { other as main } from './m-main';",
  ].join('\n'),
  'named-only.js': 'export const main = 1;',
  'types.ts': 'export interface T {}\nexport const v = 1;',
  'partly-unknown.js': "export * from './missing';\nexport const known = 1;",
  'all-unknown.js': "export * from './missing';",
};
for (const [name, text] of Object.entries(FIXTURES)) {
  fs.writeFileSync(path.join(DIR, name), text);
}
const FILE = path.join(DIR, 'app.js');

const linter = new Linter({ cwd: DIR, configType: 'flat' });

/** The messageIds `rule` reports on `code`, in order. */
function ids(
  rule: unknown,
  code: string,
  options: unknown[] = [],
  extra: { typescript?: boolean } = {},
): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.js', '**/*.ts'],
      plugins: { t: { rules: { r: rule as never } } },
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
        ...(extra.typescript ? { parser: tsParser } : {}),
      },
      rules: { 't/r': ['error', ...(options as never[])] },
    },
    { filename: extra.typescript ? path.join(DIR, 'app.ts') : FILE },
  );
  const fatal = messages.find((m) => m.fatal);
  if (fatal) throw new Error(fatal.message);
  return messages.map((m) => m.messageId ?? `${m.ruleId}: ${m.message}`);
}

describe('named', () => {
  it('a name the module does not export', () => {
    expect(ids(named, "import { a, nope, 'a' as x } from './m';")).toEqual([
      'named',
    ]);
    expect(ids(named, "export { a, nope } from './m';")).toEqual(['named']);
    expect(ids(named, "import { default as d } from './no-default';")).toEqual([
      'named',
    ]);
  });

  it('nothing to check, or a module that is not known', () => {
    expect(ids(named, "import d from './m';")).toEqual([]);
    expect(ids(named, 'const local = 1;\nexport { local };')).toEqual([]);
    expect(ids(named, "import { a } from './missing';")).toEqual([]);
    expect(ids(named, "import { a } from './dyn';")).toEqual([]);
    expect(ids(named, "import { a } from './cjs';")).toEqual([]);
  });

  it('type-only imports and exports are not checked', () => {
    const ts = { typescript: true };
    expect(ids(named, "import type { T } from './m';", [], ts)).toEqual([]);
    expect(ids(named, "import { type T, a } from './m';", [], ts)).toEqual([]);
    expect(ids(named, "export type { T } from './m';", [], ts)).toEqual([]);
    expect(ids(named, "export { type T, a } from './m';", [], ts)).toEqual([]);
  });

  it('a module that does not parse is not known (as in eslint-plugin-import)', () => {
    expect(ids(named, "import { a } from './bad';")).toEqual([]);
  });

  it('commonjs: destructured require()', () => {
    const cjs = [{ commonjs: true }];
    expect(
      ids(
        named,
        "const { a, nope, ['b']: c, [k]: d, ...rest } = require('./m');",
        cjs,
      ),
    ).toEqual(['named']);
    expect(ids(named, "const { a } = require('./bad');", cjs)).toEqual([]);
    for (const code of [
      "const m = require('./m');",
      "const {} = require('./m');",
      'const { a } = m;',
      "const { a } = o.require('./m');",
      "const { a } = load('./m');",
      'const { a } = require();',
      "const { a } = require('./m', 1);",
      'const { a } = require(name);',
      'const { a } = require(1);',
      "const { nope } = require('./missing');",
      "const { nope } = require('./dyn');",
    ]) {
      expect(ids(named, code, cjs), code).toEqual([]);
    }
    // Off by default.
    expect(ids(named, "const { nope } = require('./m');")).toEqual([]);
  });
});

describe('default', () => {
  it('a default import of a module with no default', () => {
    expect(ids(defaultRule, "import d from './no-default';")).toEqual([
      'noDefaultExport',
    ]);
    expect(ids(defaultRule, "import d from './m';")).toEqual([]);
    expect(ids(defaultRule, "import { a } from './no-default';")).toEqual([]);
    expect(ids(defaultRule, "import d from './missing';")).toEqual([]);
    // CommonJS (read only for its import()): a default by interop.
    expect(ids(defaultRule, "import d from './dyn';")).toEqual([]);
    expect(ids(defaultRule, "import d from './bad';")).toEqual(['parseError']);
    expect(
      ids(defaultRule, "import type d from './no-default';", [], {
        typescript: true,
      }),
    ).toEqual([]);
  });
});

describe('namespace', () => {
  it('members a namespace import does not have', () => {
    expect(
      ids(
        namespace,
        "import * as m from './m';\nm.a; m.nope; m['b']; m['nope2'];",
      ),
    ).toEqual(['namespace', 'namespace']);
    expect(ids(namespace, "m.nope;\nimport * as m from './m';")).toEqual([
      'namespace',
    ]);
    expect(
      ids(
        namespace,
        "import * as m from './m';\nconst k = 'a';\nconst { a, nope, [k]: v, ...rest } = m;\nconst [x] = m;",
      ),
    ).toEqual(['namespace']);
    expect(
      ids(
        namespace,
        "import * as m from './m';\nconst el = <m.nope />;\nconst ok = <m.a />;",
      ),
    ).toEqual(['namespace']);
  });

  it('assigning to a member', () => {
    expect(ids(namespace, "import * as m from './m';\nm.a = 1;")).toEqual([
      'assignment',
    ]);
    expect(ids(namespace, "import * as m from './m';\nm.x = 1;")).toEqual([
      'assignment',
      'namespace',
    ]);
  });

  it('computed members', () => {
    const code = "import * as m from './m';\nconst k = 'a';\nm[k]; m['nope'];";
    expect(ids(namespace, code)).toEqual(['namespace']);
    expect(ids(namespace, code, [{ allowComputed: true }])).toEqual([]);
    expect(ids(namespace, code, [{ allowComputed: false }])).toEqual([
      'computedReference',
      'computedReference',
    ]);
  });

  it('deep: through a namespace the module re-exports', () => {
    expect(
      ids(
        namespace,
        "import * as d from './deep';\nd.m.a; d.m.nope; d.plain.x; d.q.x; f(d.m); g[d.m];",
      ),
    ).toEqual(['namespace']);
    expect(ids(namespace, "import { m } from './deep';\nm.nope;")).toEqual([
      'namespace',
    ]);
    expect(ids(namespace, "import m from './deep';\nm.nope;")).toEqual([
      'namespace',
    ]);
    expect(ids(namespace, "import { plain } from './deep';\nplain.x;")).toEqual(
      [],
    );
    expect(
      ids(
        namespace,
        "import * as d from './deep';\nconst { m: { a, nope }, plain: { x }, q } = d;",
      ),
    ).toEqual(['namespace']);
  });

  it('a star export of a module that is not known: names may be there', () => {
    expect(
      ids(
        namespace,
        "import * as p from './partly-unknown';\np.known; p.other; const { more } = p;",
      ),
    ).toEqual([]);
    expect(ids(namespace, "import * as u from './all-unknown';")).toEqual([]);
    expect(ids(exportRule, "export * from './all-unknown';")).toEqual([]);
  });

  it('a CommonJS module and a shadowed JSX root are not checked', () => {
    expect(ids(namespace, "import * as d from './dyn';\nd.nope;")).toEqual([]);
    expect(
      ids(
        namespace,
        "import * as m from './m';\nconst f = (m) => <m.Nope />;\nconst g = () => <m.Nope2 />;",
      ),
    ).toEqual(['namespace']);
  });

  it('a namespace with no names, a module that does not parse', () => {
    expect(ids(namespace, "import * as e from './empty';")).toEqual([
      'noExports',
    ]);
    expect(ids(namespace, "import * as b from './bad';")).toEqual([
      'parseError',
    ]);
  });

  it('not a namespace import, or shadowed', () => {
    for (const code of [
      "import './m';",
      "import * as m from './missing';\nm.nope;",
      "import * as m from './m';\nfunction f(m) { m.nope; const { nope } = m; }",
      "import * as m from './m';\nfoo().nope; other.nope; const { x } = other; const y = foo();",
      "import * as m from './m';\nconst el = <other.nope />; const el2 = <m.a.b />;",
      'const x = 1;',
    ]) {
      expect(ids(namespace, code), code).toEqual([]);
    }
  });
});

describe('no-deprecated', () => {
  it('a deprecated import, and every use of it', () => {
    expect(
      ids(
        noDeprecated,
        "import { old, fresh } from './deprecated';\nold; fresh;",
      ),
    ).toEqual(['deprecatedImport', 'deprecatedUsage']);
    expect(ids(noDeprecated, "import legacy from './deprecated';")).toEqual([
      'deprecatedImport',
    ]);
    expect(
      ids(
        noDeprecated,
        "import { old } from './deprecated';\nfunction f(old) { return old; }",
      ),
    ).toEqual(['deprecatedImport']);
  });

  it('a deprecated module', () => {
    expect(ids(noDeprecated, "import { x } from './depmod';")).toEqual([
      'deprecatedImport',
    ]);
    expect(
      ids(noDeprecated, "import { x } from './depmod';", [
        { allow: ['./depmod'] },
      ]),
    ).toEqual([]);
  });

  it('checkJSDoc: false reads no documentation from other modules', () => {
    const off = [{ checkJSDoc: false }];
    expect(
      ids(noDeprecated, "import { old } from './deprecated';\nold;", off),
    ).toEqual([]);
    expect(ids(noDeprecated, "import { x } from './depmod';", off)).toEqual([]);
    expect(
      ids(noDeprecated, "import * as d from './deprecated';\nd.old;", off),
    ).toEqual([]);
    expect(ids(noDeprecated, "import { old } from './bad';", off)).toEqual([
      'parseError',
    ]);
  });

  it('allow', () => {
    expect(
      ids(noDeprecated, "import { old } from './deprecated';\nold;", [
        { allow: ['old'] },
      ]),
    ).toEqual([]);
  });

  it('through a namespace, and a namespace of a namespace', () => {
    expect(
      ids(
        noDeprecated,
        "import * as d from './deprecated';\nd.old; d.fresh; d.nope; d['old']; other.old;",
      ),
    ).toEqual(['deprecatedExport']);
    expect(
      ids(
        noDeprecated,
        "import * as dd from './deep-deprecated';\ndd.dep.old; f(dd.dep); g[dd.dep];",
      ),
    ).toEqual(['deprecatedExport']);
    expect(
      ids(noDeprecated, "import { dep } from './deep-deprecated';\ndep.old;"),
    ).toEqual(['deprecatedExport']);
    expect(
      ids(noDeprecated, "import * as d from './deprecated';\nd.old;", [
        { allow: ['old'] },
      ]),
    ).toEqual([]);
    expect(
      ids(
        noDeprecated,
        "import * as d from './deprecated';\nfunction f(d) { d.old; }",
      ),
    ).toEqual([]);
    expect(ids(noDeprecated, "import * as e from './empty';\ne.old;")).toEqual(
      [],
    );
  });

  it('not known, unparseable, not an import', () => {
    expect(
      ids(noDeprecated, "import { old } from './missing';\nconst x = 1;"),
    ).toEqual([]);
    expect(ids(noDeprecated, "import { nope } from './deprecated';")).toEqual(
      [],
    );
    expect(ids(noDeprecated, "import { old } from './bad';")).toEqual([
      'parseError',
    ]);
  });
});

describe('no-named-as-default', () => {
  it('the default bound to a name the module also exports', () => {
    expect(ids(noNamedAsDefault, "import a from './m';")).toEqual([
      'namedAsDefault',
    ]);
    expect(
      ids(noNamedAsDefault, "import { default as fn } from './m';"),
    ).toEqual(['namedAsDefault']);
    expect(ids(noNamedAsDefault, "import main from './m';")).toEqual([]);
    expect(ids(noNamedAsDefault, "import main from './named-only';")).toEqual(
      [],
    );
    expect(ids(noNamedAsDefault, "import a from './missing';")).toEqual([]);
  });

  it('a module that re-exports one binding as both is not a collision', () => {
    expect(
      ids(noNamedAsDefault, "import main from './reexport-same';"),
    ).toEqual([]);
    expect(
      ids(noNamedAsDefault, "import main from './reexport-other';"),
    ).toEqual(['namedAsDefault']);
    expect(
      ids(noNamedAsDefault, "import main from './reexport-renamed';"),
    ).toEqual(['namedAsDefault']);
  });

  it('a module that does not parse is reported once', () => {
    expect(
      ids(noNamedAsDefault, "import a from './bad';\nimport b from './bad';"),
    ).toEqual(['parseError']);
  });
});

describe('no-named-as-default-member', () => {
  it('a member of the default that is also a named export', () => {
    expect(
      ids(
        noNamedAsDefaultMember,
        "import m from './m';\nm.a; m.default; m.zzz;",
      ),
    ).toEqual(['namedAsDefaultMember']);
    expect(
      ids(noNamedAsDefaultMember, "import e from './empty';\ne.a;"),
    ).toEqual([]);
    expect(
      ids(noNamedAsDefaultMember, "import x from './missing';\nx.a;"),
    ).toEqual([]);
    expect(
      ids(noNamedAsDefaultMember, "import x, { a } from './missing';\nx.a;"),
    ).toEqual(['namedAsDefaultMember']);
  });

  it('a module that does not parse is reported once', () => {
    expect(
      ids(
        noNamedAsDefaultMember,
        "import a from './bad';\nimport b from './bad';\na.x;",
      ),
    ).toEqual(['parseError']);
  });
});

describe('export', () => {
  it('export * of a name this module exports too: both are reported', () => {
    expect(
      ids(exportRule, "export const a = 1;\nexport * from './m';"),
    ).toEqual(['duplicateExport', 'duplicateExport']);
    expect(
      ids(exportRule, "export * from './m';\nexport * as ns from './m';"),
    ).toEqual([]);
  });

  it('export * of a module with no named exports', () => {
    expect(ids(exportRule, "export * from './empty';")).toEqual([
      'noNamedExports',
    ]);
    expect(ids(exportRule, "export * from './missing';")).toEqual([]);
    expect(ids(exportRule, "export * from './bad';")).toEqual(['parseError']);
  });
});
