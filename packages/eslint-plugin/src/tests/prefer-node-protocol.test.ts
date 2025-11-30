/**
 * Comprehensive tests for prefer-node-protocol rule
 * Prefer using the node: protocol when importing Node.js builtin modules
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferNodeProtocol } from '../rules/architecture/prefer-node-protocol';

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

describe('prefer-node-protocol', () => {
  describe('ES6 import statements', () => {
    ruleTester.run('detect Node.js builtin imports without node: protocol', preferNodeProtocol, {
      valid: [
        // Already using node: protocol
        {
          code: 'import fs from "node:fs";',
        },
        {
          code: 'import { readFile } from "node:path";',
        },
        {
          code: 'import * as crypto from "node:crypto";',
        },
        // Non-builtin modules
        {
          code: 'import lodash from "lodash";',
        },
        {
          code: 'import React from "react";',
        },
        // Scoped packages
        {
          code: 'import { Component } from "@mui/material";',
        },
        // Relative imports
        {
          code: 'import helper from "./utils/helper";',
        },
        {
          code: 'import config from "../config";',
        },
      ],
      invalid: [
        // fs module without node: protocol
        {
          code: 'import fs from "fs";',
          output: 'import fs from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
                fix: 'Change "fs" to "node:fs"',
              },
            },
          ],
        },
        // path module
        {
          code: 'import path from "path";',
          output: 'import path from "node:path";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'path',
              },
            },
          ],
        },
        // crypto module
        {
          code: 'import crypto from "crypto";',
          output: 'import crypto from "node:crypto";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'crypto',
              },
            },
          ],
        },
        // Named imports
        {
          code: 'import { readFileSync } from "fs";',
          output: 'import { readFileSync } from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
              },
            },
          ],
        },
        // Namespace imports
        {
          code: 'import * as fs from "fs";',
          output: 'import * as fs from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Require calls', () => {
    ruleTester.run('detect Node.js builtin requires without node: protocol', preferNodeProtocol, {
      valid: [
        // Already using node: protocol
        {
          code: 'const fs = require("node:fs");',
        },
        {
          code: 'const { join } = require("node:path");',
        },
        // Non-builtin modules
        {
          code: 'const lodash = require("lodash");',
        },
        // Dynamic requires (not handled by this rule)
        {
          code: 'const module = require(variable);',
        },
      ],
      invalid: [
        // fs module
        {
          code: 'const fs = require("fs");',
          output: 'const fs = require("node:fs");',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
              },
            },
          ],
        },
        // path module
        {
          code: 'const path = require("path");',
          output: 'const path = require("node:path");',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'path',
              },
            },
          ],
        },
        // Destructuring require
        {
          code: 'const { readFile } = require("fs");',
          output: 'const { readFile } = require("node:fs");',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Dynamic imports', () => {
    ruleTester.run('detect Node.js builtin dynamic imports without node: protocol', preferNodeProtocol, {
      valid: [
        // Already using node: protocol
        {
          code: 'const fs = await import("node:fs");',
        },
        // Non-builtin modules
        {
          code: 'const lodash = await import("lodash");',
        },
      ],
      invalid: [
        // fs module
        {
          code: 'const fs = await import("fs");',
          output: 'const fs = await import("node:fs");',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'fs',
              },
            },
          ],
        },
        // path module
        {
          code: 'const path = await import("path");',
          output: 'const path = await import("node:path");',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'path',
              },
            },
          ],
        },
      ],
    });
  });

  describe('All Node.js built-in modules', () => {
    ruleTester.run('handle all Node.js built-in modules', preferNodeProtocol, {
      valid: [
        // Already using node: protocol
        {
          code: 'import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";',
        },
      ],
      invalid: [
        // All major built-ins without node: protocol
        {
          code: 'import fs from "fs"; import path from "path"; import crypto from "crypto"; import http from "http"; import https from "https";',
          output: 'import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import http from "node:http"; import https from "node:https";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'crypto' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'http' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'https' },
            },
          ],
        },
        // Sub-path imports
        {
          code: 'import { promises } from "fs";',
          output: 'import { promises } from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
          ],
        },
        {
          code: 'import { posix } from "path";',
          output: 'import { posix } from "node:path";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
          ],
        },
      ],
    });
  });

  describe('Additional modules option', () => {
    ruleTester.run('handle additional modules configuration', preferNodeProtocol, {
      valid: [
        // Configured additional module with node: protocol
        {
          code: 'import myModule from "node:my-custom-module";',
          options: [{ additionalModules: ['my-custom-module'] }],
        },
      ],
      invalid: [
        // Additional module without node: protocol
        {
          code: 'import myModule from "my-custom-module";',
          options: [{ additionalModules: ['my-custom-module'] }],
          output: 'import myModule from "node:my-custom-module";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: {
                moduleName: 'my-custom-module',
              },
            },
          ],
        },
        // Multiple additional modules
        {
          code: 'import mod1 from "custom-mod1"; import mod2 from "custom-mod2";',
          options: [{ additionalModules: ['custom-mod1', 'custom-mod2'] }],
          output: 'import mod1 from "node:custom-mod1"; import mod2 from "node:custom-mod2";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'custom-mod1' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'custom-mod2' },
            },
          ],
        },
      ],
    });
  });

  describe('Complex import patterns', () => {
    ruleTester.run('handle complex import scenarios', preferNodeProtocol, {
      valid: [
        // Dynamic imports with expressions (not handled)
        {
          code: 'const module = import(`${basePath}/module`);',
        },
        // Template literals in require (not handled)
        {
          code: 'const fs = require(`fs`);',
        },
      ],
      invalid: [
        // Mixed imports (some valid, some not)
        {
          code: 'import fs from "node:fs"; import path from "path";',
          output: 'import fs from "node:fs"; import path from "node:path";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
          ],
        },
      ],
      invalid: [
        // Multiple statements with violations
        {
          code: `
            import fs from "fs";
            import path from "path";
            const crypto = require("crypto");
            const util = await import("util");
          `,
          output: `
            import fs from "node:fs";
            import path from "node:path";
            const crypto = require("node:crypto");
            const util = await import("node:util");
          `,
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'crypto' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'util' },
            },
          ],
        },
        // Import with type keyword (TypeScript)
        {
          code: 'import type { ReadStream } from "fs";',
          output: 'import type { ReadStream } from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', preferNodeProtocol, {
      valid: [
        // TypeScript with node: protocol
        {
          code: 'import * as fs from "node:fs";',
          filename: '/src/file.ts',
        },
        // Type-only imports with node: protocol
        {
          code: 'import type { PathLike } from "node:fs";',
          filename: '/src/file.ts',
        },
      ],
      invalid: [
        // TypeScript without node: protocol
        {
          code: 'import fs from "fs";',
          filename: '/src/file.ts',
          output: 'import fs from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
          ],
        },
        // TypeScript type imports
        {
          code: 'import type { Stats } from "fs";',
          filename: '/src/file.ts',
          output: 'import type { Stats } from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
          ],
        },
      ],
    });
  });

  describe('Real-world usage patterns', () => {
    ruleTester.run('handle real-world Node.js module usage', preferNodeProtocol, {
      valid: [
        // Common Node.js patterns with node: protocol
        {
          code: `
            import { readFile } from "node:fs/promises";
            import { join } from "node:path";
            import { createServer } from "node:http";
          `,
        },
        // File system operations
        {
          code: `
            import fs from "node:fs";
            import path from "node:path";

            const filePath = path.join(__dirname, "file.txt");
            fs.readFileSync(filePath, "utf8");
          `,
        },
      ],
      invalid: [
        // Common Node.js server setup
        {
          code: `
            import http from "http";
            import https from "https";
            import crypto from "crypto";
            import fs from "fs";
            import path from "path";

            const server = http.createServer((req, res) => {
              const filePath = path.join(__dirname, req.url);
              const content = fs.readFileSync(filePath);
              const hash = crypto.createHash('sha256').update(content).digest('hex');
              res.end(hash);
            });
          `,
          output: `
            import http from "node:http";
            import https from "node:https";
            import crypto from "node:crypto";
            import fs from "node:fs";
            import path from "node:path";

            const server = http.createServer((req, res) => {
              const filePath = path.join(__dirname, req.url);
              const content = fs.readFileSync(filePath);
              const hash = crypto.createHash('sha256').update(content).digest('hex');
              res.end(hash);
            });
          `,
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'http' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'https' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'crypto' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
          ],
        },
        // Express.js style application
        {
          code: `
            const express = require("express");
            const fs = require("fs");
            const path = require("path");
            const crypto = require("crypto");

            const app = express();

            app.get("/file/:name", (req, res) => {
              const filePath = path.join(__dirname, req.params.name);
              const content = fs.readFileSync(filePath);
              const etag = crypto.createHash('md5').update(content).digest('hex');
              res.set('ETag', etag).send(content);
            });
          `,
          output: `
            const express = require("express");
            const fs = require("node:fs");
            const path = require("node:path");
            const crypto = require("node:crypto");

            const app = express();

            app.get("/file/:name", (req, res) => {
              const filePath = path.join(__dirname, req.params.name);
              const content = fs.readFileSync(filePath);
              const etag = crypto.createHash('md5').update(content).digest('hex');
              res.set('ETag', etag).send(content);
            });
          `,
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'path' },
            },
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'crypto' },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', preferNodeProtocol, {
      valid: [
        // Empty imports
        {
          code: 'import "some-side-effect";',
        },
        // Import assertions (future JS feature)
        {
          code: 'import json from "./data.json" assert { type: "json" };',
        },
        // Dynamic imports with expressions
        {
          code: 'const module = import(getModuleName());',
        },
      ],
      valid: [
        // Module names that start with node: (already correct)
        {
          code: 'import fs from "node:fs";',
        },
      ],
      invalid: [
        // Case variations (fs vs FS) - handled case-insensitively
        {
          code: 'import fs from "FS";',
          output: 'import fs from "node:FS";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'FS' },
            },
          ],
        },
      ],
    });
  });

  describe('Performance considerations', () => {
    ruleTester.run('consider performance implications', preferNodeProtocol, {
      valid: [
        // node: protocol is generally faster and more explicit
        {
          code: 'import fs from "node:fs";',
        },
      ],
      invalid: [
        // Legacy imports are flagged for modernization
        {
          code: 'import fs from "fs";',
          output: 'import fs from "node:fs";',
          errors: [
            {
              messageId: 'preferNodeProtocol',
              data: { moduleName: 'fs' },
            },
          ],
        },
      ],
    });
  });
});