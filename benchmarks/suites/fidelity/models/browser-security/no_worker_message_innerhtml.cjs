const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 360,
  traces: 4000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-worker-message-innerhtml',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.recv)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.value)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const v = {
      Data: 'e.data',
      Sanitized: 'DOMPurify.sanitize(e.data)',
      Lit: "'<p>done</p>'",
    }[tag(s.value)];
    const stmt = {
      Inner: `element.innerHTML = ${v};`,
      Outer: `element.outerHTML = ${v};`,
      InsertAdj: `element.insertAdjacentHTML('beforeend', ${v});`,
      DocWrite: `document.write(${v});`,
      TextContent: `element.textContent = ${v};`,
    }[tag(s.sink)];
    const h = `(e) => { ${stmt} }`;
    const r = tag(s.recv);
    const target = r === 'SharedWorkerPort' ? 'worker.port' : 'worker';
    const reg = {
      OnMessage: `${target}.onmessage = ${h};`,
      AELMessage: `${target}.addEventListener('message', ${h});`,
    }[tag(s.reg)];
    const head = [
      "import DOMPurify from 'dompurify';",
      'declare const element: HTMLElement;',
    ];
    if (r === 'WorkerParam')
      return [...head, `export function wire(worker: Worker) { ${reg} }`].join(
        '\n',
      );
    const ctor = {
      WorkerConst: "new Worker('worker.js')",
      SharedWorkerPort: "new SharedWorker('shared.js')",
      WsConst: "new WebSocket('wss://chat.example.com')",
    }[r];
    return [...head, `const worker = ${ctor};`, reg].join('\n');
  },
  model: (s) => s.verdict,
};
