/**
 * Tests for the message-source resolver.
 *
 * Resolution is lexical, so these drive it through a real `Linter` run — the
 * scope manager is what decides which binding a name refers to, and a bare
 * parser AST has no scopes. The load-bearing assertions are the negative ones:
 * an unidentifiable or shadowed receiver must resolve to `undefined` rather
 * than to a guess, because that is what hands the finding to the generic rule
 * instead of reporting it twice — or, worse, not at all.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import {
  constructedSource,
  createPayloadResolver,
  createReceiverResolver,
  handlerSource,
  readsEventPayload,
  receiverSource,
  SHADOWED,
} from './message-source';

/**
 * Run `code` through a Linter and hand the callback the live SourceCode.
 *
 * A throwaway rule is the only way to get a scope-aware SourceCode, which is
 * exactly what the resolver needs.
 */
function withSourceCode<T>(code: string, use: (sourceCode: any) => T): T {
  let result!: T;
  const linter = new Linter();
  linter.verify(code, {
    plugins: {
      probe: {
        rules: {
          collect: {
            create(context: any) {
              return {
                'Program:exit'() {
                  result = use(context.sourceCode);
                },
              };
            },
          },
        },
      },
    },
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: { 'probe/collect': 'error' },
  });
  return result;
}

const exprOf = (code: string): TSESTree.Node =>
  (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
    .expression;

/** Resolve the first expression statement of `code` as a handler attachment. */
const resolve = (code: string) =>
  withSourceCode(code, (sourceCode) => {
    const resolver = createReceiverResolver(sourceCode);
    const statement = (sourceCode.ast.body as TSESTree.Node[]).find(
      (node): node is TSESTree.ExpressionStatement =>
        node.type === AST_NODE_TYPES.ExpressionStatement,
    );
    return statement === undefined
      ? undefined
      : handlerSource(statement.expression, resolver);
  });

describe('constructedSource', () => {
  it('names the source a constructor produces', () => {
    expect(constructedSource(exprOf('new WebSocket("wss://x")'))).toBe(
      'websocket',
    );
    expect(constructedSource(exprOf('new Worker("w.js")'))).toBe('worker');
    expect(constructedSource(exprOf('new SharedWorker("w.js")'))).toBe(
      'worker',
    );
    expect(constructedSource(exprOf('new FileReader()'))).toBe('filereader');
  });

  it('is undefined for anything else', () => {
    expect(constructedSource(exprOf('new EventSource("/x")'))).toBeUndefined();
    expect(constructedSource(exprOf('makeSocket()'))).toBeUndefined();
    expect(
      constructedSource(exprOf('new factories.WebSocket()')),
    ).toBeUndefined();
    expect(constructedSource(undefined)).toBeUndefined();
  });
});

describe('receiverSource', () => {
  /** Resolve the receiver of `X.onmessage = …` in the last statement. */
  const receiverOf = (code: string) =>
    withSourceCode(code, (sourceCode) => {
      const resolver = createReceiverResolver(sourceCode);
      let found: TSESTree.Node | undefined;
      const walk = (node: TSESTree.Node): void => {
        if (
          node.type === AST_NODE_TYPES.AssignmentExpression &&
          node.left.type === AST_NODE_TYPES.MemberExpression
        ) {
          found = node.left.object;
        }
        for (const [key, value] of Object.entries(node)) {
          if (key === 'parent') continue;
          for (const child of Array.isArray(value) ? value : [value]) {
            if (
              child &&
              typeof child === 'object' &&
              typeof child.type === 'string'
            )
              walk(child);
          }
        }
      };
      walk(sourceCode.ast);
      return found === undefined ? undefined : receiverSource(found, resolver);
    });

  it('resolves an identifier through the scope chain', () => {
    expect(
      receiverOf('const ws = new WebSocket("x");\nws.onmessage = f;'),
    ).toBe('websocket');
  });

  it('treats the global receivers as the postMessage source', () => {
    for (const name of ['window', 'self', 'globalThis', 'parent', 'top']) {
      expect(receiverOf(`${name}.onmessage = f;`)).toBe('postmessage');
    }
  });

  it('does NOT treat a shadowed global as the postMessage source', () => {
    // A parameter named `window` is not the window. Before lexical
    // resolution this was attributed to postMessage anyway.
    expect(
      receiverOf('function f(window) { window.onmessage = g; }'),
    ).toBeUndefined();
  });

  it('prefers the binding actually in scope', () => {
    // The inner `ws` is a plain value; the outer one is a WebSocket. A
    // file-wide name map answered "websocket" here, which reported an
    // arbitrary payload as WebSocket data.
    expect(
      receiverOf(
        'const ws = new WebSocket("x");\nfunction r(p) { const ws = p; ws.onmessage = f; }',
      ),
    ).toBeUndefined();
  });

  it('refuses to answer for a reassigned binding', () => {
    // A re-assignment is not a *definition*, so `defs` alone misses it.
    expect(
      receiverOf(
        'let ws = new WebSocket("x");\nws = other;\nws.onmessage = f;',
      ),
    ).toBeUndefined();
  });

  it('resolves an inline construction', () => {
    expect(receiverOf('new Worker("w.js").onmessage = f;')).toBe('worker');
  });

  it('is undefined for a receiver it cannot identify', () => {
    expect(receiverOf('socket.onmessage = f;')).toBeUndefined();
    expect(receiverOf('this.ws.onmessage = f;')).toBeUndefined();
  });
});

describe('createReceiverResolver', () => {
  it('marks a bound-but-unknown name SHADOWED, and an unbound name undefined', () => {
    // The distinction is what lets `window` mean the global only when nothing
    // shadows it.
    const [bound, unbound] = withSourceCode(
      'const thing = makeIt();\nthing.onmessage = f;',
      (sc) => {
        const resolver = createReceiverResolver(sc);
        const ids: TSESTree.Identifier[] = [];
        const walk = (n: any): void => {
          if (n.type === AST_NODE_TYPES.Identifier) ids.push(n);
          for (const [k, v] of Object.entries(n)) {
            if (k === 'parent') continue;
            for (const c of Array.isArray(v) ? v : [v]) {
              if (
                c &&
                typeof c === 'object' &&
                typeof (c as any).type === 'string'
              )
                walk(c);
            }
          }
        };
        walk(sc.ast);
        const thing = ids.find((i) => i.name === 'thing')!;
        const missing = ids.find((i) => i.name === 'makeIt')!;
        return [resolver(thing), resolver(missing)] as const;
      },
    );
    expect(bound).toBe(SHADOWED);
    expect(unbound).toBeUndefined();
  });
});

describe('createReceiverResolver — refusals', () => {
  const receiverOf = (code: string) =>
    withSourceCode(code, (sourceCode) => {
      const resolver = createReceiverResolver(sourceCode);
      let found: TSESTree.Node | undefined;
      const walk = (node: any): void => {
        if (
          node.type === AST_NODE_TYPES.AssignmentExpression &&
          node.left.type === AST_NODE_TYPES.MemberExpression
        ) {
          found = node.left.object;
        }
        for (const [k, v] of Object.entries(node)) {
          if (k === 'parent') continue;
          for (const c of Array.isArray(v) ? v : [v]) {
            if (c && typeof c === 'object' && typeof (c as any).type === 'string') walk(c);
          }
        }
      };
      walk(sourceCode.ast);
      return found === undefined ? undefined : receiverSource(found, resolver);
    });

  it('refuses a name declared more than once', () => {
    // Two `var` declarations produce two defs; which one is live at the point
    // of use is not something a single-pass resolver can claim to know.
    expect(receiverOf('var ws = new WebSocket("x");\nvar ws = other;\nws.onmessage = f;'))
      .toBeUndefined();
  });

  it('refuses a receiver that arrives as a parameter', () => {
    // A parameter has a definition, but not a `VariableDeclarator` with an
    // initialiser — nothing in this file says what it is.
    expect(receiverOf('function connect(ws) { ws.onmessage = f; }')).toBeUndefined();
  });
});

describe('handlerSource', () => {
  it('identifies each source by its receiver, not by the handler shape', () => {
    expect(
      resolve('const ws = new WebSocket("x");\nws.onmessage = (e) => {};'),
    ).toMatchObject({
      source: 'websocket',
      eventParam: 'e',
    });
    expect(
      resolve('const w = new Worker("w.js");\nw.onmessage = (e) => {};'),
    ).toMatchObject({
      source: 'worker',
      eventParam: 'e',
    });
    expect(
      resolve('const r = new FileReader();\nr.onload = (e) => {};'),
    ).toMatchObject({
      source: 'filereader',
      eventParam: 'e',
    });
    expect(
      resolve('window.addEventListener("message", (e) => {});'),
    ).toMatchObject({
      source: 'postmessage',
      eventParam: 'e',
    });
  });

  it('accepts addEventListener on a constructed receiver', () => {
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener("message", (e) => {});',
      ),
    ).toMatchObject({ source: 'websocket', eventParam: 'e' });
  });

  it('accepts onloadend and the load event for FileReader', () => {
    expect(
      resolve('const r = new FileReader();\nr.onloadend = (e) => {};')?.source,
    ).toBe('filereader');
    expect(
      resolve(
        'const r = new FileReader();\nr.addEventListener("load", (e) => {});',
      )?.source,
    ).toBe('filereader');
  });

  it('takes a function expression as readily as an arrow', () => {
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.onmessage = function (evt) {};',
      ),
    ).toMatchObject({
      source: 'websocket',
      eventParam: 'evt',
    });
  });

  it('resolves a handler attached above its construction', () => {
    // Bindings are collected for the whole file before anything is judged, so
    // statement order cannot change the answer.
    expect(
      resolve('ws.onmessage = (e) => {};\nvar ws = new WebSocket("x");')
        ?.source,
    ).toBe('websocket');
  });

  it('is undefined when the receiver cannot be identified', () => {
    // This is the mis-attribution fix: `X.onmessage` alone is not a WebSocket.
    expect(resolve('socket.onmessage = (e) => {};')).toBeUndefined();
    expect(resolve('this.ws.onmessage = (e) => {};')).toBeUndefined();
    // Same rule for the addEventListener shape — a 'message' listener on an
    // unknown receiver is not evidence of a WebSocket.
    expect(
      resolve('socket.addEventListener("message", (e) => {});'),
    ).toBeUndefined();
  });

  it('is undefined for handler shapes that carry no payload parameter', () => {
    expect(
      resolve('const ws = new WebSocket("x");\nws.onmessage = () => {};'),
    ).toBeUndefined();
    expect(
      resolve('const ws = new WebSocket("x");\nws.onmessage = handleIt;'),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.onmessage = ({ data }) => {};',
      ),
    ).toBeUndefined();
  });

  it("does not accept one source's attachment point on another", () => {
    // `ws.onload = …` is not a WebSocket message handler. A shared prop set
    // resolved it as one, and then no-eval skipped the value while
    // no-websocket-eval (which only knows onmessage) never claimed it — the
    // finding belonged to nobody.
    expect(
      resolve('const ws = new WebSocket("x");\nws.onload = (e) => {};'),
    ).toBeUndefined();
    expect(
      resolve('const r = new FileReader();\nr.onmessage = (e) => {};'),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener("load", (e) => {});',
      ),
    ).toBeUndefined();
    expect(
      resolve(
        'const r = new FileReader();\nr.addEventListener("message", (e) => {});',
      ),
    ).toBeUndefined();
  });

  it('is undefined for a property or event that is not a handler', () => {
    expect(
      resolve('const ws = new WebSocket("x");\nws.onerror = (e) => {};'),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener("close", (e) => {});',
      ),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener(evt, (e) => {});',
      ),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener(1, (e) => {});',
      ),
    ).toBeUndefined();
  });

  it('is undefined when the attached property is not a plain name', () => {
    expect(
      resolve('const ws = new WebSocket("x");\nws["onmessage"] = (e) => {};'),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws["addEventListener"]("message", (e) => {});',
      ),
    ).toBeUndefined();
  });

  it('is undefined for shapes that are not an attachment at all', () => {
    expect(
      resolve('const ws = new WebSocket("x");\nws.send("hi");'),
    ).toBeUndefined();
    expect(
      resolve('const ws = new WebSocket("x");\nws[key] = (e) => {};'),
    ).toBeUndefined();
    expect(
      resolve('const ws = new WebSocket("x");\nsend("hi");'),
    ).toBeUndefined();
    expect(
      resolve(
        'const ws = new WebSocket("x");\nws.addEventListener("message");',
      ),
    ).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nx = 1;')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\n1;')).toBeUndefined();
  });
});

describe('createPayloadResolver', () => {
  /** Resolve the source of the first `innerHTML = …` value in the file. */
  const sinkSource = (code: string) =>
    withSourceCode(code, (sourceCode) => {
      const resolve = createPayloadResolver(sourceCode);
      let value: TSESTree.Node | undefined;
      const walk = (node: any): void => {
        if (
          value === undefined &&
          node.type === AST_NODE_TYPES.AssignmentExpression &&
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'innerHTML'
        ) {
          value = node.right;
        }
        for (const [key, raw] of Object.entries(node)) {
          if (key === 'parent') continue;
          for (const child of Array.isArray(raw) ? raw : [raw]) {
            if (
              child &&
              typeof child === 'object' &&
              typeof (child as any).type === 'string'
            ) {
              walk(child);
            }
          }
        }
      };
      walk(sourceCode.ast);
      return value === undefined ? 'NO SINK' : resolve(value);
    });

  it('attributes a sink to the source whose handler encloses it', () => {
    expect(
      sinkSource(
        'const ws = new WebSocket("x");\nws.onmessage = (e) => { el.innerHTML = e.data; };',
      ),
    ).toBe('websocket');
    expect(
      sinkSource(
        'const w = new Worker("w.js");\nw.onmessage = (e) => { el.innerHTML = e.data; };',
      ),
    ).toBe('worker');
    expect(
      sinkSource(
        'const r = new FileReader();\nr.onload = (e) => { el.innerHTML = e.target.result; };',
      ),
    ).toBe('filereader');
    expect(
      sinkSource(
        'window.addEventListener("message", (e) => { el.innerHTML = e.data; });',
      ),
    ).toBe('postmessage');
  });

  it('is undefined for a sink that reads something other than the payload', () => {
    expect(
      sinkSource(
        'const ws = new WebSocket("x");\nws.onmessage = (e) => { el.innerHTML = other; };',
      ),
    ).toBeUndefined();
  });

  it('is undefined for a sink outside any handler', () => {
    expect(
      sinkSource('const ws = new WebSocket("x");\nel.innerHTML = userInput;'),
    ).toBeUndefined();
  });

  it('is undefined when the receiver cannot be identified', () => {
    expect(
      sinkSource('socket.onmessage = (e) => { el.innerHTML = e.data; };'),
    ).toBeUndefined();
  });

  it('attributes a nested handler to the innermost source', () => {
    expect(
      sinkSource(
        'const ws = new WebSocket("x");\n' +
          'ws.onmessage = (e) => {\n' +
          '  const r = new FileReader();\n' +
          '  r.onload = (e) => { el.innerHTML = e.target.result; };\n' +
          '};',
      ),
    ).toBe('filereader');
  });

  it('ignores an attachment whose handler is not an inline function', () => {
    expect(
      sinkSource('const ws = new WebSocket("x");\nws.onmessage = handler;'),
    ).toBe('NO SINK');
  });
});

describe('readsEventPayload', () => {
  it('matches a read off the handler parameter at any depth', () => {
    expect(readsEventPayload(exprOf('event.data'), 'event')).toBe(true);
    expect(readsEventPayload(exprOf('event.target.result'), 'event')).toBe(
      true,
    );
    expect(readsEventPayload(exprOf('event.data.html'), 'event')).toBe(true);
    expect(readsEventPayload(exprOf('event'), 'event')).toBe(true);
  });

  it('does not match an unrelated value', () => {
    expect(readsEventPayload(exprOf('other.data'), 'event')).toBe(false);
    expect(readsEventPayload(exprOf('"literal"'), 'event')).toBe(false);
    expect(readsEventPayload(exprOf('getData()'), 'event')).toBe(false);
  });
});
