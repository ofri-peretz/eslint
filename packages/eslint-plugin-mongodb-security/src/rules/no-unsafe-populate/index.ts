/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-populate
 * Prevents user-controlled populate() (CVE-2025-23061 related)
 * CWE-943: NoSQL Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafePopulate';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

/** Patterns that indicate user input */
const USER_INPUT_PATTERNS = [
  'req.body', 'req.query', 'req.params',
  'request.body', 'request.query', 'request.params',
  'ctx.request.body', 'ctx.query', 'ctx.params',
];

function getNodeSource(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const obj = getNodeSource(node.object);
    const prop = node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : '[computed]';
    return `${obj}.${prop}`;
  }
  return '';
}

function containsUserInput(node: TSESTree.Node): boolean {
  const source = getNodeSource(node);
  return USER_INPUT_PATTERNS.some((pattern) => source.includes(pattern));
}

export const noUnsafePopulate = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-populate',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent user-controlled populate() paths (CVE-2025-23061)' },
    hasSuggestions: true,
    messages: {
      unsafePopulate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe populate()',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 6.5,
        description: 'User-controlled populate() can lead to data exposure or injection',
        severity: 'MEDIUM',
        fix: 'Use hardcoded populate paths instead of user input',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2025-23061',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (methodName !== 'populate') {
          return;
        }

        // Check each argument to populate()
        for (const arg of node.arguments) {
          // Direct user input: .populate(req.body.field)
          if (arg.type === AST_NODE_TYPES.MemberExpression && containsUserInput(arg)) {
            context.report({ node, messageId: 'unsafePopulate' });
            return;
          }

          // Identifier that could be tainted: .populate(userField)
          if (arg.type === AST_NODE_TYPES.Identifier) {
            // We flag identifiers that aren't string literals as potentially unsafe
            context.report({ node, messageId: 'unsafePopulate' });
            return;
          }

          // Object with user-controlled path property: .populate({ path: req.body.field })
          if (arg.type === AST_NODE_TYPES.ObjectExpression) {
            for (const prop of arg.properties) {
              if (prop.type !== AST_NODE_TYPES.Property) continue;
              const keyName = prop.key.type === AST_NODE_TYPES.Identifier
                ? prop.key.name
                : null;
              if (keyName === 'path' && prop.value.type === AST_NODE_TYPES.MemberExpression && containsUserInput(prop.value)) {
                context.report({ node, messageId: 'unsafePopulate' });
                return;
              }
              if (keyName === 'path' && prop.value.type === AST_NODE_TYPES.Identifier) {
                context.report({ node, messageId: 'unsafePopulate' });
                return;
              }
            }
          }
        }
      },
    };
  },
});

export default noUnsafePopulate;
