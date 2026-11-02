const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 15,
  traces: 200,
  rule: 'no-improper-sanitization',
  key: (s) => `${tag(s.sink)}|${tag(s.value)}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      PartialReplace: 'userInput.replace(/</g, "&lt;")',
      FirstOnlyReplace: "userInput.replace('<', '&lt;')",
      FullReplaceChain:
        "userInput.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;')",
      DomPurify: 'DOMPurify.sanitize(userInput)',
      EscapeFn: 'escape(userInput)',
    }[tag(s.value)];
    const stmt = {
      InnerHTML: `element.innerHTML = ${v};`,
      OuterHTML: `element.outerHTML = ${v};`,
      ResSend: `res.send(${v});`,
    }[tag(s.sink)];
    return `import DOMPurify from 'dompurify';\nimport { escape } from 'html-escaper';\ndeclare const element: HTMLElement;\nexport function render(res: any, userInput: string) {\n  ${stmt}\n}\n`;
  },
};
