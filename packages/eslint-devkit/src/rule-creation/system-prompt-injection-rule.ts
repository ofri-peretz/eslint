/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Shared CWE-1427 detector — untrusted content built into a
 * system prompt on a raw inference SDK.
 *
 * A system prompt is instruction text. Whatever is spliced into it is read by
 * the model as instructions, not as data, so an attacker who controls any part
 * of it controls the agent's rules. This is the same argument as
 * `mcp-sdk-security/no-tool-description-injection`, one layer down: tool
 * descriptions and system prompts are both model-facing instruction surfaces
 * that must be static.
 *
 * ## Why this is not `vercel-ai-security/no-dynamic-system-prompt`
 *
 * That rule gates on the Vercel AI SDK's *bare* functions — `generateText`,
 * `streamText`, `generateObject`, `streamObject` — and reads its `system` /
 * `instructions` options. This one gates on a raw SDK's *method* calls
 * (`client.messages.create`, `client.chat.completions.create`,
 * `model.generateContent`) and the shapes those take, including the
 * `messages: [{ role: 'system' }]` array form the Vercel SDK does not use.
 *
 * The two gates cannot both match one call: a bare `generateText(...)` is never
 * a member call ending in `create`/`generateContent`, and the raw SDKs are
 * never invoked as bare functions. A file may import both SDKs and each rule
 * still reports only its own calls — which is the taxonomy contract's hard
 * rule, no line reported twice.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rule-creator';
import { formatLLMMessage, MessageIcons } from '../messaging';
import {
  createModuleListEvidence,
  createModuleListMatcher,
} from './module-evidence';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { propertyName } from '../ast/spellings';
import { resolveModuleBinding } from '../ast/module-binding';
import {
  followConst,
  isEnvironmentRead,
  isGlobalReference,
  MAX_FOLLOW_HOPS,
  readObjectProperty,
  resolveArrayLiteral,
  resolveObjectLiteral,
  resolveSdkExport,
  sdkExportName,
  variableOf,
} from './sdk-flow';

type SourceCode = Readonly<TSESLint.SourceCode>;

/**
 * Configuration for one vendor's instantiation of the CWE-1427 detector.
 *
 * The contract is: `modules` decides *whether* the rule is armed in a file,
 * `requestPaths` decides *which calls* it looks at, and `systemPromptProps`
 * decides *which option* inside those calls holds the instruction text. The
 * `messages: [{ role: 'system' }]` array form is read for every vendor and is
 * not configurable — every SDK in this family spells it the same way.
 *
 * `requestPaths` is what keeps two vendors' instantiations off the same line;
 * see the note on that field before adding a path.
 */
export interface SystemPromptInjectionRuleConfig {
  ruleName: string;
  /** Vendor name for the message, e.g. `OpenAI`. */
  vendor: string;
  /** Module names that open the gate — exact specifier or subpath. */
  modules: readonly string[];
  /**
   * Qualified member paths whose first argument carries the request, e.g.
   * `messages.create` or `completions.create`. Matched as a suffix of the
   * callee's member path.
   *
   * The *path*, not the leaf method: `create` alone is not SDK-specific, and
   * matching on it meant a file importing two SDKs reported one line twice —
   * measured, and exactly what the taxonomy contract forbids. Anthropic's
   * `messages.create` and OpenAI's `completions.create` are distinct; a bare
   * `generateText(...)` has no member path at all, which is what keeps
   * vercel-ai-security's shape out.
   */
  requestPaths: readonly string[];
  /** Option names that hold the system prompt directly, e.g. `system`. */
  systemPromptProps: readonly string[];
  /**
   * Option names whose object value holds more request options, read one level
   * deep — `@google/genai` puts `systemInstruction` under `config`.
   */
  nestedOptionKeys?: readonly string[];
  /**
   * SDK exports constructed with the prompt in their first argument, e.g. the
   * OpenAI Agents SDK's `new Agent({ instructions })`. Matched against the
   * export the callee resolves to through its import, never its local name.
   */
  promptConstructors?: readonly string[];
  /**
   * Request paths whose argument is a *batch*: `requests: [{ params }]`, each
   * `params` a full request body — Anthropic's `messages.batches.create`.
   */
  batchRequestPaths?: readonly string[];
  docsUrl: string;
  documentationLink: string;
}

type MessageIds = 'untrustedSystemPrompt';

/**
 * Is this expression static instruction text?
 *
 * Static means: a string literal, a template with no interpolations, or a
 * concatenation of those. An interpolation, a call, an await or a member
 * expression can all carry content this file cannot see.
 *
 * A bare identifier is the one deliberate exception, and only as the WHOLE
 * value: `const SYSTEM = '…'` above the call is the correct pattern and by far
 * the most common one. Following it is the data-flow analysis these rules exist
 * to avoid, and reporting every `system: SYSTEM_PROMPT` would make the rule
 * unusable. Inside a concatenation the same identifier is the dynamic half, so
 * the exception does not apply there — see isStaticText.
 */
export function isStaticInstruction(node: TSESTree.Node): boolean {
  // Only as the WHOLE value. Inside a concatenation an identifier is the
  // dynamic half — `'You are ' + role` is exactly the shape this rule exists
  // to catch, and treating the identifier as static there made it silent.
  if (node.type === AST_NODE_TYPES.Identifier) return true;
  return isStaticText(node);
}

/** Static text with no escape hatch for identifiers. */
function isStaticText(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Literal)
    return typeof node.value === 'string';
  if (node.type === AST_NODE_TYPES.TemplateLiteral)
    return node.expressions.length === 0;
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return isStaticText(node.left) && isStaticText(node.right);
  }
  return false;
}

/** Static name of a property key, or undefined when it isn't statically known. */
export function staticKey(prop: TSESTree.Node): string | undefined {
  if (prop.type !== AST_NODE_TYPES.Property || prop.computed) return undefined;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (
    prop.key.type === AST_NODE_TYPES.Literal &&
    typeof prop.key.value === 'string'
  ) {
    return prop.key.value;
  }
  return undefined;
}

/**
 * Is this object a chat message whose role is the system role?
 *
 * Only a literal `'system'` counts. `{ role: someRole }` is not knowably the
 * system turn, and guessing would report user turns — which are *supposed* to
 * carry untrusted content.
 */
export function isSystemMessage(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.ObjectExpression) return false;
  return node.properties.some((prop) => {
    if (staticKey(prop) !== 'role') return false;
    const value = unwrapTypeSyntax((prop as TSESTree.Property).value);
    return (
      value.type === AST_NODE_TYPES.Literal &&
      typeof value.value === 'string' &&
      INSTRUCTION_ROLES.has(value.value)
    );
  });
}

/**
 * The roles whose turn is instruction text. OpenAI's reasoning models replaced
 * `system` with `developer` — the same instruction channel under a new name,
 * and the one its current docs use — so a rule reading only `system` was blind
 * to every o-series and Responses-API prompt.
 */
const INSTRUCTION_ROLES = new Set(['system', 'developer']);

/** Request keys holding a list of chat turns: Chat Completions / Messages, and the Responses API. */
const MESSAGE_LIST_KEYS = ['messages', 'input'];

/* ------------------------------------------------------------------------ */
/* Instruction-text classification                                          */
/* ------------------------------------------------------------------------ */

/**
 * `static` — fixed in this file. `dynamic` — built from something that can
 * carry text this file does not fix. `unknown` — a whole value this file cannot
 * see into (a parameter, an import, a global): the caller abstains, which is the
 * old `system: SYSTEM_PROMPT` exception, kept.
 */
export type InstructionVerdict = 'static' | 'dynamic' | 'unknown';

/** TypeScript keywords whose values cannot spell instruction text. */
const NON_TEXT_TYPE_KEYWORDS = new Set<string>([
  AST_NODE_TYPES.TSNumberKeyword,
  AST_NODE_TYPES.TSBooleanKeyword,
  AST_NODE_TYPES.TSBigIntKeyword,
]);

/** Global functions that return a number or a boolean, never text. */
const NUMERIC_GLOBAL_CALLS = new Set([
  'Number',
  'parseInt',
  'parseFloat',
  'Boolean',
]);

/** Global namespaces whose members return numbers / dates (`Date.now()`, `Math.round()`). */
const NUMERIC_GLOBAL_NAMESPACES = new Set(['Math', 'Date']);

/** Number-formatting methods: only numbers have them, and they print digits. */
const NUMBER_FORMAT_METHODS = new Set([
  'toFixed',
  'toPrecision',
  'toExponential',
]);

const isGlobalNamed = (
  node: TSESTree.Node,
  names: ReadonlySet<string>,
  sourceCode: SourceCode,
): boolean =>
  node.type === AST_NODE_TYPES.Identifier &&
  names.has(node.name) &&
  isGlobalReference(node, sourceCode);

const DATE = new Set(['Date']);

/** `new Date(…)`, directly or through a const. */
function isDateValue(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  const resolved = followConst(node, sourceCode);
  return (
    resolved.type === AST_NODE_TYPES.NewExpression &&
    isGlobalNamed(resolved.callee, DATE, sourceCode)
  );
}

/** A parameter whose declared type is a number / boolean / bigint keyword. */
function isNonTextParameter(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): boolean {
  const definition = variableOf(id, sourceCode)?.defs[0];
  if (definition?.type !== 'Parameter') return false;
  const annotation = (definition.name as TSESTree.Identifier).typeAnnotation
    ?.typeAnnotation;
  if (annotation === undefined) return false;
  const members =
    annotation.type === AST_NODE_TYPES.TSUnionType
      ? annotation.types
      : [annotation];
  return members.every((member) => NON_TEXT_TYPE_KEYWORDS.has(member.type));
}

/**
 * Can this expression only ever print as a number, a boolean or a date?
 *
 * The rule's documented false-positive shape was `Today is ${new Date()…}`:
 * an interpolation that cannot carry an attacker's words. A date, a count, a
 * comparison or arithmetic result prints digits and fixed formats — no
 * instruction text — so it does not make a system prompt injectable.
 */
function isNonText(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number,
): boolean {
  // Bounded: `const a = b + 1; const b = a + 1;` is a cycle through consts.
  if (hops <= 0) return false;
  const current = unwrapTypeSyntax(node);
  switch (current.type) {
    case AST_NODE_TYPES.Literal:
      return typeof current.value !== 'string';
    case AST_NODE_TYPES.UnaryExpression:
      return true;
    case AST_NODE_TYPES.BinaryExpression:
      return (
        current.operator !== '+' ||
        (isNonText(current.left, sourceCode, hops - 1) &&
          isNonText(current.right, sourceCode, hops - 1))
      );
    case AST_NODE_TYPES.NewExpression:
      return isGlobalNamed(current.callee, DATE, sourceCode);
    case AST_NODE_TYPES.MemberExpression:
      return propertyName(current) === 'length';
    case AST_NODE_TYPES.CallExpression: {
      const callee = unwrapTypeSyntax(current.callee);
      if (isGlobalNamed(callee, NUMERIC_GLOBAL_CALLS, sourceCode)) return true;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = propertyName(callee);
      return (
        isGlobalNamed(
          unwrapTypeSyntax(callee.object),
          NUMERIC_GLOBAL_NAMESPACES,
          sourceCode,
        ) ||
        (method !== null && NUMBER_FORMAT_METHODS.has(method)) ||
        isDateValue(callee.object, sourceCode)
      );
    }
    case AST_NODE_TYPES.Identifier: {
      if (isNonTextParameter(current, sourceCode)) return true;
      const resolved = followConst(current, sourceCode);
      return resolved !== current && isNonText(resolved, sourceCode, hops - 1);
    }
    default:
      return false;
  }
}

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Every value a function can return: its `return` arguments, or an arrow's body. */
function returnedValues(fn: FunctionNode): TSESTree.Node[] {
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return [fn.body];
  const values: TSESTree.Node[] = [];
  const stack: TSESTree.Node[] = [fn.body];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === AST_NODE_TYPES.ReturnStatement && node.argument) {
      values.push(node.argument);
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      for (const child of Array.isArray(value) ? value : [value]) {
        if (
          child !== null &&
          typeof child === 'object' &&
          typeof (child as TSESTree.Node).type === 'string' &&
          !isFunctionNode(child as TSESTree.Node)
        ) {
          stack.push(child as TSESTree.Node);
        }
      }
    }
  }
  return values;
}

/** The same-file function a callee names, if it names one. */
function calledFunction(
  callee: TSESTree.Node,
  sourceCode: SourceCode,
): FunctionNode | undefined {
  const target = unwrapTypeSyntax(callee);
  if (target.type !== AST_NODE_TYPES.Identifier) return undefined;
  const resolved = followConst(target, sourceCode);
  if (isFunctionNode(resolved)) return resolved;
  // A `function` declaration: its name's definition is the function itself.
  const definition = variableOf(target, sourceCode)?.defs[0];
  return definition?.type === 'FunctionName'
    ? (definition.node as FunctionNode)
    : undefined;
}

/** The root of a member chain: `a` in `a.b.c`. */
function memberRoot(node: TSESTree.MemberExpression): TSESTree.Node {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = unwrapTypeSyntax(current.object);
  }
  return current;
}

/** Is this identifier bound by an `import`? Module code, not request data. */
function isImported(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  return (
    node.type === AST_NODE_TYPES.Identifier &&
    variableOf(node, sourceCode)?.defs[0]?.type === 'ImportBinding'
  );
}

/** Node builtins whose path helpers return a path built from their arguments. */
const PATH_BUILTINS = new Set([
  'fs',
  'fs/promises',
  'os',
  'path',
  'path/posix',
  'path/win32',
]);
const PATH_HELPERS = new Set([
  'mkdtemp',
  'mkdtempSync',
  'tmpdir',
  'homedir',
  'join',
  'resolve',
  'dirname',
  'basename',
  'relative',
  'normalize',
]);

/**
 * `path.join(os.tmpdir(), 'x')`, `await mkdtemp(prefix)` — a filesystem path
 * the process generates. Resolved through the import, so a local `join` is not it.
 */
function isPathHelper(callee: TSESTree.Node, sourceCode: SourceCode): boolean {
  const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
  const method = binding?.path[binding.path.length - 1];
  return (
    binding !== undefined &&
    PATH_BUILTINS.has(binding.module) &&
    method !== undefined &&
    PATH_HELPERS.has(method)
  );
}

/**
 * Is this system-prompt value fixed in this file?
 *
 * `whole` is true for the value of the prompt option itself and false for a
 * part of it. A whole value this file cannot see into (a parameter, an import,
 * a global) is `unknown` — reporting every `system: SYSTEM_PROMPT` would make
 * the rule unusable. The same value spliced into a template is the dynamic half
 * of it, so it is `dynamic` there.
 *
 * Followed within the file: consts, `[…].join()`, string methods on static
 * text, conditionals between static branches, same-file helpers whose every
 * return is static, members of same-file object literals, and interpolation-free
 * tagged templates (`dedent\`…\``). Values that cannot print text (dates,
 * numbers, comparisons) are static wherever they appear.
 */
export function classifyInstruction(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  whole: boolean,
  hops: number = MAX_FOLLOW_HOPS,
): InstructionVerdict {
  const current = unwrapTypeSyntax(node);
  if (hops <= 0) return 'dynamic';
  if (isNonText(current, sourceCode, hops)) return 'static';

  const part = (child: TSESTree.Node): InstructionVerdict =>
    classifyInstruction(child, sourceCode, false, hops - 1);
  const allStatic = (children: readonly TSESTree.Node[]): InstructionVerdict =>
    children.every((child) => part(child) === 'static') ? 'static' : 'dynamic';
  const branches = (a: TSESTree.Node, b: TSESTree.Node): InstructionVerdict => {
    const verdicts = new Set(
      [a, b].map((branch) =>
        classifyInstruction(branch, sourceCode, whole, hops - 1),
      ),
    );
    if (verdicts.has('dynamic')) return 'dynamic';
    return verdicts.has('unknown') ? 'unknown' : 'static';
  };

  switch (current.type) {
    case AST_NODE_TYPES.Literal:
      return 'static';
    case AST_NODE_TYPES.TemplateLiteral:
      return allStatic(current.expressions);
    case AST_NODE_TYPES.TaggedTemplateExpression:
      return allStatic(current.quasi.expressions);
    case AST_NODE_TYPES.BinaryExpression:
      return allStatic([current.left, current.right]);
    case AST_NODE_TYPES.ConditionalExpression:
      return branches(current.consequent, current.alternate);
    case AST_NODE_TYPES.LogicalExpression:
      return branches(current.left, current.right);
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      // A prompt *function* (the Agents SDK accepts one): judge what it returns.
      return allStatic(returnedValues(current));
    case AST_NODE_TYPES.CallExpression:
      return classifyCall(current, sourceCode, hops);
    case AST_NODE_TYPES.AwaitExpression:
      return classifyInstruction(current.argument, sourceCode, whole, hops - 1);
    case AST_NODE_TYPES.Identifier: {
      const resolved = followConst(current, sourceCode);
      if (resolved !== current) {
        return classifyInstruction(resolved, sourceCode, whole, hops - 1);
      }
      // An imported binding is module code — `RECOMMENDED_PROMPT_PREFIX`
      // from the Agents SDK is the documented way to start a prompt.
      if (isImported(current, sourceCode)) return 'static';
      return whole ? 'unknown' : 'dynamic';
    }
    case AST_NODE_TYPES.MemberExpression: {
      // Operator configuration, not visitor input.
      if (isEnvironmentRead(current, sourceCode)) return 'static';
      const object = resolveObjectLiteral(current.object, sourceCode);
      if (object !== undefined) {
        const key = propertyName(current);
        if (key === null) {
          // `PROMPTS[kind]` — static if every entry is.
          return allStatic(
            object.properties.map((property) =>
              property.type === AST_NODE_TYPES.Property
                ? property.value
                : property,
            ),
          );
        }
        const read = readObjectProperty(object, key, sourceCode);
        if (read.kind === 'value') {
          return classifyInstruction(read.node, sourceCode, whole, hops - 1);
        }
      }
      const root = memberRoot(current);
      if (isImported(root, sourceCode)) return 'static';
      return whole &&
        root.type === AST_NODE_TYPES.Identifier &&
        isGlobalReference(root, sourceCode)
        ? 'unknown'
        : 'dynamic';
    }
    default:
      return 'dynamic';
  }
}

function classifyCall(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
  hops: number,
): InstructionVerdict {
  const part = (child: TSESTree.Node): InstructionVerdict =>
    classifyInstruction(child, sourceCode, false, hops - 1);
  const isStatic = (child: TSESTree.Node): boolean =>
    child.type !== AST_NODE_TYPES.SpreadElement && part(child) === 'static';
  const callee = unwrapTypeSyntax(call.callee);

  // A process-generated filesystem path from static parts —
  // `path.join(os.tmpdir(), 'x')`, `await mkdtemp(prefix)`.
  if (isPathHelper(callee, sourceCode)) {
    return call.arguments.every(isStatic) ? 'static' : 'dynamic';
  }

  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    // `[A, B].join('\n')` over static parts.
    const array = resolveArrayLiteral(callee.object, sourceCode);
    if (array !== undefined && propertyName(callee) === 'join') {
      const elements = array.elements.filter(
        (element): element is TSESTree.Expression | TSESTree.SpreadElement =>
          element !== null,
      );
      return elements.every(isStatic) && call.arguments.every(isStatic)
        ? 'static'
        : 'dynamic';
    }
    // A string method on static text with static arguments: `SYSTEM.trim()`.
    // Not a method of an imported object: `db.query('…')` returns rows, and
    // an import being module code says nothing about what its methods return.
    if (isImported(memberRoot(callee), sourceCode)) return 'dynamic';
    return part(callee.object) === 'static' && call.arguments.every(isStatic)
      ? 'static'
      : 'dynamic';
  }

  // A same-file helper whose every return is static.
  const fn = calledFunction(callee, sourceCode);
  if (fn === undefined) return 'dynamic';
  return returnedValues(fn).every(isStatic) ? 'static' : 'dynamic';
}

/** The `content` value of a message object, if it has a static `content` key. */
export function messageContent(
  node: TSESTree.ObjectExpression,
): TSESTree.Node | undefined {
  for (const prop of node.properties) {
    if (staticKey(prop) === 'content') return (prop as TSESTree.Property).value;
  }
  return undefined;
}

/**
 * Dot-joined member path of a callee, root object excluded.
 *
 * `client.chat.completions.create` -> `chat.completions.create`.
 * A bare `generateText` -> undefined: no member path, so no raw-SDK rule can
 * match it and the Vercel AI SDK's form stays with its own plugin.
 */
export function calleePath(callee: TSESTree.Node): string | undefined {
  const parts: string[] = [];
  let node: TSESTree.Node = callee;
  while (node.type === AST_NODE_TYPES.MemberExpression) {
    // `client['messages']['create']` is the same path — the spelling a
    // bundler emits. A key chosen at runtime or a `#private` name is not.
    const name = propertyName(node);
    if (name === null) return undefined;
    parts.unshift(name);
    node = node.object;
  }
  return parts.length > 0 ? parts.join('.') : undefined;
}

export function createSystemPromptInjectionRule(
  config: SystemPromptInjectionRuleConfig,
) {
  const promptProps = new Set(config.systemPromptProps);
  const paths = config.requestPaths;
  // One probe per rule, not per file: it caches by `Program`, so the walk is
  // paid once however many rules in the plugin ask.
  const usesSdk = createModuleListEvidence(config.modules);
  const owns = createModuleListMatcher(config.modules);
  const nestedKeys = config.nestedOptionKeys ?? [];
  const constructors = new Set(config.promptConstructors ?? []);
  const batchPaths = config.batchRequestPaths ?? [];

  return createRule<[], MessageIds>({
    name: config.ruleName,
    meta: {
      // Shared detection, shared runtimes: oxlint only if every plugin's rule
      // from this factory passes its own suite there.
      interop: { runtimes: ['eslint', 'oxlint'] },
      type: 'problem',
      docs: {
        url: config.docsUrl,
        description: `Disallow untrusted content built into the ${config.vendor} system prompt`,
        cwe: 'CWE-1427',
        cvss: 8.1,
      },
      messages: {
        untrustedSystemPrompt: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: `Untrusted Content in ${config.vendor} System Prompt`,
          cwe: 'CWE-1427',
          owasp: 'A03:2021',
          cvss: 8.1,
          description:
            'The system prompt is built at runtime, so whatever is spliced in is read by the model as instructions rather than as data — anyone controlling that value controls the agent',
          severity: 'HIGH',
          compliance: ['SOC2'],
          fix: 'Keep the system prompt a static string. Pass runtime values as a separate user message, where the model treats them as data — never interpolate them into the instructions.',
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    createOnce(context) {
      let sourceCode: Readonly<TSESLint.SourceCode>;
      let reported: Set<TSESTree.Node>;

      /** Report the value of any system-prompt option that is not static. */
      function inspectRequest(
        options: TSESTree.ObjectExpression,
        nested: boolean,
      ): void {
        // `system: …` / `instructions: …` / `systemInstruction: …`
        for (const key of promptProps) {
          const read = readObjectProperty(options, key, sourceCode);
          if (read.kind === 'value') collect(read.node);
        }

        // `messages: [{ role: 'system', content: … }]`, and the Responses
        // API's `input: [{ role: 'developer', content: … }]`.
        for (const key of MESSAGE_LIST_KEYS) {
          const read = readObjectProperty(options, key, sourceCode);
          if (read.kind !== 'value') continue;
          const list = resolveArrayLiteral(read.node, sourceCode);
          for (const element of list?.elements ?? []) {
            if (
              element === null ||
              element.type === AST_NODE_TYPES.SpreadElement
            )
              continue;
            const message = resolveObjectLiteral(element, sourceCode);
            if (message === undefined || !isInstructionTurn(message)) continue;
            const content = readObjectProperty(message, 'content', sourceCode);
            if (content.kind === 'value') collect(content.node);
          }
        }

        // `config: { systemInstruction: … }` — one level, never deeper.
        if (nested) return;
        for (const key of nestedKeys) {
          const read = readObjectProperty(options, key, sourceCode);
          const inner =
            read.kind === 'value'
              ? resolveObjectLiteral(read.node, sourceCode)
              : undefined;
          if (inner !== undefined) inspectRequest(inner, true);
        }
      }

      /** `role: 'system'` / `'developer'`, written inline or through a const. */
      function isInstructionTurn(message: TSESTree.ObjectExpression): boolean {
        const read = readObjectProperty(message, 'role', sourceCode);
        if (read.kind !== 'value') return false;
        const role = followConst(read.node, sourceCode);
        return (
          role.type === AST_NODE_TYPES.Literal &&
          typeof role.value === 'string' &&
          INSTRUCTION_ROLES.has(role.value)
        );
      }

      /**
       * Judge a prompt value. Content-block arrays (`[{ type: 'text', text }]`,
       * Anthropic's cache-control form and OpenAI's content parts) and Gemini's
       * `{ parts: [{ text }] }` are unwrapped to the text they carry first.
       */
      function collect(value: TSESTree.Node): void {
        const resolved = followConst(value, sourceCode);
        if (resolved.type === AST_NODE_TYPES.ArrayExpression) {
          for (const element of resolved.elements) {
            if (
              element !== null &&
              element.type !== AST_NODE_TYPES.SpreadElement
            )
              collect(element);
          }
          return;
        }
        if (resolved.type === AST_NODE_TYPES.ObjectExpression) {
          for (const key of ['text', 'parts']) {
            const read = readObjectProperty(resolved, key, sourceCode);
            if (read.kind === 'value') collect(read.node);
          }
          return;
        }
        if (
          classifyInstruction(value, sourceCode, true) === 'dynamic' &&
          !reported.has(value)
        ) {
          reported.add(value);
          context.report({ node: value, messageId: 'untrustedSystemPrompt' });
        }
      }

      /**
       * Is the receiver provably something other than this SDK's client?
       *
       * Only same-file evidence counts: an object literal, or a `new X()` whose
       * `X` is a same-file class that does not extend the SDK or an import from
       * another package. A parameter, an import or a call result is inspected
       * as before — clients are passed around, and `import { ai } from
       * './lib/ai'` is usually the SDK client.
       */
      function receiverIsForeign(callee: TSESTree.Node): boolean {
        const root = memberRoot(callee as TSESTree.MemberExpression);
        const value = followConst(root, sourceCode);
        if (value === root) return false;
        if (value.type === AST_NODE_TYPES.ObjectExpression) return true;
        if (value.type !== AST_NODE_TYPES.NewExpression) return false;
        if (resolveSdkExport(value.callee, sourceCode, owns) !== undefined)
          return false;
        const constructor = unwrapTypeSyntax(value.callee);
        if (constructor.type !== AST_NODE_TYPES.Identifier) return false;
        const definition = variableOf(constructor, sourceCode)?.defs[0];
        if (definition?.type === 'ImportBinding') {
          const source = (definition.parent as TSESTree.ImportDeclaration)
            .source.value;
          return !source.startsWith('.');
        }
        if (definition?.type === 'ClassName') {
          const superClass = (definition.node as TSESTree.ClassDeclaration)
            .superClass;
          return (
            superClass === null ||
            resolveSdkExport(superClass, sourceCode, owns) === undefined
          );
        }
        return false;
      }

      function requestOf(node: TSESTree.Node | undefined): void {
        if (node === undefined || node.type === AST_NODE_TYPES.SpreadElement)
          return;
        const options = resolveObjectLiteral(node, sourceCode);
        if (options !== undefined) inspectRequest(options, false);
      }

      /**
       * The entries of a batch list: an array literal's elements, or what the
       * callback of `items.map((item) => ({ custom_id, params }))` returns —
       * the usual way a batch is built.
       */
      function batchEntries(node: TSESTree.Node): TSESTree.Node[] {
        const list = resolveArrayLiteral(node, sourceCode);
        if (list !== undefined) {
          return list.elements.filter(
            (element): element is TSESTree.Expression =>
              element !== null && element.type !== AST_NODE_TYPES.SpreadElement,
          );
        }
        const call = followConst(node, sourceCode);
        if (
          call.type !== AST_NODE_TYPES.CallExpression ||
          call.callee.type !== AST_NODE_TYPES.MemberExpression ||
          propertyName(call.callee) !== 'map'
        )
          return [];
        const callback = call.arguments[0];
        return callback !== undefined && isFunctionNode(callback)
          ? returnedValues(callback)
          : [];
      }

      /** `{ requests: [{ params: <request> }, …] }` — each params is a request. */
      function batchOf(node: TSESTree.Node | undefined): void {
        if (node === undefined || node.type === AST_NODE_TYPES.SpreadElement)
          return;
        const batch = resolveObjectLiteral(node, sourceCode);
        const read =
          batch === undefined
            ? undefined
            : readObjectProperty(batch, 'requests', sourceCode);
        if (read?.kind !== 'value') return;
        for (const element of batchEntries(read.node)) {
          const entry = resolveObjectLiteral(element, sourceCode);
          const params =
            entry === undefined
              ? undefined
              : readObjectProperty(entry, 'params', sourceCode);
          if (params?.kind === 'value') requestOf(params.node);
        }
      }

      const matches = (path: string, list: readonly string[]): boolean =>
        list.some((p) => path === p || path.endsWith(`.${p}`));

      return {
        before() {
          // Asked once, up front, over the whole AST — so the verdict cannot depend
          // on whether the import is written above or below the call, which is what
          // the old two-visitor gate needed a `Program:exit` pass to survive.
          if (!usesSdk(context.sourceCode.ast)) return false;
          sourceCode = context.sourceCode;
          // A request object held in a const and sent twice is one finding.
          reported = new Set<TSESTree.Node>();
          return true;
        },
        CallExpression(node: TSESTree.CallExpression) {
          // A member call whose path ends in one of this SDK's request paths.
          const path = calleePath(node.callee);
          if (path === undefined) return;
          if (matches(path, batchPaths)) {
            if (!receiverIsForeign(node.callee)) batchOf(node.arguments[0]);
            return;
          }
          if (!matches(path, paths)) return;
          if (receiverIsForeign(node.callee)) return;
          // Every argument: the Assistants API takes the thread id first
          // (`runs.create(threadId, { instructions })`), and a second options
          // argument with no prompt keys costs nothing to read.
          for (const argument of node.arguments) requestOf(argument);
        },

        NewExpression(node: TSESTree.NewExpression) {
          if (constructors.size === 0) return;
          const binding = resolveSdkExport(node.callee, sourceCode, owns);
          if (binding === undefined) return;
          if (!constructors.has(sdkExportName(binding))) return;
          requestOf(node.arguments[0]);
        },
      };
    },
  });
}
