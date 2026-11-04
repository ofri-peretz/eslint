const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

// (receiver) -> body
const USES = {
  WhereTemplateReq: (c) =>
    `return ${c('find')}({ $where: \`this.name === '\${req.body.name}'\` });`,
  WhereFunction: (c) =>
    `const userAge = 18;\nreturn ${c('find')}({ $where: function () { return this.age > userAge; } });`,
  WhereLiteral: (c) => `return ${c('find')}({ $where: 'this.x > this.y' });`,
  WhereQuotedKey: (c) =>
    `return ${c('find')}({ '$where': 'this.x > this.y' });`,
  WhereInOr: (c) =>
    `return ${c('find')}({ $or: [{ $where: 'this.x > this.y' }, { active: true }] });`,
  MethodOnModel: (c) => `return ${c('$where')}('this.x > this.y');`,
  MethodOnQuery: (c) =>
    `return ${c('find')}({ active: true }).$where(function () { return this.age > 18; });`,
  ExprCompare: (c) => `return ${c('find')}({ $expr: { $gt: ['$age', 18] } });`,
  EqValue: (c) => `return ${c('find')}({ name: { $eq: req.body.name } });`,
  AggregateAddFields: (c) =>
    `return ${c('aggregate')}([{ $addFields: { isActive: { $gt: ['$lastLogin', 0] } } }, { $match: { isActive: true } }]);`,
  PlainWhereKey: (c) => `return ${c('find')}({ where: { id: 1 } });`,
};

const base = {
  rule: 'no-unsafe-where',
  domain: 66, // 6 receivers x 11 uses
  traces: 450,
  key: (s) => `${tag(s.receiver)}|${tag(s.use)}`,
  code: (s) => {
    const r = tag(s.receiver);
    return program(
      r,
      USES[tag(s.use)]((m) => callee(r, m)),
    );
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
