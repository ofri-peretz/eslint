const { tag } = require('../../lib.cjs');

const DEFAULT_SANITIZERS = [
  'DOMPurify.sanitize',
  'sanitize',
  'sanitizeHtml',
  'xss',
  'purify',
  'escapeHtml',
  'escapeHTML',
  'escape',
];

// The runner reads `filename` right after calling `code`, so `code` picks it.
let filename = 'src/app.ts';

module.exports = {
  domain: 660,
  traces: 7000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-innerhtml',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.sink)}|${tag(s.value)}|allowLit=${s.allowLit}|${tag(s.trusted)}|${tag(s.ctx)}`,
  config: (s) => ({
    allowLiteralStrings: s.allowLit,
    ...(tag(s.trusted) === 'WithCustom'
      ? { trustedSanitizers: [...DEFAULT_SANITIZERS, 'myClean'] }
      : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: true } : {}),
  }),
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const v = {
      Lit: "'<p>Static content</p>'",
      TplStatic: '`<p>Static content</p>`',
      TplExpr: '`<div>${userInput}</div>`',
      Concat: "'<p>' + userInput + '</p>'",
      Ident: 'userInput',
      UnknownCall: 'getUserContent()',
      DomPurify: 'DOMPurify.sanitize(userInput)',
      SanitizeFn: 'sanitize(userInput)',
      AwaitSanitize: 'await sanitize(userInput)',
      CustomSan: 'myClean(userInput)',
      ConstLitVar: 'html',
    }[tag(s.value)];
    const stmt = {
      InnerHTML: `el.innerHTML = ${v};`,
      OuterHTML: `el.outerHTML = ${v};`,
      ComputedInner: `el['innerHTML'] = ${v};`,
      InnerPlusEq: `el.innerHTML += ${v};`,
      TextContent: `el.textContent = ${v};`,
    }[tag(s.sink)];
    return [
      "import DOMPurify from 'dompurify';",
      "import { sanitize, myClean, getUserContent } from './lib';",
      'export async function render(el: HTMLElement, userInput: string) {',
      "  const html = '<p>Static content</p>';",
      `  ${stmt}`,
      '  return html;',
      '}',
    ].join('\n');
  },
  model: (s) => s.verdict,
};
