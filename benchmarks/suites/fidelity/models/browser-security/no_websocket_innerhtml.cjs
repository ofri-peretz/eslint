const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 368, // 360 in Prod + 4 values in each of 2 test contexts
  traces: 4500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-websocket-innerhtml',
  key: (s) =>
    `${tag(s.recv)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.value)}|${tag(s.form)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  code: (s) => {
    const p = tag(s.form) === 'ArrowEvent' ? 'event' : 'msg';
    const v = {
      Data: `${p}.data`,
      DataField: `${p}.data.html`,
      Sanitized: `DOMPurify.sanitize(${p}.data)`,
      Lit: "'<p>hello</p>'",
    }[tag(s.value)];
    const stmt = {
      Inner: `el.innerHTML = ${v};`,
      Outer: `el.outerHTML = ${v};`,
      InsertAdj: `el.insertAdjacentHTML('beforeend', ${v});`,
      DocWrite: `document.write(${v});`,
      TextContent: `el.textContent = ${v};`,
    }[tag(s.sink)];
    const h =
      tag(s.form) === 'ArrowEvent'
        ? `(${p}) => { ${stmt} }`
        : `function (${p}) { ${stmt} }`;
    const reg = {
      OnMessage: `ws.onmessage = ${h};`,
      AELMessage: `ws.addEventListener('message', ${h});`,
      AELOpen: `ws.addEventListener('open', ${h});`,
    }[tag(s.reg)];
    const head = [
      "import DOMPurify from 'dompurify';",
      'declare const el: HTMLElement;',
    ];
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
