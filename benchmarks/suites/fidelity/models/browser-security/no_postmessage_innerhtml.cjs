const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 720,
  traces: 7500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-postmessage-innerhtml',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.reg)}|${tag(s.sink)}|${tag(s.value)}|${tag(s.form)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const p = tag(s.form) === 'ArrowEvent' ? 'event' : 'e';
    const v = {
      Data: `${p}.data`,
      DataField: `${p}.data.content`,
      Sanitized: `DOMPurify.sanitize(${p}.data)`,
      Lit: "'<p>hello</p>'",
    }[tag(s.value)];
    const stmt = {
      Inner: `element.innerHTML = ${v};`,
      Outer: `element.outerHTML = ${v};`,
      InsertAdj: `element.insertAdjacentHTML('beforeend', ${v});`,
      DocWrite: `document.write(${v});`,
      TextContent: `element.textContent = ${v};`,
    }[tag(s.sink)];
    const h =
      tag(s.form) === 'ArrowEvent'
        ? `(${p}) => { ${stmt} }`
        : `function (${p}) { ${stmt} }`;
    const reg = {
      WinAEL: `window.addEventListener('message', ${h});`,
      SelfAEL: `self.addEventListener('message', ${h});`,
      GlobalThisAEL: `globalThis.addEventListener('message', ${h});`,
      WinOnMessage: `window.onmessage = ${h};`,
      ParamPort: `export function wire(port: MessagePort) { port.onmessage = ${h}; }`,
      ClickAEL: `window.addEventListener('click', ${h});`,
    }[tag(s.reg)];
    return [
      "import DOMPurify from 'dompurify';",
      'declare const element: HTMLElement;',
      reg,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
