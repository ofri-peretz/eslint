/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * prefer-dependency-version-strategy
 *
 * Enforces a consistent version-specifier strategy (caret, tilde, exact, etc.)
 * for package.json dependencies. Pairs with a lockfile-alignment check
 * (e.g. `npm ci`, or this monorepo's `scripts/check-version-alignment.ts`)
 * so both format consistency and lockfile parity are enforced; this rule
 * handles the "format" half at edit/PR time inside ESLint.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type VersionStrategy = 'caret' | 'tilde' | 'exact' | 'range' | 'any';

/**
 * Does this string read as something npm accepts where a version goes?
 *
 * Semver and its ranges (`1.2.3`, `^1.2`, `>=1 <2`, `1.0.0 - 2.0.0`, `1.x`),
 * the `*` and `x` wildcards, the dist-tags npm itself documents, and the
 * protocol specifiers this rule's options already name. Used only to decide
 * whether an object literal IS a dependency map; what a value should look like
 * once it is one is `checkVersion`'s question.
 *
 * @vocabulary npm — https://docs.npmjs.com/cli/configuring-npm/package-json#dependencies
 */
const VERSION_SPECIFIER =
  /^(?:[\^~<>=]*\s*\d|[*x]$|latest$|next$|(?:workspace|file|link|npm|git\+[a-z]+|github|https?):)/i;

/**
 * Manifest fields that are ABOUT the package rather than things it depends on.
 *
 * The guard below asked only whether every VALUE was a version specifier,
 * which passes vacuously as soon as no disqualifying sibling is left:
 * `{ name: 'x', version: '1.0.0', main: 'index.js' }` is exempt, but narrow it
 * to `{ version: '1.0.0' }` and the same field reports — and the autofix
 * rewrites a manifest's own version to `^1.0.0`, which is not publishable.
 * A dependency map is keyed by PACKAGE NAME; these keys never are.
 *
 * @vocabulary npm — https://docs.npmjs.com/cli/configuring-npm/package-json
 */
const MANIFEST_FIELDS: ReadonlySet<string> = new Set([
  'name',
  'version',
  'description',
  'main',
  'module',
  'types',
  'typings',
  'license',
  'author',
  'homepage',
  'repository',
  'keywords',
  'files',
  'type',
  'private',
  'man',
  'sideEffects',
  'publishConfig',
]);

/**
 * Blocks whose VALUE is keyed by something other than a package name.
 *
 * `dist-tags` is the sharp one: npm keys it by TAG (`latest`, `next`) and each
 * value is the single exact version that tag resolves to, so a caret there is
 * not a thing npm accepts. `dependencies`, `devDependencies` and
 * `peerDependencies` are deliberately absent — those ARE dependency maps, and
 * the selector above reads them.
 *
 * @vocabulary npm — https://docs.npmjs.com/cli/commands/npm-dist-tag
 */
const NON_DEPENDENCY_BLOCKS: ReadonlySet<string> = new Set([
  'dist-tags',
  'versions',
  'engines',
  'scripts',
  'exports',
  'imports',
  'bin',
  'browser',
]);

export interface Options {
  strategy?: VersionStrategy;
  allowWorkspace?: boolean;
  allowFile?: boolean;
  allowLink?: boolean;
  overrides?: Record<string, VersionStrategy>;
}

type RuleOptions = [Options?];
type MessageIds = 'preferStrategy' | 'invalidStrategy';

export const preferDependencyVersionStrategy = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'prefer-dependency-version-strategy',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/prefer-dependency-version-strategy.md',
      description:
        'Enforce consistent version strategy (caret, tilde, exact, etc.) for package.json dependencies',
    },
    fixable: 'code',
    messages: {
      preferStrategy: formatLLMMessage({
        icon: MessageIcons.PACKAGE,
        issueName: 'Dependency Version Strategy',
        description: 'Dependency "{{name}}" should use {{strategy}} version',
        severity: 'MEDIUM',
        fix: 'Change "{{current}}" to "{{expected}}" for version flexibility',
        documentationLink:
          'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
      }),
      invalidStrategy: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Version Strategy',
        description: 'Strategy "{{strategy}}" is not valid',
        severity: 'MEDIUM',
        fix: 'Use one of: caret (^), tilde (~), exact (no prefix), range (<, >, ||), or any',
        documentationLink:
          'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['caret', 'tilde', 'exact', 'range', 'any'],
            description:
              'Version strategy to enforce: caret (^), tilde (~), exact (no prefix), range (allows <, >, ||), or any (allows all)',
          },
          allowWorkspace: {
            type: 'boolean',
            description: 'Allow workspace: protocol versions',
            default: true,
          },
          allowFile: {
            type: 'boolean',
            description: 'Allow file: protocol versions',
            default: true,
          },
          allowLink: {
            type: 'boolean',
            description: 'Allow link: protocol versions',
            default: true,
          },
          overrides: {
            type: 'object',
            additionalProperties: {
              type: 'string',
              enum: ['caret', 'tilde', 'exact', 'range', 'any'],
            },
            description:
              'Package-specific strategy overrides. Key is package name, value is strategy. Example: { "react": "exact", "lodash": "tilde" }',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      strategy: 'caret' as VersionStrategy,
      allowWorkspace: true,
      allowFile: true,
      allowLink: true,
      overrides: {},
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      strategy = 'caret',
      allowWorkspace = true,
      allowFile = true,
      allowLink = true,
      overrides = {},
    } = options;

    // Validate strategy
    const validStrategies: VersionStrategy[] = [
      'caret',
      'tilde',
      'exact',
      'range',
      'any',
    ];
    if (!validStrategies.includes(strategy)) {
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'invalidStrategy',
        data: { strategy },
      });
      return {};
    }

    // If strategy is 'any', allow all versions
    if (strategy === 'any') {
      return {};
    }

    function checkVersion(
      node: TSESTree.Property,
      depName: string,
      version: string,
    ): void {
      // Skip special protocols
      if (allowWorkspace && version.startsWith('workspace:')) return;
      if (allowFile && version.startsWith('file:')) return;
      if (allowLink && version.startsWith('link:')) return;

      // Skip if not a semantic version (allow prefixes like ^, ~)
      // Match patterns like: 1.0.0, ^1.0.0, ~1.0.0, >=1.0.0, etc.
      if (!version.match(/^[\^~<>=]?\d+\.\d+\.\d+/)) return;

      // Check for package-specific override
      const packageStrategy = overrides[depName] || strategy;

      // If override is 'any', skip this package
      if (packageStrategy === 'any') return;

      let expectedVersion = version;
      let needsFix = false;

      /**
       * Is this specifier a RANGE rather than a prefixed version?
       *
       * The same predicate the `range` branch below already uses, lifted so the
       * other three strategies can decline instead of rewriting.
       *
       * `<2.0.0` is an exclusive upper bound, not a version with a prefix: its
       * `2.0.0` is the major the author pinned AWAY from. The caret branch
       * stripped it as if it were `^` or `~` and emitted `^2.0.0`, whose
       * resolved set — `>=2.0.0 <3.0.0` — is DISJOINT from the original's.
       * Unattended `--fix` therefore installed the excluded major. Every other
       * transition this rule performs pivots on the same base version and stays
       * satisfiable; this was the only one that inverted the constraint.
       *
       * It was also never a considered policy: the `/^[\^~<>=]?\d+/` gate above
       * admits exactly ONE operator character, so `>=1.0.0 <2.0.0` — the
       * canonical range in this rule's own docs table — falls out of the rule
       * entirely while its one-character cousins were rewritten. And
       * `1.0.0 - 2.0.0` autofixed to `^1.0.0 - 2.0.0`, which
       * `semver.validRange` rejects outright.
       */
      const isRangeSpecifier =
        version.includes('||') ||
        version.includes('>') ||
        version.includes('<') ||
        version.includes(' - ');

      // A range is already a range; only the `range` strategy has anything to
      // say about it, and what it says is "compliant".
      if (isRangeSpecifier && packageStrategy !== 'range') return;

      // Determine expected format based on strategy (package override or default)
      // First, extract the base version (remove any existing prefix)
      const baseVersion = version.replace(/^[\^~<>=]+/, '');

      switch (packageStrategy) {
        case 'caret':
          if (!version.startsWith('^')) {
            expectedVersion = `^${baseVersion}`;
            needsFix = true;
          }
          break;
        case 'tilde':
          if (!version.startsWith('~')) {
            expectedVersion = `~${baseVersion}`;
            needsFix = true;
          }
          break;
        case 'exact': {
          // Remove any prefix to get exact version
          if (version !== baseVersion) {
            expectedVersion = baseVersion;
            needsFix = true;
          }
          break;
        }
        case 'range':
          // Allow ranges like ">=1.0.0 <2.0.0" or "1.0.0 || 2.0.0"
          if (
            !version.includes('||') &&
            !version.includes('>=') &&
            !version.includes('<=') &&
            !version.includes('>') &&
            !version.includes('<') &&
            !version.includes(' - ')
          ) {
            // If it's just a version, suggest caret as default for ranges
            // Use baseVersion to avoid double-prefixing (e.g., ^^18.0.0)
            expectedVersion = `^${baseVersion}`;
            needsFix = true;
          }
          break;
      }

      if (needsFix) {
        context.report({
          node: node.value,
          messageId: 'preferStrategy',
          data: {
            name: depName,
            strategy: packageStrategy,
            current: version,
            expected: expectedVersion,
          },
          fix(fixer: TSESLint.RuleFixer) {
            return fixer.replaceText(
              node.value,
              JSON.stringify(expectedVersion),
            );
          },
        });
      }
    }

    /**
     * Check an object expression for dependency version violations
     */
    const checkObjectExpression = (node: TSESTree.ObjectExpression) => {
      for (const prop of node.properties) {
        if (
          prop.type === 'Property' &&
          prop.key &&
          prop.value &&
          prop.value.type === 'Literal'
        ) {
          const depName =
            prop.key.type === 'Identifier'
              ? prop.key.name
              : prop.key.type === 'Literal'
                ? String(prop.key.value)
                : null;

          if (depName && typeof prop.value.value === 'string') {
            checkVersion(prop, depName, prop.value.value);
          }
        }
      }
    };

    return {
      // Check package.json dependencies properties
      'Property[key.value="dependencies"], Property[key.value="devDependencies"], Property[key.value="peerDependencies"]'(
        node: TSESTree.Property,
      ) {
        if (node.value.type !== 'ObjectExpression') return;
        checkObjectExpression(node.value);
      },

      // Also check object literals (for testing and general use)
      ObjectExpression(node: TSESTree.ObjectExpression) {
        // A dependency map is keyed by package name and EVERY value is a
        // version specifier. This used to ask whether ANY value looked like a
        // version, which made a package.json fixture in a test —
        // `{ name: 'x', version: '1.0.0', main: 'index.js' }` — and a vendoring
        // record carrying `version: '1.0.0'` beside a repo URL and a commit
        // count both report `Dependency "version" should use caret`. One value
        // that is not a specifier — a name, a path, a date, a number, an array
        // — says the object is something else. A spread says nothing either
        // way. The `dependencies` selector above still reads the real map
        // inside a manifest.
        // What this object is sitting IN can disqualify it outright: the
        // values under `dist-tags` are every one of them version-shaped, so
        // no amount of looking at values alone will ever reject it.
        const parent = node.parent;
        if (
          parent?.type === 'Property' &&
          NON_DEPENDENCY_BLOCKS.has(objectKeyName(parent) ?? '')
        ) {
          return;
        }

        let sawSpecifier = false;
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          // A key that names a manifest field is not a package name, and one
          // is enough to say the object is a manifest rather than a map of
          // dependencies — however few siblings it has left.
          if (MANIFEST_FIELDS.has(objectKeyName(prop) ?? '')) return;
          if (
            prop.value.type !== 'Literal' ||
            typeof prop.value.value !== 'string' ||
            !VERSION_SPECIFIER.test(prop.value.value)
          ) {
            return;
          }
          sawSpecifier = true;
        }

        if (sawSpecifier) {
          checkObjectExpression(node);
        }
      },
    };
  },
});
