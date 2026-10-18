/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP/FN review 2026-10-12 for the two connection-config detectors (TLS and
 * credentials): config-file shapes with no import, objects handed to another
 * library, values followed through bindings, ternaries, fallbacks and
 * relative modules, positional passwords and DSN templates.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { configShapeEvidence, possibleValues } from './connection-config';
import {
  createHardcodedCredentialsRule,
  urlPrefix,
} from './hardcoded-credentials-rule';
import { createRequireTlsRule } from './require-tls-rule';
import { moduleEnv, parseModule, valueAt } from './value-follow';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const SHAPES = [{ key: 'client', values: ['pg'], with: ['connection'] }];
const meta = (cwe: string) => ({
  type: 'problem' as const,
  docs: {
    description: 'review',
    url: 'https://example.test/r',
    cwe,
    cvss: 7.4,
    confidence: 'high' as const,
  },
});
const tls = createRequireTlsRule({
  meta: meta('CWE-319'),
  modules: ['drv'],
  connectionKeys: ['connection'],
  urlSchemes: ['postgres'],
  configShapes: SHAPES,
  fix: 'f',
  documentationLink: 'https://example.test/d',
});
const creds = createHardcodedCredentialsRule({
  meta: meta('CWE-798'),
  modules: ['drv'],
  connectionKeys: ['connection'],
  urlSchemes: ['postgres'],
  configShapes: SHAPES,
  positionalPassword: 2,
  fix: 'f',
  urlFix: 'u',
  documentationLink: 'https://example.test/d',
});
const credsNoPositional = createHardcodedCredentialsRule({
  meta: meta('CWE-798'),
  modules: ['drv'],
  urlSchemes: ['postgres'],
  fix: 'f',
  urlFix: 'u',
  documentationLink: 'https://example.test/d',
});

const D = "import drv from 'drv';\n";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-conn-review-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(
  path.join(dir, 'cfg.ts'),
  "export const pw = 'hunter2';\nexport const dsn = 'postgres://u:pw@h/db';\nexport const tlsOff = { rejectUnauthorized: false };\nexport const tlsOn = { rejectUnauthorized: true, [k]: 1, ...more };\nexport const inverted = { trustServerCertificate: true };\n",
);
const FILE = path.join(dir, 'main.ts');

describe('configShapeEvidence', () => {
  it('is undefined without shapes, and matches only the documented shape', () => {
    expect(configShapeEvidence([])).toBeUndefined();
    const evidence = configShapeEvidence(SHAPES)!;
    const objectOf = (code: string) =>
      (
        parseModule(`(${code});`, '/s.ts', parser)!.ast
          .body[0] as TSESTree.ExpressionStatement
      ).expression as TSESTree.Node;
    expect(evidence(objectOf("{ client: 'pg', connection: {} }"))).toBe(true);
    expect(evidence(objectOf("{ client: 'mysql', connection: {} }"))).toBe(
      false,
    );
    expect(evidence(objectOf("{ client: 'pg' }"))).toBe(false);
    expect(evidence(objectOf('{ client: pg, connection: {} }'))).toBe(false);
    expect(
      evidence(objectOf('{ client: 1, connection: {}, [k]: 1, ...r }')),
    ).toBe(false);
    expect(evidence(objectOf('x'))).toBe(false);
  });
});

describe('possibleValues', () => {
  it('stops at the depth bound', () => {
    const chain =
      Array.from({ length: 12 }, () => 'c ?').join(' ') +
      " 'a'" +
      Array.from({ length: 12 }, () => " : 'b'").join('');
    const module = parseModule(`probe(${chain});`, '/p.ts', parser)!;
    const call = (module.ast.body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.CallExpression;
    expect(
      possibleValues(valueAt(call.arguments[0], moduleEnv(module, parser)))
        .length,
    ).toBeGreaterThan(1);
  });
});

describe('urlPrefix', () => {
  it('reads literals and the head of a template', () => {
    const exprOf = (code: string) =>
      (
        parseModule(code, '/u.ts', parser)!.ast
          .body[0] as TSESTree.ExpressionStatement
      ).expression;
    expect(urlPrefix(exprOf("'postgres://a'"))).toBe('postgres://a');
    expect(urlPrefix(exprOf('`postgres://u:p@${h}/d`'))).toBe(
      'postgres://u:p@',
    );
    expect(urlPrefix(exprOf('x'))).toBeUndefined();
  });
});

describe('createRequireTlsRule — review 2026-10', () => {
  ruleTester.run('tls', tls, {
    valid: [
      {
        name: 'test file',
        filename: '/r/test/db.ts',
        code: D + "drv({ host: 'h', ssl: false });",
      },
      {
        name: 'handed to another library',
        code:
          D +
          "import https from 'https';\nnew https.Agent({ host: 'h', rejectUnauthorized: false });",
      },
      {
        name: 'a config shape that is not this driver',
        code: "module.exports = { client: 'mysql', connection: { host: 'h', ssl: false } };",
      },
      {
        name: 'a TLS object from another module that keeps verification',
        filename: FILE,
        code:
          D + "import { tlsOn } from './cfg';\ndrv({ host: 'h', ssl: tlsOn });",
      },
      {
        name: 'a nested object under a non-connection key',
        code: D + "drv({ host: 'h', other: { ssl: false } });",
      },
      {
        name: 'a runtime value',
        code: D + "drv({ host: 'h', ssl: process.env.SSL === '1' });",
      },
      { name: 'a non-string literal', code: D + 'const n = 1;' },
      {
        name: 'a URL no driver reads',
        code: D + "const u = 'postgres://h/db?sslmode=disable';",
      },
      {
        name: 'computed and spread keys',
        code: D + "drv({ host: 'h', [k]: false, ...rest });",
      },
    ],
    invalid: [
      {
        name: 'a knexfile shape with no import',
        code: "module.exports = { client: 'pg', connection: { host: 'h', ssl: false } };",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        name: 'a ternary arm',
        code: D + "drv({ host: 'h', ssl: c ? false : true });",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        name: 'a ternary arm holding an object',
        code:
          D +
          "drv({ host: 'h', ssl: c ? { rejectUnauthorized: false } : undefined });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'a fallback',
        code: D + "drv({ host: 'h', rejectUnauthorized: v ?? false });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'a TLS object bound first',
        code:
          D +
          "const o = { rejectUnauthorized: false };\ndrv({ host: 'h', ssl: o });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'a TLS object from another module',
        filename: FILE,
        code:
          D +
          "import { tlsOff } from './cfg';\ndrv({ host: 'h', ssl: tlsOff });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'the inverted spelling from another module',
        filename: FILE,
        code:
          D +
          "import { inverted } from './cfg';\ndrv({ host: 'h', ssl: inverted });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'the inverted spelling inline',
        code: D + "drv({ host: 'h', trustServerCertificate: true });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        name: 'a URL a driver call reads',
        code: D + "drv('postgres://h/db?sslmode=disable');",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        name: 'deeply nested ssl objects stop at the bound',
        code: D + "drv({ host: 'h', ssl: { ssl: { ssl: { ssl: false } } } });",
        errors: [{ messageId: 'tlsDisabled' }],
      },
    ],
  });
  ruleTester.run('tls depth', tls, {
    valid: [
      {
        name: 'past the nesting bound',
        code:
          D +
          "drv({ host: 'h', ssl: { ssl: { ssl: { ssl: { ssl: { ssl: false } } } } } });",
      },
    ],
    invalid: [],
  });
});

describe('createHardcodedCredentialsRule — review 2026-10', () => {
  ruleTester.run('creds', creds, {
    valid: [
      {
        name: 'test file',
        filename: '/r/__tests__/db.ts',
        code: D + "drv({ host: 'h', password: 'p' });",
      },
      {
        name: 'handed to another library',
        code:
          D +
          "import axios from 'axios';\naxios.create({ host: 'h', password: 'p' });",
      },
      {
        name: 'not a driver callee',
        code: D + "other('postgres://u:pw@h/db');",
      },
      {
        name: 'positional password from the environment',
        code: D + "new drv('db', 'u', process.env.PW);",
      },
      { name: 'too few positional arguments', code: D + "new drv('db', 'u');" },
      {
        name: 'a call is not the positional constructor',
        code: D + "drv('db', 'u', 'pw');",
      },
      { name: 'a spread argument', code: D + 'drv(...args);' },
      {
        name: 'a non-connection nested key',
        code: D + "drv({ host: 'h', other: { password: 'p' } });",
      },
      {
        name: 'a connection key holding a non-object',
        code: D + "drv({ host: 'h', connection: make() });",
      },
      {
        name: 'a template DSN without a password',
        code: D + 'drv(`postgres://${h}/db`);',
      },
      { name: 'a template that is no URL', code: D + 'drv(`x ${y}`);' },
      {
        name: 'no import, no shape',
        code: "drv({ host: 'h', password: 'p' });",
      },
    ],
    invalid: [
      {
        name: 'a knexfile shape with no import',
        code: "module.exports = { client: 'pg', connection: { host: 'h', password: 'p' } };",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a literal fallback',
        code: D + "drv({ host: 'h', password: process.env.PW || 'p' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a constant bound first, reported at the use',
        code: D + "const p = 'p';\ndrv({ host: 'h', password: p });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a constant from another module',
        filename: FILE,
        code:
          D + "import { pw } from './cfg';\ndrv({ host: 'h', password: pw });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a DSN from another module',
        filename: FILE,
        code: D + "import { dsn } from './cfg';\ndrv(dsn);",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'a DSN property bound first',
        code:
          D + "const u = 'postgres://u:pw@h/db';\ndrv({ host: 'h', url: u });",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'a DSN template head',
        code: D + 'drv(`postgres://u:pw@${h}/db`);',
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'the positional password',
        code: D + "new drv('db', 'u', 'pw');",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a nested connection object bound first',
        code:
          D +
          "const c = { password: 'p' };\ndrv({ host: 'h', connection: c });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
  ruleTester.run('creds without positional', credsNoPositional, {
    valid: [
      {
        name: 'positional arguments are not read',
        code: D + "new drv('db', 'u', 'pw');",
      },
    ],
    invalid: [],
  });
});
