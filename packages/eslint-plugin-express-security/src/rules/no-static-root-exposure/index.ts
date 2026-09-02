/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-static-root-exposure
 *
 * Detects static-file middleware that exposes the application root — serving
 * __dirname, '.', '..', process.cwd(), or a path.join()/path.resolve() with
 * no subdirectory or with '..' segments — plus any use of serve-index
 * (directory listing). Serving the application root publishes .env,
 * package-lock.json, .git metadata and the server source itself.
 *
 * CWE-548: Exposure of Information Through Directory Listing
 * OWASP A05:2021 – Security Misconfiguration
 *
 * ## Detection method: structural-api
 *
 * This rule passes the litmus test: it fires on the AST shape of
 * `express.static(<root expression>)` and `serveIndex(...)` — not on route
 * strings or variable names. The safe pattern is a dedicated asset directory:
 * `express.static(path.join(__dirname, 'public'))` (any allowlisted root).
 *
 * The rule does not resolve variables holding paths
 * (`const root = __dirname; express.static(root)`) — a documented false
 * negative kept to avoid taint analysis.
 *
 * @see https://cwe.mitre.org/data/definitions/548.html
 * @see https://expressjs.com/en/4x/api.html#express.static
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary `__dirname` and `process.cwd()` are Node's, and
 * `express.static` is Express's. A project cannot rename them, so they are
 * hardcoded rather than configurable.
 *
 * @see https://nodejs.org/api/modules.html#__dirname
 * @see https://expressjs.com/en/starter/static-files.html
 */
type MessageIds =
  | 'staticRoot'
  | 'traversalSegments'
  | 'nonLiteralPath'
  | 'unknownRoot'
  | 'directoryListing'
  | 'scopeToSubdir';

export interface Options {
  /**
   * Directory names accepted as the first path segment of a static root.
   * Default: `[]` — no allowlist enforced. Set it to opt in.
   */
  allowedRoots?: string[];
}

type RuleOptions = [Options?];

/**
 * Empty by default: no allowlist is enforced unless the consumer asks for one.
 * The previous default (`public|static|dist|build|assets`) treated every other
 * asset-directory name as a vulnerability.
 */
const DEFAULT_ALLOWED_ROOTS: string[] = [];

/** path methods that assemble a root directory from segments. */
const JOIN_METHODS = new Set(['join', 'resolve']);

/**
 * Quotes a config-supplied string for source output. Prefers single quotes,
 * falling back to `JSON.stringify`'s escaped form when the value contains a
 * quote or backslash — naive interpolation would emit invalid JavaScript.
 */
function quoteLiteral(value: string): string {
  const json = JSON.stringify(value);
  const inner = json.slice(1, -1);
  return /['\\]/.test(inner) ? json : `'${inner}'`;
}

export const noStaticRootExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-static-root-exposure',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-static-root-exposure.md',
      description:
        'Disallow express.static() roots that expose the application directory and any serve-index usage',
      cwe: 'CWE-548',
      cvss: 7.5,
    },
    messages: {
      staticRoot: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Application Root Served Statically (CWE-548)',
        cwe: 'CWE-548',
        description:
          'express.static() serves {{exposed}} — the application root. This publishes .env, package-lock.json, .git metadata and the server source itself.',
        severity: 'HIGH',
        fix: "Serve a dedicated asset directory instead: express.static(path.join(__dirname, 'public')).",
        documentationLink: 'https://cwe.mitre.org/data/definitions/548.html',
      }),
      traversalSegments: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Static Root Escapes the Application Directory (CWE-548)',
        cwe: 'CWE-548',
        description:
          'The static root contains a ".." segment, so files OUTSIDE the intended directory become publicly reachable.',
        severity: 'HIGH',
        fix: 'Point express.static() at a dedicated asset directory inside the project, with no ".." segments.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/548.html',
      }),
      nonLiteralPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Static-Root Segment (CWE-548)',
        cwe: 'CWE-548',
        description:
          'The static root is built from a non-literal segment, so the served directory cannot be verified at lint time and may expose unintended files.',
        severity: 'MEDIUM',
        fix: "Use a string literal for every path segment: path.join(__dirname, 'public').",
        documentationLink: 'https://cwe.mitre.org/data/definitions/548.html',
      }),
      unknownRoot: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unrecognized Static-Assets Directory (CWE-548)',
        cwe: 'CWE-548',
        description:
          '"{{root}}" is not an allowlisted static-assets directory. Serving arbitrary directories risks exposing files that were never meant to be public.',
        severity: 'MEDIUM',
        fix: 'Serve a dedicated asset directory (public/, static/, dist/, build/, assets/) or add the directory to the allowedRoots option.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/548.html',
      }),
      directoryListing: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Directory Listing Enabled (CWE-548)',
        cwe: 'CWE-548',
        description:
          'serve-index exposes a browsable listing of every file in the served directory, giving attackers a map of the filesystem.',
        severity: 'HIGH',
        fix: 'Remove the serve-index middleware; serve an explicit index file or a curated file list instead.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/548.html',
      }),
      scopeToSubdir: "Serve path.join(__dirname, '{{root}}') instead",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedRoots: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Directory names accepted as the first path segment of a static root',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { allowedRoots } = options as Options;
    const roots = new Set(allowedRoots ?? DEFAULT_ALLOWED_ROOTS);
    const suggestionRoot =
      (allowedRoots ?? DEFAULT_ALLOWED_ROOTS)[0] ?? 'public';

    /** Local bindings of the serve-index package (require + import). */
    const serveIndexNames = new Set(['serveIndex']);

    function isDirnameNode(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.Identifier && node.name === '__dirname'
      );
    }

    function isProcessCwdCall(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
      if (callee.object.name !== 'process') return false;
      // `process['cwd']()` resolves the same directory.
      return propertyName(callee) === 'cwd';
    }

    function isPathJoinCall(
      node: TSESTree.Node,
    ): node is TSESTree.CallExpression {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
      if (callee.object.name !== 'path') return false;
      // `path['join'](…)` builds the same path.
      return JOIN_METHODS.has(propertyName(callee) as string);
    }

    function isExpressStaticCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      // `express['static'](root)` mounts the same static handler.
      if (propertyName(callee) !== 'static') return false;
      if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
      return callee.object.name.toLowerCase() === 'express';
    }

    /** Split a path string into meaningful segments ('' and '.' dropped). */
    function segmentsOf(value: string): string[] {
      return value.split(/[\\/]+/).filter((seg) => seg !== '' && seg !== '.');
    }

    function reportRoot(node: TSESTree.Node, exposed: string): void {
      context.report({
        node,
        messageId: 'staticRoot',
        data: { exposed },
        suggest: [
          {
            messageId: 'scopeToSubdir',
            data: { root: suggestionRoot },
            fix: (fixer: TSESLint.RuleFixer) =>
              fixer.replaceText(
                node,
                `path.join(__dirname, ${quoteLiteral(suggestionRoot)})`,
              ),
          },
        ],
      });
    }

    /** Analyze the argument list of a path.join()/path.resolve() root. */
    function checkJoinRoot(call: TSESTree.CallExpression): void {
      const literalSegments: string[] = [];
      let hasNonLiteral = false;
      let hasTraversal = false;

      for (const arg of call.arguments) {
        // __dirname / process.cwd() are anchors, not served subdirectories
        if (isDirnameNode(arg) || isProcessCwdCall(arg)) continue;
        if (
          arg.type === AST_NODE_TYPES.Literal &&
          typeof arg.value === 'string'
        ) {
          const segments = segmentsOf(arg.value);
          if (segments.includes('..')) hasTraversal = true;
          literalSegments.push(...segments);
          continue;
        }
        hasNonLiteral = true;
      }

      if (hasTraversal) {
        context.report({ node: call, messageId: 'traversalSegments' });
        return;
      }
      // A non-literal segment is UNKNOWN, not dangerous. It only exposes the
      // application root if nothing else bounds the path, so it is a finding
      // exactly when no literal subdirectory scopes it.
      //
      // `app.use('/js', express.static(path.join(TARGET, 'js')))` was all 5 of
      // this rule's corpus findings (okta-signin-widget's prod-server script).
      // `TARGET` is a build constant and `'js'` bounds the served tree to a
      // subdirectory of it, whatever it resolves to. Reporting that said the
      // application root was published, which is false about the code.
      if (hasNonLiteral && literalSegments.length === 0) {
        context.report({ node: call, messageId: 'nonLiteralPath' });
        return;
      }
      if (literalSegments.length === 0) {
        // path.join(__dirname) — anchors only, no subdirectory
        reportRoot(call, context.sourceCode.getText(call));
        return;
      }
      // The allowlist is opt-in. Enforcing `public|static|dist|build|assets`
      // by default made every other asset directory a security finding —
      // `js`, `css`, `img`, `fonts` are ordinary names, and a directory's name
      // says nothing about whether serving it exposes anything. Configure
      // `allowedRoots` to restore the stricter posture.
      if (roots.size > 0 && !roots.has(literalSegments[0])) {
        context.report({
          node: call,
          messageId: 'unknownRoot',
          data: { root: literalSegments[0] },
        });
      }
    }

    /** Analyze the first argument of express.static(). */
    function checkStaticRoot(node: TSESTree.Node): void {
      if (isDirnameNode(node)) {
        reportRoot(node, '__dirname');
        return;
      }
      if (isProcessCwdCall(node)) {
        reportRoot(node, 'process.cwd()');
        return;
      }
      if (node.type === AST_NODE_TYPES.Literal) {
        if (typeof node.value !== 'string') return;
        const segments = segmentsOf(node.value);
        if (segments.includes('..')) {
          context.report({ node, messageId: 'traversalSegments' });
          return;
        }
        if (segments.length === 0) {
          // '', '.', './', '/'
          reportRoot(node, `'${node.value}'`);
          return;
        }
        // Same opt-in allowlist as the path.join() branch above.
        if (roots.size > 0 && !roots.has(segments[0])) {
          context.report({
            node,
            messageId: 'unknownRoot',
            data: { root: segments[0] },
          });
        }
        return;
      }
      if (isPathJoinCall(node)) {
        checkJoinRoot(node);
      }
      // Anything else (variables, template literals) is not analyzed —
      // documented false negative to avoid taint analysis.
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value !== 'serve-index') return;
        for (const specifier of node.specifiers) {
          serveIndexNames.add(specifier.local.name);
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== AST_NODE_TYPES.Identifier) return;
        if (!node.init) return;
        if (node.init.type !== AST_NODE_TYPES.CallExpression) return;
        const callee = node.init.callee;
        if (callee.type !== AST_NODE_TYPES.Identifier) return;
        if (callee.name !== 'require') return;
        const requiredModule = node.init.arguments[0];
        if (!requiredModule) return;
        if (requiredModule.type !== AST_NODE_TYPES.Literal) return;
        if (requiredModule.value !== 'serve-index') return;
        serveIndexNames.add(node.id.name);
      },

      CallExpression(node: TSESTree.CallExpression) {
        // serve-index usage is a finding on its own — directory listing
        const callee = node.callee;
        if (
          callee.type === AST_NODE_TYPES.Identifier &&
          serveIndexNames.has(callee.name)
        ) {
          context.report({ node, messageId: 'directoryListing' });
          return;
        }

        if (!isExpressStaticCall(node)) return;
        const rootArg = node.arguments[0];
        if (!rootArg) return;
        checkStaticRoot(rootArg);
      },
    };
  },
});
