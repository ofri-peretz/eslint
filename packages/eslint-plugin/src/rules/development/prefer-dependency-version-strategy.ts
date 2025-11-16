/**
 * prefer-dependency-version-strategy
 * 
 * Enforces a consistent version strategy (caret, tilde, exact, etc.) for package.json dependencies.
 * Works alongside @nx/dependency-checks to ensure both version alignment and strategy consistency.
 * 
 * This rule is designed to complement @nx/dependency-checks, which validates that dependencies
 * match the lockfile. This rule ensures the version specifier format is consistent.
 */

import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type VersionStrategy = 'caret' | 'tilde' | 'exact' | 'range' | 'any';

interface Options {
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
        documentationLink: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
      }),
      invalidStrategy: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Version Strategy',
        description: 'Strategy "{{strategy}}" is not valid',
        severity: 'MEDIUM',
        fix: 'Use one of: caret (^), tilde (~), exact (no prefix), range (<, >, ||), or any',
        documentationLink: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      strategy = 'caret',
      allowWorkspace = true,
      allowFile = true,
      allowLink = true,
      overrides = {},
    } = (options || {}) as Options;

    // Validate strategy
    const validStrategies: VersionStrategy[] = ['caret', 'tilde', 'exact', 'range', 'any'];
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
      version: string
    ): void {
      // Skip special protocols
      if (allowWorkspace && version.startsWith('workspace:')) return;
      if (allowFile && version.startsWith('file:')) return;
      if (allowLink && version.startsWith('link:')) return;

      // Skip if not a semantic version
      if (!version.match(/^\d+\.\d+\.\d+/)) return;

      // Check for package-specific override
      const packageStrategy = overrides[depName] || strategy;

      // If override is 'any', skip this package
      if (packageStrategy === 'any') return;

      let expectedVersion = version;
      let needsFix = false;

      // Determine expected format based on strategy (package override or default)
      switch (packageStrategy) {
        case 'caret':
          if (!version.startsWith('^')) {
            expectedVersion = `^${version}`;
            needsFix = true;
          }
          break;
        case 'tilde':
          if (!version.startsWith('~')) {
            expectedVersion = `~${version}`;
            needsFix = true;
          }
          break;
        case 'exact': {
          // Remove any prefix
          const exactVersion = version.replace(/^[^0-9]+/, '');
          if (version !== exactVersion) {
            expectedVersion = exactVersion;
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
            expectedVersion = `^${version}`;
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
            return fixer.replaceText(node.value, JSON.stringify(expectedVersion));
          },
        });
      }
    }

    return {
      'Property[key.value="dependencies"], Property[key.value="devDependencies"], Property[key.value="peerDependencies"]'(
        node: TSESTree.Property
      ) {
        if (node.value.type !== 'ObjectExpression') return;

        for (const prop of node.value.properties) {
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
      },
    };
  },
});

