const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee, RECEIVERS } = require('../../mongodb.cjs');

// `this.UserRepository`: PascalCase, but a property reached through `this`.
const recv = {
  ...RECEIVERS,
  ThisPascal: {
    head: "import mongoose from 'mongoose';",
    pre: 'export const conn = mongoose.connection;',
    cls: 'export class UserService {\n  constructor(private readonly UserRepository: any) {}\n',
    callee: (m) => `this.UserRepository.${m}`,
  },
};

const CALLS = {
  UpdateOne: (c) =>
    `${c('updateOne')}({ _id: id }, { password: req.body.password })`,
  UpdateMany: (c) => `${c('updateMany')}({ role: 'user' }, { verified: true })`,
  FindOneAndUpdate: (c) =>
    `${c('findOneAndUpdate')}({ _id: id }, { password: req.body.password })`,
  FindByIdAndUpdate: (c) =>
    `${c('findByIdAndUpdate')}(id, { password: 'newpassword' })`,
  Save: (c) =>
    `${c('findById')}(id).then((doc: any) => { doc.password = req.body.password; return doc.save(); })`,
  Create: (c) => `${c('create')}({ email: req.body.email })`,
  FindById: (c) => `${c('findById')}(id)`,
};

const base = {
  rule: 'no-bypass-middleware',
  domain: 56, // 8 receivers x 7 methods
  traces: 380,
  key: (s) => `${tag(s.receiver)}|${tag(s.method)}`,
  code: (s) => {
    const r = tag(s.receiver);
    const c = (m) => recv[r].callee(m);
    const body = `return ${CALLS[tag(s.method)](c)};`;
    if (recv[r] === RECEIVERS[r]) return program(r, body);
    const R = recv[r];
    return `${R.head}\n${R.pre}\n${R.cls}  async handle(req: any, res: any, id: string) {\n    ${body}\n  }\n}\n`;
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
