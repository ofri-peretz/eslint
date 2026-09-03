/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-express-body-parser-limits
 *
 * Detects an Express/body-parser body parser configured with an *explicit*
 * size limit larger than the app can afford.
 *
 * CWE-400: Uncontrolled Resource Consumption
 *
 * ## What this rule does NOT report, and why
 *
 * `express.json()` with no options is **not** unbounded. Every one of the four
 * parsers — `json`, `urlencoded`, `raw`, `text` — ships `limit: '100kb'` as its
 * documented default, in Express 4 and 5 alike. The rule used to report the
 * omission as "Missing Body Parser Limit … attackers can exhaust server
 * memory", which is a claim about a default that does not exist: 100kb is far
 * below every threshold this rule enforces, so the rule was reporting a
 * configuration it would have accepted had it been written out. All seven
 * findings on the 8-repo corpus were that shape, including
 * `app.use(express.urlencoded({ extended: true }))`.
 *
 * Only an explicit `limit` above `maxLimit` is a finding. That is also the
 * only form an attacker can steer, and it now catches the numeric spelling
 * (`limit: 52428800`) that the string-only comparison used to miss entirely.
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://expressjs.com/en/4x/api.html#express.json
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'excessiveLimit';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
  /** Largest explicit limit, in bytes, that is not reported. Default: 5242880 (5MB) */
  maxLimit?: number;
  /** Limits that are considered excessive (as strings). Default: ['50mb', '100mb', '500mb', '1gb'] */
  excessiveLimits?: string[];
}

type RuleOptions = [Options?];

/**
 * Largest explicit limit that is not reported, in bytes (5MB).
 *
 * Sits just under the smallest entry in `DEFAULT_EXCESSIVE_LIMITS` so the two
 * gates agree: 10mb and up is excessive whichever way it is spelled. The old
 * value, 102400, was never read by the rule at all — it would have reported
 * `limit: '1mb'`, which this rule's own fix text recommends.
 */
const DEFAULT_MAX_LIMIT = 5 * 1024 * 1024;

const DEFAULT_EXCESSIVE_LIMITS = [
  '10mb',
  '50mb',
  '100mb',
  '500mb',
  '1gb',
  '1GB',
  '10MB',
  '50MB',
  '100MB',
  '500MB',
];

/**
 * Body parser function names to check
 */
const BODY_PARSER_METHODS = new Set(['json', 'urlencoded', 'raw', 'text']);

/**
 * Check if a property has a limit option
 */
function getLimitOption(
  properties: TSESTree.ObjectLiteralElement[],
): TSESTree.Property | null {
  for (const prop of properties) {
    if (
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'limit'
    ) {
      return prop;
    }
  }
  return null;
}

/** Byte multipliers `bytes` (the parser body-parser delegates to) accepts. */
const UNITS: Readonly<Record<string, number>> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
};

/**
 * The limit in bytes, or `null` when it is not a literal we can evaluate.
 *
 * `limit` accepts either a number of bytes or a `bytes`-parseable string, and
 * the two spellings are equally common. Comparing only against a list of
 * *strings* meant `express.json({ limit: 52428800 })` — 50MB, spelled the way
 * a constant usually is — was invisible to this rule.
 */
function limitInBytes(value: TSESTree.Node): number | null {
  if (value.type === 'Literal' && typeof value.value === 'number')
    return value.value;
  const text = staticString(value);
  if (text === null) return null;
  const parsed = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?\s*$/i.exec(text);
  if (!parsed) return null;
  return Number(parsed[1]) * UNITS[(parsed[2] ?? 'b').toLowerCase()];
}

/**
 * Check if the limit value is considered excessive
 */
function isExcessiveLimit(
  value: TSESTree.Node,
  excessiveLimits: string[],
  maxLimit: number,
): boolean {
  const staticText = staticString(value);
  if (staticText !== null) {
    const named = excessiveLimits.some(
      (limit) => staticText.toLowerCase() === limit.toLowerCase(),
    );
    if (named) return true;
  }
  const bytes = limitInBytes(value);
  return bytes !== null && bytes > maxLimit;
}

export const requireExpressBodyParserLimits = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-express-body-parser-limits',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-express-body-parser-limits.md',
      description:
        'Require size limits on Express.js body parsers to prevent DoS attacks',
      cwe: 'CWE-400',
      cvss: 7.5,
    },
    messages: {
      excessiveLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Excessive Body Parser Limit',
        cwe: 'CWE-400',
        description:
          "This body parser raises the limit above Express's 100kb default, so a single request can pin that much memory per connection.",
        severity: 'MEDIUM',
        fix: "Reduce the limit to a reasonable size: '100kb' for JSON APIs, '1mb' for file uploads with proper handling",
        documentationLink: 'https://expressjs.com/en/4x/api.html#express.json',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
          maxLimit: {
            type: 'number',
            default: DEFAULT_MAX_LIMIT,
            description:
              'Largest explicit body-parser limit, in bytes, that is not reported',
          },
          excessiveLimits: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_EXCESSIVE_LIMITS,
            description: 'Limits considered excessive',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      maxLimit: DEFAULT_MAX_LIMIT,
      excessiveLimits: DEFAULT_EXCESSIVE_LIMITS,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const {
      allowInTests = false,
      maxLimit = DEFAULT_MAX_LIMIT,
      excessiveLimits = DEFAULT_EXCESSIVE_LIMITS,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    if (isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for express.json(), express.urlencoded(), etc.
        // or bodyParser.json(), bodyParser.urlencoded(), etc.
        if (callee.type !== 'MemberExpression') {
          return;
        }

        const object = callee.object;
        const property = callee.property;

        // Check if it's express.* or bodyParser.*
        if (object.type !== 'Identifier') {
          return;
        }

        if (object.name !== 'express' && object.name !== 'bodyParser') {
          return;
        }

        if (property.type !== 'Identifier') {
          return;
        }

        if (!BODY_PARSER_METHODS.has(property.name)) {
          return;
        }

        // An absent options object, or options without `limit`, leaves the
        // parser on Express's documented 100kb default. There is nothing to
        // report: the default is already at (in fact below) `maxLimit`.
        const firstArg = node.arguments[0];
        if (firstArg?.type !== 'ObjectExpression') return;

        const limitProp = getLimitOption(firstArg.properties);
        if (!limitProp) return;

        if (isExcessiveLimit(limitProp.value, excessiveLimits, maxLimit)) {
          context.report({
            node: limitProp,
            messageId: 'excessiveLimit',
          });
        }
      },
    };
  },
});
