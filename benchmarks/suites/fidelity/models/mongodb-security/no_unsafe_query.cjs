const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const FILTERS = {
  BodyValue: '{ email: req.body.email }',
  QueryValue: '{ username: req.query.user }',
  ParamsValue: '{ _id: req.params.id }',
  OrBranch: '{ $or: [{ email: req.body.email }, { active: true }] }',
  SpreadBody: '{ ...req.body }',
  EqWrapped: '{ email: { $eq: req.body.email } }',
  StringCast: '{ username: String(req.query.user) }',
  TemplateCoerced: '{ slug: `${prefix}-${req.body.name}` }',
  Concatenated: "{ name: 'user:' + req.body.name }",
  ObjectIdWrapped: '{ _id: new ObjectId(req.params.id) }',
  Literal: "{ email: 'admin@example.com' }",
};

const METHOD = {
  Find: 'find',
  FindOne: 'findOne',
  UpdateOne: 'updateOne',
  CustomDefault: 'customFind',
  CustomOpted: 'customFind',
};

const base = {
  rule: 'no-unsafe-query',
  domain: 440, // 8 receivers x 5 calls x 11 filters
  traces: 2600,
  key: (s) => `${tag(s.receiver)}|${tag(s.call)}|${tag(s.shape)}`,
  config: (s) =>
    tag(s.call) === 'CustomOpted'
      ? { additionalMethods: ['customFind'] }
      : undefined,
  code: (s) => {
    const r = tag(s.receiver);
    const c = tag(s.call);
    const f = FILTERS[tag(s.shape)];
    const args = c === 'UpdateOne' ? `${f}, { $set: { active: true } }` : f;
    return program(r, `return ${callee(r, METHOD[c])}(${args});`, {
      pre: "const prefix = 'u';",
    });
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
