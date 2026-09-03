/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the URL-navigation predicates.
 *
 * The rules that use these are covered by their own suites, their corpora and
 * the partition matrix; what those cannot reach are the REFUSALS — the shapes
 * where a predicate must answer "I cannot prove that". Those branches are the
 * whole reason the helpers are safe to use, and an uncovered refusal is a
 * branch nobody has ever seen return `false`.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import {
  identityArgumentIndex,
  isGuardedDestination,
  isLocationNavigationCall,
  isLocationNavigationWrite,
  isLocationTarget,
  isOpaquePredicateOverTarget,
  isOriginEqualityGuard,
  isRelativePathGuard,
  isRouterObject,
  isSteerableUrlValue,
} from './navigation-targets';

const linter = new Linter();

/**
 * Run `predicate` over every node of `nodeType` in `code` and collect the
 * verdicts in source order.
 */
function verdicts(
  code: string,
  nodeType: string,
  predicate: (node: TSESTree.Node, sourceCode: TSESLint.SourceCode) => unknown,
): unknown[] {
  const collected: unknown[] = [];
  const probe = {
    create(context: { sourceCode: TSESLint.SourceCode }) {
      return {
        [nodeType](node: TSESTree.Node) {
          collected.push(predicate(node, context.sourceCode));
        },
      };
    },
  };
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { probe: { rules: { probe: probe as never } } },
      rules: { 'probe/probe': 'error' },
    },
    'probe.tsx',
  );
  // A crash surfaces as a message with no ruleId. Letting that through would
  // turn a thrown predicate into an empty result set that reads as "no hits".
  expect(messages.filter((m) => m.ruleId === null).map((m) => m.message)).toEqual([]);
  return collected;
}

const first = (
  code: string,
  nodeType: string,
  predicate: (node: TSESTree.Node, sourceCode: TSESLint.SourceCode) => unknown,
): unknown => verdicts(code, nodeType, predicate)[0];

/** The first verdict that was not skipped with `null`. */
const firstHit = (
  code: string,
  nodeType: string,
  predicate: (node: TSESTree.Node, sourceCode: TSESLint.SourceCode) => unknown,
): unknown => verdicts(code, nodeType, predicate).find((v) => v !== null);

// ---------------------------------------------------------------------------
describe('isLocationTarget / navigation writes and calls', () => {
  it.each([
    ['bare identifier', 'location.href = x;', true],
    ['window-qualified', 'window.location.href = x;', true],
    ['computed holder', "window['location'].href = x;", true],
    ['a plain object property', 'myapp.location.href = x;', false],
    ['a non-holder global', 'crypto.location.href = x;', false],
  ])('%s', (_name, code, expected) => {
    const write = verdicts(code, 'MemberExpression', (node) =>
      isLocationTarget((node as TSESTree.MemberExpression).object),
    );
    expect(write.some(Boolean)).toBe(expected);
  });

  it('a private field is not a static key, so it is not a Location', () => {
    expect(
      verdicts(
        'class A { #location; read() { return this.#location; } }',
        'MemberExpression',
        (node) => isLocationTarget(node),
      ),
    ).toEqual([false]);
  });

  it('a computed key that is not a string literal is not a Location', () => {
    expect(
      first('window[key].href = x;', 'AssignmentExpression', (node) =>
        isLocationNavigationWrite((node as TSESTree.AssignmentExpression).left),
      ),
    ).toBe(false);
  });

  it('a non-member assignment target is never a navigation', () => {
    expect(
      first('location = x;', 'AssignmentExpression', (node) =>
        isLocationNavigationWrite((node as TSESTree.AssignmentExpression).left),
      ),
    ).toBe(false);
  });

  it.each([
    ['location.assign', 'location.assign(x);', true],
    ['computed holder replace', "window['location'].replace(x);", true],
    ['Object.assign is not a navigation', 'Object.assign(a, b);', false],
    ['String.replace is not a navigation', "s.replace('a', 'b');", false],
    ['a bare call has no receiver', 'assign(x);', false],
  ])('%s', (_name, code, expected) => {
    expect(
      verdicts(code, 'CallExpression', (node) =>
        isLocationNavigationCall(node as TSESTree.CallExpression),
      ).some(Boolean),
    ).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
describe('isSteerableUrlValue — the query-string surface', () => {
  const steerable = (code: string): unknown =>
    first(`window.open(${code});`, 'CallExpression', (node, sourceCode) =>
      isSteerableUrlValue(
        (node as TSESTree.CallExpression).arguments[0] as TSESTree.Node,
        sourceCode,
      ),
    );

  it.each([
    ["new URLSearchParams(location.search).get('n')", true],
    ["new URL(location.href).searchParams.get('n')", true],
    ['new URL(location.href).hash', true],
    ["window['location'].hash", true],
    // A steerable value reached through a default or a branch is still
    // steerable — an attacker picks which side wins. Both arms of
    // `isSteerableUrlValue` were unreachable from the existing table.
    ['location.search || fallback', true],
    ['fallback || location.search', true],
    ['flag ? location.hash : safe', true],
    ['flag ? safe : location.hash', true],
    ["'/a' || '/b'", false],
    ["flag ? '/a' : '/b'", false],
    // A param reader on a member that is NOT `X.searchParams` over a URL:
    // `urlContainerKind` reaches its MemberExpression arm and falls through,
    // which is the only path to that return.
    ["location.hash.get('n')", false],
    ["new URL(location.href).hash.get('n')", false],
    // Same fall-through reached with a SUBSCRIPTED param reader, now that
    // PARAM_READERS resolves those too: `location['hash']` is not
    // `X.searchParams` over a URL, so `urlContainerKind` returns null.
    ["location['hash']['get']('n')", false],
    ["new URL(location.href)['hash']['get']('n')", false],
    // Refusals.
    ["new URLSearchParams('a=1').get('n')", false],
    ["new URL('https://acme.io').hash", false],
    ["new Foo(location.search).get('n')", false],
    ["new URLSearchParams().get('n')", false],
    ["new URLSearchParams(...args).get('n')", false],
    ["new (ns.URL)(location.href).hash", false],
    ["new URL(location.href).protocol", false],
    ["new URL(location.href).other", false],
    ["params.get('n')", false],
    ["fetchIt(location.search)", false],
  ])('%s → %s', (code, expected) => {
    expect(steerable(code)).toBe(expected);
  });

  // The reader's receiver is a BINDING here, so `urlContainerKind` has to
  // resolve the initialiser before it can see a `URLSearchParams`. This is the
  // form real code uses; the inline spelling is answered further up.
  it('a URLSearchParams reached through a const binding is steerable', () => {
    expect(
      first(
        'const p = new URL(location.href).searchParams; window.open(p.get("n"));',
        'CallExpression',
        (node, sourceCode) =>
          isSteerableUrlValue(
            (node as TSESTree.CallExpression).arguments[0] as TSESTree.Node,
            sourceCode,
          ),
      ),
    ).toBe(true);
  });

  it('a template that does not open with the interpolation is not steerable', () => {
    expect(steerable('`https://acme.io/${new URLSearchParams(location.search).get("n")}`')).toBe(
      false,
    );
  });

  it('a template that DOES open with it is', () => {
    expect(steerable('`${new URLSearchParams(location.search).get("n")}/x`')).toBe(true);
  });

  it.each([
    ["new URLSearchParams(location.search).get('n') || '/home'", true],
    ["'/home' || new URLSearchParams(location.search).get('n')", true],
    ["flag ? new URLSearchParams(location.search).get('n') : '/a'", true],
    ["flag ? '/a' : new URLSearchParams(location.search).get('n')", true],
    ["new URLSearchParams(location.search).get('n') + '/x'", true],
    ["'/x' + new URLSearchParams(location.search).get('n')", false],
    ["'/a' - 1", false],
  ])('%s → %s', (code, expected) => {
    expect(steerable(code)).toBe(expected);
  });

  it('a self-referential binding terminates rather than recursing forever', () => {
    expect(
      first(
        'function f() { const a = a; window.open(a); }',
        'CallExpression',
        (node, sourceCode) => {
          const call = node as TSESTree.CallExpression;
          return call.arguments.length === 1
            ? isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode)
            : null;
        },
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('useSearchParams / useRouter resolve to their imports', () => {
  const RR = 'import { useSearchParams } from "react-router-dom";\n';

  it('the React Router tuple form is steerable', () => {
    expect(
      first(
        `${RR}const [params] = useSearchParams(); window.open(params.get('n'));`,
        'CallExpression',
        (node, sourceCode) => {
          const call = node as TSESTree.CallExpression;
          return sourceCode.getText(call).startsWith('window.open')
            ? isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode)
            : null;
        },
      ),
    ).toBe(null);
  });

  it.each([
    // not a destructuring at all
    [`${RR}const params = useSearchParams; window.open(params.get('n'));`, false],
    // an ArrayPattern initialised by something else
    [`const [params] = somethingElse(); window.open(params.get('n'));`, false],
    // a hook name that resolves to no import
    [`function useSearchParams() {} const [p] = useSearchParams(); window.open(p.get('n'));`, false],
    // an unresolvable identifier
    [`window.open(params.get('n'));`, false],
  ])('refusal %#', (code, expected) => {
    const hits = verdicts(code, 'CallExpression', (node, sourceCode) => {
      const call = node as TSESTree.CallExpression;
      if (!sourceCode.getText(call).startsWith('window.open')) return null;
      return isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode);
    });
    expect(hits.filter((h) => h !== null)).toEqual([expected]);
  });

  it.each([
    ['import { useRouter } from "next/navigation";\nconst r = useRouter();', true],
    ['import { useRouter } from "some-lib";\nconst r = useRouter();', false],
    ['function useRouter() {} const r = useRouter();', false],
    ['const r = makeRouter();', false],
    ['const r = 1;', false],
  ])('isRouterObject %#', (code, expected) => {
    expect(
      firstHit(`${code} r.push(x);`, 'CallExpression', (node, sourceCode) => {
        const call = node as TSESTree.CallExpression;
        if (!sourceCode.getText(call).startsWith('r.push')) return null;
        return isRouterObject(
          (call.callee as TSESTree.MemberExpression).object,
          sourceCode,
        );
      }),
    ).toBe(expected);
  });

  it('a router reached through a member expression is not resolvable', () => {
    expect(
      first('ctx.router.push(x);', 'CallExpression', (node, sourceCode) =>
        isRouterObject(
          ((node as TSESTree.CallExpression).callee as TSESTree.MemberExpression).object,
          sourceCode,
        ),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('identityArgumentIndex — only a function we can READ counts', () => {
  const index = (prelude: string): unknown =>
    first(`${prelude} f(a, b);`, 'CallExpression', (node, sourceCode) =>
      identityArgumentIndex(node as TSESTree.CallExpression, sourceCode),
    );

  it.each([
    ['function f(x) { return x; }', 0],
    ['function f(x, y) { return y; }', 1],
    ['const f = (x) => x;', 0],
    ['const f = function (x) { return x; };', 0],
    // Refusals — nothing here is provably the identity.
    ['function f(x) { log(x); return x; }', null],
    ['function f(x) { return sanitize(x); }', null],
    ['function f(x) { return; }', null],
    ['function f(x) { log(x); }', null],
    ['function f(x) { return y; }', null],
    ['const f = (x) => sanitize(x);', null],
    ['const f = 1;', null],
    ['let f = (x) => x; f = other;', null],
    ['declare function f(x: string): string;', null],
    ['import { f } from "./f";', null],
  ])('%s → %s', (prelude, expected) => {
    expect(index(prelude)).toBe(expected);
  });

  it('a member-expression callee is never resolved to a function', () => {
    expect(
      first('ns.f(a);', 'CallExpression', (node, sourceCode) =>
        identityArgumentIndex(node as TSESTree.CallExpression, sourceCode),
      ),
    ).toBe(null);
  });

  it('an identity helper called with too few arguments proves nothing', () => {
    expect(
      firstHit(
        'function f(x, y) { return y; } window.open(f(location.hash));',
        'CallExpression',
        (node, sourceCode) => {
          const call = node as TSESTree.CallExpression;
          return sourceCode.getText(call).startsWith('window.open')
            ? isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode)
            : null;
        },
      ),
    ).toBe(false);
  });

  it('a spread argument is not a value we can follow', () => {
    const hits = verdicts(
      'function f(x) { return x; } window.open(f(...args));',
      'CallExpression',
      (node, sourceCode) => {
        const call = node as TSESTree.CallExpression;
        if (!sourceCode.getText(call).startsWith('window.open')) return null;
        return isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode);
      },
    );
    expect(hits.filter((h) => h !== null)).toEqual([false]);
  });
});

// ---------------------------------------------------------------------------
describe('isRelativePathGuard', () => {
  const guard = (test: string): unknown =>
    first(`if (${test}) { go(); }`, 'IfStatement', (node, sourceCode) =>
      isRelativePathGuard((node as TSESTree.IfStatement).test, sourceCode),
    );

  it.each([
    ["n.startsWith('/') && !n.startsWith('//')", true],
    ["!n.startsWith('//') && n.startsWith('/')", true],
    ["ok && n.startsWith('/') && !n.startsWith('//')", true],
    ['/^\\/[^/]/.test(n)', true],
    ['/^\\/(?!\\/)/.test(n)', true],
    // Refusals — each is a guard that does NOT reject `//evil.test`.
    ["n.startsWith('/')", false],
    ["!n.startsWith('//')", false],
    ["n.startsWith('/') && !m.startsWith('//')", false],
    ["n.startsWith('https://')", false],
    ["n.startsWith(prefix) && !n.startsWith('//')", false],
    ['/^https:\\/\\/acme\\.io$/.test(n)', false],
    ['re.test(n)', false],
    ["n.endsWith('/')", false],
    ['n.startsWith()', false],
    ['flag', false],
    ['!!n', false],
    ["obj['startsWith'](n)", false],
    ["n.startsWith('/') && !n.other('//')", false],
  ])('%s → %s', (test, expected) => {
    expect(guard(test)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
describe('isOriginEqualityGuard', () => {
  const guard = (prelude: string, test: string): unknown =>
    first(`${prelude} if (${test}) { go(); }`, 'IfStatement', (node, sourceCode) =>
      isOriginEqualityGuard((node as TSESTree.IfStatement).test, sourceCode),
    );

  const PARSED = "const p = new URL(location.href);";

  it.each([
    [`p.origin === 'https://acme.io'`, true],
    [`'https://acme.io' === p.origin`, true],
    [`p.host === 'acme.io'`, true],
    [`p.hostname == 'acme.io'`, true],
    [`ok && p.origin === 'https://acme.io'`, true],
    // Refusals.
    [`p.pathname === '/a'`, false],
    [`p.origin !== 'https://acme.io'`, false],
    [`other.origin === 'https://acme.io'`, false],
    [`p.origin`, false],
    [`fn(p.origin)`, false],
  ])('%s → %s', (test, expected) => {
    expect(guard(PARSED, test)).toBe(expected);
  });

  it('a URL parsed from a fixed string is not a guard over anything steerable', () => {
    expect(
      guard("const p = new URL('https://acme.io');", "p.origin === 'https://acme.io'"),
    ).toBe(false);
  });

  it('a deeply nested logical chain is refused rather than walked forever', () => {
    // Right-nested, because `a && b && c` groups to the LEFT and would put the
    // interesting operand at depth 1.
    const deep = Array.from({ length: 10 }, (_, i) => `f${i} && (`).join('');
    expect(guard(PARSED, `${deep}p.origin === 'https://acme.io'${')'.repeat(10)}`)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
describe('isOpaquePredicateOverTarget', () => {
  const over = (code: string): unknown =>
    first(`${code}`, 'IfStatement', (node, sourceCode) => {
      const statement = node as TSESTree.IfStatement;
      const target = sourceCode.ast.body[0];
      const declared =
        target.type === 'VariableDeclaration'
          ? (target.declarations[0].id as TSESTree.Node)
          : statement.test;
      return isOpaquePredicateOverTarget(statement.test, declared, sourceCode);
    });

  it.each([
    ['const n = 1; if (isValid(n)) { go(); }', true],
    ['const n = 1; if (ALLOWED.includes(n)) { go(); }', true],
    ['const n = 1; if (a || isValid(n)) { go(); }', true],
    // The target is the RECEIVER, not an argument — a prefix check, not a guard.
    ["const n = 1; if (n.startsWith('/')) { go(); }", false],
    // A predicate we CAN read has to prove something itself.
    ['const n = 1; const isValid = (x) => x; if (isValid(n)) { go(); }', false],
    ['const n = 1; function isValid(x) { return x; } if (isValid(n)) { go(); }', false],
    // Not a call at all.
    ['const n = 1; if (flag) { go(); }', false],
    // A call that never receives the target.
    ['const n = 1; if (isValid(other)) { go(); }', false],
    // A name with two declarations has no single knowable function, so it is
    // treated as unreadable and the guard defers.
    ['const n = 1; function isValid(x) { return x; } var isValid; if (isValid(n)) { go(); }', true],
    ['const n = 1; if (isValid(...args)) { go(); }', false],
  ])('%#', (code, expected) => {
    expect(over(code)).toBe(expected);
  });

  it('a deeply nested logical chain is refused rather than walked forever', () => {
    const deep = Array.from({ length: 10 }, (_, i) => `f${i} || (`).join('');
    expect(over(`const n = 1; if (${deep}isValid(n)${')'.repeat(10)}) { go(); }`)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
describe('isGuardedDestination', () => {
  const guarded = (code: string): unknown =>
    firstHit(`${code}`, 'CallExpression', (node, sourceCode) => {
      const call = node as TSESTree.CallExpression;
      if (!sourceCode.getText(call).startsWith('go(')) return null;
      return isGuardedDestination(
        call,
        call.arguments[0] as TSESTree.Node,
        sourceCode,
        () => false,
      );
    });

  it.each([
    ['const n = 1; if (isValid(n)) { go(n); }', true],
    ['function f(n) { if (!isValid(n)) return; go(n); }', true],
    ['function f(n) { if (!isValid(n)) throw new Error("x"); go(n); }', true],
    ['function f(n) { if (!isValid(n)) { log(); return; } go(n); }', true],
    // Refusals.
    ['const n = 1; go(n);', false],
    ['const n = 1; if (flag) { go(n); }', false],
    // The guard comes AFTER the call, so it guards nothing.
    ['function f(n) { go(n); if (!isValid(n)) return; }', false],
    // The negated branch does not exit.
    ['function f(n) { if (!isValid(n)) { log(); } go(n); }', false],
    // Not negated, so the exit is on the VALID path.
    ['function f(n) { if (isValid(n)) return; go(n); }', false],
    // Not an if at all.
    ['function f(n) { log(n); go(n); }', false],
    // A `!` over something that is not a guard over the target.
    ['function f(n) { if (!flag) return; go(n); }', false],
  ])('%#', (code, expected) => {
    expect(guarded(code)).toBe(expected);
  });

  it('a ternary whose test proves the destination is accepted', () => {
    expect(
      firstHit("go(ok ? n : '/');", 'CallExpression', (node, sourceCode) => {
        const call = node as TSESTree.CallExpression;
        if (!sourceCode.getText(call).startsWith('go(')) return null;
        return isGuardedDestination(
          call,
          call.arguments[0] as TSESTree.Node,
          sourceCode,
          () => true,
        );
      }),
    ).toBe(true);
  });

  it('gives up rather than walking an unbounded ancestor chain', () => {
    const nest = 'if (a) {'.repeat(24) + 'go(n);' + '}'.repeat(24);
    expect(guarded(nest)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
/**
 * The refusals that only a pathological shape reaches.
 *
 * Every one of these is a `return null` / `return false` that keeps a
 * predicate honest, and an uncovered refusal is a branch nobody has ever seen
 * fire. They are exercised here rather than deleted because each one is
 * reachable from real (if unusual) source.
 */
describe('urlContainerKind — the refusals', () => {
  const steerable = (code: string): unknown =>
    firstHit(code, 'CallExpression', (node, sourceCode) => {
      const call = node as TSESTree.CallExpression;
      if (!sourceCode.getText(call).startsWith('window.open')) return null;
      return isSteerableUrlValue(call.arguments[0] as TSESTree.Node, sourceCode);
    });

  it.each([
    // A cyclic binding: the container walk must terminate.
    ['function f() { const a = a; window.open(a.get("n")); }', false],
    // A container expression that is neither a NewExpression, a member, a call
    // nor an identifier.
    ['window.open((0, params).get("n"));', false],
    // An identifier with no initialiser and no destructuring.
    ['function f(p) { window.open(p.get("n")); }', false],
    // A member read that is not `.searchParams`.
    ['window.open(new URL(location.href).other.get("n"));', false],
    // A call that is not a routing hook.
    ['window.open(makeParams().get("n"));', false],
    // A binding written twice has no single knowable value.
    ['let p = new URLSearchParams(location.search); p = other; window.open(p.get("n"));', false],
    // A destructuring whose initialiser is not a routing hook.
    ['const { p } = makeThings(); window.open(p.get("n"));', false],
    // An ArrayPattern declared without an initialiser (a for-of head).
    ['for (const [p] of rows) { window.open(p.get("n")); }', false],
    // A function parameter destructured as an array.
    ['function f([p]) { window.open(p.get("n")); }', false],
  ])('%#', (code, expected) => {
    expect(steerable(code)).toBe(expected);
  });
});
