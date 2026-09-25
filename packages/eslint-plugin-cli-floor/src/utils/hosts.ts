/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview The one place this plugin decides what a command is.
 *
 * Every rule here reads the same model of the file: which commands it declares,
 * on which host, with which description, examples and handler. The model is
 * built from **provenance, not spelling**. `.action()`, `.command()` and
 * `.description()` are ordinary method names that any router, ORM or test double
 * may own, so a call only counts when its receiver is proven — through
 * `resolveModuleBinding` and ESLint's scope analysis — to be a value the host
 * module produced:
 *
 * - **commander** (and its drop-ins `burgee/commander`,
 *   `@commander-js/extra-typings`): `new Command()`, `createCommand()`, the
 *   `program` export, the pre-v12 default export, and anything a chain of
 *   `this`-returning methods hands back from one of those.
 * - **yargs** (and `burgee/yargs`): `yargs(argv)`, the pre-v18 singleton, a
 *   chain off either, and the instance a `.command()` builder is handed.
 * - **burgee**: the object literal given to `defineCommand`, `defineProgram` or
 *   `definePlugin`, and the object literals in its `commands` array.
 *
 * Where a value cannot be read — a spread, a computed key, a description held
 * in a variable, a command module imported from another file — the model says
 * `unknown` and every rule abstains. Precision over recall is the contract
 * (burgee's `eslint-plugin-cli-floor` intent, constraint 3).
 */

import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

// ---------------------------------------------------------------------------
// Host modules
// ---------------------------------------------------------------------------

/** Modules whose `Command` is commander's. The drop-ins are the same API. */
export const COMMANDER_MODULES: ReadonlySet<string> = new Set([
  'commander',
  '@commander-js/extra-typings',
  'burgee/commander',
]);

/** Modules whose default export is yargs' factory (or, before v18, its singleton). */
export const YARGS_MODULES: ReadonlySet<string> = new Set([
  'yargs',
  'yargs/yargs',
  'burgee/yargs',
]);

/** burgee's own declaration entry points, by module. */
const BURGEE_DEFINERS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['burgee', new Set(['defineCommand', 'defineProgram', 'definePlugin'])],
  ['burgee/plugin', new Set(['definePlugin'])],
]);

/** Every package the model can recognise — the file gate reads this list. */
export const HOST_PACKAGES: readonly string[] = [
  'commander',
  '@commander-js/extra-typings',
  'yargs',
  'burgee',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Host = 'commander' | 'yargs' | 'burgee';

/** A fact the model could establish, could refute, or could not read. */
export type Fact = 'present' | 'absent' | 'unknown';

/** When two calls disagree, the stronger claim wins: present > unknown > absent. */
const FACT_RANK: Readonly<Record<Fact, number>> = {
  absent: 0,
  unknown: 1,
  present: 2,
};

export type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export interface CommandRecord {
  host: Host;
  /** Where a finding about the command is reported. */
  node: TSESTree.Node;
  /** Has a handler (`.action`, a yargs handler, burgee `run`/`load`). */
  runnable: boolean;
  /** Declared hidden — not in help, so help-facing rules abstain. */
  hidden: boolean;
  description: Fact;
  examples: Fact;
}

export interface ProgramModel {
  commands: CommandRecord[];
  /** Every function the model proved to be a command handler. */
  handlers: ReadonlySet<FunctionNode>;
  /**
   * Example command lines that contain a line break — `.example()` first
   * arguments and burgee `examples[].command` strings.
   */
  multilineExamples: TSESTree.Node[];
  /**
   * `.opts()` / `.optsWithGlobals()` calls on a proven commander command: the
   * parsed flags, read from outside the handler's parameters.
   */
  optionReads: ReadonlySet<TSESTree.CallExpression>;
}

type Scope = TSESLint.Scope.Scope;
type Variable = TSESLint.Scope.Variable;

// ---------------------------------------------------------------------------
// Small AST helpers
// ---------------------------------------------------------------------------

export function isFunctionNode(
  node: TSESTree.Node | null | undefined,
): node is FunctionNode {
  return (
    node?.type === AST_NODE_TYPES.FunctionDeclaration ||
    node?.type === AST_NODE_TYPES.FunctionExpression ||
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Innermost variable named `name` visible from `scope`. */
export function lookup(name: string, scope: Scope): Variable | undefined {
  for (let current: Scope | null = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable) return variable;
  }
  return undefined;
}

/** A `const`/`let` binding written exactly once, and its initializer. */
function singleInit(variable: Variable): TSESTree.Expression | undefined {
  const def = variable.defs[0];
  if (def?.type !== 'Variable') return undefined;
  if (def.node.id.type !== AST_NODE_TYPES.Identifier) return undefined;
  if (variable.references.filter((r) => r.isWrite()).length > 1) {
    return undefined;
  }
  return def.node.init ?? undefined;
}

/** `(x)`, `x as T`, `x!`, `x satisfies T` all denote `x`. */
function unwrap(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.TSAsExpression ||
    current.type === AST_NODE_TYPES.TSNonNullExpression ||
    current.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * `resolveModuleBinding`, plus the one destructuring spelling it skips:
 * `const { ['Command']: foo } = require('commander')`. A computed key that is a
 * static string names the export exactly as the dotted key does, and a
 * minifier or a hand-written constant index produces it.
 */
export function bindingOf(
  node: TSESTree.Node,
  scope: Scope,
): ModuleBindingResult | undefined {
  const direct = resolveModuleBinding(node, scope);
  if (direct || node.type !== AST_NODE_TYPES.Identifier) return direct;
  const def = lookup(node.name, scope)?.defs[0];
  if (def?.type !== 'Variable' || def.node.init === null) return undefined;
  if (def.node.id.type !== AST_NODE_TYPES.ObjectPattern) return undefined;
  const property = def.node.id.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property &&
      p.computed &&
      p.value.type === AST_NODE_TYPES.Identifier &&
      p.value.name === node.name,
  );
  const key = property ? staticString(property.key) : null;
  if (key === null) return undefined;
  const base = resolveModuleBinding(def.node.init, scope);
  return base && { module: base.module, path: [...base.path, key] };
}

type ModuleBindingResult = { module: string; path: string[] };

/**
 * The export a parameter's type annotation names, when that type was imported
 * from a module: `(program: Command)` with `Command` imported from commander is
 * `{ module: 'commander', path: ['Command'] }`. The annotation is the author's
 * own statement of provenance, resolved through the import like any value.
 */
function annotatedBinding(
  variable: Variable,
  scope: Scope,
): { module: string; path: string[] } | undefined {
  const def = variable.defs[0];
  const id = def?.name;
  const annotation =
    def?.type === 'Parameter' && id?.type === AST_NODE_TYPES.Identifier
      ? id.typeAnnotation?.typeAnnotation
      : undefined;
  if (annotation?.type !== AST_NODE_TYPES.TSTypeReference) return undefined;
  return bindingOf(annotation.typeName, scope);
}

/**
 * The function a handler argument denotes: written inline, or a function
 * declared in this file and passed by name (one hop).
 */
export function functionOf(
  node: TSESTree.Node | undefined,
  scope: Scope,
): FunctionNode | undefined {
  if (!node) return undefined;
  const target = unwrap(node);
  if (isFunctionNode(target)) return target;
  if (target.type !== AST_NODE_TYPES.Identifier) return undefined;
  const variable = lookup(target.name, scope);
  const def = variable?.defs[0];
  if (def?.type === 'FunctionName' && isFunctionNode(def.node)) return def.node;
  const init = variable && singleInit(variable);
  return init && isFunctionNode(init) ? init : undefined;
}

/** The string a text node spells, including an interpolated template's quasis. */
function textOf(node: TSESTree.Node): string | null {
  const plain = staticString(node);
  if (plain !== null) return plain;
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    // An untagged template always cooks: an invalid escape is a syntax error.
    return node.quasis.map((q) => String(q.value.cooked)).join('');
  }
  return null;
}

/** A text node whose value contains a line break — not one copy-pasteable line. */
function isMultiline(node: TSESTree.Node): boolean {
  const text = textOf(node);
  return text !== null && /[\r\n]/.test(text);
}

/** Properties of an object literal by key, and whether a spread hides others. */
interface ObjectShape {
  props: Map<string, TSESTree.Node>;
  opaque: boolean;
}

function shapeOf(node: TSESTree.ObjectExpression): ObjectShape {
  const props = new Map<string, TSESTree.Node>();
  let opaque = false;
  for (const property of node.properties) {
    if (property.type !== AST_NODE_TYPES.Property) {
      opaque = true;
      continue;
    }
    const key = objectKeyName(property);
    if (key === null) {
      opaque = true;
      continue;
    }
    props.set(key, property.value);
  }
  return { props, opaque };
}

/** `true` literally — a flag written as anything else is not read as set. */
function isTrue(node: TSESTree.Node | undefined): boolean {
  return (
    node !== undefined &&
    node.type === AST_NODE_TYPES.Literal &&
    node.value === true
  );
}

/** `false` literally. */
function isFalse(node: TSESTree.Node | undefined): boolean {
  return (
    node !== undefined &&
    node.type === AST_NODE_TYPES.Literal &&
    node.value === false
  );
}

/**
 * A description argument: present when it is a non-empty string, absent when
 * it is an empty one, unknown when it is anything the AST cannot read.
 */
function descriptionFact(node: TSESTree.Node): Fact {
  const text = staticString(node);
  if (text === null) return 'unknown';
  return text.trim() === '' ? 'absent' : 'present';
}

// ---------------------------------------------------------------------------
// commander
// ---------------------------------------------------------------------------

/**
 * Methods that return the command they are called on. A method outside this
 * list ends the chain: the model stops following rather than guess what an
 * unknown method returns.
 *
 * The getter-capable ones (`description()`, `name()`, `version()` …) return a
 * string when called with no argument, so they only continue a chain when
 * given one.
 */
const COMMANDER_SETTERS: ReadonlySet<string> = new Set([
  'action',
  'addArgument',
  'addCommand',
  'addHelpCommand',
  'addHelpOption',
  'addHelpText',
  'addOption',
  'alias',
  'aliases',
  'argument',
  'arguments',
  'commandsGroup',
  'configureHelp',
  'configureOutput',
  'copyInheritedSettings',
  'description',
  'executableDir',
  'helpCommand',
  'helpGroup',
  'helpOption',
  'hook',
  'name',
  'nameFromFilename',
  'on',
  'option',
  'optionsGroup',
  'requiredOption',
  'setOptionValue',
  'setOptionValueWithSource',
  'summary',
  'usage',
  'version',
]);

/** Setters that take no argument and still return the command. */
const COMMANDER_TOGGLES: ReadonlySet<string> = new Set([
  'allowExcessArguments',
  'allowUnknownOption',
  'combineFlagAndOptionalValue',
  'enablePositionalOptions',
  'exitOverride',
  'passThroughOptions',
  'showHelpAfterError',
  'showSuggestionAfterError',
  'storeOptionsAsProperties',
]);

/** Identity of one commander command: its creation node, or the shared `program`. */
type CommanderKey = TSESTree.Node | string;

function commanderBinding(
  node: TSESTree.Node,
  scope: Scope,
): { module: string; path: string[] } | undefined {
  const binding = bindingOf(node, scope);
  return binding && COMMANDER_MODULES.has(binding.module) ? binding : undefined;
}

/**
 * `.command(name)` and `.command(name, opts)` create a subcommand and return it;
 * `.command(name, 'description')` declares a stand-alone executable and returns
 * the parent. Anything else in the second slot is unreadable.
 */
type CommandCallKind = 'subcommand' | 'executable' | 'unknown';

function commanderCommandKind(call: TSESTree.CallExpression): CommandCallKind {
  const [, second] = call.arguments;
  if (second === undefined) return 'subcommand';
  if (second.type === AST_NODE_TYPES.ObjectExpression) return 'subcommand';
  if (staticString(second) !== null) return 'executable';
  return 'unknown';
}

/**
 * The commander command an expression evaluates to, or `undefined` when that
 * cannot be proven.
 */
export function commanderKeyOf(
  node: TSESTree.Node,
  scope: Scope,
  seen: Set<TSESTree.Node> = new Set(),
): CommanderKey | undefined {
  const target = unwrap(node);
  if (seen.has(target)) return undefined;
  seen.add(target);

  if (target.type === AST_NODE_TYPES.NewExpression) {
    const binding = commanderBinding(target.callee, scope);
    return binding?.path.at(-1) === 'Command' ? target : undefined;
  }

  if (
    target.type === AST_NODE_TYPES.Identifier ||
    target.type === AST_NODE_TYPES.MemberExpression
  ) {
    const binding = commanderBinding(target, scope);
    if (binding) {
      // `program`, `commander.program`, and — before commander 12 — the
      // module object itself, which *was* the program.
      if (binding.path.length === 0) return `${binding.module}#program`;
      if (binding.path.length === 1 && binding.path[0] === 'program') {
        return `${binding.module}#program`;
      }
      return undefined;
    }
    if (target.type === AST_NODE_TYPES.Identifier) {
      const variable = lookup(target.name, scope);
      if (!variable) return undefined;
      // `function register(program: Command)` — each such parameter is one
      // command, whichever program the caller hands in.
      const typed = annotatedBinding(variable, scope);
      if (typed) {
        return COMMANDER_MODULES.has(typed.module) &&
          typed.path.at(-1) === 'Command'
          ? variable.defs[0].name
          : undefined;
      }
      const init = singleInit(variable);
      return init ? commanderKeyOf(init, scope, seen) : undefined;
    }
    return undefined;
  }

  if (target.type !== AST_NODE_TYPES.CallExpression) return undefined;
  const { callee } = target;

  if (callee.type !== AST_NODE_TYPES.MemberExpression) {
    const binding = commanderBinding(callee, scope);
    return binding?.path.at(-1) === 'createCommand' ? target : undefined;
  }

  const method = propertyName(callee);
  if (method === null) return undefined;
  const receiver = commanderKeyOf(callee.object, scope, seen);
  if (receiver === undefined) return undefined;

  if (method === 'command') {
    const kind = commanderCommandKind(target);
    if (kind === 'subcommand') return target;
    return kind === 'executable' ? receiver : undefined;
  }
  if (COMMANDER_TOGGLES.has(method)) return receiver;
  if (COMMANDER_SETTERS.has(method) && target.arguments.length > 0) {
    return receiver;
  }
  return undefined;
}

interface CommanderEntry {
  node: TSESTree.Node;
  subcommand: boolean;
  hidden: boolean;
  parent?: CommanderEntry;
  description: Fact;
  /** Any `addHelpText` on this command. */
  helpText: boolean;
  /** An `addHelpText('afterAll' | 'beforeAll', …)` — shown on every descendant. */
  inheritedHelpText: boolean;
  handler: boolean;
}

// ---------------------------------------------------------------------------
// yargs
// ---------------------------------------------------------------------------

/** yargs methods that return the instance they are called on. */
const YARGS_CHAIN: ReadonlySet<string> = new Set([
  'alias',
  'array',
  'boolean',
  'check',
  'choices',
  'coerce',
  'command',
  'commandDir',
  'commands',
  'completion',
  'config',
  'conflicts',
  'count',
  'default',
  'defaults',
  'demand',
  'demandCommand',
  'demandOption',
  'describe',
  'detectLocale',
  'env',
  'epilog',
  'epilogue',
  'example',
  'exitProcess',
  'fail',
  'global',
  'group',
  'help',
  'hide',
  'implies',
  'locale',
  'middleware',
  'nargs',
  'normalize',
  'number',
  'option',
  'options',
  'parserConfiguration',
  'pkgConf',
  'positional',
  'recommendCommands',
  'requiresArg',
  'scriptName',
  'showHelpOnFail',
  'showHidden',
  'skipValidation',
  'strict',
  'strictCommands',
  'strictOptions',
  'string',
  'updateLocale',
  'updateStrings',
  'usage',
  'version',
  'wrap',
]);

/**
 * Which yargs instance an expression is: the program's root, or the one a
 * command's builder was handed (whose `.example()` belongs to that command).
 */
type YargsOwner =
  { kind: 'root' } | { kind: 'builder'; command: TSESTree.CallExpression };

/** Filled by the model: builder function → the `.command()` call it builds. */
type BuilderIndex = Map<FunctionNode, TSESTree.CallExpression>;

function yargsBinding(node: TSESTree.Node, scope: Scope): boolean {
  const binding = bindingOf(node, scope);
  return (
    binding !== undefined &&
    YARGS_MODULES.has(binding.module) &&
    binding.path.length === 0
  );
}

export function yargsOwnerOf(
  node: TSESTree.Node,
  scope: Scope,
  builders: BuilderIndex,
  seen: Set<TSESTree.Node> = new Set(),
): YargsOwner | undefined {
  const target = unwrap(node);
  if (seen.has(target)) return undefined;
  seen.add(target);

  if (target.type === AST_NODE_TYPES.Identifier) {
    // The pre-v18 singleton: `yargs.command(…)` straight off the import.
    if (yargsBinding(target, scope)) return { kind: 'root' };
    const variable = lookup(target.name, scope);
    if (!variable) return undefined;
    const def = variable.defs[0];
    if (def?.type === 'Parameter' && isFunctionNode(def.node)) {
      // A builder's FIRST parameter is the instance it is handed.
      const first = def.node.params[0];
      const command = builders.get(def.node);
      if (
        command &&
        first?.type === AST_NODE_TYPES.Identifier &&
        first.name === target.name
      ) {
        return { kind: 'builder', command };
      }
      // `function buildCli(y: Argv)` — the author says it is a yargs instance.
      const typed = annotatedBinding(variable, scope);
      return typed !== undefined &&
        YARGS_MODULES.has(typed.module) &&
        typed.path.at(-1) === 'Argv'
        ? { kind: 'root' }
        : undefined;
    }
    const init = singleInit(variable);
    return init ? yargsOwnerOf(init, scope, builders, seen) : undefined;
  }

  if (target.type !== AST_NODE_TYPES.CallExpression) return undefined;
  const { callee } = target;

  // `yargs(argv)` / `yargs()` / `require('yargs')(argv)`.
  if (yargsBinding(callee, scope)) return { kind: 'root' };

  if (callee.type !== AST_NODE_TYPES.MemberExpression) return undefined;
  const method = propertyName(callee);
  if (method === null || !YARGS_CHAIN.has(method)) return undefined;
  return yargsOwnerOf(callee.object, scope, builders, seen);
}

/** A yargs command string or alias list whose first name is the default command. */
function isDefaultYargsCommand(node: TSESTree.Node | undefined): boolean {
  const first =
    node?.type === AST_NODE_TYPES.ArrayExpression ? node.elements[0] : node;
  const text = staticString(first);
  if (text === null) return false;
  const head = text.trim().split(/\s+/)[0];
  return head === '$0' || head === '*';
}

interface YargsCommand {
  call: TSESTree.CallExpression;
  isDefault: boolean;
  hidden: boolean;
  description: Fact;
  builder?: FunctionNode;
  handler?: FunctionNode;
  /** A handler is registered, whether or not this file can read it. */
  runnable: boolean;
  /**
   * A builder is registered that this file cannot read (imported, or hidden
   * behind a spread) — its `.example()` calls are invisible, so abstain.
   */
  builderUnreadable: boolean;
  /** The registration could not be read (an imported command module). */
  opaque: boolean;
}

/**
 * A builder argument whose examples cannot be seen: present, not a function
 * this file declares, and not an options object (which holds no examples).
 */
function unreadableBuilder(
  node: TSESTree.Node | undefined,
  fn: FunctionNode | undefined,
): boolean {
  return (
    node !== undefined &&
    fn === undefined &&
    node.type !== AST_NODE_TYPES.ObjectExpression
  );
}

/** The parts of a `.command(…)` registration the model can read. */
function parseYargsCommand(
  call: TSESTree.CallExpression,
  scope: Scope,
): YargsCommand {
  const [first, second, third, fourth] = call.arguments;
  const base: YargsCommand = {
    call,
    isDefault: false,
    hidden: false,
    description: 'unknown',
    runnable: false,
    builderUnreadable: false,
    opaque: true,
  };
  if (first === undefined) return base;

  if (first.type === AST_NODE_TYPES.ObjectExpression) {
    // `.command({ command, describe, builder, handler })`
    const { props, opaque } = shapeOf(first);
    const describe =
      props.get('describe') ?? props.get('description') ?? props.get('desc');
    const handler = functionOf(props.get('handler'), scope);
    const builder = functionOf(props.get('builder'), scope);
    const builderNode = props.get('builder');
    return {
      call,
      isDefault: isDefaultYargsCommand(props.get('command')),
      hidden: isFalse(describe),
      description:
        describe === undefined
          ? opaque
            ? 'unknown'
            : 'absent'
          : descriptionFact(describe),
      builder,
      handler,
      runnable: props.has('handler') || opaque,
      builderUnreadable:
        unreadableBuilder(builderNode, builder) ||
        (opaque && builderNode === undefined),
      opaque: false,
    };
  }

  const nameIsReadable =
    staticString(first) !== null ||
    first.type === AST_NODE_TYPES.ArrayExpression;
  if (!nameIsReadable) return base;

  // `.command(cmd, desc, builder?, handler?)`. A second argument that is not a
  // string or `false` is a builder or a module in some older overload — read
  // as unknown rather than as a missing description.
  let description: Fact = 'unknown';
  if (second === undefined) description = 'absent';
  else if (staticString(second) !== null) description = descriptionFact(second);
  return {
    call,
    isDefault: isDefaultYargsCommand(first),
    hidden: isFalse(second),
    description,
    builder: functionOf(third, scope),
    handler: functionOf(fourth, scope),
    runnable: fourth !== undefined,
    builderUnreadable: unreadableBuilder(third, functionOf(third, scope)),
    opaque: false,
  };
}

// ---------------------------------------------------------------------------
// burgee
// ---------------------------------------------------------------------------

function burgeeDefiner(
  callee: TSESTree.Node,
  scope: Scope,
): string | undefined {
  const binding = bindingOf(callee, scope);
  if (!binding || binding.path.length !== 1) return undefined;
  const names = BURGEE_DEFINERS.get(binding.module);
  const [name] = binding.path;
  return names?.has(name) ? name : undefined;
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

const cache = new WeakMap<TSESTree.Program, ProgramModel>();

type SourceCode = Readonly<TSESLint.SourceCode>;

type Child = TSESTree.Node | (TSESTree.Node | null)[] | null | undefined;

/** Visit every node once, parent before child. */
function walk(
  node: TSESTree.Node,
  keys: SourceCode['visitorKeys'],
  visit: (node: TSESTree.Node) => void,
): void {
  visit(node);
  // The parser's visitor keys name every child-bearing key of every node type
  // it produces, and each holds a node, an array of nodes (with holes), or null.
  for (const key of keys[node.type] as readonly string[]) {
    const child = (node as unknown as Record<string, Child>)[key];
    for (const item of Array.isArray(child) ? child : [child]) {
      if (item) walk(item, keys, visit);
    }
  }
}

/**
 * Build (once per file) the model every rule in this plugin reads.
 */
export function programModel(sourceCode: SourceCode): ProgramModel {
  const ast = sourceCode.ast;
  const cached = cache.get(ast);
  if (cached) return cached;

  const calls: TSESTree.CallExpression[] = [];
  walk(ast, sourceCode.visitorKeys, (node) => {
    if (node.type === AST_NODE_TYPES.CallExpression) calls.push(node);
  });

  const scopeOf = (node: TSESTree.Node): Scope => sourceCode.getScope(node);
  const handlers = new Set<FunctionNode>();
  const multilineExamples: TSESTree.Node[] = [];
  const optionReads = new Set<TSESTree.CallExpression>();
  const commands: CommandRecord[] = [];

  // -- commander ------------------------------------------------------------
  const commander = new Map<CommanderKey, CommanderEntry>();
  const entry = (key: CommanderKey, node: TSESTree.Node): CommanderEntry => {
    let found = commander.get(key);
    if (!found) {
      found = {
        node: typeof key === 'string' ? node : key,
        subcommand: false,
        hidden: false,
        description: 'absent',
        helpText: false,
        inheritedHelpText: false,
        handler: false,
      };
      commander.set(key, found);
    }
    return found;
  };

  // -- yargs ----------------------------------------------------------------
  const builders: BuilderIndex = new Map();
  const yargsCommands: YargsCommand[] = [];
  // First pass: every `.command()` on a proven yargs instance, so a builder's
  // parameter is known before the `.example()` calls inside it are attributed.
  // Registrations nested in a builder are only reachable once their parent
  // builder is indexed, so repeat until nothing new is found.
  const registered = new Set<TSESTree.CallExpression>();
  for (let grew = true; grew;) {
    grew = false;
    for (const call of calls) {
      if (registered.has(call)) continue;
      const { callee } = call;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) continue;
      if (propertyName(callee) !== 'command') continue;
      const scope = scopeOf(call);
      if (!yargsOwnerOf(callee.object, scope, builders)) continue;
      registered.add(call);
      grew = true;
      const parsed = parseYargsCommand(call, scope);
      yargsCommands.push(parsed);
      if (parsed.builder) builders.set(parsed.builder, call);
    }
  }
  const yargsExamples = new Set<TSESTree.CallExpression>();
  let rootExamples = false;

  for (const call of calls) {
    const { callee } = call;
    const scope = scopeOf(call);

    // burgee: defineCommand / defineProgram / definePlugin
    const definer = burgeeDefiner(callee, scope);
    if (definer !== undefined) {
      const [argument] = call.arguments;
      if (argument?.type === AST_NODE_TYPES.ObjectExpression) {
        readBurgee(argument, definer !== 'defineCommand', scope);
      }
      continue;
    }

    if (callee.type !== AST_NODE_TYPES.MemberExpression) continue;
    const method = propertyName(callee);
    if (method === null) continue;

    // commander
    const key = commanderKeyOf(callee.object, scope);
    if (key !== undefined) {
      readCommander(call, method, key, scope);
      continue;
    }

    // yargs `.example()`
    if (method === 'example') {
      const owner = yargsOwnerOf(callee.object, scope, builders);
      if (!owner) continue;
      if (!readYargsExample(call)) continue;
      if (owner.kind === 'root') rootExamples = true;
      else yargsExamples.add(owner.command);
    }
  }

  function readCommander(
    call: TSESTree.CallExpression,
    method: string,
    key: CommanderKey,
    scope: Scope,
  ): void {
    const self = entry(key, call);
    if (method === 'command') {
      if (commanderCommandKind(call) !== 'subcommand') return;
      const sub = entry(call, call);
      sub.subcommand = true;
      sub.parent = self;
      const [, options] = call.arguments;
      if (options?.type === AST_NODE_TYPES.ObjectExpression) {
        sub.hidden = isTrue(shapeOf(options).props.get('hidden'));
      }
      return;
    }
    if (method === 'addCommand') {
      const [child, options] = call.arguments;
      const childKey = child && commanderKeyOf(child, scope);
      if (childKey === undefined) return;
      const sub = entry(childKey, child);
      sub.parent = self;
      if (options?.type === AST_NODE_TYPES.ObjectExpression) {
        sub.hidden = isTrue(shapeOf(options).props.get('hidden'));
      }
      return;
    }
    if (method === 'description' || method === 'summary') {
      const [text] = call.arguments;
      if (text === undefined) return;
      const fact = descriptionFact(text);
      // One readable description is enough; an unreadable one outranks absent.
      // Ranked, so the order the calls are visited in cannot change the answer.
      if (FACT_RANK[fact] > FACT_RANK[self.description]) {
        self.description = fact;
      }
      return;
    }
    if (method === 'addHelpText') {
      if (call.arguments.length < 2) return;
      self.helpText = true;
      const position = staticString(call.arguments[0]);
      if (position !== 'after' && position !== 'before') {
        self.inheritedHelpText = true;
      }
      return;
    }
    if (method === 'action') {
      const fn = functionOf(call.arguments[0], scope);
      self.handler = call.arguments.length > 0;
      if (fn) handlers.add(fn);
      return;
    }
    if (method === 'opts' || method === 'optsWithGlobals') {
      optionReads.add(call);
    }
  }

  /** Records a multi-line example; returns whether the call declares one at all. */
  function readYargsExample(call: TSESTree.CallExpression): boolean {
    const [first] = call.arguments;
    // `.example()` with nothing in it renders nothing.
    if (first === undefined) return false;
    if (first.type === AST_NODE_TYPES.ArrayExpression) {
      // `.example([[cmd, desc], …])`
      for (const pair of first.elements) {
        if (pair?.type !== AST_NODE_TYPES.ArrayExpression) continue;
        const [line] = pair.elements;
        if (line && isMultiline(line)) multilineExamples.push(line);
      }
      return first.elements.length > 0;
    }
    if (isMultiline(first)) multilineExamples.push(first);
    return true;
  }

  function readBurgee(
    node: TSESTree.ObjectExpression,
    container: boolean,
    scope: Scope,
  ): void {
    const { props, opaque } = shapeOf(node);
    const children = props.get('commands');
    if (children?.type === AST_NODE_TYPES.ArrayExpression) {
      for (const child of children.elements) {
        if (child?.type === AST_NODE_TYPES.ObjectExpression) {
          readBurgee(child, false, scope);
        }
      }
    }
    // A program or a plugin is not itself a command.
    if (container) return;

    const run = props.get('run');
    const fn = functionOf(run, scope);
    if (fn) handlers.add(fn);

    const description = props.get('description');
    const examples = props.get('examples');
    let exampleFact: Fact;
    if (examples === undefined) exampleFact = opaque ? 'unknown' : 'absent';
    else if (examples.type !== AST_NODE_TYPES.ArrayExpression) {
      exampleFact = 'unknown';
    } else {
      exampleFact = examples.elements.length > 0 ? 'present' : 'absent';
      for (const example of examples.elements) {
        if (example?.type !== AST_NODE_TYPES.ObjectExpression) continue;
        const line = shapeOf(example).props.get('command');
        if (line && isMultiline(line)) multilineExamples.push(line);
      }
    }

    commands.push({
      host: 'burgee',
      node,
      runnable: run !== undefined || props.has('load') || opaque,
      hidden: isTrue(props.get('hidden')),
      description:
        description === undefined
          ? opaque
            ? 'unknown'
            : 'absent'
          : descriptionFact(description),
      examples: exampleFact,
    });
  }

  // -- assemble commander ---------------------------------------------------
  const inheritsHelpText = (start: CommanderEntry): boolean => {
    // `a.addCommand(b); b.addCommand(a)` is legal to write; walk it once.
    const visited = new Set<CommanderEntry>([start]);
    let ancestor = start.parent;
    while (ancestor && !visited.has(ancestor)) {
      if (ancestor.inheritedHelpText) return true;
      visited.add(ancestor);
      ancestor = ancestor.parent;
    }
    return false;
  };
  for (const found of commander.values()) {
    if (!found.subcommand && !found.handler) continue;
    commands.push({
      host: 'commander',
      node: found.node,
      runnable: found.handler,
      hidden: found.hidden,
      description: found.description,
      examples:
        found.helpText || inheritsHelpText(found) ? 'present' : 'absent',
    });
  }

  // -- assemble yargs -------------------------------------------------------
  for (const command of yargsCommands) {
    if (command.handler) handlers.add(command.handler);
    if (command.opaque) continue;
    let examples: Fact = yargsExamples.has(command.call) ? 'present' : 'absent';
    if (command.isDefault && rootExamples) examples = 'present';
    if (examples === 'absent' && command.builderUnreadable)
      examples = 'unknown';
    commands.push({
      host: 'yargs',
      node: command.call,
      runnable: command.runnable,
      hidden: command.hidden,
      description: command.description,
      examples,
    });
  }

  const model: ProgramModel = {
    commands,
    handlers,
    multilineExamples,
    optionReads,
  };
  cache.set(ast, model);
  return model;
}

/** The innermost proven handler lexically containing `node`, if any. */
export function enclosingHandler(
  node: TSESTree.Node,
  handlers: ReadonlySet<FunctionNode>,
): FunctionNode | undefined {
  for (
    let current: TSESTree.Node | undefined = node.parent;
    current;
    current = current.parent
  ) {
    if (isFunctionNode(current) && handlers.has(current)) return current;
  }
  return undefined;
}
