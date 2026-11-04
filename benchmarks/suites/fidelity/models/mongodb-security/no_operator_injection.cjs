const { tag, withTestFile } = require('../../lib.cjs');

// Handler -> [params, request object expression]
const HANDLERS = {
  Express: ['req: any, res: any', 'req'],
  Fastify: ['request: any, reply: any', 'request'],
  Koa: ['ctx: any', 'ctx.request'],
};

// (request expr) -> filter object
const OPERANDS = {
  NeBody: (r) => `{ password: { $ne: ${r}.body.value } }`,
  GtQueryOr: (r) => `{ score: { $gt: ${r}.query.min || 0 } }`,
  NinArray: (r) => `{ role: { $nin: [${r}.query.role] } }`,
  GtJsonParse: (r) => `{ score: { $gt: JSON.parse(${r}.query.min) } }`,
  LteParams: (r) => `{ age: { $lte: ${r}.params.max } }`,
  EqBody: (r) => `{ email: { $eq: ${r}.body.email } }`,
  GtNumber: (r) => `{ score: { $gt: Number(${r}.query.min) } }`,
  GteParseInt: (r) => `{ score: { $gte: parseInt(${r}.query.min, 10) } }`,
  LtUnary: (r) => `{ price: { $lt: +${r}.query.max } }`,
  NeStringCast: (r) => `{ password: { $ne: String(${r}.body.value) } }`,
  NeLiteral: () => "{ status: { $ne: 'deleted' } }",
  NotRequest: () => '{ count: { $gt: prereq.bodyCount } }',
};

const PLACEMENTS = {
  InModelFind: [
    "import mongoose from 'mongoose';\nconst User = mongoose.model('User');",
    (f) => `return User.find(${f});`,
  ],
  InNativeFindOne: [
    "import { MongoClient } from 'mongodb';\nconst db = new MongoClient(process.env.MONGO_URL as string).db();",
    (f) => `return db.collection('users').findOne(${f});`,
  ],
  Standalone: [
    "import mongoose from 'mongoose';\nexport const conn = mongoose.connection;",
    (f) => `const filter = ${f};\n  return filter;`,
  ],
  NoImport: [
    "const User = getModel('User');",
    (f) => `return User.find(${f});`,
  ],
};

const base = {
  rule: 'no-operator-injection',
  domain: 144, // 3 handlers x 4 placements x 12 operands
  traces: 900,
  key: (s) => `${tag(s.handler)}|${tag(s.placement)}|${tag(s.operand)}`,
  code: (s) => {
    const [params, r] = HANDLERS[tag(s.handler)];
    const [head, body] = PLACEMENTS[tag(s.placement)];
    const f = OPERANDS[tag(s.operand)](r);
    return `${head}\nconst prereq = { bodyCount: 3 };\nexport async function handle(${params}) {\n  ${body(f)}\n}\n`;
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
