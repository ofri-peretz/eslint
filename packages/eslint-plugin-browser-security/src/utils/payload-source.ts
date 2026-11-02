/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The message-source partition, with the two attachment shapes the devkit
 * resolver does not attribute.
 *
 * Every rule in the innerHTML / eval family asks the same question — "which
 * untrusted source does this value come from?" — and the partition only holds
 * if they all ask it of the SAME resolver. So the extension lives here, once,
 * and every family member imports this instead of the devkit original:
 *
 * ```js
 * const reader = new FileReader();
 * reader.onload = () => { el.innerHTML = reader.result; };   // was nobody's file content
 *
 * const worker = new SharedWorker('shared.js');
 * worker.port.onmessage = (e) => { el.innerHTML = e.data; }; // was nobody's worker message
 * ```
 *
 * `reader.result` is the same value as `e.target.result`; the devkit resolver
 * only attributes reads of the handler's PARAMETER. A SharedWorker delivers
 * messages ONLY through its `.port` (a MessagePort), and the devkit resolver
 * only recognises a handler attached to the worker itself — so the SharedWorker
 * half of `no-worker-message-innerhtml`'s ownership gate could never fire on
 * working code. Both belong in `message-source.ts`; they sit here because the
 * plugin may not change the devkit.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  constructedSource,
  createPayloadResolver as createHandlerPayloadResolver,
  createReceiverResolver,
  payloadRoot,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import type { MessageSource, ReceiverResolver } from '@interlace/eslint-devkit';

/** Is `node` the `.port` of a resolved `new SharedWorker(…)` (or Worker)? */
function isWorkerPort(node: TSESTree.Node, resolve: ReceiverResolver): boolean {
  if (
    node.type !== AST_NODE_TYPES.MemberExpression ||
    propertyName(node) !== 'port'
  ) {
    return false;
  }
  const owner = node.object;
  const source =
    owner.type === AST_NODE_TYPES.Identifier
      ? resolve(owner)
      : constructedSource(owner);
  return source === 'worker';
}

/**
 * Is this function attached as a message handler to a worker's port —
 * `w.port.onmessage = fn` or `w.port.addEventListener('message', fn)`?
 */
function isPortHandler(fn: TSESTree.Node, resolve: ReceiverResolver): boolean {
  // A function's parent always exists: only Program has none.
  const parent = fn.parent as TSESTree.Node;
  if (parent.type === AST_NODE_TYPES.AssignmentExpression) {
    return (
      parent.right === fn &&
      parent.left.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(parent.left) === 'onmessage' &&
      isWorkerPort(parent.left.object, resolve)
    );
  }
  return (
    parent.type === AST_NODE_TYPES.CallExpression &&
    parent.arguments[1] === fn &&
    parent.callee.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(parent.callee) === 'addEventListener' &&
    staticString(parent.arguments[0]) === 'message' &&
    isWorkerPort(parent.callee.object, resolve)
  );
}

/** The variable `name` resolves to from `node`'s scope outwards. */
function findVariable(
  node: TSESTree.Node,
  name: string,
  sourceCode: TSESLint.SourceCode,
): TSESLint.Scope.Variable | undefined {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const found = scope.variables.find((variable) => variable.name === name);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Build the file's payload resolver: the devkit's handler-parameter
 * attribution, then `reader.result`, then a worker port's handler payload.
 */
export function createPayloadResolver(
  sourceCode: TSESLint.SourceCode,
): (node: TSESTree.Node) => MessageSource | undefined {
  const handlerPayload = createHandlerPayloadResolver(sourceCode);
  const resolve = createReceiverResolver(sourceCode);

  /** `reader.result` (and reads on top of it) off a resolved FileReader. */
  function readerResult(node: TSESTree.Node): MessageSource | undefined {
    let current = node;
    while (
      current.type === AST_NODE_TYPES.MemberExpression &&
      current.object.type === AST_NODE_TYPES.MemberExpression
    ) {
      current = current.object;
    }
    if (
      current.type !== AST_NODE_TYPES.MemberExpression ||
      current.object.type !== AST_NODE_TYPES.Identifier ||
      propertyName(current) !== 'result'
    ) {
      return undefined;
    }
    return resolve(current.object) === 'filereader' ? 'filereader' : undefined;
  }

  /** A read of the parameter of a handler attached to a worker's port. */
  function portPayload(node: TSESTree.Node): MessageSource | undefined {
    const root = payloadRoot(node);
    if (root === undefined) return undefined;
    const variable = findVariable(root, root.name, sourceCode);
    const isPortParameter =
      variable?.defs.some(
        (definition) =>
          definition.type === 'Parameter' &&
          isPortHandler(definition.node, resolve),
      ) ?? false;
    return isPortParameter ? 'worker' : undefined;
  }

  return (node) =>
    handlerPayload(node) ?? readerResult(node) ?? portPayload(node);
}
