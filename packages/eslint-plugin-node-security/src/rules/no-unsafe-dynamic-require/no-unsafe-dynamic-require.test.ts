/**
 * Comprehensive tests for no-unsafe-dynamic-require rule
 * Security: CWE-95 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from './index';

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

/**
 * The pre-inversion contract: any non-literal specifier is a finding.
 *
 * Measured on the 8-repo corpus that produced 14 findings and zero code
 * injections — all of it build tooling resolving files in its own repo. The
 * default now requires evidence that an attacker names the module; these cases
 * keep pinning the callee/argument plumbing through the restoring option.
 */
const UNRESOLVED = [{ reportUnresolvedSpecifiers: true }];

describe('no-unsafe-dynamic-require', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - static require', noUnsafeDynamicRequire, {
      valid: [
        // Static require with string literal
        {
          code: 'const fs = require("fs");',
        },
        {
          code: 'const path = require("path");',
        },
        {
          code: 'const module = require("./local-module");',
        },
        // Template literal with no expressions
        {
          code: 'const fs = require(`fs`);',
        },
        {
          code: 'const path = require(`./utils/path`);',
        },
        // Not a require call
        {
          code: 'const result = myFunction(moduleName);',
        },
        {
          code: 'const obj = { require: () => {} }; obj.require(name);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dynamic Require', () => {
    ruleTester.run('invalid - dynamic require calls', noUnsafeDynamicRequire, {
      valid: [],
      invalid: [
        {
          code: 'const module = require(moduleName);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const mod = require(userInput);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'require(`./modules/${moduleName}`);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'require(`./${dir}/${file}`);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: `
            const moduleName = getUserInput();
            const mod = require(moduleName);
          `,
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const mod = require(config.moduleName);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', noUnsafeDynamicRequire, {
      valid: [],
      invalid: [
        {
          code: 'const mod = require(moduleName);',
          options: UNRESOLVED,
          errors: [
            {
              messageId: 'unsafeDynamicRequire',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noUnsafeDynamicRequire, {
      valid: [
        // Empty require (should not trigger)
        {
          code: 'require();',
        },
        // Spread element (should not trigger)
        {
          code: 'require(...args);',
        },
      ],
      invalid: [
        {
          code: '(require)(moduleName);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const req = require; req(moduleName);',
          options: UNRESOLVED,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  describe('Options - allowDynamicImport', () => {
    ruleTester.run('allowDynamicImport option', noUnsafeDynamicRequire, {
      valid: [
        // Note: This option is for import(), not require()
        // So require() should still be flagged even with this option
      ],
      invalid: [
        {
          code: 'const mod = require(moduleName);',
          options: [{ allowDynamicImport: true, reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  // ── The inversion ──────────────────────────────────────────────────────
  // Every `valid` case is a verbatim shape from the 8-repo corpus scan and
  // reported before this change.
  describe('Build-time Specifiers Are Not Code Injection', () => {
    ruleTester.run('taint required by default', noUnsafeDynamicRequire, {
      valid: [
        // okta/okta-signin-widget scripts/find-internal-packages.js:7,11.
        `const ROOT = '/repo'; const packageJson = require(path.resolve(ROOT, 'package.json'));`,
        // okta/okta-signin-widget .../generate-language-config.js:6.
        `const ROOT_DIR = '/repo'; const packageJson = require(ROOT_DIR + '/package.json');`,
        // auth0/express-openid-connect end-to-end/fixture/helpers.js:23 — the
        // specifier is a parameter, so its provenance is a caller-side fact.
        `function load(name) { return require(path.join('..', '..', 'examples', name)); }`,
        // okta/okta-signin-widget playground/mocks/config/networkFailureHelper.js:115.
        `function readMock(filePath) { return require(filePath); }`,
        // okta/okta-auth-js .../express-embedded-sign-in-widget/web-server/server.js:81.
        `const widgetDir = __dirname; const widgetPackage = require(path.resolve(widgetDir, 'package.json'));`,
      ],
      invalid: [
        // The shape CWE-95 is actually about: the module name is chosen by
        // whoever is talking to the process.
        {
          code: `app.get('/load', (req, res) => { const mod = require(req.query.name); });`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // argv names the module.
        {
          code: `const plugin = require(process.argv[2]);`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // Traced one hop through a binding, and interpolated rather than
        // passed whole — neither launders the taint.
        {
          code: `function boot(req) {
                   const name = req.body.plugin;
                   return require(\`./plugins/\${name}\`);
                 }`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // `taintSources` is configurable.
        {
          code: `function boot(payload) { return require(payload.mod); }`,
          options: [{ taintSources: ['payload'] }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  // ── Rule-corpus regressions ────────────────────────────────────────────
  // benchmarks/rule-corpus/node-security__no-unsafe-dynamic-require
  describe('Corpus regressions', () => {
    ruleTester.run('corpus', noUnsafeDynamicRequire, {
      valid: [
        // A `const` bound to a literal is that literal, whatever it is called.
        // webpack's resolver API names a specifier `request`, which collides
        // with a taint ROOT — and the roots are matched by name.
        `const request = './loaders/babel-loader.js'; const loader = require(request);`,
        `const event = \`./handlers/build\`; require(event);`,
        // A bare parameter is a caller-side fact. `readMock(filePath)` above is
        // already silent; naming the same parameter `request` must not change
        // the verdict.
        `function resolveLoader(request) { return require(request); }`,
        `const load = (ctx) => require(ctx);`,
        // Every write is a literal the program wrote; the request picks a
        // branch, never a path.
        `function serializerFor(req) {
           let serializer = './serializers/json';
           if (req.headers.accept === 'application/xml') { serializer = './serializers/xml'; }
           return require(serializer);
         }`,
        // Specifier out of the program's own config — unresolved, and
        // unresolved is silent by default.
        `const { adapter } = require('./config.json'); const store = require(adapter);`,
        // import(): static, allowlisted, and opted out.
        `const en = await import('./locales/en-US.json');`,
        `const m = await import(\`./locales/en.json\`);`,
        `const T = { csv: './csv' }; const m = await import(T[req.query.f]);`,
        {
          code: `const m = await import(req.params.name);`,
          options: [{ allowDynamicImport: true }],
        },
        // Neither of these is the CJS loader.
        `const mod = registry.load(req.query.name);`,
        `const mod = obj[key](req.query.name);`,
        `const mod = module.load(req.query.name);`,
        // A callee that is neither an identifier nor a member expression.
        `const mod = getRequire()(req.query.name);`,
      ],
      invalid: [
        // The ESM spelling of the same loader. `allowDynamicImport` was
        // declared, schema'd, defaulted to the stricter value — and never read,
        // so this was silent in every configuration.
        {
          code: `router.post('/activate', async (req) => { const plugin = await import(req.params.name); });`,
          errors: [{ messageId: 'unsafeDynamicImport' }],
        },
        {
          code: `const mod = await import(moduleName);`,
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicImport' }],
        },
        // `module.require` is the same loader through the module object.
        {
          code: `const reporter = module.require(req.query.reporter);`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // `createRequire` is how ESM reaches the CJS loader — the same binding
        // as `const load = require`, one call deeper.
        {
          code: `const requireCjs = createRequire(import.meta.url); const t = requireCjs(req.body.transform);`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // The const-resolution above must not swallow a const bound to taint.
        {
          code: `const request = req.query.name; const mod = require(request);`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // A `let` is not a constant: the last write before the call decides.
        {
          code: `let request = './a'; request = req.query.name; const mod = require(request);`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // The parameter carve-out is "unresolved", not "safe": the option that
        // restores the sweep still reports it.
        {
          code: `function resolveLoader(request) { return require(request); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });
});
