const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const QUERIES = {
  Find: (c) => `${c('find')}({ active: true })`,
  FindOne: (c) => `${c('findOne')}({ email: 'a@example.com' })`,
  FindById: (c) => `${c('findById')}(id)`,
  FindExec: (c) => `${c('find')}({ active: true }).exec()`,
  FindWhereChain: (c) => `${c('find')}().where('age').gte(18).limit(10)`,
  FindLean: (c) => `${c('find')}({ active: true }).lean()`,
  SelectThenLean: (c) => `${c('find')}({ active: true }).select('name').lean()`,
  FindByIdLean: (c) => `${c('findById')}(id).lean()`,
  LeanThenExec: (c) =>
    `${c('findOne')}({ email: 'a@example.com' }).lean().exec()`,
  Aggregate: (c) =>
    `${c('aggregate')}([{ $group: { _id: null, count: { $sum: 1 } } }])`,
  CountDocuments: (c) => `${c('countDocuments')}({ active: true })`,
};

const base = {
  rule: 'require-lean-queries',
  domain: 88, // 8 receivers x 11 queries
  traces: 600,
  key: (s) => `${tag(s.receiver)}|${tag(s.query)}`,
  code: (s) => {
    const r = tag(s.receiver);
    return program(
      r,
      `const result = await ${QUERIES[tag(s.query)]((m) => callee(r, m))};\nres.json(result);`,
    );
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
