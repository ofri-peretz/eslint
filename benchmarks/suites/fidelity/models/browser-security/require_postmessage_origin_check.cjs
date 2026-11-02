const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 150,
  traces: 1500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'require-postmessage-origin-check',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.reg)}|${tag(s.check)}|${tag(s.form)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: true } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const check = tag(s.check);
    const param = check === 'Destructured' ? '{ origin, data }' : 'event';
    const body = {
      NoCheck:
        'const { action, data } = event.data; processAction(action, data);',
      Truthy: 'if (event.origin) { processAction(event.data); }',
      StrictEq:
        "if (event.origin !== 'https://trusted.com') return; processAction(event.data);",
      Allowlist:
        'if (!ALLOWED.includes(event.origin)) return; processAction(event.data);',
      Destructured:
        "if (origin !== 'https://trusted.com') return; processAction(data);",
    }[check];
    const h =
      tag(s.form) === 'Arrow'
        ? `(${param}) => { ${body} }`
        : `function (${param}) { ${body} }`;
    const reg = {
      WinAEL: `window.addEventListener('message', ${h});`,
      SelfAEL: `self.addEventListener('message', ${h});`,
      BareAEL: `addEventListener('message', ${h});`,
      WinOnMessage: `window.onmessage = ${h};`,
      ClickAEL: `window.addEventListener('click', ${h});`,
    }[tag(s.reg)];
    return [
      "import { processAction } from './actions';",
      "const ALLOWED = ['https://trusted.com'];",
      reg,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
