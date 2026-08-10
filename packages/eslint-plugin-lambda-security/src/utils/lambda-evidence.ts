/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Packages whose presence means this file is Lambda code.
 *
 * `serverless-*` and `@middy/*` are matched by prefix because both are families
 * (`@middy/http-json-body-parser`, `serverless-http`).
 */
const AWS_PACKAGES: ReadonlySet<string> = new Set([
  'aws-lambda',
  'aws-sdk',
  'aws-xray-sdk',
  'aws-xray-sdk-core',
  // The bare framework package, distinct from the `serverless-*` plugin family
  // below. Without it, a file importing exactly `serverless` fell outside the
  // gate — 8 in-SDK corpus findings went silent before this line was added.
  'serverless',
  '@aws-lambda-powertools/logger',
  '@aws-lambda-powertools/tracer',
  '@aws-lambda-powertools/metrics',
]);

const AWS_PREFIXES: readonly string[] = [
  '@aws-sdk/',
  '@middy/',
  'serverless-',
  '@aws-lambda-powertools/',
];

/** The Lambda calling convention, in the order the runtime passes them. */
const HANDLER_PARAMS: readonly string[] = ['event', 'context', 'callback'];

function isAwsSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (AWS_PACKAGES.has(specifier)) return true;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  if (AWS_PACKAGES.has(root)) return true;
  return AWS_PREFIXES.some((prefix) => specifier.startsWith(prefix));
}

/**
 * `require('aws-sdk')` and `await import('aws-sdk')` — the two dynamic forms.
 *
 * A Lambda bundle loads the SDK lazily often enough that omitting the dynamic
 * `import()` arm cost six real findings in the corpus: it is an
 * `ImportExpression`, not a `CallExpression`, so the `require` check never sees
 * it.
 */
function isAwsDynamicLoad(node: TSESTree.Node): boolean {
  const argument =
    node.type === AST_NODE_TYPES.ImportExpression
      ? node.source
      : node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ? node.arguments[0]
        : undefined;
  return (
    argument?.type === AST_NODE_TYPES.Literal &&
    typeof argument.value === 'string' &&
    isAwsSpecifier(argument.value)
  );
}

/** Whether a member/identifier chain ends in `handler`. */
function namesHandler(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name === 'handler';
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return (
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'handler'
    );
  }
  return false;
}

/**
 * `exports.handler = …`, `module.exports.handler = …`, `export const handler`,
 * `export async function handler`, `export { x as handler }`.
 */
function declaresHandler(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.AssignmentExpression &&
    namesHandler(node.left)
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
    if (node.specifiers.some((s) => namesHandler(s.exported))) return true;
    const decl = node.declaration;
    if (decl?.type === AST_NODE_TYPES.FunctionDeclaration && decl.id) {
      return decl.id.name === 'handler';
    }
    if (decl?.type === AST_NODE_TYPES.VariableDeclaration) {
      return decl.declarations.some(
        (d) =>
          d.id.type === AST_NODE_TYPES.Identifier && d.id.name === 'handler',
      );
    }
  }
  return false;
}

/**
 * A function taking `(event, context)` — the Lambda calling convention.
 *
 * Requires at least two parameters in order. `(event)` alone is far too common
 * outside Lambda to be evidence of anything: every DOM listener and every
 * emitter callback takes one parameter named `event`.
 */
function hasHandlerSignature(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression &&
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  const params = node.params;
  if (params.length < 2) return false;
  return HANDLER_PARAMS.slice(0, params.length).every(
    (expected, i) =>
      params[i].type === AST_NODE_TYPES.Identifier &&
      (params[i] as TSESTree.Identifier).name === expected,
  );
}

/**
 * Whether this file is AWS Lambda code.
 *
 * Every rule in this plugin is gated on it. Measured over 107,382 files,
 * **98% of everything this plugin reported (9,244 of 9,473 findings) was in a
 * file with no AWS anything in it** — `no-error-swallowing` alone contributed
 * 5,543, firing on any `try/catch` in any file while its own description
 * claimed to detect "empty catch blocks in Lambda handlers".
 *
 * The evidence is deliberately a **union**, because an import gate alone is the
 * wrong gate here. Measured over the 12-repo Lambda corpus: 413 files export a
 * handler and **184 of them (45%) import nothing AWS at all** — `aws-lambda` is
 * a types package, a type-only import vanishes at runtime, and a plain JS
 * handler imports nothing. Gating on imports would have silenced the plugin on
 * nearly half of the real handlers. Conversely 441 files import an AWS SDK
 * without exporting a handler, and they are still Lambda code.
 *
 * So: a handler export, or the `(event, context)` calling convention, or an AWS
 * import. All three are local to the file — nothing is read from
 * `serverless.yml`, `template.yaml` or `package.json`, so there is no project
 * state to go stale and no dependency on lint order.
 */
export function fileIsLambda(ast: TSESTree.Program): boolean {
  let found = false;

  const visit = (node: TSESTree.Node): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isAwsSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (
      isAwsDynamicLoad(node) ||
      declaresHandler(node) ||
      hasHandlerSignature(node)
    ) {
      found = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            visit(child as TSESTree.Node);
            if (found) return;
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        typeof (value as TSESTree.Node).type === 'string'
      ) {
        visit(value as TSESTree.Node);
        if (found) return;
      }
    }
  };

  visit(ast);
  return found;
}
