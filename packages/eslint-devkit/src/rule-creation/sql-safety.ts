/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Can a value spliced into SQL text change the statement? Decided from where
 * the value is written, never from what it is called.
 *
 * The shared CWE-89 detector used to report EVERY interpolation into a raw
 * sink: `${TABLE}` bound to a literal three lines up, `${ids.map(() => '?').join()}`
 * (the placeholder list the rule's own fix asks for), `${isUnique ? 'UNIQUE ' : ''}`,
 * `${mysql.escapeId(col)}`. A value is SAFE here when the file proves it can
 * only be fixed text, a number, or text the driver itself escaped or
 * parameterised:
 *
 *   - literals, and templates / `+` chains / ternaries / `??` / `||` built only
 *     of safe parts;
 *   - numbers: arithmetic, `.length`, `Number()` / `parseInt()` / `Math.*`, a
 *     parameter typed `number`, the index argument of an array callback;
 *   - a binding every write of which is safe — including a `let sql` builder
 *     whose every `+=` appends fixed text — an enum member, a `const` object
 *     member, a class field initialised with a literal, and a lookup into a
 *     `const` map whose every value is safe (the allowlist idiom);
 *   - a list joined from fixed elements: an array literal, `.map(cb)` whose
 *     callback returns only fixed text (`() => '?'`), `Array(n).fill('?')`;
 *   - the driver's own escapers (`mysql.escape`, `escapeId`, `format`,
 *     `sequelize.escape`) and parameterised fragments (a tagged template whose
 *     tag the driver exports, `Prisma.join`, `sql.identifier`);
 *   - a call to a function written in this file (or a relative import) every
 *     `return` of which is safe.
 *
 * Anything else — a parameter, request data, an unknown call — is unproven,
 * and an unproven value in a raw SQL string is the finding.
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { propertyName, staticString } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import {
  type OriginClassifier,
  createOriginClassifier,
  isFunctionNode,
  sourceMatches,
  writtenAnnotation,
} from './driver-origin';
import { isGlobal } from './request-source';
import {
  type Value,
  MAX_FOLLOW_DEPTH,
  follow,
  importSpecifierOf,
  isRelativeSpecifier,
  lookup,
  returnedValues,
  valueAt,
} from './value-follow';

/** Global conversions whose result is a number or a boolean. */
const NUMBER_FUNCTIONS: ReadonlySet<string> = new Set([
  'Number',
  'parseInt',
  'parseFloat',
  'Boolean',
  'isNaN',
  'isFinite',
]);

/** Global namespaces every member function of which returns a number. */
const NUMBER_NAMESPACES: ReadonlySet<string> = new Set(['Math', 'Number']);

/** Global names whose value is fixed. */
const FIXED_GLOBALS: ReadonlySet<string> = new Set([
  'undefined',
  'NaN',
  'Infinity',
]);

/** String methods whose result is built only from the receiver and arguments. */
const STRING_TRANSFORMS: ReadonlySet<string> = new Set([
  'slice',
  'substring',
  'substr',
  'trim',
  'trimStart',
  'trimEnd',
  'toUpperCase',
  'toLowerCase',
  'padStart',
  'padEnd',
  'repeat',
  'at',
  'charAt',
  'concat',
  'replace',
  'replaceAll',
  'toString',
  'toFixed',
  'valueOf',
]);

/** Array methods whose result holds only elements of the receiver. */
const LIST_SUBSETS: ReadonlySet<string> = new Set([
  'filter',
  'slice',
  'sort',
  'reverse',
  'concat',
]);

/** Array methods whose callback produces each element of the result. */
const LIST_MAPPERS: ReadonlySet<string> = new Set(['map', 'flatMap']);

/** Array methods that hand each element (and its index) to a callback. */
const ELEMENT_CALLBACKS: ReadonlySet<string> = new Set([
  'map',
  'flatMap',
  'forEach',
  'filter',
  'some',
  'every',
  'find',
]);

export interface SqlSafetyOptions {
  /** Classifies a receiver (and a written type) against the driver modules. */
  readonly origin: OriginClassifier;
  /**
   * Driver functions whose result is escaped SQL text: a member call on a
   * receiver that is not provably foreign, or a binding imported under that
   * name from the driver (`mysql.escapeId(col)`, `pool.escape(v)`,
   * `sequelize.escape(v)`).
   */
  readonly escapers: ReadonlySet<string>;
  /**
   * Driver members whose result is a parameterised fragment, never text:
   * `Prisma.join(ids)`, `sql.identifier(name)`, `knex.ref(col)`. Only on a
   * receiver proven to be the driver.
   */
  readonly fragmentFactories: ReadonlySet<string>;
  /** Modules escapers may be imported from by name. */
  readonly modules: readonly string[];
  /**
   * Standalone escaping libraries for this driver — `sqlstring` for mysql —
   * whose `escape` / `escapeId` / `format` are as good as the driver's own.
   */
  readonly escaperModules?: readonly string[];
}

/** Is this TYPE annotation one whose values are numbers, booleans or fixed literals? */
function isFixedType(type: TSESTree.TypeNode, value: Value): boolean {
  switch (type.type) {
    case AST_NODE_TYPES.TSNumberKeyword:
    case AST_NODE_TYPES.TSBooleanKeyword:
    case AST_NODE_TYPES.TSBigIntKeyword:
    case AST_NODE_TYPES.TSLiteralType:
    case AST_NODE_TYPES.TSUndefinedKeyword:
    case AST_NODE_TYPES.TSNullKeyword:
      return true;
    case AST_NODE_TYPES.TSUnionType:
      return type.types.every((t) => isFixedType(t, value));
    case AST_NODE_TYPES.TSTypeReference: {
      if (type.typeName.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = lookup(
        type.typeName.name,
        value.env.scopeOf(type.typeName),
      );
      return variable?.defs[0]?.type === 'TSEnumName';
    }
    default:
      return false;
  }
}

/** The member a `TSEnumDeclaration` declares as `key`, when it is one. */
function enumMember(
  object: TSESTree.Node,
  key: string,
  value: Value,
): TSESTree.TSEnumMember | null {
  if (object.type !== AST_NODE_TYPES.Identifier) return null;
  const variable = lookup(object.name, value.env.scopeOf(object));
  const def = variable?.defs[0];
  if (def?.type !== 'TSEnumName') return null;
  const declaration = def.node as TSESTree.TSEnumDeclaration;
  return (
    declaration.body.members.find(
      (m) =>
        (m.id.type === AST_NODE_TYPES.Identifier ? m.id.name : m.id.value) ===
        key,
    ) ?? null
  );
}

/** Do two expressions read the same binding path — `a.b.c` and `a.b.c`? */
function sameExpression(a: TSESTree.Node, b: TSESTree.Node): boolean {
  const x = unwrapTypeSyntax(a);
  const y = unwrapTypeSyntax(b);
  if (
    x.type === AST_NODE_TYPES.Identifier &&
    y.type === AST_NODE_TYPES.Identifier
  )
    return x.name === y.name;
  return (
    x.type === AST_NODE_TYPES.MemberExpression &&
    y.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(x) !== null &&
    propertyName(x) === propertyName(y) &&
    sameExpression(x.object, y.object)
  );
}

/** Is `inner` inside (or the same node as) `outer`? */
function contains(outer: TSESTree.Node, inner: TSESTree.Node): boolean {
  return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
}

/** Does this statement always leave the enclosing block? */
function exits(statement: TSESTree.Statement): boolean {
  if (statement.type === AST_NODE_TYPES.BlockStatement) {
    const last = statement.body.at(-1);
    return last !== undefined && exits(last);
  }
  return (
    statement.type === AST_NODE_TYPES.ThrowStatement ||
    statement.type === AST_NODE_TYPES.ReturnStatement ||
    statement.type === AST_NODE_TYPES.ContinueStatement ||
    statement.type === AST_NODE_TYPES.BreakStatement
  );
}

/** Build the safety judge for one plugin. */
export function createSqlSafety(options: SqlSafetyOptions): {
  /**
   * Can `value`, spliced into SQL text, only ever be fixed text or a number?
   *
   * @param quoted the hole sits inside a quoted token (`'…'`, `` `…` ``). An
   *   escaper's output brings its own quotes, which close that token — so
   *   there an escaped value is only as safe as what was escaped.
   */
  isSafe(value: Value, quoted?: boolean): boolean;
} {
  type Seen = Set<TSESTree.Node>;
  const { origin, escapers, fragmentFactories, modules } = options;
  // ponytail: set for the duration of one synchronous `isSafe` call.
  let quoted = false;
  const escaped = (
    call: TSESTree.CallExpression,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean =>
    !quoted ||
    call.arguments.every((a) => isSafe(at(a, value), depth + 1, seen));
  const escaperOrigin = createOriginClassifier([
    ...modules,
    ...(options.escaperModules ?? []),
  ]);
  const escaperSources = [...modules, ...(options.escaperModules ?? [])];

  const at = (node: TSESTree.Node, value: Value): Value =>
    valueAt(node, value.env);

  /** A type whose values are fixed, or one of the driver's fragment types. */
  const isFixedOrDriverType = (
    type: TSESTree.TypeNode,
    value: Value,
  ): boolean =>
    isFixedType(type, value) || origin.ofType(at(type, value)) === 'ours';

  /** Is every element of this array value fixed text or a number? */
  function isSafeList(value: Value, depth: number, seen: Seen): boolean {
    if (depth > MAX_FOLLOW_DEPTH) return false;
    const node = unwrapTypeSyntax(value.node);
    if (node.type === AST_NODE_TYPES.ArrayExpression) {
      return node.elements.every(
        (element) =>
          element === null || isSafe(at(element, value), depth + 1, seen),
      );
    }
    if (node.type === AST_NODE_TYPES.Identifier) {
      const variable = lookup(node.name, value.env.scopeOf(node));
      if (variable === null || variable.defs[0]?.type !== 'Variable')
        return false;
      return variable.references.every((reference) => {
        if (reference.isWrite()) {
          return (
            reference.writeExpr != null &&
            isSafeList(at(reference.writeExpr, value), depth + 1, seen)
          );
        }
        const use = reference.identifier.parent;
        // `list.push(x)` — every pushed element must be safe.
        if (
          use?.type === AST_NODE_TYPES.MemberExpression &&
          use.object === reference.identifier &&
          use.parent?.type === AST_NODE_TYPES.CallExpression &&
          use.parent.callee === use
        ) {
          const method = propertyName(use);
          if (method === 'push' || method === 'unshift') {
            return use.parent.arguments.every((argument) =>
              isSafe(at(argument, value), depth + 1, seen),
            );
          }
          return true;
        }
        // Handed to something else — it may be filled there.
        return !(
          use?.type === AST_NODE_TYPES.CallExpression ||
          use?.type === AST_NODE_TYPES.NewExpression
        );
      });
    }
    if (node.type === AST_NODE_TYPES.MemberExpression) {
      const followed = follow(at(node, value));
      return followed.node !== node && isSafeList(followed, depth + 1, seen);
    }
    if (
      node.type !== AST_NODE_TYPES.CallExpression &&
      node.type !== AST_NODE_TYPES.NewExpression
    ) {
      return false;
    }
    const callee = node.callee;
    // `Array(n)` / `new Array('a', 'b')` — holes or the arguments themselves.
    if (
      callee.type === AST_NODE_TYPES.Identifier &&
      callee.name === 'Array' &&
      isGlobal(callee, value.env)
    ) {
      return node.arguments.every((a) => isSafe(at(a, value), depth + 1, seen));
    }
    if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
    const method = propertyName(callee);
    const object = callee.object;
    const [first, second] = node.arguments;
    if (
      object.type === AST_NODE_TYPES.Identifier &&
      (object.name === 'Array' || object.name === 'Object') &&
      isGlobal(object, value.env)
    ) {
      if (object.name === 'Array' && method === 'from') {
        // `Array.from({ length: n }, () => '?')`
        if (second !== undefined)
          return callbackReturnsSafe(second, value, depth, seen);
        return (
          first !== undefined && isSafeList(at(first, value), depth + 1, seen)
        );
      }
      if (
        object.name === 'Object' &&
        (method === 'keys' || method === 'values')
      ) {
        const target = first === undefined ? null : follow(at(first, value));
        return (
          target !== null &&
          target.node.type === AST_NODE_TYPES.ObjectExpression &&
          target.node.properties.every(
            (p) =>
              p.type === AST_NODE_TYPES.Property &&
              !p.computed &&
              (method === 'keys' ||
                isSafe(at(p.value, target), depth + 1, seen)),
          )
        );
      }
      return false;
    }
    // `.fill(v)` overwrites every element; a partial fill keeps the rest.
    if (method === 'fill')
      return (
        first !== undefined &&
        isSafe(at(first, value), depth + 1, seen) &&
        (node.arguments.length === 1 ||
          isSafeList(at(object, value), depth + 1, seen))
      );
    if (method !== null && LIST_MAPPERS.has(method))
      return (
        first !== undefined && callbackReturnsSafe(first, value, depth, seen)
      );
    if (method !== null && LIST_SUBSETS.has(method))
      return (
        isSafeList(at(object, value), depth + 1, seen) &&
        (method !== 'concat' ||
          node.arguments.every((a) =>
            isSafeList(at(a, value), depth + 1, seen),
          ))
      );
    return false;
  }

  /** Does this callback only ever return safe values? */
  function callbackReturnsSafe(
    callback: TSESTree.Node,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    const fn = unwrapTypeSyntax(callback);
    if (!isFunctionNode(fn)) return false;
    const results = returnedValues(fn);
    return (
      results !== null &&
      results.every((r) => isSafe(at(r, value), depth + 1, seen))
    );
  }

  /** A parameter: typed as fixed, or an array callback's element / index. */
  function isSafeParameter(
    identifier: TSESTree.Node,
    fn: TSESTree.Node,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    const annotation = writtenAnnotation(identifier);
    if (annotation !== undefined && isFixedOrDriverType(annotation, value))
      return true;
    // A parameter's definition node is the function that declares it.
    const index = (fn as TSESTree.FunctionLike).params.findIndex(
      (p) => p === identifier,
    );
    const call = fn.parent;
    if (
      call?.type !== AST_NODE_TYPES.CallExpression ||
      (call.arguments[0] !== fn && call.arguments[1] !== fn) ||
      call.callee.type !== AST_NODE_TYPES.MemberExpression
    ) {
      return false;
    }
    const method = propertyName(call.callee);
    const receiver = call.callee.object;
    const isArrayFrom =
      receiver.type === AST_NODE_TYPES.Identifier &&
      receiver.name === 'Array' &&
      method === 'from' &&
      call.arguments[1] === fn;
    if (
      !isArrayFrom &&
      (method === null ||
        !ELEMENT_CALLBACKS.has(method) ||
        call.arguments[0] !== fn)
    )
      return false;
    // The second callback argument is always the element's numeric index.
    if (index === 1) return true;
    if (index !== 0) return false;
    if (isArrayFrom) {
      const source = call.arguments[0];
      return (
        source.type === AST_NODE_TYPES.ObjectExpression ||
        isSafeList(at(source, value), depth + 1, seen)
      );
    }
    return isSafeList(at(receiver, value), depth + 1, seen);
  }

  /**
   * Is this binding checked against an allowlist before `use`?
   *
   *   if (!/^[a-z_]+$/.test(key)) throw …;      // anchored pattern, then exit
   *   if (!ALLOWED.includes(col)) return;       // fixed list, then exit
   *   if (ALLOWED.has(dir)) { …use… }           // used only inside the check
   *
   * The pattern must be anchored at both ends — `/\w/.test(x)` passes
   * `a'; DROP` — and the list must hold only fixed values.
   */
  function isAllowlisted(
    variable: TSESLint.Scope.Variable,
    use: TSESTree.Node,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    return variable.references.some((reference) => {
      const call = reference.identifier.parent;
      if (
        call?.type !== AST_NODE_TYPES.CallExpression ||
        call.arguments[0] !== reference.identifier ||
        call.callee.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return false;
      }
      const method = propertyName(call.callee);
      const checker = at(call.callee.object, value);
      const fixed =
        method === 'test'
          ? isAnchoredPattern(checker)
          : (method === 'includes' || method === 'has') &&
            isSafeList(checker, depth + 1, seen);
      if (!fixed) return false;
      const negated =
        call.parent?.type === AST_NODE_TYPES.UnaryExpression &&
        call.parent.operator === '!';
      const test = negated ? call.parent : call;
      const guard = test?.parent;
      if (guard?.type !== AST_NODE_TYPES.IfStatement || guard.test !== test)
        return false;
      if (!negated) return contains(guard.consequent, use);
      // `if (!ok) exit;` — everything after the `if` in its block is checked.
      return (
        exits(guard.consequent) &&
        guard.range[1] <= use.range[0] &&
        contains(guard.parent as TSESTree.Node, use)
      );
    });
  }

  /**
   * The value an allowlist test checks — `x` in `LIST.includes(x)`,
   * `SET.has(x)`, `/^…$/.test(x)`, or their negation — or `null`.
   */
  function allowlistedBy(
    test: TSESTree.Node,
    value: Value,
    depth: number,
    seen: Seen,
  ): TSESTree.Node | null {
    const call =
      test.type === AST_NODE_TYPES.UnaryExpression && test.operator === '!'
        ? test.argument
        : test;
    if (
      call.type !== AST_NODE_TYPES.CallExpression ||
      call.callee.type !== AST_NODE_TYPES.MemberExpression ||
      call.arguments.length !== 1
    ) {
      return null;
    }
    const method = propertyName(call.callee);
    const checker = at(call.callee.object, value);
    const fixed =
      method === 'test'
        ? isAnchoredPattern(checker)
        : (method === 'includes' || method === 'has') &&
          isSafeList(checker, depth + 1, seen);
    return fixed ? call.arguments[0] : null;
  }

  /** A regular expression anchored at both ends: `/^…$/`. */
  function isAnchoredPattern(value: Value): boolean {
    const target = follow(value).node as { regex?: { pattern: string } };
    const pattern = target.regex?.pattern;
    return (
      pattern !== undefined && pattern.startsWith('^') && pattern.endsWith('$')
    );
  }

  function isSafeIdentifier(
    node: TSESTree.Identifier,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    const variable = lookup(node.name, value.env.scopeOf(node));
    if (variable === null || variable.defs.length === 0)
      return FIXED_GLOBALS.has(node.name);
    if (isAllowlisted(variable, node, value, depth, seen)) return true;
    const def = variable.defs[0];
    if (def.type === 'Parameter')
      return isSafeParameter(
        variable.identifiers[0],
        def.node,
        value,
        depth,
        seen,
      );
    const specifier = importSpecifierOf(variable);
    if (specifier !== null) {
      if (!isRelativeSpecifier(specifier.source)) return false;
      const followed = follow(at(node, value));
      return (
        followed.node !== node &&
        followed.node.type !== AST_NODE_TYPES.Program &&
        isSafe(followed, depth + 1, seen)
      );
    }
    if (def.type !== 'Variable') return false;
    const annotation = writtenAnnotation(def.node.id);
    if (annotation !== undefined && isFixedOrDriverType(annotation, value))
      return true;
    const loop = def.node.parent.parent;
    if (
      loop?.type === AST_NODE_TYPES.ForOfStatement &&
      loop.left === def.node.parent
    ) {
      return isSafeList(at(loop.right, value), depth + 1, seen);
    }
    if (def.node.id.type !== AST_NODE_TYPES.Identifier) {
      const followed = follow(at(node, value));
      return followed.node !== node && isSafe(followed, depth + 1, seen);
    }
    const writes = variable.references.filter((r) => r.isWrite());
    return (
      writes.length > 0 &&
      writes.every(
        (r) =>
          r.writeExpr != null &&
          isSafe(at(r.writeExpr, value), depth + 1, seen),
      )
    );
  }

  function isSafeMember(
    node: TSESTree.MemberExpression,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    const key = propertyName(node);
    if (key === 'length') return true;
    if (key !== null) {
      const member = enumMember(node.object, key, value);
      if (member !== null)
        return (
          member.initializer === undefined ||
          isSafe(at(member.initializer, value), depth + 1, seen)
        );
    }
    const followed = follow(at(node, value));
    if (followed.node !== node) return isSafe(followed, depth + 1, seen);
    // A class field or static: `this.table`, `Repo.TABLE`.
    const owner =
      node.object.type === AST_NODE_TYPES.ThisExpression
        ? enclosingClassOf(node)
        : classOf(node.object, value);
    if (owner !== null && key !== null) {
      const field = owner.body.body.find(
        (e): e is TSESTree.PropertyDefinition =>
          e.type === AST_NODE_TYPES.PropertyDefinition &&
          !e.computed &&
          e.key.type === AST_NODE_TYPES.Identifier &&
          e.key.name === key,
      );
      return (
        field?.value != null && isSafe(at(field.value, value), depth + 1, seen)
      );
    }
    // `ALLOWED[input]` — a lookup into a fixed map yields fixed text or
    // `undefined`, whatever the key.
    if (node.computed) {
      const object = follow(at(node.object, value));
      if (object.node.type === AST_NODE_TYPES.ObjectExpression) {
        return object.node.properties.every(
          (p) =>
            p.type === AST_NODE_TYPES.Property &&
            isSafe(at(p.value, object), depth + 1, seen),
        );
      }
      return isSafeList(object, depth + 1, seen);
    }
    return false;
  }

  function enclosingClassOf(
    node: TSESTree.Node,
  ): TSESTree.ClassDeclaration | TSESTree.ClassExpression | null {
    for (let n = node.parent; n; n = n.parent) {
      if (
        n.type === AST_NODE_TYPES.ClassDeclaration ||
        n.type === AST_NODE_TYPES.ClassExpression
      ) {
        return n;
      }
    }
    return null;
  }

  function classOf(
    node: TSESTree.Node,
    value: Value,
  ): TSESTree.ClassDeclaration | null {
    if (node.type !== AST_NODE_TYPES.Identifier) return null;
    const def = lookup(node.name, value.env.scopeOf(node))?.defs[0];
    return def?.type === 'ClassName'
      ? (def.node as TSESTree.ClassDeclaration)
      : null;
  }

  function isSafeCall(
    node: TSESTree.CallExpression,
    value: Value,
    depth: number,
    seen: Seen,
  ): boolean {
    const callee = unwrapTypeSyntax(node.callee);
    const [first] = node.arguments;
    if (callee.type === AST_NODE_TYPES.Identifier) {
      if (isGlobal(callee, value.env)) {
        if (NUMBER_FUNCTIONS.has(callee.name)) return true;
        return (
          callee.name === 'String' &&
          first !== undefined &&
          isSafe(at(first, value), depth + 1, seen)
        );
      }
      // Not a global, so the name resolves to a binding of this file.
      const specifier = importSpecifierOf(
        lookup(
          callee.name,
          value.env.scopeOf(callee),
        ) as TSESLint.Scope.Variable,
      );
      if (
        specifier !== null &&
        sourceMatches(specifier.source, escaperSources)
      ) {
        return (
          escapers.has(specifier.name) && escaped(node, value, depth, seen)
        );
      }
    }
    if (callee.type === AST_NODE_TYPES.MemberExpression) {
      const method = propertyName(callee);
      const object = callee.object;
      if (
        object.type === AST_NODE_TYPES.Identifier &&
        NUMBER_NAMESPACES.has(object.name) &&
        isGlobal(object, value.env)
      ) {
        return true;
      }
      if (method !== null) {
        if (
          escapers.has(method) &&
          escaperOrigin(at(object, value)) !== 'foreign'
        ) {
          return escaped(node, value, depth, seen);
        }
        if (
          fragmentFactories.has(method) &&
          origin(at(object, value)) === 'ours'
        )
          return true;
        if (method === 'join') {
          return (
            isSafeList(at(object, value), depth + 1, seen) &&
            (first === undefined || isSafe(at(first, value), depth + 1, seen))
          );
        }
        if (STRING_TRANSFORMS.has(method)) {
          return (
            isSafe(at(object, value), depth + 1, seen) &&
            node.arguments.every((a) => isSafe(at(a, value), depth + 1, seen))
          );
        }
      }
    }
    // A function written in this project: safe when every `return` is.
    const target = follow(at(callee, value));
    if (!isFunctionNode(target.node)) return false;
    const results = returnedValues(target.node);
    return (
      results !== null &&
      results.every((r) => isSafe(valueAt(r, target.env), depth + 1, seen))
    );
  }

  function isSafe(value: Value, depth = 0, seen: Seen = new Set()): boolean {
    if (depth > MAX_FOLLOW_DEPTH || seen.has(value.node)) return false;
    seen.add(value.node);
    try {
      // `x as Knex.Raw`, `y satisfies Prisma.Sql` — a value the program
      // declares to be one of the driver's own fragment objects.
      if (
        (value.node.type === AST_NODE_TYPES.TSAsExpression ||
          value.node.type === AST_NODE_TYPES.TSSatisfiesExpression) &&
        origin.ofType(at(value.node.typeAnnotation, value)) === 'ours'
      ) {
        return true;
      }
      const node = unwrapTypeSyntax(value.node);
      switch (node.type) {
        case AST_NODE_TYPES.Literal:
        case AST_NODE_TYPES.UnaryExpression:
        case AST_NODE_TYPES.UpdateExpression:
          return true;
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.every((e) =>
            isSafe(at(e, value), depth + 1, seen),
          );
        case AST_NODE_TYPES.TaggedTemplateExpression:
          // A tag the driver exports parameterises its holes.
          return origin(at(node.tag, value)) === 'ours';
        case AST_NODE_TYPES.BinaryExpression:
          // Every operator but `+` yields a number or a boolean.
          return (
            node.operator !== '+' ||
            (isSafe(at(node.left, value), depth + 1, seen) &&
              isSafe(at(node.right, value), depth + 1, seen))
          );
        case AST_NODE_TYPES.LogicalExpression:
          return (
            isSafe(at(node.left, value), depth + 1, seen) &&
            isSafe(at(node.right, value), depth + 1, seen)
          );
        case AST_NODE_TYPES.ConditionalExpression: {
          // `ALLOWED.includes(x) ? x : 'id'` — the arm the check guards is
          // the checked value itself.
          const checked = allowlistedBy(node.test, value, depth, seen);
          const armSafe = (arm: TSESTree.Node, guarded: boolean): boolean =>
            (guarded && checked !== null && sameExpression(arm, checked)) ||
            isSafe(at(arm, value), depth + 1, seen);
          const negated =
            node.test.type === AST_NODE_TYPES.UnaryExpression &&
            node.test.operator === '!';
          return (
            armSafe(node.consequent, !negated) &&
            armSafe(node.alternate, negated)
          );
        }
        case AST_NODE_TYPES.ArrayExpression:
          return isSafeList(at(node, value), depth + 1, seen);
        case AST_NODE_TYPES.AwaitExpression:
          return isSafe(at(node.argument, value), depth + 1, seen);
        case AST_NODE_TYPES.ChainExpression:
          return isSafe(at(node.expression, value), depth + 1, seen);
        case AST_NODE_TYPES.Identifier:
          return isSafeIdentifier(node, value, depth, seen);
        case AST_NODE_TYPES.MemberExpression:
          return isSafeMember(node, value, depth, seen);
        case AST_NODE_TYPES.CallExpression:
          return isSafeCall(node, value, depth, seen);
        default:
          return false;
      }
    } finally {
      // `seen` guards the active chain only: a value judged once may be
      // judged again on a different path.
      seen.delete(value.node);
    }
  }

  return {
    isSafe: (value, inQuotes = false) => {
      quoted = inQuotes;
      try {
        return isSafe(value);
      } finally {
        quoted = false;
      }
    },
  };
}

/** The literal text of a string expression, ignoring every interpolated value. */
export function sqlStaticText(node: TSESTree.Node): string {
  const value = unwrapTypeSyntax(node);
  if (value.type === AST_NODE_TYPES.TemplateLiteral) {
    return value.quasis.map((q) => q.value.raw).join('');
  }
  if (
    value.type === AST_NODE_TYPES.BinaryExpression &&
    value.operator === '+'
  ) {
    return `${sqlStaticText(value.left)}${sqlStaticText(value.right)}`;
  }
  return staticString(value) ?? '';
}
