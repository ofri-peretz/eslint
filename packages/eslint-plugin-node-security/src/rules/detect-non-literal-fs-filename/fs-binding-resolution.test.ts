/**
 * Binding-resolution tests for detect-non-literal-fs-filename.
 *
 * The rule used to gate on the receiver being literally the identifier `fs`,
 * so every other way of binding the module was unchecked. Each invalid case
 * below is a shape that reported *nothing* before this change — revert
 * the receiver check to the old `object.name !== 'fs'` check and they all go
 * silent, which is what makes this file a lock rather than a restatement.
 *
 * The receiver is resolved by devkit's `resolveModuleBinding`, so the
 * spelling-level arms it covers are locked in devkit's own suite.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from './index';

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
    ],
    invalid: [
      // Both used to be pinned VALID, as resolver limits. They are fs calls:
      // `{ promises: { readFile } }` binds fs.promises.readFile, and an object
      // rest copies fs's own methods, so `rest.readFile` is fs.readFile. The
      // devkit resolver now follows nesting and rest, so both report.
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'a nested destructuring pattern binds fs.promises.readFile',
        code: "const { promises: { readFile } } = require('fs');\nreadFile(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        options: [{ reportUnresolvedPaths: true }],
        name: 'an object rest of fs carries its methods',
        code: "const { ...rest } = require('fs');\nrest.readFile(userPath);",
        errors: [{ messageId: 'fsPathTraversal' }],
      },
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
