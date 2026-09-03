/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-cors
 * Detects overly permissive CORS configurations in Express.js applications
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'permissiveCors';

export interface Options {
  /** Allow permissive CORS in test files. Default: false */
  allowInTests?: boolean;

  /** Allow origin: true for development. Default: false */
  allowOriginTrue?: boolean;

  /** Allowed origins that should not trigger warnings. Default: [] */
  allowedOrigins?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if node is a CORS configuration with wildcard or overly permissive origin
 */
/**
 * Read a boolean-literal property off a CORS options object.
 *
 * The surrounding predicates match the PRINTED text of the whole object, which
 * cannot tell `credentials: true` from the same words inside a nested object,
 * a comment, or a string. Partitioning on a regex would be guesswork, so the
 * partition reads the property.
 */
function readsBooleanTrue(
  node: TSESTree.ObjectExpression,
  name: string,
): boolean {
  return node.properties.some(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      ((property.key.type === 'Identifier' && property.key.name === name) ||
        (property.key.type === 'Literal' && property.key.value === name)) &&
      property.value.type === 'Literal' &&
      property.value.value === true,
  );
}

/** `origin: true` or `origin: '*'` — the two shapes that accept any site. */
function isPermissiveOrigin(node: TSESTree.ObjectExpression): boolean {
  return node.properties.some(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      ((property.key.type === 'Identifier' && property.key.name === 'origin') ||
        (property.key.type === 'Literal' && property.key.value === 'origin')) &&
      property.value.type === 'Literal' &&
      (property.value.value === true || property.value.value === '*'),
  );
}

function isPermissiveCorsConfig(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode,
  options: Options,
): { isPermissive: boolean; reason: string } {
  const text = sourceCode.getText(node);

  // RULE PARTITION: `origin` permissive AND `credentials: true` is the specific
  // finding, and `no-cors-credentials-wildcard` owns it — it names the credential
  // leak and prescribes an explicit-origin allowlist, which is strictly more
  // than this rule can say. Both fired on the same two corpus sites
  // (okta-signin-widget playground/mocks/server.js:73 and :79), so one fix was
  // reported twice at two severities. This rule reports the rest: a permissive
  // origin with no credentials attached.
  if (readsBooleanTrue(node, 'credentials') && isPermissiveOrigin(node)) {
    return { isPermissive: false, reason: '' };
  }

  // Check for origin: '*'
  if (/\borigin\s*:\s*['"`]\*['"`]/.test(text)) {
    return {
      isPermissive: true,
      reason: "origin: '*' allows any domain to access your API",
    };
  }

  // Check for origin: true (reflects request origin)
  if (!options.allowOriginTrue && /\borigin\s*:\s*true\b/.test(text)) {
    return {
      isPermissive: true,
      reason: 'origin: true reflects the request origin, allowing any domain',
    };
  }

  // The `origin: true` + `credentials: true` case used to be handled here. It
  // is unreachable now: the partition above returns before it, because
  // no-cors-credentials-wildcard owns exactly that combination.

  return { isPermissive: false, reason: '' };
}

/**
 * Check if this is a standalone cors() call (not inside app.use)
 */
function isStandaloneCorsCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  // cors() or cors({...})
  if (callee.type === 'Identifier' && callee.name === 'cors') {
    // Check if parent is app.use() - if so, skip (handled by isAppUseCors)
    const parent = node.parent;
    if (
      parent &&
      parent.type === 'CallExpression' &&
      parent.callee.type === 'MemberExpression' &&
      propertyName(parent.callee) === 'use'
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Check if this is app.use(cors(...))
 */
function isAppUseCors(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  if (
    callee.type === 'MemberExpression' &&
    propertyName(callee) === 'use'
  ) {
    // Check if first argument is cors() call
    const firstArg = node.arguments[0];
    if (
      firstArg &&
      firstArg.type === 'CallExpression' &&
      firstArg.callee.type === 'Identifier' &&
      firstArg.callee.name === 'cors'
    ) {
      return true;
    }
  }

  return false;
}

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-permissive-cors.md',
      description:
        'Disallow overly permissive CORS configurations (wildcard origin, origin: true)',
      cwe: 'CWE-942',
      cvss: 7.5,
    },
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS Configuration',
        cwe: 'CWE-942',
        description: '{{reason}}',
        severity: 'HIGH',
        fix: 'Specify an explicit whitelist of allowed origins: origin: ["https://trusted-domain.com"]',
        documentationLink:
          'https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow permissive CORS in test files',
          },
          allowOriginTrue: {
            type: 'boolean',
            default: false,
            description: 'Allow origin: true for development',
          },
          allowedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Allowed origins that should not trigger warnings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      allowOriginTrue: false,
      allowedOrigins: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { allowInTests = false, allowOriginTrue = false } =
      options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for cors({...}) call
        if (isStandaloneCorsCall(node) || isAppUseCors(node)) {
          let corsConfigNode: TSESTree.ObjectExpression | null = null;

          // Get the config object
          if (
            isStandaloneCorsCall(node) &&
            node.arguments[0]?.type === 'ObjectExpression'
          ) {
            corsConfigNode = node.arguments[0];
          } else if (isAppUseCors(node)) {
            const corsCall = node.arguments[0] as TSESTree.CallExpression;
            if (corsCall.arguments[0]?.type === 'ObjectExpression') {
              corsConfigNode = corsCall.arguments[0];
            }
          }

          // Check for cors() with no arguments - defaults to permissive
          // Handle both standalone cors() and app.use(cors())
          let corsCallNode: TSESTree.CallExpression | null = null;

          if (isStandaloneCorsCall(node)) {
            corsCallNode = node;
          } else {
            // Guaranteed app.use(cors(...)) by the isAppUseCors guard above
            corsCallNode = node.arguments[0] as TSESTree.CallExpression;
          }

          if (corsCallNode && corsCallNode.arguments.length === 0) {
            context.report({
              node: corsCallNode,
              messageId: 'permissiveCors',
              data: {
                reason: 'cors() with no options uses permissive defaults',
              },
            });
            return;
          }

          if (corsConfigNode) {
            const { isPermissive, reason } = isPermissiveCorsConfig(
              corsConfigNode,
              sourceCode,
              { allowOriginTrue } as Options,
            );

            if (isPermissive) {
              context.report({
                node: corsConfigNode,
                messageId: 'permissiveCors',
                data: { reason },
              });
            }
          }
        }
      },
    };
  },
});
