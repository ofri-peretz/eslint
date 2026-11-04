const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const QUERIES = {
  Plain: (c) => `${c('findById')}(id)`,
  SelectPlus: (c) => `${c('findById')}(id).select('+password')`,
  SelectInclude: (c) => `${c('findById')}(id).select('password name')`,
  SelectPlusSsn: (c) => `${c('findById')}(id).select('+ssn')`,
  ProjObjInclude: (c) => `${c('findById')}(id, { password: 1, name: 1 })`,
  SelectExclude: (c) => `${c('findById')}(id).select('-password')`,
  SelectSafe: (c) => `${c('findById')}(id).select('name email avatar')`,
  SelectSimilarName: (c) =>
    `${c('findById')}(id).select('name passwordUpdatedAt')`,
  ProjString: (c) => `${c('findById')}(id, 'name email')`,
  ProjObjExclude: (c) => `${c('findById')}(id, { password: 0 })`,
};

const OPTS = {
  Default: undefined,
  CustomSsn: { sensitiveFields: ['ssn'] },
  NoRequireVisible: { requireVisibleSensitiveField: false },
};

const base = {
  rule: 'no-select-sensitive-fields',
  domain: 240, // 4 receivers x 10 queries x 2 visibilities x 3 option sets
  traces: 1500,
  key: (s) =>
    `${tag(s.receiver)}|${tag(s.query)}|${tag(s.visibility)}|${tag(s.opt)}`,
  config: (s) => OPTS[tag(s.opt)],
  code: (s) => {
    const r = tag(s.receiver);
    // `new Schema()` is Mongo evidence by itself, so the NoImport file shows
    // its field through an interface instead.
    const visible = tag(s.visibility) === 'SchemaVisible';
    const pre =
      r === 'NoImport'
        ? `export interface UserDoc { name: string; ${visible ? 'password: string; ' : ''}}`
        : `export const userSchema = new Schema({ name: String, email: String${visible ? ', password: String' : ''} });`;
    const imports =
      r === 'NoImport' ? '' : "import { Schema } from 'mongoose';";
    return program(
      r,
      `const user = await ${QUERIES[tag(s.query)]((m) => callee(r, m))};\nres.json(user);`,
      { imports, pre },
    );
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
