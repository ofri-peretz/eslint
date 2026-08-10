import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noIdorResourceAccess } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-idor-resource-access', () => {
  ruleTester.run('no-idor-resource-access', noIdorResourceAccess, {
    valid: [
      // THE safe pattern — the query is scoped to the principal
      {
        code: `
          app.get('/invoices/:id', (req, res) =>
            Invoice.findOne({ _id: req.params.id, owner: req.user.id }).then((doc) => res.json(doc)),
          );
        `,
      },
      // Ownership checked on the loaded document
      {
        code: `
          app.get('/invoices/:id', async function (req, res) {
            const doc = await Invoice.findById(req.params.id);
            if (doc.ownerId !== req.session.userId) return res.sendStatus(403);
            res.json(doc);
          });
        `,
      },
      // Key is not client-supplied
      {
        code: `app.get('/me', (req, res) => User.findById(currentUserId).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(req.headers.host).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(cache.params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(a.b.params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(req[container].id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById(getReq().params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => User.findById({ id: getReq().params.id }).then(send));`,
      },
      // Not a single-resource lookup
      {
        code: `app.get('/x/:id', (req, res) => Invoice.find({ tag: req.params.tag }).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => lookup(req.params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => Invoice[method](req.params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => Invoice['findById'](req.params.id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById(req['params'].id).then(send));`,
      },
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById().then(send));`,
      },
      // Outside any request handler — a script, a seed, a job
      { code: `Invoice.findById(req.params.id);` },
      {
        code: `function seed(input) { return Invoice.findById(input.params.id); }`,
      },
      // The lookup vocabulary is configurable
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById(req.params.id).then(send));`,
        options: [{ lookupMethods: ['fetchById'] }],
      },
    ],
    invalid: [
      // The textbook IDOR
      {
        code: `app.get('/invoices/:id', (req, res) => Invoice.findById(req.params.id).then((doc) => res.json(doc)));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Query-string key
      {
        code: `app.get('/invoices', (req, res) => Invoice.findByPk(req.query.invoiceId).then(send));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Filter object built from the request
      {
        code: `app.post('/invoices/find', (req, res) => Invoice.findOne({ _id: req.body.id }).then(send));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Prisma-style nested where clause
      {
        code: `app.get('/x/:id', (req, res) => prisma.invoice.findUnique({ where: { id: req.params.id } }).then(send));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Destructive operations count too
      {
        code: `
          app.delete('/invoices/:id', async function (req, res) {
            await Invoice.findByIdAndDelete(req.params.id);
            res.sendStatus(204);
          });
        `,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      {
        code: `
          function handler(req, res) {
            return Invoice.deleteOne({ _id: req.params.id });
          }
        `,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // A computed principal read is not recognised as one (documented FN)
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById(req.params.id).then(() => res['user']));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Koa-style request nesting
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById(ctx.req.params.id).then(send));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // A principal-shaped read on something that is not the request
      {
        code: `app.get('/x/:id', (req, res) => Invoice.findById(req.params.id).then((doc) => res.json(payload.user)));`,
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
      // Configured lookup vocabulary
      {
        code: `app.get('/x/:id', (req, res) => Invoice.fetchById(req.params.id).then(send));`,
        options: [{ lookupMethods: ['fetchById'] }],
        errors: [{ messageId: 'unscopedResourceLookup' as const }],
      },
    ],
  });
});
