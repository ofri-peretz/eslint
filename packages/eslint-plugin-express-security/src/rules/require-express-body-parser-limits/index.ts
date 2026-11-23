/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-express-body-parser-limits
 *
 * Detects an Express/body-parser body parser configured with NO explicit
 * size limit.
 *
 * CWE-400: Uncontrolled Resource Consumption
 *
 * ## Decided behaviour: any explicit limit is a deliberate choice
 *
 * The four parsers — `json`, `urlencoded`, `raw`, `text` — ship
 * `limit: '100kb'` as a documented default, so `express.json()` is not
 * unbounded. The rule still reports it: the default is invisible at the call
 * site, and a body-size ceiling is a decision that belongs in the code where a
 * reviewer can see it and change it.
 *
 * What it does NOT report is any `limit` that is written down, whatever the
 * value. `express.json({ limit: '50mb' })` is an author stating a number on
 * purpose, and a rule that second-guesses the number reports a configuration
 * the author already reviewed. This reverses two earlier policies: the
 * original "no limit is not a finding" (2026-08-12, when 7 of 7 corpus
 * findings were the 100kb default) and the later "an explicit limit above
 * `maxLimit` is a finding". `maxLimit` and `excessiveLimits` are still
 * accepted so existing configs keep loading, and are ignored.
 *
 * An options value the rule cannot read (`express.json(opts)`, a spread, a
 * computed key) abstains: it may well carry the limit.
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://expressjs.com/en/4x/api.html#express.json
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  isPackageCallee,
  packageBindings,
  type PackageBindings,
} from '../../utils/import-bindings';
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  createRule,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingLimit';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
  /** @deprecated Ignored: any explicit limit is accepted. Kept so existing configs load. */
  maxLimit?: number;
  /** @deprecated Ignored: any explicit limit is accepted. Kept so existing configs load. */
  excessiveLimits?: string[];
}

type RuleOptions = [Options?];

/**
 * Body parser function names to check
 */
const BODY_PARSER_METHODS = new Set(['json', 'urlencoded', 'raw', 'text']);

/**
 * Does this options object leave the limit unset?
 *
 * `false` when a `limit` key is present, and also when the answer cannot be
 * read: a spread, or a key computed at runtime, may carry it.
 */
function leavesLimitUnset(
  properties: TSESTree.ObjectLiteralElement[],
): boolean {
  for (const prop of properties) {
    if (prop.type !== 'Property') return false;
    // `limit:`, `'limit':` and `['limit']:` all name the option; a computed
    // `[limit]:` names whatever the variable holds, so it may be anything.
    const key = objectKeyName(prop);
    if (key === null || key === 'limit') return false;
  }
  return true;
}

export const requireExpressBodyParserLimits = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-express-body-parser-limits',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-express-body-parser-limits.md',
      description:
        'Require size limits on Express.js body parsers to prevent DoS attacks',
      cwe: 'CWE-400',
      cvss: 7.5,
    },
    messages: {
      missingLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Body Parser Without An Explicit Limit',
        cwe: 'CWE-400',
        description:
          "This body parser sets no `limit`, so it silently runs on Express's 100kb default. A body-size ceiling is a security decision that should be visible where the parser is mounted, not inherited.",
        severity: 'MEDIUM',
        fix: "State the ceiling: express.json({ limit: '100kb' }). Any value you write down is accepted.",
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
            description:
              'Deprecated and ignored: any explicit body-parser limit is accepted',
          },
          excessiveLimits: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Deprecated and ignored: any explicit body-parser limit is accepted',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: false }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    /** What the file binds `express` and `body-parser` to. */
    let parsers: PackageBindings;

    return {
      before() {
        const [options] = currentOptions();
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        ({ allowInTests = false } = options as Options);

        const filename = context.filename;
        const isTestFile = allowInTests && isTestFilePath(filename);

        if (isTestFile) {
          return false;
        }
        parsers = packageBindings(context.sourceCode.ast, [
          'express',
          'body-parser',
        ]);
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // express.json(), bodyParser.urlencoded(), … by their conventional
        // names, or through whatever the file binds the packages to:
        // `import { json } from 'express'`, `import parsers from 'body-parser'`.
        const isParser = [...BODY_PARSER_METHODS].some(
          (method) =>
            isPackageCallee(callee, parsers, method) ||
            (callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' &&
              (callee.object.name === 'express' ||
                callee.object.name === 'bodyParser') &&
              propertyName(callee) === method),
        );
        if (!isParser) return;

        // No argument, or an options object with no `limit` key and nothing
        // that could carry one, runs on the 100kb default unstated. Options
        // the rule cannot read (`express.json(opts)`) may hold the limit.
        const firstArg = node.arguments[0];
        if (firstArg !== undefined && firstArg.type !== 'ObjectExpression') {
          return;
        }
        if (firstArg !== undefined && !leavesLimitUnset(firstArg.properties)) {
          return;
        }

        context.report({ node, messageId: 'missingLimit' });
      },
    };
  },
});
