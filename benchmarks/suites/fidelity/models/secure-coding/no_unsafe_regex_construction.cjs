const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 20,
  traces: 300,
  rule: 'no-unsafe-regex-construction',
  key: (s) =>
    `${tag(s.call)}|${tag(s.pattern)}|allowLiterals=${s.allowLiterals}`,
  config: (s) => ({ allowLiterals: s.allowLiterals }),
  code: (s) => {
    const ctor = tag(s.call) === 'NewRegExp' ? 'new RegExp' : 'RegExp';
    const arg = {
      ReqQuery: 'req.query.search',
      ReqHop: 'q',
      TemplateReq: '`^${req.query.prefix}`',
      Param: 'term',
      TemplateParam: '`^${term}`',
      Escaped: 'escapeRegExp(req.query.search)',
      EscapedTemplate: '`^${escapeRegExp(term)}`',
      Literal: "'^[a-z]+$'",
      ConstBound: 'FIXED',
    }[tag(s.pattern)];
    return `import { escapeRegExp } from './escape';\nconst FIXED = '^[a-z]+$';\nexport function search(req: any, term: string) {\n  const q = req.query.q;\n  return ${ctor}(${arg}, 'i');\n}\n`;
  },
};
