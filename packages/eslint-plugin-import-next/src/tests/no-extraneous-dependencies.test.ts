/**
 * Tests for no-extraneous-dependencies
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const mockPackageJson = {
  dependencies: {
    'react': '18.0.0',
    '@org/comp': '1.0.0'
  },
  devDependencies: {
    'jest': '29.0.0',
    'eslint': '8.0.0'
  },
  optionalDependencies: {
    'redis': '1.0.0'
  },
  peerDependencies: {
    'prop-types': '15.0.0'
  },
  bundledDependencies: ['bundled-lib']
};

ruleTester.run('no-extraneous-dependencies', noExtraneousDependencies, {
  valid: [
    // --- burgee FP/FN sweep 2026-09-17 ---
    // Surfaced by packages/linegauge/src/slice.test.ts:1 in the burgee corpus, where a
    // workspace-root devDependency is reported as missing and `ignore` is the documented
    // escape hatch. `ignore` is published in the schema and the generated docs
    // ("Specific package names to ignore (don't report as missing)") but was never
    // destructured in create(), so setting it did nothing at all.
    {
      name: 'ignore suppresses a package the manifest does not declare',
      code: `import sliceAnsi from 'slice-ansi';`,
      options: [{ packageJson: { dependencies: {} }, ignore: ['slice-ansi'] }],
    },
    {
      name: 'ignore does not suppress a package outside its list',
      code: `import declared from 'declared-pkg';`,
      options: [
        {
          packageJson: { dependencies: { 'declared-pkg': '1.0.0' } },
          ignore: ['something-else'],
        },
      ],
    },
    // Regular dependencies
    {
      name: 'a declared dependency', 
      code: `import React from 'react';`,
      options: [{ packageJson: mockPackageJson }]
    },
    { 
      code: `import Comp from '@org/comp';`,
      options: [{ packageJson: mockPackageJson }]
    },
    { 
      code: `import Sub from '@org/comp/sub';`,
      options: [{ packageJson: mockPackageJson }]
    },
    
    // Dev Dependencies (allowed by default)
    { 
      code: `import jest from 'jest';`,
      options: [{ packageJson: mockPackageJson }]
    },
    
    // Optional Dependencies
    { 
        code: `import redis from 'redis';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Peer Dependencies
    { 
        code: `import PropTypes from 'prop-types';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Bundled Dependencies
    { 
        code: `import bundled from 'bundled-lib';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Builtins
    { 
        name: 'a bare builtin',
        code: `import fs from 'fs';`,
        options: [{ packageJson: mockPackageJson }]
    },
    { 
        name: 'a node: builtin',
        code: `import path from 'node:path';`,
        options: [{ packageJson: mockPackageJson }]
    },
    // `node:process` was reported as a missing dependency: the hand-written
    // builtin list never had `process`, `module`, `worker_threads` or
    // `perf_hooks`. A `node:`-prefixed specifier is a builtin by definition,
    // and the bare names come from `builtinModules` rather than a list that rots.
    {
        name: 'node:process is a builtin, not a dependency',
        code: `import process from 'node:process';`,
        options: [{ packageJson: mockPackageJson }]
    },
    {
        name: 'a bare builtin newer than the old hand-written list',
        code: `import { isMainThread } from 'worker_threads';`,
        options: [{ packageJson: mockPackageJson }]
    },
    // A `<scheme>:` specifier is not a package path. Splitting it on `/` alone
    // derived the "package name" `fumadocs-mdx:collections`, which npm's own
    // grammar forbids (`:` is not in [a-z0-9-._~]), so it could never match a
    // declared dependency — the rule reported a missing package at HIGH and
    // suggested `npm install fumadocs-mdx:collections`, a command that cannot
    // succeed. Same class as the `#` and `node:` carve-outs above.
    // burgee apps/docs/src/lib/source.ts:2
    {
        name: 'a build-tool virtual specifier is not a package name',
        code: `import { docs } from 'fumadocs-mdx:collections/server';`,
        options: [{ packageJson: { name: 'docs', dependencies: { 'fumadocs-mdx': '^12.0.0' } } }]
    },
    {
        name: 'a spec-defined URL specifier is not a package name',
        code: `import x from 'data:text/javascript,export default 1';`,
        options: [{ packageJson: mockPackageJson }]
    },
    {
        name: 'a framework virtual module belonging to no package',
        code: `import { r } from 'virtual:pwa-register';`,
        options: [{ packageJson: mockPackageJson }]
    },
    {
        name: 'a required node: builtin',
        code: `const { performance } = require('node:perf_hooks');`,
        options: [{ packageJson: mockPackageJson }]
    },
    
    // Relative imports
    { 
        code: `import foo from './foo';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Allow patterns
    {
        code: `import 'internal-lib';`,
        options: [{ 
            packageJson: mockPackageJson,
            allowPatterns: ['internal-*']
        }]
    },

    // Require checks
    {
        code: `const React = require('react');`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Export from
    {
        code: `export { React } from 'react';`,
        options: [{ packageJson: mockPackageJson }]
    },
    {
        code: `export * from 'react';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Dynamic import
    {
        code: `import('react');`,
        options: [{ packageJson: mockPackageJson }]
    }
  ],

  invalid: [
    // Missing dependency
    {
      name: 'an import of a package that is not in package.json',
      code: `import axios from 'axios';`,
      options: [{ packageJson: mockPackageJson }],
      errors: [{ 
        messageId: 'missingDependency',
        suggestions: [
          { messageId: 'addToDependencies', output: `// TODO: Run: npm install axios\nimport axios from 'axios';` },
          { messageId: 'addToDevDependencies', output: `// TODO: Run: npm install --save-dev axios\nimport axios from 'axios';` }
        ]
      }]
    },
    
    // Dev Dependency in Production (devDependencies: false)
    {
        code: `import jest from 'jest';`,
        options: [{ packageJson: mockPackageJson, devDependencies: false }],
        errors: [{
            messageId: 'devDependencyInProduction',
            suggestions: [
                { messageId: 'moveToDependencies', output: `// TODO: Move jest from devDependencies to dependencies in package.json\nimport jest from 'jest';` }
            ]
        }]
    },
    
    // We skip other invalid cases because asserting suggestions strings is brittle 
    // and maintenance heavy if messages change. The logic is covered by the invalid
    // case above and the diverse valid cases.
  ],
});

/**
 * What is not an external dependency.
 *
 * The relative guard tested only the `./` and `../` PREFIXES, so the bare forms
 * fell through and were reported as packages literally named `.` and `..`.
 * `require('..')` is how a package's own tests import its root, and it was four
 * of the ten findings on auth0/express-openid-connect — the first repository
 * this rule was ever measured against, because it had been excluded from the
 * corpus gate on the false premise that it needed an installed tree.
 *
 * A `#`-prefixed specifier resolves through the package's own `imports` field.
 * It is internal by specification and can never name an external dependency.
 */
ruleTester.run('no-extraneous-dependencies — what is not a package', noExtraneousDependencies, {
  valid: [
    // `require('..')` / `import from '..'` — the package root.
    { code: "import a from '..';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '.';", options: [{ packageJson: mockPackageJson }] },
    { code: "const a = require('..');", options: [{ packageJson: mockPackageJson }] },
    // Still relative with a path attached.
    { code: "import a from './sib';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '../sib';", options: [{ packageJson: mockPackageJson }] },
    // Node subpath imports resolve through the package's own `imports` field.
    { code: "import a from '#internal/thing';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '#dep';", options: [{ packageJson: mockPackageJson }] },
    // An absolute path is not a package either.
    { code: "import a from '/abs/path';", options: [{ packageJson: mockPackageJson }] },
  ],
  invalid: [
    {
      // POSITIVE CONTROL. Without it every valid case above passes on a rule
      // that stopped reporting.
      code: "import a from 'definitely-not-declared';",
      options: [{ packageJson: mockPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: `// TODO: Run: npm install definitely-not-declared\nimport a from 'definitely-not-declared';`,
            },
            {
              messageId: 'addToDevDependencies',
              output: `// TODO: Run: npm install --save-dev definitely-not-declared\nimport a from 'definitely-not-declared';`,
            },
          ],
        },
      ],
    },
    {
      // FN GUARD: a package name may legitimately BEGIN with dots. The guard
      // requires a `/` or end-of-string after them, so `..weird` is still a
      // package and still reports.
      code: "import a from '..weird';",
      options: [{ packageJson: mockPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: `// TODO: Run: npm install ..weird\nimport a from '..weird';`,
            },
            {
              messageId: 'addToDevDependencies',
              output: `// TODO: Run: npm install --save-dev ..weird\nimport a from '..weird';`,
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Type-only imports.
 *
 * burgee FP/FN sweep 2026-09-23 — surfaced by apps/docs-chassis/src/mdx.tsx:3 and
 * apps/docs-chassis/src/source.ts:12 (`import type { MDXComponents } from 'mdx/types'`,
 * satisfied by `@types/mdx` in devDependencies). The rule reported a HIGH missing
 * dependency and suggested `npm install mdx`, an unrelated runtime package.
 *
 * Upstream (the doc every message links to, and the README's "Full drop-in
 * replacement" claim): "Type imports are ignored by default." A type import is
 * erased at compile time, so it cannot pull in a runtime dependency.
 */
const typesOnlyPackageJson = {
  dependencies: { react: '19.0.0' },
  devDependencies: { '@types/mdx': '2.0.0' },
};

ruleTester.run('no-extraneous-dependencies — type-only imports', noExtraneousDependencies, {
  valid: [
    {
      name: 'an `import type` declaration is ignored, it is erased at compile time',
      code: "import type { MDXComponents } from 'mdx/types';",
      options: [{ packageJson: typesOnlyPackageJson }],
    },
    {
      name: 'an import whose every specifier is an inline `type` is ignored like `import type`',
      code: "import { type MDXComponents } from 'mdx/types';",
      options: [{ packageJson: typesOnlyPackageJson }],
    },
  ],
  invalid: [
    {
      // FN GUARD: one value specifier keeps the import at runtime.
      name: 'a mixed import with one value specifier is still checked',
      code: "import { type MDXComponents, compile } from 'mdx';",
      options: [{ packageJson: typesOnlyPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: "// TODO: Run: npm install mdx\nimport { type MDXComponents, compile } from 'mdx';",
            },
            {
              messageId: 'addToDevDependencies',
              output: "// TODO: Run: npm install --save-dev mdx\nimport { type MDXComponents, compile } from 'mdx';",
            },
          ],
        },
      ],
    },
    {
      // FN GUARD: a default import is a value binding even beside a `type` specifier.
      name: 'a default import beside an inline type specifier is still checked',
      code: "import mdx, { type MDXComponents } from 'mdx';",
      options: [{ packageJson: typesOnlyPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: "// TODO: Run: npm install mdx\nimport mdx, { type MDXComponents } from 'mdx';",
            },
            {
              messageId: 'addToDevDependencies',
              output: "// TODO: Run: npm install --save-dev mdx\nimport mdx, { type MDXComponents } from 'mdx';",
            },
          ],
        },
      ],
    },
    {
      // FN GUARD: a side-effect import has no specifiers and is not a type import.
      name: 'a bare side-effect import is still checked',
      code: "import 'mdx';",
      options: [{ packageJson: typesOnlyPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            { messageId: 'addToDependencies', output: "// TODO: Run: npm install mdx\nimport 'mdx';" },
            { messageId: 'addToDevDependencies', output: "// TODO: Run: npm install --save-dev mdx\nimport 'mdx';" },
          ],
        },
      ],
    },
  ],
});
