const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const QUERIES = {
  Find: (c) => `${c('find')}({ active: true })`,
  FindOne: (c) => `${c('findOne')}({ email: 'a@example.com' })`,
  FindById: (c) => `${c('findById')}(id)`,
  LeanOnly: (c) => `${c('find')}({ active: true }).lean()`,
  NullProjection: (c) =>
    `${c('find')}({ active: true }, null, { sort: { name: 1 } })`,
  ProjString: (c) => `${c('find')}({ active: true }, 'name email avatar')`,
  ProjObject: (c) => `${c('find')}({}, { name: 1, email: 1 })`,
  SelectChain: (c) => `${c('find')}({ active: true }).select('name email')`,
  SelectExclude: (c) =>
    `${c('findById')}(id).select('-password -internalNotes')`,
  FindByIdProj: (c) => `${c('findById')}(id, 'name email')`,
  CountDocuments: (c) => `${c('countDocuments')}({ active: true })`,
};

const base = {
  rule: 'require-projection',
  domain: 77, // 7 receivers x 11 queries
  traces: 520,
  key: (s) => `${tag(s.receiver)}|${tag(s.query)}`,
  code: (s) => {
    const r = tag(s.receiver);
    return program(r, `return ${QUERIES[tag(s.query)]((m) => callee(r, m))};`);
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
