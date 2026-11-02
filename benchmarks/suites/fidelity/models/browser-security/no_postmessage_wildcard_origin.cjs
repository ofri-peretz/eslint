const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 126,
  traces: 1300,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-postmessage-wildcard-origin',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.recv)}|${tag(s.origin)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const callee = {
      Window: 'window.postMessage',
      ContentWindow: 'iframe.contentWindow.postMessage',
      Parent: 'parent.postMessage',
      Opener: 'window.opener.postMessage',
      Computed: "window['postMessage']",
      OptionalOpener: 'window.opener?.postMessage',
    }[tag(s.recv)];
    const args = {
      StarLit: "userData, '*'",
      StarTpl: 'userData, `*`',
      Exact: "userData, 'https://trusted-domain.com'",
      Slash: "userData, '/'",
      OptsStar: "userData, { targetOrigin: '*' }",
      OptsExact: "userData, { targetOrigin: 'https://trusted-domain.com' }",
      Missing: 'userData',
    }[tag(s.origin)];
    return [
      'declare const iframe: HTMLIFrameElement;',
      'declare const userData: unknown;',
      `${callee}(${args});`,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
