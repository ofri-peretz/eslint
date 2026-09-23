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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type VersionStrategy = 'caret' | 'tilde' | 'exact' | 'range' | 'any';

/**
 * The manifest keys whose value IS a dependency map.
 *
 * These keys are the only evidence the rule accepts. An object keyed by package
 * name with version-shaped values could be a lot of things: a record of the
 * exact versions a compatibility oracle graded, a lockfile excerpt, or a test
 * fixture. The rule used to guess from that shape, and the guess reported
 * burgee's `GRADED_VERSIONS` table, where exact versions are the whole point.
 *
 * @vocabulary npm — https://docs.npmjs.com/cli/configuring-npm/package-json#dependencies
 */
const DEPENDENCY_KEYS: ReadonlySet<string> = new Set([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]);

/**
 * An ESTree `Property`, or the `JSONProperty` that `jsonc-eslint-parser`
 * produces for a real `package.json`. The two have the same shape, but
 * TSESTree only knows about the first.
 */
type AnyProperty = TSESTree.Property;

/** The static name of a property key, in either AST. */
function keyName(prop: AnyProperty): string | null {
  const key = prop.key as { type: string; name: string; value?: unknown };
  if (
    !prop.computed &&
    (key.type === 'Identifier' || key.type === 'JSONIdentifier')
  ) {
    return key.name;
  }
  if (
    (key.type === 'Literal' || key.type === 'JSONLiteral') &&
    typeof key.value === 'string'
  ) {
    return key.value;
  }
  return null;
}

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

    const checkDependencyBlock = (node: AnyProperty): void => {
      if (!DEPENDENCY_KEYS.has(keyName(node) ?? '')) return;
      const block = node.value as { type: string; properties: AnyProperty[] };
      if (
        block.type !== 'ObjectExpression' &&
        block.type !== 'JSONObjectExpression'
      ) {
        return;
      }
      for (const prop of block.properties) {
        if (
          prop.type !== 'Property' &&
          (prop.type as string) !== 'JSONProperty'
        ) {
          continue;
        }
        const value = prop.value as { type: string; value?: unknown };
        if (value.type !== 'Literal' && value.type !== 'JSONLiteral') continue;
        const depName = keyName(prop);
        if (depName && typeof value.value === 'string') {
          checkVersion(prop, depName, value.value);
        }
      }
    };

    return {
      Property: checkDependencyBlock,
      // `jsonc-eslint-parser`, which the docs configure for `**/package.json`.
      JSONProperty: checkDependencyBlock,
    };
  },
});
