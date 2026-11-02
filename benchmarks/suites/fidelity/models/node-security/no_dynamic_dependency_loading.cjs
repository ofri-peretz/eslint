const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-dynamic-dependency-loading',
  domain: 28, // 2 loaders x 7 args x 2 positions
  traces: 400,
  key: (s) => `${tag(s.loader)}|${tag(s.arg)}|${tag(s.pos)}`,
  code: (s) => {
    const [pre, a] = {
      Literal: ['', "'./plugins/auth'"],
      StaticTemplate: ['', '`./plugins/auth`'],
      ReqVar: ['const moduleName = req.query.module;', 'moduleName'],
      TemplateExpr: [
        'const feature = req.query.feature;',
        '`./${feature}/index.js`',
      ],
      Concat: ['const feature = req.query.feature;', "'./features/' + feature"],
      TernaryVar: [
        "const libName = process.env.USE_ALT_LIB ? 'alt-lib' : 'main-lib';",
        'libName',
      ],
      ConfigMember: [
        "const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));",
        'config.handlerPath',
      ],
    }[tag(s.arg)];
    const call =
      tag(s.loader) === 'Require'
        ? `const loaded = require(${a});`
        : `const loaded = import(${a});`;
    const head = "import fs from 'node:fs';\ndeclare const req: any;";
    return tag(s.pos) === 'TopLevel'
      ? `${head}\n${pre}\n${call}\nexport { loaded };\n`
      : `${head}\nexport function load() {\n  ${pre}\n  ${call}\n  return loaded;\n}\n`;
  },
  model: (s) => s.verdict,
};
