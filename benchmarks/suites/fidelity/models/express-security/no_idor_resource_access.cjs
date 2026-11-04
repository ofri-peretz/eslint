const { tag } = require('../../lib.cjs');

const METHOD = {
  FindById: 'findById',
  FindByPk: 'findByPk',
  FindOne: 'findOne',
  FindUnique: 'findUnique',
  FindFirst: 'findFirst',
  FindByIdAndUpdate: 'findByIdAndUpdate',
  FindByIdAndDelete: 'findByIdAndDelete',
  DeleteOne: 'deleteOne',
  UpdateOne: 'updateOne',
  Find: 'find',
  FetchById: 'fetchById',
};
const KEY = {
  ParamsId: 'req.params.id',
  ParamsBracket: "req.params['id']",
  QueryId: 'req.query.invoiceId',
  BodyId: 'req.body.id',
  NestedFilter: '{ _id: req.params.id }',
  PrismaWhere: '{ where: { id: req.params.id } }',
  ConstKey: 'currentInvoiceId',
  CopiedVar: 'id',
};
// Principal read placed in the handler body (or none).
const PRINCIPAL = {
  NoPrincipal: [],
  ReqUser: ['if (!req.user) return res.sendStatus(401);'],
  ReqSession: ['if (!req.session.userId) return res.sendStatus(401);'],
  ReqAuth: ['if (!req.auth) return res.sendStatus(401);'],
  ResLocalsUser: ['if (!res.locals.user) return res.sendStatus(401);'],
};

module.exports = {
  rule: 'no-idor-resource-access',
  // Methods 11 + custom option x 2; Keys 8; Principals 5; Handlers 5 x 2.
  domain: 13 + 8 + 5 + 10,
  traces: 1500,
  key: (s) =>
    ['focus', 'method', 'key', 'principal', 'handler', 'custom']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.custom ? { lookupMethods: ['findById', 'fetchById'] } : undefined,
  code: (s) => {
    const k = tag(s.key);
    const body = [
      ...(k === 'CopiedVar' ? ['const { id } = req.params;'] : []),
      ...PRINCIPAL[tag(s.principal)],
      `const doc = await Invoice.${METHOD[tag(s.method)]}(${KEY[k]});`,
      'res.json(doc);',
    ].map((l) => `  ${l}`);
    const HANDLER = {
      Arrow: () => [
        "app.get('/invoices/:id', async (req, res) => {",
        ...body,
        '});',
      ],
      FunctionExpr: () => [
        "app.delete('/invoices/:id', async function (req, res) {",
        ...body,
        '});',
      ],
      RouterGet: () => [
        'const router = express.Router();',
        "router.get('/invoices/:id', async (req, res) => {",
        ...body,
        '});',
        'app.use(router);',
      ],
      RouteChain: () => [
        "app.route('/invoices/:id').get(async (req, res) => {",
        ...body,
        '});',
      ],
      NamedHandler: () => [
        'async function getInvoice(req, res) {',
        ...body,
        '}',
        "app.get('/invoices/:id', getInvoice);",
      ],
    };
    return [
      "import express from 'express';",
      "import { Invoice, currentInvoiceId } from './models';",
      'const app = express();',
      ...HANDLER[tag(s.handler)](),
      '',
    ].join('\n');
  },
};
