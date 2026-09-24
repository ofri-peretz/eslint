/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview What a prompt is, and what "backed by a flag" looks like in
 * the AST.
 *
 * A prompt is a call that resolves — by import, not by name — to one of the
 * prompt libraries below. "Backed by a flag" is read structurally: the handler
 * consults a value that came from its own inputs (its parameters, or the parsed
 * options of a proven commander command) *before* the prompt can run, in one of
 * the shapes that make the prompt skippable:
 *
 *   opts.name ?? await text(…)              // a fallback
 *   if (!opts.name) name = await text(…)    // a guarded branch
 *   opts.yes ? true : await confirm(…)      // a conditional
 *   if (opts.yes) return run(); await …     // an early exit before it
 *   ({ name = await text(…) }) => …         // a destructuring default
 *   inquirer.prompt(questions, { name: opts.name })  // inquirer's prefill
 *   { when: () => !opts.name }              // inquirer's per-question gate
 *
 * It does not match the prompt's result variable to an option by spelling —
 * that would be deciding by a name, which this repository gates against.
 */

import { AST_NODE_TYPES, objectKeyName } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import type { FunctionNode } from './hosts';
import { bindingOf, isFunctionNode, lookup } from './hosts';

type Scope = TSESLint.Scope.Scope;

const CLACK = [
  'autocomplete',
  'autocompleteMultiselect',
  'confirm',
  'group',
  'groupMultiselect',
  'multiselect',
  'password',
  'path',
  'select',
  'selectKey',
  'text',
];

const INQUIRER_PROMPTS = [
  'checkbox',
  'confirm',
  'editor',
  'expand',
  'input',
  'number',
  'password',
  'rawlist',
  'search',
  'select',
];

/**
 * Prompt entry points by module, as the dotted export path that asks a
 * question. `''` is the module's default export called directly.
 */
const PROMPT_EXPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['@clack/prompts', new Set(CLACK)],
  ['caique/clack', new Set(CLACK)],
  ['inquirer', new Set(['prompt', 'default.prompt'])],
  ['caique/inquirer', new Set(['prompt', 'default.prompt'])],
  ['@inquirer/prompts', new Set(INQUIRER_PROMPTS)],
  // `@inquirer/input` and its siblings: one prompt per package, as the default.
  ...INQUIRER_PROMPTS.map(
    (name) => [`@inquirer/${name}`, new Set(['', 'default'])] as const,
  ),
  ['prompts', new Set(['', 'default', 'prompt'])],
  ['enquirer', new Set(['prompt'])],
  ['caique', new Set(['ask'])],
  ['caique/ask', new Set(['ask'])],
]);

/** Whether `module`'s export at `path` asks a question. */
export function isPromptExport(
  module: string,
  path: readonly string[],
): boolean {
  return PROMPT_EXPORTS.get(module)?.has(path.join('.')) === true;
}

/** Every module a prompt can come from — the file gate reads this list. */
export const PROMPT_PACKAGES: readonly string[] = [
  '@clack/prompts',
  'inquirer',
  '@inquirer/prompts',
  'prompts',
  'enquirer',
  'caique',
];

/** Whether a call asks a question, proven by where its callee was imported from. */
export function isPromptCall(
  call: TSESTree.CallExpression,
  scope: Scope,
): boolean {
  const binding = bindingOf(call.callee, scope);
  return binding !== undefined && isPromptExport(binding.module, binding.path);
}

// ---------------------------------------------------------------------------
// "Came from the handler's inputs"
// ---------------------------------------------------------------------------

export interface InputContext {
  handler: FunctionNode;
  /** `.opts()` calls on a proven commander command. */
  optionReads: ReadonlySet<TSESTree.CallExpression>;
  scopeOf: (node: TSESTree.Node) => Scope;
  visitorKeys: TSESLint.SourceCode['visitorKeys'];
}

/**
 * Whether an expression reads the handler's inputs anywhere inside it: a
 * handler parameter (or a name destructured from one), `this` in a
 * non-arrow handler (commander binds the command), a proven `.opts()` read,
 * or a local whose initializer does any of those.
 */
export function readsInputs(
  node: TSESTree.Node,
  context: InputContext,
  seen: Set<TSESTree.Node> = new Set(),
): boolean {
  if (seen.has(node)) return false;
  seen.add(node);

  if (node.type === AST_NODE_TYPES.ThisExpression) {
    return thisOwner(node) === context.handler;
  }
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    context.optionReads.has(node)
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = lookup(node.name, context.scopeOf(node));
    const def = variable?.defs[0];
    if (!def) return false;
    if (def.type === 'Parameter') return def.node === context.handler;
    if (def.type === 'Variable' && def.node.init) {
      return readsInputs(def.node.init, context, seen);
    }
    return false;
  }
  // Do not descend into a nested function: reading an input inside a callback
  // defined in the test is not the test reading it.
  if (isFunctionNode(node)) return false;
  // `x.name` and `{ name: v }` spell a key, not a variable: only the object,
  // a computed key and a property's value are reads.
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return (
      readsInputs(node.object, context, seen) ||
      (node.computed && readsInputs(node.property, context, seen))
    );
  }
  if (node.type === AST_NODE_TYPES.Property) {
    return readsInputs(node.value, context, seen);
  }

  for (const key of context.visitorKeys[node.type] as readonly string[]) {
    const child = (node as unknown as Record<string, Child>)[key];
    for (const item of Array.isArray(child) ? child : [child]) {
      if (item && readsInputs(item, context, seen)) return true;
    }
  }
  return false;
}

type Child = TSESTree.Node | (TSESTree.Node | null)[] | null | undefined;

/**
 * The function whose `this` a `this` expression denotes — the nearest
 * non-arrow function, since arrows do not bind their own. Commander binds the
 * command there, so `this.opts()` in a `function` handler reads its flags.
 */
function thisOwner(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (current.parent) {
    current = current.parent;
    if (
      current.type === AST_NODE_TYPES.FunctionDeclaration ||
      current.type === AST_NODE_TYPES.FunctionExpression
    ) {
      break;
    }
  }
  return current;
}

/** A statement that always leaves: `return`, `throw`, or a block ending in one. */
function alwaysExits(node: TSESTree.Statement): boolean {
  if (
    node.type === AST_NODE_TYPES.ReturnStatement ||
    node.type === AST_NODE_TYPES.ThrowStatement
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    const last = node.body.at(-1);
    return last !== undefined && alwaysExits(last);
  }
  return false;
}

/** A `when:` key on a question object whose value reads the handler's inputs. */
function hasInputGatedQuestion(
  node: TSESTree.Node,
  context: InputContext,
): boolean {
  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    return node.elements.some(
      (element) => element !== null && hasInputGatedQuestion(element, context),
    );
  }
  if (node.type !== AST_NODE_TYPES.ObjectExpression) return false;
  return node.properties.some(
    (property) =>
      property.type === AST_NODE_TYPES.Property &&
      objectKeyName(property) === 'when' &&
      readsInputsThroughFunction(property.value, context),
  );
}

/** Like `readsInputs`, but also looks inside a function value's body. */
function readsInputsThroughFunction(
  node: TSESTree.Node,
  context: InputContext,
): boolean {
  if (isFunctionNode(node)) return readsInputs(node.body, context);
  return readsInputs(node, context);
}

/**
 * Whether a prompt call inside `context.handler` is skipped when the caller
 * supplies the value on the command line.
 */
export function isFlagBacked(
  prompt: TSESTree.CallExpression,
  context: InputContext,
): boolean {
  // Library-level prefill: inquirer's `prompt(questions, answers)` and a
  // question's `when` gate.
  const [questions, answers] = prompt.arguments;
  if (answers !== undefined && readsInputs(answers, context)) return true;
  if (questions !== undefined && hasInputGatedQuestion(questions, context)) {
    return true;
  }

  // The caller found `context.handler` by walking up from the prompt, so the
  // walk below always reaches it.
  let child: TSESTree.Node = prompt;
  let current = prompt.parent as TSESTree.Node;
  while (current !== context.handler) {
    switch (current.type) {
      case AST_NODE_TYPES.LogicalExpression:
        if (current.right === child && readsInputs(current.left, context)) {
          return true;
        }
        break;
      case AST_NODE_TYPES.ConditionalExpression:
      case AST_NODE_TYPES.IfStatement:
        if (current.test !== child && readsInputs(current.test, context)) {
          return true;
        }
        break;
      case AST_NODE_TYPES.AssignmentPattern:
        // `({ name = await text() }) =>` or `const { name = await text() } = opts`
        if (current.right === child && defaultIsFromInputs(current, context)) {
          return true;
        }
        break;
      case AST_NODE_TYPES.BlockStatement:
        if (earlierExitReadsInputs(current.body, child, context)) return true;
        break;
      default:
        break;
    }
    child = current;
    current = current.parent as TSESTree.Node;
  }
  return false;
}

/** An earlier `if (<inputs>) return|throw` sibling in the same block. */
function earlierExitReadsInputs(
  body: readonly TSESTree.Node[],
  child: TSESTree.Node,
  context: InputContext,
): boolean {
  return body
    .slice(0, body.indexOf(child))
    .some(
      (statement) =>
        statement.type === AST_NODE_TYPES.IfStatement &&
        alwaysExits(statement.consequent) &&
        readsInputs(statement.test, context),
    );
}

/**
 * A destructuring default is skipped when the destructured object carries the
 * key — so it is flag-backed when that object is the handler's input: the
 * handler's own parameter, or a declaration or assignment from its inputs.
 */
function defaultIsFromInputs(
  pattern: TSESTree.AssignmentPattern,
  context: InputContext,
): boolean {
  let parent = pattern.parent as TSESTree.Node;
  while (
    parent.type === AST_NODE_TYPES.Property ||
    parent.type === AST_NODE_TYPES.ObjectPattern ||
    parent.type === AST_NODE_TYPES.ArrayPattern
  ) {
    parent = parent.parent as TSESTree.Node;
  }
  if (isFunctionNode(parent)) return parent === context.handler;
  if (parent.type === AST_NODE_TYPES.VariableDeclarator) {
    return parent.init !== null && readsInputs(parent.init, context);
  }
  if (parent.type === AST_NODE_TYPES.AssignmentExpression) {
    return readsInputs(parent.right, context);
  }
  return false;
}
