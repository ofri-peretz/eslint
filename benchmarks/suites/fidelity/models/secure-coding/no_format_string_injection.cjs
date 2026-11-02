const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 20,
  traces: 250,
  rule: 'no-format-string-injection',
  key: (s) => `${tag(s.fn)}|${tag(s.fmt)}`,
  config: () => ({}),
  code: (s) => {
    const fmt = {
      ReqBody: 'req.body.format',
      UserFormat: 'userFormat',
      Literal: '"User: %s"',
      ConstBound: 'template',
      NeutralVar: 'fmtStr',
    }[tag(s.fmt)];
    const head = {
      UtilFormat: "import util from 'util';",
      UtilFormatDestr: "import { format } from 'node:util';",
      ConsoleLog: '',
      Sprintf: "import { sprintf } from 'sprintf-js';",
    }[tag(s.fn)];
    const callee = {
      UtilFormat: 'util.format',
      UtilFormatDestr: 'format',
      ConsoleLog: 'console.log',
      Sprintf: 'sprintf',
    }[tag(s.fn)];
    return `${head}\nconst template = "User: %s, Data: %j";\nexport function h(req: any, userFormat: string, fmtStr: string) {\n  return ${callee}(${fmt}, req.body.name);\n}\n`;
  },
};
