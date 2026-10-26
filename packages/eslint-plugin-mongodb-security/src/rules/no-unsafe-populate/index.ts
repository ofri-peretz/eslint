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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'unsafePopulate';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

/** Patterns that indicate user input */
const USER_INPUT_PATTERNS = [
  'req.body',
  'req.query',
  'req.params',
  'request.body',
  'request.query',
  'request.params',
  'ctx.request.body',
  'ctx.query',
  'ctx.params',
];

function getNodeSource(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const obj = getNodeSource(node.object);
    const prop =
      node.property.type === AST_NODE_TYPES.Identifier
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

/**
 * Request input, or a template literal built from it:
 * `` `${req.query.rel}` `` names exactly the path `req.query.rel` does.
 */
function fromRequest(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.some(fromRequest);
  }
  // Only a member chain can spell `req.query…`; anything else reads as ''.
  return containsUserInput(node);
}

/** The variable a name resolves to, walking outward from `scope`. */
function lookup(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current !== null;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return undefined;
}

/**
 * `const AUTHOR = 'author'` — a name for a path the program wrote. Every
 * identifier argument used to be reported, so naming a hardcoded path, which
 * is the fix this rule's message asks for, was itself a finding.
 */
function isConstString(
  node: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): boolean {
  const def = lookup(node.name, scope)?.defs[0];
  return (
    def?.type === 'Variable' &&
    def.parent.kind === 'const' &&
    // A string literal or an uninterpolated template.
    staticString(def.node.init) !== null
  );
}

export const noUnsafePopulate = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-populate',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-unsafe-populate.md',
      description: 'Prevent user-controlled populate() paths (CVE-2025-23061)',
      cwe: 'CWE-943',
      cvss: 6.5,
    },
    messages: {
      unsafePopulate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe populate()',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 6.5,
        description:
          'User-controlled populate() can lead to data exposure or injection',
        severity: 'MEDIUM',
        fix: 'Use hardcoded populate paths instead of user input',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2025-23061',
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
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
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
        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const inTestFile = isTestFilePath(filename);

        if (allowInTests && inTestFile) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        // `query['populate'](...)` calls the same method the dotted form does.
        const methodName = propertyName(node.callee);

        if (methodName !== 'populate') {
          return;
        }

        const scope = context.sourceCode.getScope(node);
        /** A path value: request-built, or a name that is not a const string. */
        const unsafePath = (value: TSESTree.Node): boolean =>
          fromRequest(value) ||
          (value.type === AST_NODE_TYPES.Identifier &&
            !isConstString(value, scope));

        for (const arg of node.arguments) {
          if (
            // `.populate(req.query.include)`, `` .populate(`${req.query.rel}`) ``,
            // `.populate(userField)`
            unsafePath(arg) ||
            // `.populate([req.query.rel, 'author'])` — each element is a path.
            (arg.type === AST_NODE_TYPES.ArrayExpression &&
              arg.elements.some(
                (element) => element !== null && fromRequest(element),
              )) ||
            // `.populate({ path: req.body.field })`
            (arg.type === AST_NODE_TYPES.ObjectExpression &&
              arg.properties.some(
                (prop) =>
                  prop.type === AST_NODE_TYPES.Property &&
                  // `{ path }`, `{ 'path' }` and `{ ['path'] }` are one key.
                  objectKeyName(prop) === 'path' &&
                  unsafePath(prop.value),
              ))
          ) {
            context.report({ node, messageId: 'unsafePopulate' });
            return;
          }
        }
      },
    };
  },
});

export default noUnsafePopulate;
