const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 141, // 135 in Prod + 3 values in each of 2 test contexts
  traces: 1800,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-websocket-eval',
  key: (s) =>
    `${tag(s.recv)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.value)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  code: (s) => {
    const v = {
      Data: 'event.data',
      DataField: 'event.data.code',
      Lit: "'1 + 1'",
    }[tag(s.value)];
    const stmt = {
      Eval: `eval(${v});`,
      NewFunction: `const fn = new Function(${v}); fn();`,
      CallFunction: `const fn = Function(${v}); fn();`,
      WindowEval: `window.eval(${v});`,
      JsonParse: `const parsed = JSON.parse(${v}); handle(parsed);`,
    }[tag(s.sink)];
    const h = `(event) => { ${stmt} }`;
    const reg = {
      OnMessage: `ws.onmessage = ${h};`,
      AELMessage: `ws.addEventListener('message', ${h});`,
      AELOpen: `ws.addEventListener('open', ${h});`,
    }[tag(s.reg)];
    const head = ['declare function handle(x: unknown): void;'];
    const r = tag(s.recv);
    if (r === 'WsParam')
      return [...head, `export function wire(ws: WebSocket) { ${reg} }`].join(
        '\n',
      );
    const ctor =
      r === 'WsConst'
        ? "new WebSocket('wss://chat.example.com')"
        : "new Worker('w.js')";
    return [...head, `const ws = ${ctor};`, reg].join('\n');
  },
  model: (s) => s.verdict,
};
