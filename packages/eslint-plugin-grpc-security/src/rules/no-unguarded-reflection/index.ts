/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Register gRPC server reflection only behind a guard
 * @description Server reflection answers "which services and methods does this
 * listener serve?" to any client, unauthenticated. Registered unconditionally,
 * it ships to production and publishes every service on the server, the
 * internal ones a team assumed nobody outside knew about included
 * (`grpcurl -plaintext host:port list`). That is CWE-306 on the reflection
 * endpoint and OWASP API9:2023 (improper inventory management) for what it
 * reveals.
 *
 * Decided by structure: a registration reports when nothing in the file stands
 * between it and the program running. Any branch counts as a guard (an `if`
 * on `process.env.NODE_ENV`, a config flag, a ternary arm, the right side of
 * `&&`, a `switch` case, an earlier `if (…) return`), because a branch is a
 * decision the code made and the rule cannot know the deployment. A helper
 * that registers reflection is followed to its call sites in the same file; a
 * helper with none (exported, a class method) is left to its caller.
 *
 * @see https://github.com/grpc/grpc/blob/master/doc/server-reflection.md
 */

import {
  TSESTree,
  createRule,
  followConst,
  formatLLMMessage,
  isModuleBinding,
  MessageIcons,
  propertyName,
  variableOf,
} from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

import {
  GRPC_REFLECTION,
  GRPC_SERVER_REFLECTION,
  fileUsesGrpcReflection,
} from '../../utils/grpc-evidence';

type MessageIds = 'unguardedReflection';
type SourceCode = Readonly<TSESLint.SourceCode>;
type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/** Is this call one of the two ways a Node gRPC server registers reflection? */
function isReflectionRegistration(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
): boolean {
  const { callee } = call;
  // grpc-server-reflection: addReflection(server, descriptorSetPath)
  if (
    isModuleBinding(callee, sourceCode.getScope(call), GRPC_SERVER_REFLECTION, [
      'addReflection',
    ])
  ) {
    return true;
  }
  // @grpc/reflection: new ReflectionService(def).addToServer(server)
  if (
    callee.type !== 'MemberExpression' ||
    propertyName(callee) !== 'addToServer'
  ) {
    return false;
  }
  const service = followConst(callee.object, sourceCode);
  return (
    service.type === 'NewExpression' &&
    isModuleBinding(
      service.callee,
      sourceCode.getScope(service),
      GRPC_REFLECTION,
      ['ReflectionService'],
    )
  );
}

/** Does this statement always leave its block: `return`, `throw`, `break`, `continue`? */
function exits(statement: TSESTree.Statement): boolean {
  switch (statement.type) {
    case 'ReturnStatement':
    case 'ThrowStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return true;
    case 'BlockStatement': {
      const last = statement.body.at(-1);
      return last !== undefined && exits(last);
    }
    default:
      return false;
  }
}

/** `if (…) return;` before `child` in the same block makes `child` conditional. */
function followsEarlyExit(
  body: readonly TSESTree.Node[],
  child: TSESTree.Node,
): boolean {
  return body
    .slice(0, body.indexOf(child))
    .some(
      (statement) =>
        statement.type === 'IfStatement' && exits(statement.consequent),
    );
}

/** The identifier a function is bound to, when it has one in this file. */
function bindingOf(fn: FunctionNode): TSESTree.Identifier | undefined {
  if (fn.type === 'FunctionDeclaration') return fn.id ?? undefined;
  const { parent } = fn;
  return parent.type === 'VariableDeclarator' &&
    parent.init === fn &&
    parent.id.type === 'Identifier'
    ? parent.id
    : undefined;
}

/**
 * Is there a branch between `node` and the top of the program?
 *
 * A function is crossed transparently when it is a callback or an IIFE (it
 * runs when its caller does); a named helper is answered by its call sites; any
 * other function cannot be followed, so it counts as guarded: the rule only
 * reports what the file proves.
 */
function isConditional(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  visiting: Set<FunctionNode>,
): boolean {
  let child: TSESTree.Node = node;
  for (
    let parent = node.parent;
    parent != null;
    child = parent, parent = parent.parent
  ) {
    switch (parent.type) {
      case 'IfStatement':
      case 'ConditionalExpression':
        if (child !== parent.test) return true;
        break;
      case 'LogicalExpression':
        if (child === parent.right) return true;
        break;
      // Even a case's own test runs only when the cases above it missed.
      case 'SwitchCase':
        return true;
      case 'BlockStatement':
      case 'Program':
        if (followsEarlyExit(parent.body, child)) return true;
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const invoker = parent.parent;
        const runsWithCaller =
          (invoker.type === 'CallExpression' ||
            invoker.type === 'NewExpression') &&
          (invoker.callee === parent ||
            invoker.arguments.includes(parent as TSESTree.Expression));
        if (runsWithCaller) break;
        return isOnlyCalledConditionally(parent, sourceCode, visiting);
      }
      default:
        break;
    }
  }
  return false;
}

/** True unless some call site of `fn` in this file is itself unconditional. */
function isOnlyCalledConditionally(
  fn: FunctionNode,
  sourceCode: SourceCode,
  visiting: Set<FunctionNode>,
): boolean {
  if (visiting.has(fn)) return true;
  const binding = bindingOf(fn);
  const variable = binding && variableOf(binding, sourceCode);
  if (variable === undefined) return true;
  visiting.add(fn);
  const unconditional = variable.references.some(({ identifier }) => {
    const call = identifier.parent;
    return (
      call?.type === 'CallExpression' &&
      call.callee === identifier &&
      !isConditional(call, sourceCode, visiting)
    );
  });
  visiting.delete(fn);
  return !unconditional;
}

export const noUnguardedReflection = createRule<[], MessageIds>({
  name: 'no-unguarded-reflection',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-unguarded-reflection.md',
      description: 'Register gRPC server reflection only behind a guard',
      cwe: 'CWE-306',
      cvss: 5.3,
    },
    messages: {
      unguardedReflection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Server Reflection Registered Unconditionally',
        cwe: 'CWE-306',
        owasp: 'A05:2021',
        cvss: 5.3,
        description:
          'Server reflection is registered with nothing in the file between it and production, so any client can list every service and method on this listener, internal ones included',
        severity: 'MEDIUM',
        compliance: ['SOC2', 'ISO27001'],
        fix: "Register reflection only where it is meant to run: `if (process.env.NODE_ENV !== 'production') new ReflectionService(def).addToServer(server);`. Serve internal services from a separate server bound to a private interface.",
        documentationLink:
          'https://github.com/grpc/grpc/blob/master/doc/server-reflection.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      before() {
        return fileUsesGrpcReflection(context.sourceCode.ast);
      },
      CallExpression(node): void {
        const { sourceCode } = context;
        if (!isReflectionRegistration(node, sourceCode)) return;
        if (isConditional(node, sourceCode, new Set())) return;
        context.report({ node, messageId: 'unguardedReflection' });
      },
    };
  },
});
