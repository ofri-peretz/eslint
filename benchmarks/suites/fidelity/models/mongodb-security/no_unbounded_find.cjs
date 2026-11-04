const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const QUERIES = {
  FindFilter: (c) => `${c('find')}({ active: true })`,
  FindEmpty: (c) => `${c('find')}({})`,
  FindNoArgs: (c) => `${c('find')}()`,
  SkipOnly: (c) => `${c('find')}({ active: true }).skip(20)`,
  ToArray: (c) => `${c('find')}({ active: true }).toArray()`,
  LimitChain: (c) => `${c('find')}({ active: true }).limit(100)`,
  SortLimitChain: (c) =>
    `${c('find')}({ active: true }).sort({ createdAt: -1 }).limit(10)`,
  // The driver takes options second, Mongoose third.
  OptsLimit: (c, native) =>
    native
      ? `${c('find')}({}, { limit: 100 })`
      : `${c('find')}({}, null, { limit: 100 })`,
  Predicate: (c) => `${c('find')}((u: any) => u.active)`,
  FindOne: (c) => `${c('findOne')}({ email: 'a@example.com' })`,
};

const base = {
  rule: 'no-unbounded-find',
  domain: 80, // 8 receivers x 10 queries
  traces: 560,
  key: (s) => `${tag(s.receiver)}|${tag(s.query)}`,
  code: (s) => {
    const r = tag(s.receiver);
    return program(
      r,
      `return ${QUERIES[tag(s.query)]((m) => callee(r, m), r === 'Native')};`,
    );
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
