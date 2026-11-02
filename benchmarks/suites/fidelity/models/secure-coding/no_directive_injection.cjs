const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 15,
  traces: 200,
  rule: 'no-directive-injection',
  filename: 'src/app.tsx',
  key: (s) => `${tag(s.sink)}|${tag(s.value)}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      UserInputVar: 'userInput',
      ReqBody: 'req.body.html',
      Const: "'<b>hello</b>'",
      Sanitized: 'DOMPurify.sanitize(userInput)',
      NeutralVar: 'label',
    }[tag(s.value)];
    const stmt = {
      InnerHTML: `element.innerHTML = ${v};\n  return null;`,
      OuterHTML: `element.outerHTML = ${v};\n  return null;`,
      DangerouslySet: `return <div dangerouslySetInnerHTML={{ __html: ${v} }} />;`,
    }[tag(s.sink)];
    return `import DOMPurify from 'dompurify';\ndeclare const element: HTMLElement;\nexport function View(req: any, userInput: string, label: string) {\n  ${stmt}\n}\n`;
  },
};
