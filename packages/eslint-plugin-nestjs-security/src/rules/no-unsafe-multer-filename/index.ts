/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-multer-filename
 * Flags a multer `diskStorage` filename callback that stores the uploaded
 * file under a name the client chose.
 * CWE-22: Improper Limitation of a Pathname to a Restricted Directory
 *
 * ```ts
 * diskStorage({
 *   destination: './uploads',
 *   filename(req, file, cb) {
 *     cb(null, Date.now() + '-' + file.originalname);   // ← reported
 *   },
 * });
 * ```
 *
 * `file.originalname` is the `filename` parameter of the multipart part. It is
 * attacker-controlled in full — multer does not normalise it, and a timestamp
 * prefix does not help, because the traversal lives in the *suffix*:
 * `1712345678-../../../../home/app/.ssh/authorized_keys`.
 *
 * Why this rule exists at all, given the corpus said no: measured over 52,363
 * files, only 8 combine `diskStorage(` with `originalname`, and 5 of those 8
 * pass it through raw. A low file count is not the same as a low hit rate —
 * every project that writes this code writes it the same way, because the same
 * three tutorials teach it.
 *
 * ## What is deliberately NOT reported
 *
 * Any value that reaches the callback through a **function call** — `extname()`,
 * `basename()`, `parse().ext`, `sanitize()`, a project helper. The author did
 * something to the name, and deciding whether it was enough means reading a
 * function this rule cannot see. Abstaining there is the difference between a
 * rule with 5 unarguable findings and one with 8 arguable ones.
 *
 * That line is drawn on measured shapes: `${uuid()}${extname(file.originalname)}`
 * (truthy) and `originalname.split('.').pop()` (brocoders) both stay quiet,
 * and `resetName(file)` (meimei-admin) stays quiet because the concatenation
 * happens in another function.
 *
 * @see https://cwe.mitre.org/data/definitions/22.html
 * @see https://github.com/expressjs/multer#diskstorage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { fileUsesNestjs } from '../../utils/nestjs-evidence';

type MessageIds = 'clientControlledFilename';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** Function-ish nodes that can serve as a `filename` handler. */
type FunctionNode =
  TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;

function isFunctionNode(node: TSESTree.Node | undefined): node is FunctionNode {
  return (
    node?.type === AST_NODE_TYPES.FunctionExpression ||
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/**
 * The `filename` handler of a `diskStorage({ … })` call, or null.
 *
 * Both spellings multer's own README uses are accepted: the property
 * (`filename: function (…) {}`) and the method (`filename(…) {}`).
 */
function filenameHandler(node: TSESTree.CallExpression): FunctionNode | null {
  const [options] = node.arguments;
  if (options?.type !== AST_NODE_TYPES.ObjectExpression) return null;
  for (const prop of options.properties) {
    if (prop.type !== AST_NODE_TYPES.Property) continue;
    if (prop.computed) continue;
    if (
      prop.key.type !== AST_NODE_TYPES.Identifier ||
      prop.key.name !== 'filename'
    )
      continue;
    return isFunctionNode(prop.value) ? prop.value : null;
  }
  return null;
}

/**
 * Whether an expression reads `.originalname` off the handler's `file` param
 * without any call in between.
 *
 * Concatenation, template literals and parentheses are transparent: they carry
 * the attacker's bytes through unchanged. A `CallExpression` anywhere on the
 * path is where this stops — see the header.
 */
function readsOriginalNameRaw(
  node: TSESTree.Node | null | undefined,
  fileParam: string,
): boolean {
  if (!node) return false;
  switch (node.type) {
    case AST_NODE_TYPES.MemberExpression:
      return (
        !node.computed &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        node.property.name === 'originalname' &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        node.object.name === fileParam
      );
    case AST_NODE_TYPES.BinaryExpression:
      // `a + b`. Any other operator produces a number or a boolean, neither of
      // which can carry a path separator.
      return (
        node.operator === '+' &&
        (readsOriginalNameRaw(node.left, fileParam) ||
          readsOriginalNameRaw(node.right, fileParam))
      );
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.some((e) => readsOriginalNameRaw(e, fileParam));
    case AST_NODE_TYPES.ConditionalExpression:
      return (
        readsOriginalNameRaw(node.consequent, fileParam) ||
        readsOriginalNameRaw(node.alternate, fileParam)
      );
    case AST_NODE_TYPES.LogicalExpression:
      return (
        readsOriginalNameRaw(node.left, fileParam) ||
        readsOriginalNameRaw(node.right, fileParam)
      );
    default:
      return false;
  }
}

export const noUnsafeMulterFilename = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-multer-filename',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-unsafe-multer-filename.md',
      description:
        'Disallows storing an uploaded file under a client-controlled name',
      cwe: 'CWE-22',
      cvss: 8.1,
    },
    messages: {
      clientControlledFilename: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Client-Controlled Upload Filename',
        cwe: 'CWE-22',
        owasp: 'A01:2021',
        cvss: 8.1,
        description:
          'file.originalname is the filename the client put in the multipart body — multer passes it through unchanged, so it can contain path separators and ../ segments. A timestamp or random prefix does not help: the traversal is in the part that follows it, and multer joins the result onto the destination directory. An upload named ../../../../app/dist/main.js overwrites the running server',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS'],
        // this is the
        // remediation SHOWN to the user; the `${}` is example code in prose,
        // not an un-interpolated template.
        // eslint-disable-next-line no-template-curly-in-string
        fix: 'Build the stored name yourself and take only the extension from the client: cb(null, `${randomUUID()}${extname(file.originalname)}`)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    // Registering no visitors is both the gate and the cheap path: a file
    // that does not use this SDK does no work at all.
    if (!fileUsesNestjs(context.sourceCode.ast)) return {};

    const { allowInTests = true } = options;
    if (allowInTests && isTestFilePath(context.filename)) return {};

    /** The name a handler parameter was given, or null when it is destructured. */
    function paramName(param: TSESTree.Parameter | undefined): string | null {
      return param?.type === AST_NODE_TYPES.Identifier ? param.name : null;
    }

    /**
     * Report the first client-controlled value handed to the storage callback.
     *
     * Multer's signature is `(req, file, cb)`, so `file` is the second parameter
     * and `cb` the third — read by position, not by name: the corpus spells the
     * callback `cb`, `cd` and `callback` across four repos, and a name-based
     * check would have missed two of the five real findings.
     */
    function checkHandler(handler: FunctionNode): void {
      const fileParam = paramName(handler.params[1]);
      const callbackParam = paramName(handler.params[2]);
      if (!fileParam || !callbackParam) return;

      /** Locals assigned a raw `file.originalname`, so `let x = …; cb(null, x)`. */
      const tainted = new Set<string>();

      /** Whether an expression is tainted directly or through a tainted local. */
      const isTainted = (node: TSESTree.Node | null | undefined): boolean => {
        if (readsOriginalNameRaw(node, fileParam)) return true;
        if (!node) return false;
        if (node.type === AST_NODE_TYPES.Identifier)
          return tainted.has(node.name);
        if (node.type === AST_NODE_TYPES.BinaryExpression)
          return (
            node.operator === '+' &&
            (isTainted(node.left) || isTainted(node.right))
          );
        if (node.type === AST_NODE_TYPES.TemplateLiteral)
          return node.expressions.some(isTainted);
        return false;
      };

      let reported = false;

      /**
       * Walk the handler body in source order, so a local is marked tainted
       * before the `cb(…)` that consumes it. Nested functions are skipped: a
       * callback declared inside the handler has its own `file` binding, and
       * following it would mean guessing at when it runs.
       */
      const visit = (node: TSESTree.Node): void => {
        if (reported) return;
        if (node !== handler && isFunctionNode(node)) return;

        if (
          node.type === AST_NODE_TYPES.VariableDeclarator &&
          isTainted(node.init)
        )
          if (node.id.type === AST_NODE_TYPES.Identifier)
            tainted.add(node.id.name);

        if (
          node.type === AST_NODE_TYPES.AssignmentExpression &&
          node.left.type === AST_NODE_TYPES.Identifier &&
          isTainted(node.right)
        )
          tainted.add(node.left.name);

        if (
          node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === callbackParam &&
          isTainted(node.arguments[1])
        ) {
          context.report({
            node: node.arguments[1],
            messageId: 'clientControlledFilename',
          });
          reported = true;
          return;
        }

        for (const key of Object.keys(node) as (keyof typeof node)[]) {
          if (key === 'parent') continue;
          const child = node[key] as unknown;
          if (Array.isArray(child)) {
            for (const c of child)
              if (c && typeof c === 'object' && 'type' in c)
                visit(c as TSESTree.Node);
          } else if (child && typeof child === 'object' && 'type' in child) {
            visit(child as TSESTree.Node);
          }
        }
      };

      visit(handler);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // `diskStorage({…})` and `multer.diskStorage({…})` are the same call.
        const callee = node.callee;
        const name =
          callee.type === AST_NODE_TYPES.Identifier
            ? callee.name
            : callee.type === AST_NODE_TYPES.MemberExpression &&
                !callee.computed &&
                callee.property.type === AST_NODE_TYPES.Identifier
              ? callee.property.name
              : null;
        if (name !== 'diskStorage') return;
        const handler = filenameHandler(node);
        if (handler) checkHandler(handler);
      },
    };
  },
});
