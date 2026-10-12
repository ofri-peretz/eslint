/**
 * Tests for the value-following and SDK-binding helpers behind the three
 * inference-SDK factories.
 *
 * Each helper is asked about a node found by a marker: the expression passed
 * to a call of `probe(...)`. That keeps the fixture code readable as the code
 * people write, with the question asked in one place.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  committedStrings,
  createSdkClientMatcher,
  followConst,
  isCredentialShaped,
  isEnvironmentRead,
  isGlobalReference,
  literalString,
  MAX_FOLLOW_HOPS,
  readObjectProperty,
  resolveArrayLiteral,
  resolveObjectLiteral,
  resolveSdkExport,
  sdkExportName,
  variableOf,
} from './sdk-flow';
import { createModuleListMatcher } from './module-evidence';

type SourceCode = Readonly<TSESLint.SourceCode>;

/**
 * Lint `code` with a one-off rule and hand the first argument of every
 * `probe(...)` call, in source order, to `inspect` — together with the
 * SourceCode the helpers need for scope resolution.
 */
function probes<T>(
  code: string,
  inspect: (node: TSESTree.Node, sourceCode: SourceCode) => T,
): T[] {
  const out: T[] = [];
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: {
        t: {
          rules: {
            probe: {
              create(context) {
                return {
                  CallExpression(node) {
                    const call = node as unknown as TSESTree.CallExpression;
                    if (
                      call.callee.type === 'Identifier' &&
                      call.callee.name === 'probe'
                    ) {
                      out.push(
                        inspect(
                          call.arguments[0] as TSESTree.Node,
                          context.sourceCode as unknown as SourceCode,
                        ),
                      );
                    }
                  },
                };
              },
            },
          },
        },
      },
      rules: { 't/probe': 'error' },
    },
    'sample.ts',
  );
  expect(messages.filter((m) => m.fatal)).toEqual([]);
  return out;
}

const text = (node: TSESTree.Node): string =>
  node.type === 'Literal'
    ? String(node.value)
    : node.type === 'Identifier'
      ? node.name
      : node.type;

describe('variableOf / isGlobalReference', () => {
  it('resolves a reference, a declaration and a global', () => {
    const [local, declared, global] = probes(
      `const foo = 1; probe(foo); const bar = 2; probe(undeclaredThing);`,
      (node, sc) => {
        const id = node as TSESTree.Identifier;
        return [variableOf(id, sc)?.name, isGlobalReference(id, sc)] as const;
      },
    ).concat(
      probes(`function f(baz) { return 1; } probe(1);`, (_n, sc) => {
        // A parameter's declaring identifier is not a reference: found
        // through the scope's `set`.
        const fn = sc.ast.body[0] as TSESTree.FunctionDeclaration;
        const decl = fn.params[0] as TSESTree.Identifier;
        return [
          variableOf(decl, sc)?.name,
          isGlobalReference(decl, sc),
        ] as const;
      }),
    );
    expect(local).toEqual(['foo', false]);
    expect(declared).toEqual([undefined, true]);
    expect(global).toEqual(['baz', false]);
  });

  it('is undefined for an identifier no scope declares or references', () => {
    const [result] = probes(`probe(1);`, (_n, sc) => {
      const orphan = {
        type: 'Identifier',
        name: 'nowhere',
        parent: sc.ast,
        range: [0, 0],
        loc: sc.ast.loc,
      } as unknown as TSESTree.Identifier;
      return variableOf(orphan, sc);
    });
    expect(result).toBeUndefined();
  });
});

describe('followConst', () => {
  it('follows const chains, destructured object-literal keys and type wrappers', () => {
    const results = probes(
      `const a = 'x'; const b = a; probe(b);
       const cfg = { k: 'y' }; const { k: c } = cfg; probe(c);
       const d = 'z' as const; probe(d!);
       const { [dyn]: e } = cfg; probe(e);
       const { missing: f } = cfg; probe(f);
       const { k: g } = load(); probe(g);
       const [h] = ['w']; probe(h);
       let i = 'v'; i = other; probe(i);
       let j; probe(j);
       function p(q) { probe(q); }
       const { k: { deep } } = cfg; probe(deep);
       const { ...rest } = cfg; probe(rest);`,
      (node, sc) => text(followConst(node, sc)),
    );
    expect(results).toEqual([
      'x',
      'y',
      'z',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'q',
      'deep',
      'rest',
    ]);
  });

  it('stops at the hop budget', () => {
    const chain = Array.from(
      { length: MAX_FOLLOW_HOPS + 2 },
      (_, n) => `const v${n} = ${n === 0 ? "'end'" : `v${n - 1}`};`,
    ).join('\n');
    const [result] = probes(
      `${chain}\nprobe(v${MAX_FOLLOW_HOPS + 1});`,
      (node, sc) => text(followConst(node, sc)),
    );
    expect(result).not.toBe('end');
  });
});

describe('resolveObjectLiteral / resolveArrayLiteral', () => {
  it('returns the literal a const holds, or undefined', () => {
    const results = probes(
      `const o = { a: 1 }; const l = [1]; probe(o); probe(l); probe(x);`,
      (node, sc) => [
        resolveObjectLiteral(node, sc)?.type,
        resolveArrayLiteral(node, sc)?.type,
      ],
    );
    expect(results).toEqual([
      ['ObjectExpression', undefined],
      [undefined, 'ArrayExpression'],
      [undefined, undefined],
    ]);
  });
});

describe('readObjectProperty', () => {
  const read = (code: string) =>
    probes(code, (node, sc) => {
      const r = readObjectProperty(node as TSESTree.ObjectExpression, 'k', sc);
      return r.kind === 'value' ? text(r.node) : r.kind;
    });

  it('the last write wins, through same-file spreads', () => {
    expect(
      read(
        `const base = { k: 'b' }; const none = { j: 1 };
         probe({ k: 'a', ...base });
         probe({ ...base, k: 'a' });
         probe({ k: 'a', ...none });
         probe({ 'k': 'q' });
         probe({ j: 1 });`,
      ),
    ).toEqual(['b', 'a', 'a', 'q', 'absent']);
  });

  it('is unknown behind an unreadable spread or a computed key', () => {
    expect(
      read(`probe({ k: 'a', ...other }); probe({ k: 'a', [dyn]: 'b' });`),
    ).toEqual(['unknown', 'unknown']);
  });

  it('stops following spreads at the hop budget', () => {
    const [result] = probes(
      `const base = { k: 'b' }; probe({ ...base });`,
      (node, sc) =>
        readObjectProperty(node as TSESTree.ObjectExpression, 'k', sc, 0).kind,
    );
    expect(result).toBe('unknown');
  });
});

describe('isCredentialShaped', () => {
  it('accepts generated tokens', () => {
    expect(isCredentialShaped('sk-ant-api03-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5')).toBe(
      true,
    );
    expect(isCredentialShaped('3f9a2c7e1b8d4f6a0c5e9b2d7a1f4c8e')).toBe(true);
  });

  it('rejects stand-ins', () => {
    for (const value of [
      'short-1',
      'my-anthropic-api-key-xyz',
      'Zx9Qw2Lm8 Rt4Yv6Np0Kc3Hd5',
      '12345678901234567890123',
      '<YOUR_API_KEY_0123456789>',
      'sk-proj-0123...0123456789',
      'sk-proj-xxxxxxxxxxxxxxxx1',
      'sk-test-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5',
      'ExampleKey-Zx9Qw2Lm8Rt4Yv6Np0',
    ]) {
      expect(isCredentialShaped(value), value).toBe(false);
    }
  });
});

describe('literalString', () => {
  it('reads string literals and interpolation-free templates, through consts', () => {
    const results = probes(
      "const k = 'abc'; probe(k); probe(`def`); probe(1); probe(`a${x}`); probe(x);",
      (node, sc) => literalString(node, sc),
    );
    expect(results).toEqual(['abc', 'def', undefined, undefined, undefined]);
  });
});

describe('committedStrings', () => {
  it('collects literals through consts and both sides of a fallback', () => {
    const results = probes(
      "const k = 'a'; probe(process.env.K ?? k); probe(x || 'b'); probe(c ? 'd' : `e`); probe(process.env.K); probe(1);",
      (node, sc) => committedStrings(node, sc),
    );
    expect(results).toEqual([['a'], ['b'], ['d', 'e'], [], []]);
  });

  it('stops at the hop budget', () => {
    const [result] = probes("probe(a ?? 'x');", (node, sc) =>
      committedStrings(node, sc, 0),
    );
    expect(result).toEqual([]);
  });
});

describe('resolveSdkExport / sdkExportName', () => {
  const owns = createModuleListMatcher(['test-sdk']);
  const resolve = (code: string) =>
    probes(code, (node, sc) => {
      const binding = resolveSdkExport(node, sc, owns);
      return binding && `${binding.module}#${sdkExportName(binding)}`;
    });

  it('resolves every load form, renamed', () => {
    expect(
      resolve(
        `import A from 'test-sdk'; probe(A);
         import { B as Bee } from 'test-sdk'; probe(Bee);
         import { 'quoted' as Q } from 'test-sdk'; probe(Q);
         import * as ns from 'test-sdk'; probe(ns.C); probe(ns);
         import Eq = require('test-sdk'); probe(Eq);
         const R = require('test-sdk'); probe(R);
         const { D: Dee } = require('test-sdk'); probe(Dee);
         async function f() { const { default: E } = await import('test-sdk'); probe(E); probe((await import('test-sdk')).F); }`,
      ),
    ).toEqual([
      'test-sdk#default',
      'test-sdk#B',
      'test-sdk#quoted',
      'test-sdk#C',
      'test-sdk#default',
      'test-sdk#default',
      'test-sdk#default',
      'test-sdk#D',
      'test-sdk#default',
      'test-sdk#F',
    ]);
  });

  it('abstains on other modules, unknown shapes and local bindings', () => {
    expect(
      resolve(
        `import X from 'other'; probe(X);
         import Y = require('other'); probe(Y);
         import Z = Namespace.Inner; probe(Z);
         const W = require('other'); probe(W);
         const V = require(dyn); probe(V);
         const U = load('test-sdk'); probe(U);
         function g(require) { const T = require('test-sdk'); probe(T); }
         import * as ns from 'test-sdk'; probe(ns[dyn]);
         probe(import(spec));
         probe(import('other'));
         let S; probe(S);
         const [P] = require('test-sdk'); probe(P);
         const { [dyn]: O } = require('test-sdk'); probe(O);
         probe(class {});
         function h(param) { probe(param); }
         const M = mod.require('test-sdk'); probe(M);
         const { a: { b: N } } = require('test-sdk'); probe(N);`,
      ),
    ).toEqual(Array(17).fill(undefined));
  });

  it('stops at the hop budget', () => {
    const [result] = probes(`import A from 'test-sdk'; probe(A);`, (node, sc) =>
      resolveSdkExport(node, sc, owns, 0),
    );
    expect(result).toBeUndefined();
  });
});

describe('createSdkClientMatcher', () => {
  const owns = createModuleListMatcher(['test-sdk']);
  const matcher = createSdkClientMatcher(owns);
  const args = (code: string) =>
    probes(code, (node, sc) =>
      matcher.optionArguments(
        node as TSESTree.NewExpression | TSESTree.CallExpression,
        sc,
      ),
    );

  it('every argument of an SDK-bound callee, a subclass, super() and withOptions', () => {
    expect(
      args(
        `import C from 'test-sdk';
         probe(new C(a, b));
         class Sub extends C { constructor() { probe(super(o)); } }
         probe(new Sub(o));
         const Expr = class extends C {}; probe(new Expr(o));
         probe(anything.withOptions(o));`,
      ),
    ).toEqual([[0, 1], [0], [0], [0], [0]]);
  });

  it('the one parameter a same-file wrapper hands to the SDK', () => {
    expect(
      args(
        `import C from 'test-sdk';
         function direct(x, opts) { return new C(opts); }
         probe(direct(1, o));
         const spread = (opts = {}) => new C({ a: 1, ...opts });
         probe(spread(o));
         probe(spread(o));
         const typed = (opts) => new C(opts as never);
         probe(typed(o));
         function logged(opts) { log(opts); return new C(opts); }
         probe(logged(o));`,
      ),
    ).toEqual([[1], [0], [0], [0], [0]]);
  });

  it('nothing for calls the SDK does not own', () => {
    expect(
      args(
        `import C from 'test-sdk';
         import D from 'other';
         probe(new D(o));
         probe(new (pick())(o));
         probe(unbound(o));
         class Plain {} probe(new Plain(o));
         class Other extends D { constructor() { probe(super(o)); } }
         class NoBase { constructor() { probe(super.x()); } }
         function inner(opts) { return () => new C(opts); }
         probe(inner(o));
         function local(opts) { return opts; }
         probe(local(o));
         function noParam() { return new C(fixed); }
         probe(noParam(o));
         function other(opts) { return new C({ ...rest, a: opts.a }, opts.b); }
         probe(other(o));
         const notFn = 1; probe(notFn(o));
         let late; probe(new late(o));
         function noisy(opts) { log(opts); return 1; }
         probe(noisy(o));`,
      ),
    ).toEqual(Array.from({ length: 13 }, () => []));
  });

  it('exportOf resolves a callee the same way', () => {
    const [result] = probes(`import C from 'test-sdk'; probe(C);`, (node, sc) =>
      matcher.exportOf(node, sc),
    );
    expect(result).toEqual({ module: 'test-sdk', path: ['default'] });
  });
});

describe('isEnvironmentRead', () => {
  it('reads process.env and import.meta.env, not look-alikes', () => {
    const results = probes(
      `probe(process.env.K); probe(process.env['K']); probe(import.meta.env.K);
       probe(config.env.K); probe(env.K); probe(K);
       function f(process) { probe(process.env.K); }
       probe(process[dyn].K);`,
      (node, sc) => isEnvironmentRead(node, sc),
    );
    expect(results).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
