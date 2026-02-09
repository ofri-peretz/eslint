/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-schema-validation
 * Requires Mongoose schema validation
 * CWE-20: Improper Input Validation
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireSchemaValidation';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const VALIDATION_PROPERTIES = [
  'required', 'validate', 'enum', 'min', 'max',
  'minlength', 'maxlength', 'match', 'minLength', 'maxLength',
];

export const requireSchemaValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-schema-validation',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require validation on Mongoose schema fields' },
    hasSuggestions: true,
    messages: {
      requireSchemaValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Schema Validation',
        cwe: 'CWE-20',
        owasp: 'A04:2021',
        cvss: 6.1,
        description: 'Mongoose schema field lacks validation',
        severity: 'MEDIUM',
        fix: 'Add required, validate, or enum options to schema field',
        documentationLink: 'https://mongoosejs.com/docs/validation.html',
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
      /**
       * Detect: new Schema({ field: { type: String } })
       * Report when schema field object has a `type` property but no validation properties.
       */
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== 'Schema') {
          return;
        }

        const schemaArg = node.arguments[0];
        if (!schemaArg || schemaArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        // Each property in the schema definition is a field
        for (const field of schemaArg.properties) {
          if (field.type !== AST_NODE_TYPES.Property) continue;

          // Only check object-style field definitions (not shorthand like { name: String })
          if (field.value.type !== AST_NODE_TYPES.ObjectExpression) continue;

          const fieldProps = field.value.properties;
          const hasType = fieldProps.some((p) => {
            if (p.type !== AST_NODE_TYPES.Property) return false;
            return p.key.type === AST_NODE_TYPES.Identifier && p.key.name === 'type';
          });

          if (!hasType) continue;

          const hasValidation = fieldProps.some((p) => {
            if (p.type !== AST_NODE_TYPES.Property) return false;
            const keyName = p.key.type === AST_NODE_TYPES.Identifier ? p.key.name : null;
            return keyName !== null && VALIDATION_PROPERTIES.includes(keyName);
          });

          if (!hasValidation) {
            context.report({
              node: field,
              messageId: 'requireSchemaValidation',
            });
          }
        }
      },
    };
  },
});

export default requireSchemaValidation;
