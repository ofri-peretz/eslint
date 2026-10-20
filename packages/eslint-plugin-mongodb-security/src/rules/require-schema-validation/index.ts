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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  staticString,
} from '@interlace/eslint-devkit';
import {
  fileUsesMongo,
  isSchemaConstruction,
  nonMongoImports,
} from '../../utils/mongo-evidence';

type MessageIds = 'requireSchemaValidation';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const VALIDATION_PROPERTIES: ReadonlySet<string | null> = new Set([
  'required',
  'validate',
  'enum',
  'min',
  'max',
  'minlength',
  'maxlength',
  'match',
  'minLength',
  'maxLength',
]);

/** The static name of an option key: `required`, `'required'`, `['required']`. */
function optionKey(property: TSESTree.Property): string | null {
  const { key } = property;
  if (key.type === AST_NODE_TYPES.Identifier && !property.computed)
    return key.name;
  return staticString(key);
}

export const requireSchemaValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-schema-validation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/require-schema-validation.md',
      description: 'Require validation on Mongoose schema fields',
      cwe: 'CWE-20',
      cvss: 6.1,
    },
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
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Every rule here is MongoDB-specific, and none of them could ask the
    // file-level question: over the corpus, 47% of this plugin's findings were
    // in files with no Mongo in them. `receiver.ts` discriminates by receiver
    // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
    // well as in a Mongoose one. Registering no visitors is both the gate and
    // the cheap path.
    if (!fileUsesMongo(context.sourceCode.ast)) return {};

    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const inTestFile = isTestFilePath(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    return {
      /**
       * Detect: new Schema({ field: { type: String } })
       * Report when schema field object has a `type` property but no validation properties.
       */
      NewExpression(node: TSESTree.NewExpression) {
        // `new Schema(...)` or `new mongoose.Schema(...)` — the form the
        // Mongoose docs open with, and the one the module gate already counts
        // as Mongo evidence.
        // A `Schema` imported from another package (dynamoose, ottoman) is
        // that library's, even in a file that also imports mongoose.
        if (
          !isSchemaConstruction(node, nonMongoImports(context.sourceCode.ast))
        ) {
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

          // Keys are read as Mongoose reads them: `type`, `'type'` and
          // `['type']` all declare the field's type, and a quoted
          // `'required'` validates it as much as a bare one does.
          const keys = field.value.properties.map((p) =>
            p.type === AST_NODE_TYPES.Property ? optionKey(p) : null,
          );
          if (!keys.includes('type')) continue;

          const hasValidation = keys.some((key) =>
            VALIDATION_PROPERTIES.has(key),
          );

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
