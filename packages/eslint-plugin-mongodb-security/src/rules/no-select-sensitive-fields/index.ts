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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  staticString,
  propertyName,
  objectKeyName,
} from '@interlace/eslint-devkit';
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

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'refreshToken',
  'apiKey',
  'secret',
];

const QUERY_METHODS = new Set(['find', 'findOne', 'findById']);

/**
 * Native-driver `find` options that take a number or a boolean. In the second
 * slot they would otherwise read as a projection (`{ limit: 1 }`).
 */
const DRIVER_OPTIONS: ReadonlySet<string> = new Set([
  'limit',
  'skip',
  'batchSize',
  'maxTimeMS',
  'timeout',
  'noCursorTimeout',
  'allowDiskUse',
  'returnKey',
  'showRecordId',
  'raw',
]);

export const noSelectSensitiveFields = createRule<RuleOptions, MessageIds>({
  name: 'no-select-sensitive-fields',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-select-sensitive-fields.md',
      description:
        'Prevent returning sensitive fields like password in queries',
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
        documentationLink:
          'https://mongoosejs.com/docs/api/query.html#Query.prototype.select()',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          sensitiveFields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Document field names treated as sensitive',
          },
          requireVisibleSensitiveField: {
            type: 'boolean',
            default: true,
            description:
              'Only report when a sensitive field is visibly selected',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
      requireVisibleSensitiveField: true,
    },
  ],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let fields: string[];
    let mongo: ReturnType<typeof analyzeMongoScope>;
    let sensitiveVisible: boolean;

    type Verdict = 'safe' | 'exposes' | 'unknown';

    /**
     * One projection, as a list of `[field, included]` entries. It exposes a
     * sensitive field it includes; it is safe when it includes only other
     * fields (everything else is left out) or when it excludes a sensitive
     * field (the query was written with that field in mind). Excluding only
     * other fields returns the sensitive ones with the rest: no verdict.
     */
    function classifyEntries(
      entries: ReadonlyArray<[string, boolean]>,
    ): Verdict {
      if (entries.some(([f, included]) => included && fields.includes(f)))
        return 'exposes';
      if (entries.some(([, included]) => included)) return 'safe';
      return entries.some(([f]) => fields.includes(f)) ? 'safe' : 'unknown';
    }

    /**
     * A projection string, as Mongoose reads it (`'name email'`,
     * `'-password'`, `'+password'`): whitespace-separated field names, `-`
     * excludes one, `+` forces a `select: false` field back in. A field is
     * named only by its whole token: `passwordUpdatedAt` is not `password`.
     */
    const classifyString = (text: string): Verdict =>
      classifyEntries(
        text
          .split(/\s+/)
          .filter(Boolean)
          .map((t): [string, boolean] =>
            t.startsWith('-')
              ? [t.slice(1), false]
              : [t.replace(/^\+/, ''), true],
          ),
      );

    /**
     * A projection object: `{ password: 1 }` includes the field, `{ password:
     * 0 }` excludes it. Only keys with a literal 0/1/true/false are read; an
     * options object (`{ session }`, the driver's `{ limit: 1 }`) has none.
     */
    function classifyObject(proj: TSESTree.ObjectExpression): Verdict {
      const entries: Array<[string, boolean]> = [];
      for (const p of proj.properties) {
        if (p.type !== AST_NODE_TYPES.Property) continue;
        const keyName = objectKeyName(p);
        if (
          keyName === null ||
          DRIVER_OPTIONS.has(keyName) ||
          p.value.type !== AST_NODE_TYPES.Literal ||
          ![0, 1, true, false].includes(p.value.value as number | boolean)
        )
          continue;
        entries.push([keyName, p.value.value === 1 || p.value.value === true]);
      }
      return classifyEntries(entries);
    }

    /** A `.select()` argument or a projection: a string or an object. */
    function classifyFields(node: TSESTree.Node | undefined): Verdict {
      if (!node) return 'unknown';
      const text = staticString(node);
      if (text !== null) return classifyString(text);
      return node.type === AST_NODE_TYPES.ObjectExpression
        ? classifyObject(node)
        : 'unknown';
    }

    /**
     * The projection slot, second for every query method. Mongoose takes the
     * projection itself there (`findById(id, 'name')`, `find({}, { name: 1
     * })`); the native driver takes options, with the projection under
     * `projection` (`find(filter, { projection: { name: 1 } })`).
     */
    function classifyProjection(node: TSESTree.CallExpression): Verdict {
      const arg = node.arguments[1];
      if (arg?.type === AST_NODE_TYPES.ObjectExpression) {
        const projProp = arg.properties.find(
          (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property &&
            objectKeyName(p) === 'projection',
        );
        if (projProp) return classifyFields(projProp.value);
      }
      return classifyFields(arg);
    }

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
          token.type === 'Identifier'
            ? token.value
            : token.type === 'String'
              ? token.value.slice(1, -1)
              : null;
        if (name && fields.includes(name)) return true;
      }
      return false;
    };

    return {
      before() {
        // Every rule here is MongoDB-specific, and none of them could ask the
        // file-level question: over the corpus, 47% of this plugin's findings were
        // in files with no Mongo in them. `receiver.ts` discriminates by receiver
        // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
        // well as in a Mongoose one. Registering no visitors is both the gate and
        // the cheap path.
        if (!fileUsesMongo(context.sourceCode.ast)) return false;

        const [options = {}] = context.options;
        const {
          allowInTests = true,
          sensitiveFields,
          requireVisibleSensitiveField = true,
        } = options as Options;
        // One guarded list: the JSON schema rejects `null`, but a mock context can
        // still hand one in.
        fields = sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS;
        const filename = context.filename;
        const inTestFile = isTestFilePath(filename);

        if (allowInTests && inTestFile) {
          return false;
        }

        mongo = analyzeMongoScope(context.sourceCode.ast);
        sensitiveVisible = !requireVisibleSensitiveField || schemaIsSensitive();
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        // `User['find']({…})` runs the same query `User.find({…})` runs.
        const methodName = propertyName(node.callee);

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
          parent.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(parent) === 'select'
        ) {
          // Has .select() — report only when it includes a sensitive field.
          const selectCall = parent.parent;
          if (
            selectCall.type === AST_NODE_TYPES.CallExpression &&
            classifyFields(selectCall.arguments[0]) === 'exposes'
          ) {
            context.report({
              node: selectCall,
              messageId: 'selectSensitiveFields',
            });
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
