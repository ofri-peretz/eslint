/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-select-sensitive-fields
 * Prevents returning sensitive fields like password
 * CWE-200: Information Exposure
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isTestFile } from '../../utils/paths';
import { analyzeMongoScope } from '../../utils/receiver';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'selectSensitiveFields';
export interface Options {
  allowInTests?: boolean;
  sensitiveFields?: string[];
  /**
   * Only report when a sensitive field is actually visible in the file — as a
   * schema/entity property, or named by the query's own projection.
   *
   * On by default. A generic `Repository<T>.findOne()` says nothing about
   * whether `T` has a password, and demanding a projection on every read
   * produces one finding per data-access method for zero security value. Set
   * to `false` to flag every unprojected read regardless of what the rule can
   * see — higher recall, far more noise, and only worth it if your schemas
   * live outside the files that query them.
   */
  requireVisibleSensitiveField?: boolean;
}
type RuleOptions = [Options?];

const DEFAULT_SENSITIVE_FIELDS = ['password', 'refreshToken', 'apiKey', 'secret'];

const QUERY_METHODS = new Set(['find', 'findOne', 'findById']);

export const noSelectSensitiveFields = createRule<RuleOptions, MessageIds>({
  name: 'no-select-sensitive-fields',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-select-sensitive-fields.md', description: 'Prevent returning sensitive fields like password in queries',
      cwe: 'CWE-200',
      cvss: 5.3,
    },
    messages: {
      selectSensitiveFields: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Field Exposure',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'Query may return sensitive fields like password or token',
        severity: 'MEDIUM',
        fix: 'Add .select("-password -refreshToken") to exclude sensitive fields',
        documentationLink: 'https://mongoosejs.com/docs/api/query.html#Query.prototype.select()',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true }, sensitiveFields: { type: 'array', items: { type: 'string' }, description: 'Document field names treated as sensitive' }, requireVisibleSensitiveField: { type: 'boolean', default: true, description: 'Only report when a sensitive field is visibly selected' } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true, sensitiveFields: DEFAULT_SENSITIVE_FIELDS, requireVisibleSensitiveField: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Every rule here is MongoDB-specific, and none of them could ask the
    // file-level question: over the corpus, 47% of this plugin's findings were
    // in files with no Mongo in them. `receiver.ts` discriminates by receiver
    // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
    // well as in a Mongoose one. Registering no visitors is both the gate and
    // the cheap path.
    if (!fileUsesMongo(context.sourceCode.ast)) return {};

    const [options = {}] = context.options;
    const {
      allowInTests = true,
      sensitiveFields,
      requireVisibleSensitiveField = true,
    } = options as Options;
    // One guarded list: the JSON schema rejects `null`, but a mock context can
    // still hand one in.
    const fields = sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS;
    const filename = context.filename;
    const inTestFile = isTestFile(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    /**
     * Native MongoDB driver accepts projection as the 2nd argument:
     *   collection.find(filter, { projection: { _id: 1, name: 1 } })
     * If the projection is an explicit inclusion list (1-valued keys) and
     * does not name any sensitive field, the query is safe.
     */
    function classifyProjection(node: TSESTree.CallExpression): 'safe' | 'exposes' | 'unknown' {
      const arg = node.arguments[1];
      if (!arg || arg.type !== AST_NODE_TYPES.ObjectExpression) return 'unknown';
      const projProp = arg.properties.find(
        (p): p is TSESTree.Property =>
          p.type === AST_NODE_TYPES.Property &&
          p.key.type === AST_NODE_TYPES.Identifier &&
          p.key.name === 'projection',
      );
      if (!projProp || projProp.value.type !== AST_NODE_TYPES.ObjectExpression) return 'unknown';
      const proj = projProp.value;
      let hasInclusion = false;
      for (const p of proj.properties) {
        if (p.type !== AST_NODE_TYPES.Property) continue;
        const keyName =
          p.key.type === AST_NODE_TYPES.Identifier ? p.key.name :
          p.key.type === AST_NODE_TYPES.Literal && typeof p.key.value === 'string' ? p.key.value :
          null;
        if (!keyName) continue;
        if (fields.includes(keyName)) {
          // Sensitive field is named — only safe if explicitly excluded (value 0 / false)
          if (
            p.value.type === AST_NODE_TYPES.Literal &&
            (p.value.value === 0 || p.value.value === false)
          ) continue;
          // The projection names a sensitive field and includes it — the
          // query itself is the evidence, no schema lookup needed.
          return 'exposes';
        }
        if (
          p.value.type === AST_NODE_TYPES.Literal &&
          (p.value.value === 1 || p.value.value === true)
        ) hasInclusion = true;
      }
      // Inclusion projection that doesn't name sensitive fields → safe.
      return hasInclusion ? 'safe' : 'unknown';
    }

    const mongo = analyzeMongoScope(context.sourceCode.ast);

    /**
     * Does this file declare a sensitive field anywhere — a `new Schema({...})`
     * key, an `@Prop()`/`@Column()` class property, an interface member? If
     * not, the rule has no basis for claiming the query exposes one.
     */
    const schemaIsSensitive = (): boolean => {
      // `Program.tokens` is typed optional: a parser that skips token
      // decoration would otherwise crash the rule.
      for (const token of context.sourceCode.ast.tokens ?? []) {
        const name =
          token.type === 'Identifier' ? token.value :
          token.type === 'String' ? token.value.slice(1, -1) :
          null;
        if (name && fields.includes(name)) return true;
      }
      return false;
    };
    const sensitiveVisible = !requireVisibleSensitiveField || schemaIsSensitive();

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !QUERY_METHODS.has(methodName)) {
          return;
        }

        // `find`/`findOne`/`findById` are shared with Array.prototype and with
        // every generic repository wrapper — only a model/collection receiver
        // can leak a document field.
        if (!mongo.isModelReceiver(node)) {
          return;
        }

        // Native MongoDB driver: { projection: { ... } } as 2nd arg.
        const projection = classifyProjection(node);
        if (projection === 'safe') return;
        if (projection === 'exposes') {
          context.report({ node, messageId: 'selectSensitiveFields' });
          return;
        }

        // Check if the query chain includes .select()
        const parent = node.parent;
        if (
          parent &&
          parent.type === AST_NODE_TYPES.MemberExpression &&
          parent.property.type === AST_NODE_TYPES.Identifier &&
          parent.property.name === 'select'
        ) {
          // Has .select() — check if it explicitly includes sensitive fields
          const selectCall = parent.parent;
          if (
            selectCall &&
            selectCall.type === AST_NODE_TYPES.CallExpression &&
            selectCall.arguments.length > 0
          ) {
            const arg = selectCall.arguments[0];
            if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
              const selectStr = arg.value;
              // If field is in select without exclusion prefix, it's included
              for (const field of fields) {
                if (selectStr.includes(field) && !selectStr.includes(`-${field}`)) {
                  context.report({ node: selectCall, messageId: 'selectSensitiveFields' });
                  return;
                }
              }
            }
          }
          return;
        }

        // No .select() at all — report only if a sensitive field is actually
        // in view (see `requireVisibleSensitiveField`).
        if (!sensitiveVisible) return;

        context.report({
          node,
          messageId: 'selectSensitiveFields',
        });
      },
    };
  },
});

export default noSelectSensitiveFields;
