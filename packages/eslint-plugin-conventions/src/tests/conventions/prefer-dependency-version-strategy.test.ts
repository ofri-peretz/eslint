/**
 * Comprehensive tests for prefer-dependency-version-strategy rule
 * Development: Enforce consistent version strategy for dependencies
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as jsoncParser from 'jsonc-eslint-parser';
import { preferDependencyVersionStrategy } from '../../rules/conventions/prefer-dependency-version-strategy';

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

describe('prefer-dependency-version-strategy', () => {
  describe('Valid Code', () => {
    ruleTester.run(
      'valid - correct version strategy',
      preferDependencyVersionStrategy,
      {
        valid: [
          // Caret strategy (default)
          {
            name: 'a caret range',
            code: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'caret' }],
          },
          // Tilde strategy
          {
            name: 'a tilde range under the tilde strategy',
            code: 'const pkg = { dependencies: { "react": "~18.0.0" } };',
            options: [{ strategy: 'tilde' }],
          },
          // Exact strategy
          {
            name: 'an exact version under the exact strategy',
            code: 'const pkg = { dependencies: { "react": "18.0.0" } };',
            options: [{ strategy: 'exact' }],
          },
          // Workspace protocol (if allowed)
          {
            name: 'a workspace: protocol carries no version to caret',
            code: 'const pkg = { dependencies: { "package": "workspace:*" } };',
            options: [{ strategy: 'caret', allowWorkspace: true }],
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Invalid Code - Wrong Strategy', () => {
    ruleTester.run(
      'invalid - incorrect version strategy',
      preferDependencyVersionStrategy,
      {
        valid: [],
        invalid: [
          {
            name: 'a tilde range pins tighter than the strategy allows',
            code: 'const pkg = { dependencies: { "react": "~18.0.0" } };',
            options: [{ strategy: 'caret' }],
            errors: [{ messageId: 'preferStrategy' }],
            output: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
          },
          {
            code: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'tilde' }],
            errors: [{ messageId: 'preferStrategy' }],
            output: 'const pkg = { dependencies: { "react": "~18.0.0" } };',
          },
          {
            code: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'exact' }],
            errors: [{ messageId: 'preferStrategy' }],
            output: 'const pkg = { dependencies: { "react": "18.0.0" } };',
          },
        ],
      },
    );
  });

  describe('Options - Overrides', () => {
    ruleTester.run(
      'package-specific overrides',
      preferDependencyVersionStrategy,
      {
        valid: [
          {
            code: 'const pkg = { dependencies: { "react": "18.0.0", "lodash": "^4.0.0" } };',
            options: [
              {
                strategy: 'caret',
                overrides: { react: 'exact' },
              },
            ],
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Edge Cases', () => {
    // Lines 119-124: Invalid strategy validation
    // Note: This cannot be tested with RuleTester because ESLint validates the config schema
    // before the rule code executes. The rule's validation happens during rule creation,
    // but ESLint's schema validation prevents invalid options from reaching the rule.
    // This is actually correct behavior - invalid options should be caught by schema validation.
    // To test this, we would need integration tests that bypass schema validation.

    ruleTester.run(
      'edge cases - package.json properties',
      preferDependencyVersionStrategy,
      {
        valid: [
          // Test Property visitor for dependencies (lines 244-245)
          {
            code: 'const packageJson = { dependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'caret' }],
          },
          {
            code: 'const packageJson = { devDependencies: { "typescript": "^5.0.0" } };',
            options: [{ strategy: 'caret' }],
          },
          {
            code: 'const packageJson = { peerDependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'caret' }],
          },
          // Test Property visitor with non-ObjectExpression value (line 244)
          {
            name: 'a dependencies key whose value is not an object has no entries to read',
            code: 'const packageJson = { dependencies: "invalid" };',
            options: [{ strategy: 'caret' }],
          },
          // Test ObjectExpression with non-version values (line 257 - return false)
          {
            name: 'a name and a number are not version specifiers, so this is not a dependency map',
            code: 'const obj = { name: "test", value: 123 };',
            options: [{ strategy: 'caret' }],
          },
          {
            code: 'const obj = { text: "hello world" };',
            options: [{ strategy: 'caret' }],
          },
        ],
        invalid: [
          // Test Property visitor for dependencies with wrong strategy
          {
            code: 'const packageJson = { dependencies: { "react": "~18.0.0" } };',
            options: [{ strategy: 'caret' }],
            errors: [{ messageId: 'preferStrategy' }],
            output:
              'const packageJson = { dependencies: { "react": "^18.0.0" } };',
          },
          {
            code: 'const packageJson = { devDependencies: { "typescript": "^5.0.0" } };',
            options: [{ strategy: 'exact' }],
            errors: [{ messageId: 'preferStrategy' }],
            output:
              'const packageJson = { devDependencies: { "typescript": "5.0.0" } };',
          },
          {
            code: 'const packageJson = { peerDependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'tilde' }],
            errors: [{ messageId: 'preferStrategy' }],
            output:
              'const packageJson = { peerDependencies: { "react": "~18.0.0" } };',
          },
        ],
      },
    );

    ruleTester.run(
      'edge cases - range strategy',
      preferDependencyVersionStrategy,
      {
        valid: [
          {
            name: 'a two-operator range satisfies the range strategy',
            code: 'const pkg = { dependencies: { "react": ">=18.0.0 <19.0.0" } };',
            options: [{ strategy: 'range' }],
          },
          {
            name: 'an OR of two exact versions is a range',
            code: 'const pkg = { dependencies: { "react": "18.0.0 || 19.0.0" } };',
            options: [{ strategy: 'range' }],
          },
          {
            code: 'const pkg = { dependencies: { "react": "<=18.0.0" } };',
            options: [{ strategy: 'range' }],
          },
          {
            code: 'const pkg = { dependencies: { "react": ">18.0.0" } };',
            options: [{ strategy: 'range' }],
          },
          {
            name: 'a hyphen range is a range',
            code: 'const pkg = { dependencies: { "react": "18.0.0 - 19.0.0" } };',
            options: [{ strategy: 'range' }],
          },
        ],
        invalid: [
          // Lines 191-192: Range strategy - when version is just a version (not a range), suggest caret
          {
            code: 'const pkg = { dependencies: { "react": "18.0.0" } };',
            options: [{ strategy: 'range' }],
            errors: [{ messageId: 'preferStrategy' }],
            output: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
          },
        ],
      },
    );

    ruleTester.run(
      'edge cases - any strategy',
      preferDependencyVersionStrategy,
      {
        valid: [
          {
            code: 'const pkg = { dependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'any' }],
          },
          {
            code: 'const pkg = { dependencies: { "react": "~18.0.0" } };',
            options: [{ strategy: 'any' }],
          },
          {
            code: 'const pkg = { dependencies: { "react": "18.0.0" } };',
            options: [{ strategy: 'any' }],
          },
        ],
        invalid: [],
      },
    );
  });

  /**
   * The ObjectExpression fallback read ANY object literal holding a
   * version-like string as a dependency map. In burgee a package.json fixture
   * written by a test — `{ name: 'x', version: '1.0.0', main: 'index.js' }` —
   * and a vendoring record carrying `version: '1.0.0'` beside a repo URL and a
   * commit both reported `Dependency "version" should use caret version`, and
   * the rule was turned off for every test file. A dependency map is keyed by
   * package name and EVERY value is a version specifier; one value that is not
   * says the object is something else. See docs/intents/burgee-false-positives/.
   */
  describe('an object with a version field is not a dependency map (burgee)', () => {
    ruleTester.run('mixed object literals', preferDependencyVersionStrategy, {
      valid: [
        {
          name: 'FP: a package.json fixture written by a test',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'writeFileSync(join(plain, "package.json"), JSON.stringify({ name: "x", version: "1.0.0", main: "index.js" }));',
        },
        {
          name: 'FP: a record with a version beside a repo, a tag and a count',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'const record = (over) => ({ repo: "r", version: "1.0.0", tag: "v1.0.0", commit: "a".repeat(40), vendored: "2026-09-07", files: 1, internalFiles: [], ...over });',
        },
        {
          name: 'a manifest whose dependencies are correct, with its own version field',
          code: 'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "^18.0.0" } };',
        },
        {
          // @source burgee packages/compat-oracle/src/watch.test.ts:99
          // The sealed guard above asks only whether EVERY value is a version
          // specifier, so it passes vacuously the moment there is no
          // disqualifying sibling left. A manifest's own `version` is the
          // thing being versioned, not a thing depended on, and `^1.0.0`
          // there is not a publishable manifest.
          // @found real-source scan (burgee)
          name: 'FP: a single-property manifest fragment is not a dependency map',
          code: 'const m = { version: "1.0.0" };',
        },
        {
          // @source burgee packages/compat-oracle/src/registry.test.ts:74
          // An npm dist-tags map: keys are TAG names, values are the exact
          // versions each tag resolves to. A dist-tag resolves to one
          // published version, so a caret there is not a thing npm accepts.
          // @found real-source scan (burgee)
          name: 'FP: an npm dist-tags map is keyed by tag, not by package',
          code: 'const packument = { name: "x", "dist-tags": { latest: "2.1.0", next: "3.0.0-beta.1" } };',
        },
        {
          // @source burgee packages/burgee/src/compat.ts (PR #517)
          // Package names to the exact versions a compatibility oracle graded.
          // Every key is a package name and every value is a version, so no
          // amount of looking at the object's shape tells it apart from a
          // dependency map. Only a manifest says so: a `dependencies`-family
          // key. Exact is the point here; a caret would claim grades the
          // oracle never ran.
          // @found real-source scan (burgee)
          name: 'FP: an exported record of graded exact versions is not a manifest',
          filename: 'compat.ts',
          code: `export const GRADED_VERSIONS: Readonly<Record<string, string>> = {
  '@clack/prompts': '1.8.1',
  chalk: '6.0.0',
};`,
        },
        {
          // A key chosen at RUNTIME names nothing, so it is no evidence of a
          // manifest. This used to be an invalid case, back when any object of
          // package names to versions counted as a dependency map. The rule no
          // longer guesses from shape; see the GRADED_VERSIONS case above.
          name: 'a block whose key is chosen at runtime is not evidence of a manifest',
          code: 'const m = { [k]: { react: "18.0.0" } };',
        },
        {
          name: 'a spread inside a dependencies block is skipped, not read as an entry',
          code: 'const pkg = { dependencies: { ...base, react: "^18.0.0" } };',
        },
        {
          name: 'a version held in a variable has no literal to read or rewrite',
          code: 'const pkg = { dependencies: { react: reactVersion } };',
        },
      ],
      invalid: [
        {
          name: 'a homogeneous dependency map still reports the odd one out',
          code: 'const pkg = { dependencies: { react: "18.0.0", lodash: "^4.17.21" } };',
          output:
            'const pkg = { dependencies: { react: "^18.0.0", lodash: "^4.17.21" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'dist-tags and a wildcard are version specifiers too',
          code: 'const pkg = { dependencies: { react: "18.0.0", foo: "latest", bar: "*" } };',
          output:
            'const pkg = { dependencies: { react: "^18.0.0", foo: "latest", bar: "*" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'the dependencies block INSIDE a manifest still reports, and the manifest itself does not',
          code: 'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "18.0.0" } };',
          output:
            'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "^18.0.0" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'a map mixing a workspace link with a bare version',
          code: 'const pkg = { dependencies: { app: "workspace:*", react: "18.0.0" } };',
          output:
            'const pkg = { dependencies: { app: "workspace:*", react: "^18.0.0" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'optionalDependencies is a dependency map too',
          code: 'const pkg = { optionalDependencies: { fsevents: "2.3.3" } };',
          output:
            'const pkg = { optionalDependencies: { fsevents: "^2.3.3" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
      ],
    });
  });

  /**
   * The docs configure this rule for every `package.json` through
   * `jsonc-eslint-parser`, which emits `JSONProperty` / `JSONLiteral` rather
   * than ESTree nodes. The ESTree-only selectors never matched them, so the
   * documented setup reported nothing at all.
   */
  describe('a real package.json through jsonc-eslint-parser', () => {
    const jsonTester = new RuleTester({
      languageOptions: { parser: jsoncParser },
    });
    jsonTester.run('package.json', preferDependencyVersionStrategy, {
      valid: [
        {
          name: "a manifest's own version and its engines are not dependencies",
          filename: 'package.json',
          code: '{ "name": "x", "version": "1.0.0", "engines": { "node": "24.0.0" }, "dependencies": { "react": "^18.0.0" } }',
        },
      ],
      invalid: [
        {
          name: 'a bare version under dependencies in package.json',
          filename: 'package.json',
          code: '{ "name": "x", "version": "1.0.0", "dependencies": { "react": "18.0.0" } }',
          output:
            '{ "name": "x", "version": "1.0.0", "dependencies": { "react": "^18.0.0" } }',
          errors: [{ messageId: 'preferStrategy' }],
        },
      ],
    });
  });

  // ── FP sealed 2026-09-16, from the burgee FP/FN sweep ───────────────────
  // Under the default `caret` strategy the fixer stripped a RANGE OPERATOR as
  // if it were a prefix. `<2.0.0` became `^2.0.0`, and the two are disjoint:
  // `semver.intersects('<2.0.0', '^2.0.0') === false`. An unattended `--fix`
  // installed the major the author had pinned away from. `1.0.0 - 2.0.0`
  // became `^1.0.0 - 2.0.0`, which `semver.validRange` rejects outright.
  //
  // It was never a policy either — the `/^[\^~<>=]?\d+/` gate admits one
  // operator character, so `>=1.0.0 <2.0.0` (this rule's own documented
  // example of a range) was already exempt while its one-character cousins
  // were rewritten.
  describe('range specifiers are not caret-able', () => {
    ruleTester.run(
      'prefer-dependency-version-strategy',
      preferDependencyVersionStrategy,
      {
        valid: [
          {
            // @found spec diff (semver)
            name: 'FP: an exclusive upper bound is not rewritten to a caret',
            code: 'export const pkg = { dependencies: { legacy: "<2.0.0" } };',
          },
          {
            // @found spec diff (semver)
            name: 'FP: a lower bound is not rewritten to a caret',
            code: 'export const pkg = { dependencies: { legacy: ">1.0.0" } };',
          },
          {
            // @found spec diff (semver)
            name: 'FP: a hyphen range is not rewritten into an invalid range',
            code: 'export const pkg = { dependencies: { legacy: "1.0.0 - 2.0.0" } };',
          },
        ],
        invalid: [
          {
            // CONTROL — a plain version is still caret-ed. The fix must not
            // turn into "stop reporting anything with a digit in it".
            name: 'CONTROL: a bare version is still rewritten to a caret',
            code: 'export const pkg = { dependencies: { react: "18.0.0" } };',
            output:
              'export const pkg = { dependencies: { react: "^18.0.0" } };',
            errors: [{ messageId: 'preferStrategy' }],
          },
        ],
      },
    );
  });
});
