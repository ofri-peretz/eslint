const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 30,
  traces: 300,
  rule: 'no-template-injection',
  key: (s) => `${tag(s.engine)}|${tag(s.tpl)}`,
  config: () => ({}),
  code: (s) => {
    const t = {
      ReqQuery: 'req.query.template',
      ConcatReq: "'<h1>Hello ' + req.body.name + '</h1>'",
      UserNamedTpl: '`<div>${userLayout}</div>`',
      Static: "'<h1>Hello {{name}}</h1>'",
      ConstLookup: 'TEMPLATES[req.params.page]',
    }[tag(s.tpl)];
    const [head, call] = {
      HbsCompile: [
        "const Handlebars = require('handlebars');",
        `Handlebars.compile(${t})`,
      ],
      HbsDestr: ["const { compile } = require('handlebars');", `compile(${t})`],
      EjsRender: [
        "import ejs from 'ejs';",
        `ejs.render(${t}, { user: req.user })`,
      ],
      PugCompile: ["import pug from 'pug';", `pug.compile(${t})`],
      LodashTemplate: ["const _ = require('lodash');", `_.template(${t})`],
      LocalCompile: [
        'function compile(src: string) { return src.length; }',
        `compile(${t})`,
      ],
    }[tag(s.engine)];
    return `${head}\nconst TEMPLATES: Record<string, string> = { home: '<h1>Home</h1>', about: '<h1>About</h1>' };\nexport function handler(req: any, res: any, userLayout: string) {\n  const out = ${call};\n  res.send(String(out));\n}\n`;
  },
};
