/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-cors-response
 * Detects `Access-Control-Allow-Origin: '*'` in Lambda response headers
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  namesOneOf,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import { inResponsePosition } from '../../utils/response-position';

type MessageIds = 'permissiveCors' | 'useSpecificOrigin';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noPermissiveCorsResponse = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors-response',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-permissive-cors-response.md',
      description:
        'Detects permissive CORS (Access-Control-Allow-Origin: *) in Lambda response headers',
      cwe: 'CWE-942',
      cvss: 7.5,
    },
    fixable: 'code',
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS in Lambda Response',
        cwe: 'CWE-942',
        description:
          'Wildcard CORS origin (*) allows any domain to access this Lambda function',
        severity: 'HIGH',
        fix: 'Use specific origins: headers: { "Access-Control-Allow-Origin": "https://your-domain.com" }',
        documentationLink:
          'https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html',
      }),
      useSpecificOrigin: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Origin',
        description: 'Specify allowed origins instead of wildcard',
        severity: 'LOW',
        fix: 'Replace "*" with specific domain(s)',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow permissive CORS in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /**
     * Check if this is a Lambda response structure
     * { statusCode, headers, body }
     */
    function isLambdaResponse(obj: TSESTree.ObjectExpression): boolean {
      return obj.properties.some(
        (p) =>
          p.type === AST_NODE_TYPES.Property &&
          namesOneOf(objectKeyName(p), ['statusCode', 'body']),
      );
    }

    /**
     * Check headers object for permissive CORS
     */
    function checkHeadersObject(obj: TSESTree.ObjectExpression): void {
      for (const prop of obj.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        // HTTP header names are case-insensitive, however the key is written.
        const headerName = objectKeyName(prop)?.toLowerCase();
        if (headerName !== 'access-control-allow-origin') continue;
        // `multiValueHeaders` (API Gateway v1) carries each value in a list.
        const values =
          prop.value.type === AST_NODE_TYPES.ArrayExpression
            ? prop.value.elements
            : [prop.value];
        for (const value of values) {
          if (value && staticString(value) === '*') {
            context.report({
              node: prop,
              messageId: 'permissiveCors',
              fix: (fixer) =>
                fixer.replaceText(value, '"https://your-domain.com"'),
            });
          }
        }
      }
    }

    /**
     * Check a Lambda-shaped response object literal for permissive CORS.
     *
     * Wherever it is written — returned, an arrow's implicit return, built in
     * a variable of any name, handed to the Lambda `callback` — it is what
     * API Gateway sends. The rule previously found a variable only when its
     * name contained "response".
     */
    function checkResponseObject(obj: TSESTree.ObjectExpression): void {
      if (!isLambdaResponse(obj)) return;
      for (const prop of obj.properties) {
        if (
          prop.type === AST_NODE_TYPES.Property &&
          namesOneOf(objectKeyName(prop), ['headers', 'multiValueHeaders']) &&
          prop.value.type === AST_NODE_TYPES.ObjectExpression
        ) {
          checkHeadersObject(prop.value);
        }
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;

        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }
        return true;
      },
      ObjectExpression(node: TSESTree.ObjectExpression) {
        if (inResponsePosition(node)) checkResponseObject(node);
      },
    };
  },
});
