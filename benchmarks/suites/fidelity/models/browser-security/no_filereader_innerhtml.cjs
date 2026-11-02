const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 188, // 180 in Prod + 4 values in each of 2 test contexts
  traces: 2500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-filereader-innerhtml',
  key: (s) =>
    `${tag(s.recv)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.value)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  code: (s) => {
    const v = {
      TargetResult: 'e.target.result',
      ReaderResult: 'reader.result',
      Sanitized: 'DOMPurify.sanitize(e.target.result)',
      Lit: "'<p>loaded</p>'",
    }[tag(s.value)];
    const stmt = {
      Inner: `el.innerHTML = ${v};`,
      Outer: `el.outerHTML = ${v};`,
      InsertAdj: `el.insertAdjacentHTML('beforeend', ${v});`,
      DocWrite: `document.write(${v});`,
      TextContent: `el.textContent = ${v};`,
    }[tag(s.sink)];
    const h = `(e: any) => { ${stmt} }`;
    const reg = {
      OnLoad: `reader.onload = ${h};`,
      OnLoadEnd: `reader.onloadend = ${h};`,
      AELLoad: `reader.addEventListener('load', ${h});`,
    }[tag(s.reg)];
    const head = [
      "import DOMPurify from 'dompurify';",
      'declare const el: HTMLElement;',
      'declare const file: Blob;',
    ];
    const r = tag(s.recv);
    if (r === 'ReaderParam')
      return [
        ...head,
        `export function wire(reader: FileReader) { ${reg} }`,
      ].join('\n');
    const ctor = r === 'ReaderConst' ? 'new FileReader()' : 'new Image()';
    return [
      ...head,
      `const reader: any = ${ctor};`,
      reg,
      'reader.readAsText(file);',
    ].join('\n');
  },
  model: (s) => s.verdict,
};
