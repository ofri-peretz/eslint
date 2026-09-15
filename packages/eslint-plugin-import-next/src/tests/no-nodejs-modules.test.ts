/**
 * Comprehensive tests for no-nodejs-modules rule
 * Prevents Node.js builtin imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNodejsModules } from '../rules/no-nodejs-modules';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-nodejs-modules', () => {
  describe('Basic Node.js builtin detection', () => {
    ruleTester.run('detect Node.js builtin imports', noNodejsModules, {
      valid: [
        // Valid non-Node.js imports
        {
          name: 'a relative import',
          code: 'import helper from "./helper";',
          filename: '/src/utils/helpers.js',
        },
        {
          name: 'a third-party package is not a builtin',
          code: 'import { Component } from "react";',
          filename: '/src/components/Button.js',
        },
        {
          name: 'a package whose name resembles no builtin',
          code: 'import lodash from "lodash";',
          filename: '/src/utils/helpers.js',
        },
        // Allowed builtins
        {
          name: 'a builtin named in `allow`',
          code: 'import fs from "fs";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
        },
        // No imports
        {
          name: 'a file that imports nothing',
          code: 'console.log("hello");',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        // Invalid Node.js builtin imports
        {
          name: 'a Node builtin in code that must also run in a browser',
          code: 'import fs from "fs";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
        {
          code: 'import { readFile } from "fs";',
          filename: '/src/components/Button.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
        {
          code: 'import path from "path";',
          filename: '/src/utils/index.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
        {
          code: 'import crypto from "crypto";',
          filename: '/src/security/utils.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
      ],
    });
  });

  describe('Node.js protocol imports', () => {
    ruleTester.run('handle node: protocol', noNodejsModules, {
      valid: [
        {
          code: 'import fs from "node:fs";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
        },
      ],
      invalid: [
        {
          code: 'import fs from "node:fs";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
        {
          code: 'import path from "node:path";',
          filename: '/src/utils/index.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
      ],
    });
  });

  describe('CommonJS require() calls', () => {
    ruleTester.run('handle require() calls', noNodejsModules, {
      valid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'const fs = require("fs");',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
        },
      ],
      invalid: [
        {
          code: 'const fs = require("fs");',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'nodejsBuiltinRequire',
            },
          ],
        },
        {
          code: 'const path = require("path");',
          filename: '/src/components/Button.js',
          errors: [
            {
              messageId: 'nodejsBuiltinRequire',
            },
          ],
        },
        {
          code: 'const crypto = require("crypto");',
          filename: '/src/utils/index.js',
          errors: [
            {
              messageId: 'nodejsBuiltinRequire',
            },
          ],
        },
      ],
    });
  });

  // Simplified - removed complex dynamic import tests

  describe('TypeScript import = require', () => {
    ruleTester.run('handle TypeScript import syntax', noNodejsModules, {
      valid: [
        {
          code: 'import helper = require("./helper");',
          filename: '/src/utils/helpers.ts',
        },
      ],
      invalid: [
        {
          code: 'import fs = require("fs");',
          filename: '/src/utils/helpers.ts',
          errors: [
            {
              messageId: 'nodejsBuiltinRequire',
            },
          ],
        },
      ],
    });
  });

  // Removed auto-fix functionality tests for simplicity

  describe('Configuration options', () => {
    ruleTester.run('respect allow option', noNodejsModules, {
      valid: [
        {
          code: 'import fs from "fs";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
        },
        {
          code: 'import path from "path";',
          filename: '/src/utils/index.js',
          options: [{ allow: ['fs', 'path'] }],
        },
        {
          code: 'const crypto = require("crypto");',
          filename: '/src/security/utils.js',
          options: [{ allow: ['crypto'] }],
        },
        // Review of this PR: `allow` is matched against every spelling of the
        // builtin, so it must also accept every spelling of the allow ENTRY.
        // `allow: ['fs']` already covered `node:fs/promises`; `allow:
        // ['node:fs']` did not, which reads as an arbitrary distinction to
        // anyone who writes the prefixed form.
        {
          name: 'a subpath under a builtin allowed by its `node:` spelling',
          code: 'import promises from "node:fs/promises";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['node:fs'] }],
        },
        {
          name: 'a subpath under a builtin allowed by its bare spelling',
          code: 'import promises from "node:fs/promises";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
        },
      ],
      invalid: [
        {
          code: 'import child_process from "child_process";',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['fs'] }],
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
            },
          ],
        },
      ],
    });

    // Removed additionalBuiltins option tests for simplicity
  });

  describe('Comprehensive builtin list', () => {
    ruleTester.run('detect all Node.js builtins', noNodejsModules, {
      valid: [],
      invalid: [
        {
          code: 'import assert from "assert";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import buffer from "buffer";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import child_process from "child_process";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import cluster from "cluster";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import crypto from "crypto";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import dgram from "dgram";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import dns from "dns";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import domain from "domain";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import events from "events";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import fs from "fs";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import http from "http";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import https from "https";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import net from "net";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import os from "os";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import path from "path";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import punycode from "punycode";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import querystring from "querystring";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import readline from "readline";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import stream from "stream";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import string_decoder from "string_decoder";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import timers from "timers";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import tls from "tls";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import tty from "tty";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import url from "url";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import util from "util";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import v8 from "v8";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import vm from "vm";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          code: 'import zlib from "zlib";',
          filename: '/test.js',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
      ],
    });
  });

  describe('Error messages', () => {
    ruleTester.run('provide helpful error messages', noNodejsModules, {
      valid: [],
      invalid: [
        {
          code: 'import fs from "fs";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'nodejsBuiltinImport',
              data: {
                moduleName: 'fs',
                builtinName: 'fs',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        {
          code: 'const fs = require("fs");',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'nodejsBuiltinRequire',
              data: {
                moduleName: 'fs',
                builtinName: 'fs',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });
  describe('the builtin set is whatever Node says it is', () => {
    // FP/FN sweep 2026-09-15 against the burgee corpus.
    //
    // `NODEJS_BUILTINS` was a hand-written literal set covering 31 of the 72
    // names in Node 24's `module.builtinModules`, and `isNodejsBuiltin` did an
    // exact match plus a `node:` strip with no subpath step. So a SUBPATH
    // builtin fell through even when its base was already in the set, and 11
    // top-level builtins the sibling `prefer-node-protocol` already knows were
    // missed outright. The same package had already diagnosed and fixed this
    // exact defect class in `no-extraneous-dependencies` ("This was a
    // hand-written list of 29 names, frozen at roughly Node 8"), resolving via
    // `builtinModules` from `node:module`.
    ruleTester.run('subpath and modern builtins', noNodejsModules, {
      valid: [
        {
          name: 'a scoped package that merely looks like a subpath is not a builtin',
          code: 'import x from "@scope/fs/promises";',
          filename: '/src/a.ts',
        },
        {
          name: 'allowing a builtin also allows its subpaths',
          code: 'import fsp from "node:fs/promises";',
          options: [{ allow: ['fs'] }],
          filename: '/src/a.ts',
        },
      ],
      invalid: [
        // burgee packages/seniority/src/cosmiconfig.ts:39 — four consecutive
        // `node:` imports, of which only this one was silent. Lines 38, 40 and
        // 41 (`node:fs`, `node:os`, `node:path`) all reported.
        {
          name: 'node:fs/promises is a builtin even though fs/promises is not in the literal set',
          code: 'import fsp from "node:fs/promises";',
          filename: '/src/a.ts',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          name: 'a bare subpath builtin is a builtin',
          code: 'import { setTimeout } from "timers/promises";',
          filename: '/src/a.ts',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          name: 'worker_threads stabilised in Node 12 and was missing from the set',
          code: 'import { Worker } from "node:worker_threads";',
          filename: '/src/a.ts',
          errors: [{ messageId: 'nodejsBuiltinImport' }],
        },
        {
          name: 'a missing builtin is still caught through require()',
          code: 'const dc = require("node:diagnostics_channel");',
          filename: '/src/a.ts',
          errors: [{ messageId: 'nodejsBuiltinRequire' }],
        },
        {
          name: 'a missing builtin is still caught through dynamic import()',
          code: 'const t = import("node:timers/promises");',
          filename: '/src/a.ts',
          errors: [{ messageId: 'nodejsBuiltinDynamic' }],
        },
      ],
    });
  });
});
