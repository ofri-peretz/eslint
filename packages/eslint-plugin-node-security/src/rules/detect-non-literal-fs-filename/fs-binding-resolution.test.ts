/**
 * Binding-resolution tests for detect-non-literal-fs-filename.
 *
 * The rule used to gate on the receiver being literally the identifier `fs`,
 * so every other way of binding the module was unchecked. Each invalid case
 * below is a shape that reported *nothing* before this change — revert
 * `fsMethodName` to the old `object.name !== 'fs'` check and they all go
 * silent, which is what makes this file a lock rather than a restatement.
 *
 * Layer 1: the rule through RuleTester.
 * Layer 2: fsMethodName / isFsModule / isFsRequire directly, for the arms no
 * source shape can reach through the rule.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { detectNonLiteralFsFilename, fsMethodName, isFsModule, isFsRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('fs binding resolution', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a same-named binding from an unrelated module is not fs',
        code: "import { readFile } from './my-utils';\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a bare call with no fs binding in the file',
        code: 'readFile(userPath);',
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a require of something else does not bind fs',
        code: "const fsx = require('path');\nfsx.readFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a non-dangerous method on a resolved namespace',
        code: "import fsp from 'node:fs/promises';\nfsp.realpath(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a literal path through a resolved named import',
        code: "import { readFile } from 'node:fs/promises';\nreadFile('./config.json');",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a computed member on the module object is not resolved',
        code: "import fs2 from 'fs';\nfs2[method](userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a non-promises member chain is not an fs sink',
        code: "import fs2 from 'fs';\nfs2.constants.readFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'require with no arguments is not an fs require',
        code: 'const fs3 = require();\nfs3.readFile(userPath);',
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a destructured require of a non-fs module',
        code: "const { readFile } = require('./local');\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // A numeric key is not an fs method name; better silent than guessing.
        name: 'a numeric destructuring key binds no method name',
        code: "const { 0: readFile } = require('fs');\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a computed destructuring key binds no method name',
        code: "const { [k]: readFile } = require('fs');\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a nested destructuring pattern is not a method binding',
        code: "const { promises: { readFile } } = require('fs');\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a declarator with no initialiser',
        code: 'let fsLater;\nreadFile(userPath);',
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // fs has no array shape, so an array pattern binds nothing this rule
        // can name — better silent than guessing which element is which.
        name: 'an array-pattern require binds no fs name',
        code: "const [readFile] = require('fs');\nreadFile(userPath);",
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // A rest element is not a Property and names no single method. That
        // check used to be fused with the `computed` bail on one line;
        // splitting them to let computed keys through left this arm uncovered.
        name: 'a rest element in a require pattern binds no method name',
        code: "const { ...rest } = require('fs');\nrest.readFile(userPath);",
      },
    ],
    invalid: [
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a named import from node:fs/promises',
        code: "import { readFile } from 'node:fs/promises';\nreadFile(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a renamed named import still resolves to its fs method',
        code: "import { readFile as read } from 'fs/promises';\nread(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // Parity with the import path, which already reads the string form.
        name: 'a string-literal destructuring key resolves the same method',
        code: "const { 'readFile': read } = require('fs');\nread(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // The third spelling of the same destructure, and the one a bundler
        // emits. `prop.computed` was checked before the key was read, so this
        // bound nothing and the traversal went unreported — while the bare and
        // quoted forms directly above both reported.
        name: 'a computed string destructuring key resolves the same method',
        code: "const { ['readFile']: read } = require('fs');\nread(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'the string-literal import name resolves the same method',
        code: "import { 'readFile' as read } from 'fs/promises';\nread(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a renamed default import',
        code: "import nodeFs from 'node:fs';\nnodeFs.readFileSync(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a namespace import',
        code: "import * as fileSystem from 'fs';\nfileSystem.writeFile(userPath, data);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'fs.promises off a renamed binding',
        code: "import nodeFs from 'fs';\nnodeFs.promises.readFile(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a renamed require',
        code: "const nodeFs = require('node:fs');\nnodeFs.unlink(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a destructured require',
        code: "const { readdir } = require('fs');\nreaddir(userDir);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a renamed destructured require keeps the fs method name',
        code: "const { readFile: rf } = require('node:fs/promises');\nrf(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // `promises` is the one fs export that is itself a module object.
        // Filed under methods it was unresolvable, so the whole promise API
        // reached through this idiom was silently unchecked.
        name: 'a destructured promises object binds a namespace, not a method',
        code: "const { promises } = require('fs');\npromises.readFile(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'the same through a named import',
        code: "import { promises as fsp } from 'node:fs';\nfsp.writeFile(userPath, data);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'the bare fs identifier still reports with no import at all',
        code: 'fs.readFile(userPath);',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        // Judging in visit order would miss this: the binding is established
        // after the call site. Statement order is not a security property.
        name: 'a require below the call site still binds',
        code: "function read(p) { return nodeFs.readFileSync(p); }\nconst nodeFs = require('fs');",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
    ],
  });
});

describe('isFsModule', () => {
  it('accepts the four fs specifiers', () => {
    for (const m of ['fs', 'node:fs', 'fs/promises', 'node:fs/promises']) {
      expect(isFsModule(m)).toBe(true);
    }
  });

  it('accepts fs-extra and graceful-fs, which re-export the fs surface', () => {
    // This assertion used to read `expect(isFsModule('fs-extra')).toBe(false)`,
    // which pinned a false negative: okta-signin-widget reaches fs through
    // `fs-extra` in at least five non-test files, using the same destructured
    // `readFileSync`/`writeFileSync` names the rule already tracks. A file was
    // invisible purely because of which package it imported from.
    expect(isFsModule('fs-extra')).toBe(true);
    expect(isFsModule('graceful-fs')).toBe(true);
  });

  it('rejects anything else, including a non-string source', () => {
    expect(isFsModule('./fs')).toBe(false);
    // A `require(0)` parses fine; the source is then not a string.
    expect(isFsModule(0)).toBe(false);
  });
});

describe('fsMethodName', () => {
  const calleeOf = (code: string): TSESTree.Node => {
    const stmt = parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement;
    return (stmt.expression as TSESTree.CallExpression).callee;
  };

  it('returns undefined for a callee that is neither identifier nor member', () => {
    expect(fsMethodName(calleeOf('getFs()(p)'), new Set(['fs']), new Map())).toBeUndefined();
  });

  it('resolves a member reached by a string subscript', () => {
    // This asserted `toBeUndefined()`, which pinned the blind spot as if it
    // were the specification. `fs["readFile"]` reaches the same function as
    // `fs.readFile`; there was never a reason to treat it differently, and
    // saying so in a test made the miss look deliberate.
    expect(fsMethodName(calleeOf('fs["readFile"](p)'), new Set(['fs']), new Map())).toBe(
      'readFile',
    );
  });

  it('returns undefined for a genuinely dynamic property', () => {
    // The line the previous test should have been drawing: a name that cannot
    // be resolved statically is still not resolved.
    expect(fsMethodName(calleeOf('fs[m](p)'), new Set(['fs']), new Map())).toBeUndefined();
  });

  it('resolves a namespace member', () => {
    expect(fsMethodName(calleeOf('fs.readFile(p)'), new Set(['fs']), new Map())).toBe('readFile');
  });

  it('resolves a promises member', () => {
    expect(fsMethodName(calleeOf('fs.promises.readFile(p)'), new Set(['fs']), new Map())).toBe(
      'readFile',
    );
  });

  it('rejects a promises chain rooted in an unknown binding', () => {
    expect(fsMethodName(calleeOf('other.promises.readFile(p)'), new Set(['fs']), new Map()))
      .toBeUndefined();
  });

  it('rejects a computed promises member', () => {
    expect(
      fsMethodName(calleeOf('fs[key].readFile(p)'), new Set(['fs']), new Map()),
    ).toBeUndefined();
  });

  it('rejects a member chain deeper than fs.promises', () => {
    expect(
      fsMethodName(calleeOf('a.b.c.readFile(p)'), new Set(['fs']), new Map()),
    ).toBeUndefined();
  });

  it('maps a named binding to its fs method', () => {
    expect(fsMethodName(calleeOf('read(p)'), new Set(), new Map([['read', 'readFile']]))).toBe(
      'readFile',
    );
  });
});

describe('isFsRequire', () => {
  const exprOf = (code: string): TSESTree.Node =>
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement).expression;

  it('is true for require of any fs specifier', () => {
    expect(isFsRequire(exprOf("require('fs')"))).toBe(true);
    expect(isFsRequire(exprOf("require('node:fs/promises')"))).toBe(true);
  });

  it('is false for a non-call, a non-require call, and a non-literal argument', () => {
    expect(isFsRequire(exprOf('someValue'))).toBe(false);
    expect(isFsRequire(exprOf("imports('fs')"))).toBe(false);
    expect(isFsRequire(exprOf('require(moduleName)'))).toBe(false);
    expect(isFsRequire(exprOf('require()'))).toBe(false);
  });
});
