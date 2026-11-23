/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-helmet
 * Detects Express.js applications missing helmet middleware for security headers
 * CWE-693: Protection Mechanism Failure
 *
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://helmetjs.github.io/
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  packageBindings,
  type PackageBindings,
} from '../../utils/import-bindings';
import {
  nodeReleasesBinding,
  RELEASE_SELECTOR,
  servesBrowserDocuments,
} from '../../utils/app-composition';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary `helmet` and `express` are PACKAGE names on npm, and `require`
 * is CommonJS. Matching them is matching a published module identifier, not
 * guessing at a consumer's variable names.
 *
 * @see https://www.npmjs.com/package/helmet
 */
type MessageIds = 'missingHelmet';

export interface Options {
  /** Allow missing helmet in test files. Default: false */
  allowInTests?: boolean;

  /** Alternative security headers middleware names to accept. Default: [] */
  alternativeMiddleware?: string[];

  /** Skip rule if helmet/security headers are provided elsewhere (e.g., reverse proxy). Default: false */
  assumeHelmetMiddleware?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a node is an app.use() call with helmet
 */
/**
 * The middleware an `app.use(...)` mounts: its arguments, with
 * `app.use([a(), b()])` arrays flattened — Express accepts both.
 */
function mountedMiddleware(node: TSESTree.CallExpression): TSESTree.Node[] {
  return node.arguments.flatMap((arg): TSESTree.Node[] =>
    arg.type === 'ArrayExpression'
      ? arg.elements.filter((e) => e !== null)
      : [arg],
  );
}

function isHelmetMiddleware(
  node: TSESTree.CallExpression,
  helmetNames: ReadonlySet<string>,
): boolean {
  const callee = node.callee;

  // Check for app.use(helmet()) or app.use(helmet.contentSecurityPolicy())
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  // `app['use'](helmet())` installs the same middleware.
  if (propertyName(callee) !== 'use') {
    return false;
  }

  // Check arguments for helmet usage
  for (const arg of mountedMiddleware(node)) {
    if (arg.type === 'CallExpression') {
      const argCallee = arg.callee;

      // helmet()
      if (argCallee.type === 'Identifier' && helmetNames.has(argCallee.name)) {
        return true;
      }

      // helmet.contentSecurityPolicy() etc.
      if (
        argCallee.type === 'MemberExpression' &&
        argCallee.object.type === 'Identifier' &&
        helmetNames.has(argCallee.object.name)
      ) {
        return true;
      }
    }

    // app.use(helmet) without call (unlikely but possible)
    if (arg.type === 'Identifier' && helmetNames.has(arg.name)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if middleware is an alternative security headers middleware
 */
function isAlternativeMiddleware(
  node: TSESTree.CallExpression,
  alternatives: string[],
): boolean {
  for (const arg of mountedMiddleware(node)) {
    if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
      if (alternatives.includes(arg.callee.name)) {
        return true;
      }
    }
    if (arg.type === 'Identifier' && alternatives.includes(arg.name)) {
      return true;
    }
  }
  return false;
}

/**
 * The function a call hands `binding` to, when this file defines it and
 * every use of the receiving parameter is as a RECEIVER (`app.use(...)`).
 *
 * A call to a function declared in this very file is not an app leaving the
 * file: its body is right here, so "no helmet in it" is as provable as "no
 * helmet next to `express()`". Anything the file cannot read still escapes —
 * an imported function, a method, a parameter that is passed on, returned,
 * stored or reassigned, an argument position the function has no parameter
 * for — because there the stack is assembled out of view.
 */
function localReceiverOnly(
  node: TSESTree.CallExpression,
  binding: string,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const scopeOf = (n: TSESTree.Node): TSESLint.Scope.Scope =>
    sourceCode.getScope(n);
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return false;
  const calleeName = node.callee.name;
  let variable: TSESLint.Scope.Variable | undefined;
  for (let s: TSESLint.Scope.Scope | null = scopeOf(node); s; s = s.upper) {
    variable = s.set.get(calleeName);
    if (variable) break;
  }
  const def = variable?.defs[0];
  if (!variable || !def) return false;
  let fn: TSESTree.Node | null = null;
  if (def.type === 'FunctionName') {
    fn = def.node;
  } else if (
    def.node.type === AST_NODE_TYPES.VariableDeclarator &&
    variable.references.filter((ref) => ref.isWrite()).length === 1
  ) {
    fn = def.node.init;
  }
  if (
    fn?.type !== AST_NODE_TYPES.FunctionDeclaration &&
    fn?.type !== AST_NODE_TYPES.FunctionExpression &&
    fn?.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  const params = fn.params;
  for (const [index, argument] of node.arguments.entries()) {
    if (argument.type === AST_NODE_TYPES.SpreadElement) return false;
    if (argument.type !== AST_NODE_TYPES.Identifier) continue;
    if (argument.name !== binding) continue;
    const param = params[index];
    if (param?.type !== AST_NODE_TYPES.Identifier) return false;
    const notAReceiver = sourceCode
      .getDeclaredVariables(fn)
      .filter((candidate) => candidate.name === param.name)
      .some((variable) =>
        variable.references.some((reference) => {
          const parent = reference.identifier.parent;
          const asReceiver =
            parent?.type === AST_NODE_TYPES.MemberExpression &&
            parent.object === reference.identifier;
          // A rewritten parameter is not the app any more.
          return !asReceiver || reference.isWrite();
        }),
      );
    if (notAReceiver) return false;
  }
  return true;
}

export const requireHelmet = createRule<RuleOptions, MessageIds>({
  name: 'require-helmet',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-helmet.md',
      description:
        'Require helmet middleware for security headers in Express.js applications',
      cwe: 'CWE-693',
      cvss: 7.5,
      confidence: 'high',
    },
    messages: {
      missingHelmet: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Security Headers',
        cwe: 'CWE-693',
        description:
          'This Express app renders documents to a browser but never mounts helmet. Without it the responses carry no Content-Security-Policy, X-Frame-Options or referrer policy, so any rendered page is framable and unconstrained.',
        severity: 'HIGH',
        fix: "Add helmet middleware: app.use(helmet()). Install with 'npm install helmet'.",
        documentationLink: 'https://helmetjs.github.io/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing helmet in test files',
          },
          alternativeMiddleware: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Alternative security headers middleware names to accept',
          },
          assumeHelmetMiddleware: {
            type: 'boolean',
            default: false,
            description:
              'Skip rule if security headers are provided elsewhere (e.g., reverse proxy)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      alternativeMiddleware: [],
      assumeHelmetMiddleware: false,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    let alternativeMiddleware: string[];
    let assumeHelmetMiddleware: boolean;
    let hasExpressApp: boolean;
    let hasHelmet: boolean;
    let expressAppNode: TSESTree.CallExpression | null;
    let appBinding: string | null;
    let appEscapes: boolean;
    /** `helmet` plus any local the file binds the helmet package to. */
    let helmetNames: Set<string>;
    /** Locals bound to the express module (`import createApp from 'express'`). */
    let expressBindings: PackageBindings;

    return {
      before() {
        const [options] = currentOptions();
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        // Rule partition — exactly one rule owns any given site.
        //
        // `require-rate-limiting` used to report the identical `express()` node
        // this rule reports: all six of its corpus findings were at the same
        // file:line:column as all six of this rule's. Two problem-severity
        // findings on one character, with two unrelated fixes, is the shape the
        // deprecated `no-missing-security-headers` was removed from `recommended`
        // for (see src/index.ts). The partition is now by *meaning*:
        //
        //   this rule            → the app renders documents to a browser, and the
        //                          document-directed header set is absent.
        //   require-rate-limiting → a specific credential-accepting endpoint is
        //                          unthrottled; it reports at that route, never at
        //                          `express()`.
        //
        // Helmet is inert on a response nothing renders, so document evidence is
        // this rule's precondition rather than a heuristic filter.
        if (!servesBrowserDocuments(context.sourceCode.ast)) return false;

        ({
          allowInTests = false,
          alternativeMiddleware = [],
          assumeHelmetMiddleware = false,
        } = options as Options);

        // Skip entirely if helmet/security headers are assumed to be provided elsewhere
        if (assumeHelmetMiddleware) {
          return false;
        }

        const filename = context.filename;
        const isTestFile = allowInTests && isTestFilePath(filename);

        if (isTestFile) {
          return false;
        }

        // Track if we've seen express() call and helmet usage
        hasExpressApp = false;
        hasHelmet = false;
        expressAppNode = null;
        /** The binding `express()` was assigned to, so we can see where it travels. */
        appBinding = null;
        /**
         * The app was handed to another function, which means the middleware stack
         * is assembled somewhere this rule cannot see.
         *
         * Splitting setup into `setAppConfigurations(app)` is the normal shape for
         * any non-toy Express app. ToniR7/express-typescript-starter creates the app
         * in `app.ts` and calls `app.use(helmet())` in `utils/appInitialization.ts`,
         * with `helmet` in `dependencies` — and this rule reported it anyway.
         *
         * Absence of evidence is not evidence of absence: once the binding leaves
         * the file, "no helmet here" says nothing about the application.
         */
        appEscapes = false;
        const ast = context.sourceCode.ast;
        helmetNames = new Set([
          'helmet',
          ...packageBindings(ast, ['helmet']).modules,
        ]);
        expressBindings = packageBindings(ast, ['express']);
        return true;
      },
      // `module.exports = app`, `export default app`, `return app` — the three
      // non-call ways the app leaves the file. Two of the six corpus findings
      // were `const app = express(); module.exports = app;`.
      [RELEASE_SELECTOR](node: TSESTree.Node) {
        if (appBinding !== null && nodeReleasesBinding(node, appBinding)) {
          appEscapes = true;
        }
      },

      // Detect express() app creation
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // `setAppConfigurations(app)` — the app leaves this file, unless the
        // callee is a function this file defines and only calls methods on it.
        if (
          appBinding !== null &&
          nodeReleasesBinding(node, appBinding) &&
          !localReceiverOnly(node, appBinding, context.sourceCode)
        ) {
          appEscapes = true;
        }

        // Check for express() call
        if (
          callee.type === 'Identifier' &&
          (callee.name === 'express' ||
            expressBindings.modules.has(callee.name))
        ) {
          hasExpressApp = true;
          expressAppNode = node;
          if (
            node.parent?.type === 'VariableDeclarator' &&
            node.parent.id.type === 'Identifier'
          ) {
            appBinding = node.parent.id.name;
          }
          return;
        }

        // Check for require('express')() pattern
        if (
          callee.type === 'CallExpression' &&
          callee.callee.type === 'Identifier' &&
          callee.callee.name === 'require'
        ) {
          const firstArg = callee.arguments[0];
          if (
            firstArg &&
            firstArg.type === 'Literal' &&
            firstArg.value === 'express'
          ) {
            hasExpressApp = true;
            expressAppNode = node;
            return;
          }
        }

        // Check for helmet middleware usage
        if (isHelmetMiddleware(node, helmetNames)) {
          hasHelmet = true;
          return;
        }

        // Check for alternative middleware
        if (isAlternativeMiddleware(node, alternativeMiddleware)) {
          hasHelmet = true;
          return;
        }
      },

      // Report at the end of the file if express app exists but no helmet
      'Program:exit'() {
        if (hasExpressApp && !hasHelmet && !appEscapes && expressAppNode) {
          context.report({
            node: expressAppNode,
            messageId: 'missingHelmet',
          });
        }
      },
    };
  },
});
