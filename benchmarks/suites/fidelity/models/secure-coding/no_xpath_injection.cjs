const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 60,
  traces: 700,
  rule: 'no-xpath-injection',
  key: (s) => `${tag(s.build)}|${tag(s.wrap)}|${tag(s.sink)}|${tag(s.value)}`,
  config: () => ({}),
  code: (s) => {
    const raw = tag(s.value) === 'ReqQuery' ? 'req.query.name' : 'username';
    const v = tag(s.wrap) === 'Escaped' ? `escapeXPath(${raw})` : raw;
    const expr = {
      Template: "`/users/user[@name='${" + v + "}']`",
      Concat: `"/users/user[@name='" + ${v} + "']"`,
      Const: '"/users/user[@name=\'admin\']"',
    }[tag(s.build)];
    const use = {
      AssignOnly: 'return expr;',
      DomEvaluate: 'return xmlDoc.evaluate(expr, xmlDoc);',
      XpathSelect: 'return xpath.select(expr, xmlDoc);',
      XpathSelectCast: 'return xpath.select(expr as string, xmlDoc);',
      XpathSelectTernary: "return xpath.select(ok ? expr : '//none', xmlDoc);",
    }[tag(s.sink)];
    const head = tag(s.sink).startsWith('XpathSelect')
      ? "import xpath from 'xpath';\n"
      : '';
    return `${head}declare const xmlDoc: any;\ndeclare const ok: boolean;\ndeclare function escapeXPath(v: string): string;\nexport function find(req: any, username: string) {\n  const expr = ${expr};\n  ${use}\n}\n`;
  },
};
