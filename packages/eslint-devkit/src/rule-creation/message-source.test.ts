/**
 * Tests for the message-source resolver.
 *
 * The load-bearing assertions are the negative ones: an unidentifiable receiver
 * must resolve to `undefined` rather than to a guess. That is what stops a
 * source rule claiming a provenance it cannot prove, and what hands the finding
 * to the generic rule instead of reporting it twice.
 */
import { describe, it, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  collectSourceBindings,
  constructedSource,
  createPayloadResolver,
  receiverSource,
  handlerSource,
  readsEventPayload,
} from './message-source';

const programOf = (code: string): TSESTree.Program => parser.parse(code, { range: true });

const exprOf = (code: string): TSESTree.Node =>
  (programOf(code).body[0] as TSESTree.ExpressionStatement).expression;

/**
 * Parse a file and resolve its first expression statement as a handler.
 *
 * First rather than last: one case deliberately puts the construction *after*
 * the attachment, to prove statement order does not change the answer.
 */
const resolve = (code: string) => {
  const program = programOf(code);
  const bindings = collectSourceBindings(program);
  const statement = program.body.find(
    (node): node is TSESTree.ExpressionStatement =>
      node.type === 'ExpressionStatement',
  );
  return statement === undefined ? undefined : handlerSource(statement.expression, bindings);
};

describe('constructedSource', () => {
  it('names the source a constructor produces', () => {
    expect(constructedSource(exprOf('new WebSocket("wss://x")'))).toBe('websocket');
    expect(constructedSource(exprOf('new Worker("w.js")'))).toBe('worker');
    expect(constructedSource(exprOf('new SharedWorker("w.js")'))).toBe('worker');
    expect(constructedSource(exprOf('new FileReader()'))).toBe('filereader');
  });

  it('is undefined for anything else', () => {
    expect(constructedSource(exprOf('new EventSource("/x")'))).toBeUndefined();
    expect(constructedSource(exprOf('makeSocket()'))).toBeUndefined();
    expect(constructedSource(exprOf('new factories.WebSocket()'))).toBeUndefined();
    expect(constructedSource(undefined)).toBeUndefined();
  });
});

describe('collectSourceBindings', () => {
  it('binds a name to the source it was constructed from', () => {
    const bindings = collectSourceBindings(
      programOf('const ws = new WebSocket("wss://x");\nconst r = new FileReader();'),
    );
    expect(bindings.get('ws')).toBe('websocket');
    expect(bindings.get('r')).toBe('filereader');
  });

  it('finds constructions nested inside functions', () => {
    const bindings = collectSourceBindings(
      programOf('function connect() { const inner = new WebSocket("wss://x"); return inner; }'),
    );
    expect(bindings.get('inner')).toBe('websocket');
  });

  it('does not bind a destructured, uninitialised or unrelated declarator', () => {
    const bindings = collectSourceBindings(
      programOf(
        'const { a } = new WebSocket("wss://x");\nconst plain = getSocket();\nlet later;',
      ),
    );
    expect(bindings.has('a')).toBe(false);
    expect(bindings.has('plain')).toBe(false);
    expect(bindings.has('later')).toBe(false);
  });

  it('terminates on an AST whose nodes carry parent pointers', () => {
    // ESLint sets `parent` on every node before a rule runs, so the walk must
    // skip it. Without the guard this recurses until the stack dies — the test
    // is the guard's only proof, because a bare parser AST has no parents.
    const program = programOf('const ws = new WebSocket("wss://x");');
    const link = (node: Record<string, unknown>, parent: unknown): void => {
      node.parent = parent;
      for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        const children = Array.isArray(value) ? value : [value];
        for (const child of children) {
          if (child && typeof child === 'object' && typeof (child as { type?: unknown }).type === 'string') {
            link(child as Record<string, unknown>, node);
          }
        }
      }
    };
    link(program as unknown as Record<string, unknown>, undefined);

    expect(collectSourceBindings(program).get('ws')).toBe('websocket');
  });
});

describe('receiverSource', () => {
  const bindings = collectSourceBindings(programOf('const ws = new WebSocket("wss://x");'));

  it('resolves an identifier through the file bindings', () => {
    expect(receiverSource(exprOf('ws'), bindings)).toBe('websocket');
  });

  it('treats the global receivers as the postMessage source', () => {
    for (const name of ['window', 'self', 'globalThis', 'parent', 'top']) {
      expect(receiverSource(exprOf(name), bindings)).toBe('postmessage');
    }
  });

  it('resolves an inline construction', () => {
    expect(receiverSource(exprOf('new Worker("w.js")'), bindings)).toBe('worker');
  });

  it('is undefined for a receiver it cannot identify', () => {
    // The whole point: unknown is not "probably a WebSocket".
    expect(receiverSource(exprOf('socket'), bindings)).toBeUndefined();
    expect(receiverSource(exprOf('this.ws'), bindings)).toBeUndefined();
  });
});

describe('handlerSource', () => {
  it('identifies each source by its receiver, not by the handler shape', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.onmessage = (e) => {};')).toMatchObject({
      source: 'websocket',
      eventParam: 'e',
    });
    expect(resolve('const w = new Worker("w.js");\nw.onmessage = (e) => {};')).toMatchObject({
      source: 'worker',
      eventParam: 'e',
    });
    expect(resolve('const r = new FileReader();\nr.onload = (e) => {};')).toMatchObject({
      source: 'filereader',
      eventParam: 'e',
    });
    expect(resolve('window.addEventListener("message", (e) => {});')).toMatchObject({
      source: 'postmessage',
      eventParam: 'e',
    });
  });

  it('accepts addEventListener on a constructed receiver', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.addEventListener("message", (e) => {});'))
      .toMatchObject({ source: 'websocket', eventParam: 'e' });
  });

  it('accepts onloadend and the load event for FileReader', () => {
    expect(resolve('const r = new FileReader();\nr.onloadend = (e) => {};')?.source).toBe(
      'filereader',
    );
    expect(resolve('const r = new FileReader();\nr.addEventListener("load", (e) => {});')?.source)
      .toBe('filereader');
  });

  it('takes a function expression as readily as an arrow', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.onmessage = function (evt) {};')).toMatchObject({
      source: 'websocket',
      eventParam: 'evt',
    });
  });

  it('resolves a handler attached above its construction', () => {
    // Bindings are collected for the whole file before anything is judged, so
    // statement order cannot change the answer.
    expect(resolve('ws.onmessage = (e) => {};\nvar ws = new WebSocket("x");')?.source).toBe(
      'websocket',
    );
  });

  it('is undefined when the receiver cannot be identified', () => {
    // This is the mis-attribution fix: `X.onmessage` alone is not a WebSocket.
    expect(resolve('socket.onmessage = (e) => {};')).toBeUndefined();
    expect(resolve('this.ws.onmessage = (e) => {};')).toBeUndefined();
    // Same rule for the addEventListener shape — a 'message' listener on an
    // unknown receiver is not evidence of a WebSocket.
    expect(resolve('socket.addEventListener("message", (e) => {});')).toBeUndefined();
  });

  it('is undefined for handler shapes that carry no payload parameter', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.onmessage = () => {};')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.onmessage = handleIt;')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.onmessage = ({ data }) => {};'))
      .toBeUndefined();
  });

  it('is undefined for a property or event that is not a handler', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.onerror = (e) => {};')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.addEventListener("close", (e) => {});'))
      .toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.addEventListener(evt, (e) => {});'))
      .toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.addEventListener(1, (e) => {});'))
      .toBeUndefined();
  });

  it('is undefined when the attached property is not a plain name', () => {
    expect(resolve('const ws = new WebSocket("x");\nws["onmessage"] = (e) => {};')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws["addEventListener"]("message", (e) => {});'))
      .toBeUndefined();
  });

  it('is undefined for shapes that are not an attachment at all', () => {
    expect(resolve('const ws = new WebSocket("x");\nws.send("hi");')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws[key] = (e) => {};')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nsend("hi");')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nws.addEventListener("message");'))
      .toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\nx = 1;')).toBeUndefined();
    expect(resolve('const ws = new WebSocket("x");\n1;')).toBeUndefined();
  });
});

describe('createPayloadResolver', () => {
  /** Resolve the source of the first `innerHTML = …` value in the file. */
  const sinkSource = (code: string) => {
    const program = programOf(code);
    const resolve = createPayloadResolver(program);
    let value: TSESTree.Node | undefined;
    const find = (node: TSESTree.Node): void => {
      if (
        node.type === 'AssignmentExpression' &&
        node.left.type === 'MemberExpression' &&
        node.left.property.type === 'Identifier' &&
        node.left.property.name === 'innerHTML' &&
        value === undefined
      ) {
        value = node.right;
      }
      for (const [key, raw] of Object.entries(node)) {
        if (key === 'parent') continue;
        for (const child of Array.isArray(raw) ? raw : [raw]) {
          if (child && typeof child === 'object' && typeof child.type === 'string') find(child);
        }
      }
    };
    find(program);
    return value === undefined ? 'NO SINK' : resolve(value);
  };

  it('attributes a sink to the source whose handler encloses it', () => {
    expect(
      sinkSource('const ws = new WebSocket("x");\nws.onmessage = (e) => { el.innerHTML = e.data; };'),
    ).toBe('websocket');
    expect(
      sinkSource('const w = new Worker("w.js");\nw.onmessage = (e) => { el.innerHTML = e.data; };'),
    ).toBe('worker');
    expect(
      sinkSource('const r = new FileReader();\nr.onload = (e) => { el.innerHTML = e.target.result; };'),
    ).toBe('filereader');
    expect(
      sinkSource('window.addEventListener("message", (e) => { el.innerHTML = e.data; });'),
    ).toBe('postmessage');
  });

  it('is undefined for a sink that reads something other than the payload', () => {
    // Inside a handler, but not fed by it — the generic rule owns this.
    expect(
      sinkSource('const ws = new WebSocket("x");\nws.onmessage = (e) => { el.innerHTML = other; };'),
    ).toBeUndefined();
  });

  it('is undefined for a sink outside any handler', () => {
    expect(sinkSource('const ws = new WebSocket("x");\nel.innerHTML = userInput;')).toBeUndefined();
  });

  it('is undefined when the receiver cannot be identified', () => {
    // The mis-attribution case, end to end: this is exactly the shape that used
    // to be reported as WebSocket message data.
    expect(sinkSource('socket.onmessage = (e) => { el.innerHTML = e.data; };')).toBeUndefined();
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
    expect(sinkSource('const ws = new WebSocket("x");\nws.onmessage = handler;')).toBe('NO SINK');
  });
});

describe('readsEventPayload', () => {
  it('matches a read off the handler parameter at any depth', () => {
    expect(readsEventPayload(exprOf('event.data'), 'event')).toBe(true);
    expect(readsEventPayload(exprOf('event.target.result'), 'event')).toBe(true);
    expect(readsEventPayload(exprOf('event.data.html'), 'event')).toBe(true);
    expect(readsEventPayload(exprOf('event'), 'event')).toBe(true);
  });

  it('does not match an unrelated value', () => {
    expect(readsEventPayload(exprOf('other.data'), 'event')).toBe(false);
    expect(readsEventPayload(exprOf('"literal"'), 'event')).toBe(false);
    expect(readsEventPayload(exprOf('getData()'), 'event')).toBe(false);
  });
});
