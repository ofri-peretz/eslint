/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: expiring-todo-comments
 * Add expiration conditions to TODO comments to prevent forgotten tasks
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { readJsonFileSync } from '@interlace/eslint-devkit';
import { resolvePath } from '@interlace/eslint-devkit';

type MessageIds =
  | 'expiringTodoComment'
  | 'invalidTodoCondition'
  | 'multipleTodoConditions';

export interface Options {
  /** Terms to check for (default: ['TODO', 'FIXME', 'XXX']) */
  terms?: string[];
  /** Date format for expiry dates */
  dateFormat?: string;
  /** Allow warnings for expired TODOs */
  allowWarningComments?: boolean;
}

type RuleOptions = [Options?];

export interface PackageJson {
  version?: string;
  engines?: {
    node?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** A condition parsed out of a `TODO [condition]` bracket. */
export interface ParsedTodoCondition {
  type: string;
  value: string;
  operator?: string;
}

/**
 * Normalize a version specifier (`^1.2.3`, `24.x`, `18`) into numeric
 * major/minor/patch parts. Wildcard or non-numeric segments become 0 —
 * without this, `package.json#engines.node: "24.x"` would compare as
 * equal to everything, making every `>=` engine TODO falsely match.
 */
export function parseVersionParts(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const cleaned = version.replace(/^[\^~>=<]+/, '').trim();
  const parts = cleaned
    .split('.')
    .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : 0));
  while (parts.length < 3) parts.push(0);
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersionParts(version1);
  const v2 = parseVersionParts(version2);

  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

export function checkDateCondition(dateStr: string): boolean {
  // Invalid date strings produce an Invalid Date; comparisons against it
  // are always false, so malformed input safely reads as "not expired".
  const conditionDate = new Date(dateStr + 'T00:00:00Z'); // UTC
  const now = new Date();
  return now >= conditionDate;
}

export function checkPackageVersionCondition(
  pkg: PackageJson | null,
  operator: string,
  targetVersion: string,
): boolean {
  if (!pkg?.version) return false;

  const comparison = compareVersions(pkg.version, targetVersion);

  switch (operator) {
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '=':
    case '==':
      return comparison === 0;
    default:
      return false;
  }
}

export function checkEngineVersionCondition(
  pkg: PackageJson | null,
  engine: string,
  operator: string,
  targetVersion: string,
): boolean {
  if (engine !== 'node') return false;

  const nodeVersion = pkg?.engines?.node;
  if (!nodeVersion) return false;

  // Simple version comparison for engines
  const currentVersion = nodeVersion.replace(/^[\^~>=<]+/, '');
  const comparison = compareVersions(currentVersion, targetVersion);

  switch (operator) {
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    default:
      return false;
  }
}

export function checkDependencyCondition(
  pkg: PackageJson | null,
  packageName: string,
  present: boolean,
): boolean {
  if (!pkg) return false;

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  const hasPackage = packageName in allDeps;
  return present ? hasPackage : hasPackage;
}

export function parseTodoCondition(
  commentValue: string,
  term: string,
): { conditions: string[]; rest: string } | null {
  // Match patterns like: TODO [condition]: message
  // or TODO (@author) [condition]: message
  // Also handle block comments with * prefix: * TODO [condition]: message
  const todoRegex = new RegExp(
    `\\*?\\s*${term}\\s*(?:\\([^)]+\\))?\\s*\\[([^\\]]+)\\]\\s*:\\s*(.+)$`,
    'im',
  );
  const match = commentValue.match(todoRegex);

  if (!match) return null;

  const conditionStr = match[1];
  const rest = match[2];

  // Split multiple conditions (shouldn't happen, but handle gracefully)
  const conditions = conditionStr.split(/\s*,\s*/);

  return { conditions, rest };
}

export function validateCondition(
  condition: string,
): ParsedTodoCondition | null {
  // Date condition: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(condition)) {
    return { type: 'date', value: condition };
  }

  // Package version condition: >=1.0.0, >2.0.0, etc.
  const packageVersionMatch = condition.match(/^([><]=?|=|==)\s*([\d.]+)$/);
  if (packageVersionMatch) {
    return {
      type: 'package-version',
      operator: packageVersionMatch[1],
      value: packageVersionMatch[2],
    };
  }

  // Engine version condition: engine:node@>=8, engine:node@>20.0.0
  const engineVersionMatch = condition.match(
    /^engine:(\w+)@([><]=?)\s*([\d.]+)$/,
  );
  if (engineVersionMatch) {
    const engine = engineVersionMatch[1];
    // Validate engine name
    if (!['node', 'npm', 'yarn', 'pnpm'].includes(engine)) {
      return null; // Invalid engine, let it be caught as invalid condition
    }
    return {
      type: 'engine-version',
      value: `${engine}@${engineVersionMatch[3]}`,
      operator: engineVersionMatch[2],
    };
  }

  // Dependency condition: +package-name or -package-name
  const depMatch = condition.match(/^([+-])(.+)$/);
  if (depMatch) {
    return {
      type: 'dependency',
      value: depMatch[2],
      operator: depMatch[1],
    };
  }

  return null;
}

/**
 * Evaluate an already-parsed condition. `getPkg` is called lazily so that
 * date-only conditions never touch the filesystem.
 */
export function checkParsedCondition(
  getPkg: () => PackageJson | null,
  parsed: ParsedTodoCondition | null,
): boolean {
  if (!parsed) return false;

  switch (parsed.type) {
    case 'date':
      return checkDateCondition(parsed.value);
    case 'package-version':
      return parsed.operator
        ? checkPackageVersionCondition(getPkg(), parsed.operator, parsed.value)
        : false;
    case 'engine-version': {
      const [engine, version] = parsed.value.split('@');
      return parsed.operator
        ? checkEngineVersionCondition(getPkg(), engine, parsed.operator, version)
        : false;
    }
    case 'dependency':
      return checkDependencyCondition(
        getPkg(),
        parsed.value,
        parsed.operator === '+',
      );
    default:
      return false;
  }
}

export const expiringTodoComments = createRule<RuleOptions, MessageIds>({
  name: 'expiring-todo-comments',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/expiring-todo-comments.md',
      description:
        'Add expiration conditions to TODO comments to prevent forgotten tasks',
    },
    hasSuggestions: false,
    messages: {
      expiringTodoComment: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Expiring TODO Comment',
        description: 'TODO comment has expired condition',
        severity: 'HIGH',
        fix: 'Address the TODO or update/remove the condition',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
      }),
      invalidTodoCondition: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid TODO Condition',
        description: '{{term}} TODO comment has invalid condition format',
        severity: 'MEDIUM',
        fix: 'Fix the condition format or remove the condition',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
      }),
      multipleTodoConditions: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Multiple TODO Conditions',
        description: 'TODO comment has multiple conditions',
        severity: 'MEDIUM',
        fix: 'Use only one condition per TODO comment',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          terms: {
            type: 'array',
            items: { type: 'string' },
            default: ['TODO', 'FIXME', 'XXX'],
          },
          dateFormat: {
            type: 'string',
            default: 'YYYY-MM-DD',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { terms: ['TODO', 'FIXME', 'XXX'], dateFormat: 'YYYY-MM-DD' },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { terms = ['TODO', 'FIXME', 'XXX'] } = options || {};

    // Cache package.json data
    let packageJson: PackageJson | null = null;

    function loadPackageJson(): PackageJson | null {
      if (packageJson !== null) {
        return packageJson;
      }

      const packageJsonPath = resolvePath(process.cwd(), 'package.json');
      packageJson = readJsonFileSync<PackageJson>(packageJsonPath);
      return packageJson;
    }

    function checkComment(comment: TSESTree.Comment): void {
      const commentValue = comment.value;

      for (const term of terms) {
        const parsed = parseTodoCondition(commentValue, term);
        if (!parsed) continue;

        const { conditions, rest } = parsed;

        // Check for multiple conditions
        if (conditions.length > 1) {
          context.report({
            loc: comment.loc,
            messageId: 'multipleTodoConditions',
            data: {
              term,
              conditions: conditions.join(', '),
            },
          });
          continue;
        }

        const condition = conditions[0];

        // Validate condition format
        const parsedCondition = validateCondition(condition);
        if (!parsedCondition) {
          context.report({
            loc: comment.loc,
            messageId: 'invalidTodoCondition',
            data: {
              condition,
              term,
            },
          });
          continue;
        }

        // Check if condition has expired
        if (checkParsedCondition(loadPackageJson, parsedCondition)) {
          context.report({
            loc: comment.loc,
            messageId: 'expiringTodoComment',
            data: {
              term,
              condition,
              message: rest,
            },
          });
        }

        // Only process one term per comment
        break;
      }
    }

    return {
      Program() {
        const sourceCode = context.sourceCode;
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          if (comment.type === 'Line' || comment.type === 'Block') {
            checkComment(comment);
          }
        }
      },
    };
  },
});
