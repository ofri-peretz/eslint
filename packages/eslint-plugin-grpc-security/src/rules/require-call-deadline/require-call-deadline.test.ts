/**
 * @fileoverview Tests for require-call-deadline
 *
 * A call on a gRPC client (built with `new Client(target, <credentials>)`)
 * with no `deadline` in its options can wait forever. Only calls whose every
 * argument the file can read are judged: an argument that could be an
 * options object the file cannot see keeps the rule silent.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { requireCallDeadline } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const CLIENT = `const client = new pkg.Orders(target, grpc.credentials.createSsl());`;
const ERR = [{ messageId: 'missingDeadline' as const }];

ruleTester.run('require-call-deadline', requireCallDeadline, {
  valid: [
    {
      name: 'a unary call with a deadline',
      code: `${CLIENT}\nclient.Get({ id }, { deadline: Date.now() + 5000 }, cb);`,
    },
    {
      name: 'metadata, then options with a deadline',
      code: `${CLIENT}\nconst md = new grpc.Metadata();\nclient.Get({ id }, md, { deadline }, cb);`,
    },
    {
      name: 'options from a const with a deadline',
      code: `${CLIENT}\nconst OPTS = { deadline: soon() };\nclient.Watch(req, OPTS);`,
    },
    {
      name: 'an options object the file cannot see',
      code: `${CLIENT}\nclient.Get(req, opts, cb);`,
    },
    {
      name: 'an options object with a spread it cannot read',
      code: `${CLIENT}\nclient.Get(req, { ...base }, cb);`,
    },
    {
      name: 'one unreadable argument and no callback: request or options',
      code: `${CLIENT}\nclient.Chat(opts);`,
    },
    {
      name: 'client lifecycle methods are not calls',
      code: `${CLIENT}\nclient.close();\nclient.waitForReady(deadline, cb);\nclient.getChannel();`,
    },
    {
      name: 'a client built with credentials the file cannot see',
      code: `const client = new pkg.Orders(target, creds);\nclient.Get({ id }, cb);`,
    },
    {
      name: 'a reassigned client is not followed',
      code: `let client = new pkg.Orders(target, grpc.credentials.createSsl());\nclient = other;\nclient.Get({ id }, cb);`,
    },
    {
      name: 'a client passed on, not called',
      code: `${CLIENT}\nuse(client);`,
    },
    {
      name: 'a computed method',
      code: `${CLIENT}\nclient[name]({ id }, cb);`,
    },
    {
      name: 'an unreadable second argument may be the options',
      code: `${CLIENT}\nclient.Get(request, cb);`,
    },
    {
      name: 'a client that is never bound to a name',
      code: `use(new pkg.Orders(target, grpc.credentials.createSsl()));`,
    },
    {
      name: 'a destructured client is not followed',
      code: `const { Get } = new pkg.Orders(target, grpc.credentials.createSsl());\nGet({ id }, () => {});`,
    },
  ],
  invalid: [
    {
      name: 'a unary call with only a callback',
      code: `${CLIENT}\nclient.Get({ id: 1 }, (err, res) => {});`,
      errors: ERR,
    },
    {
      name: 'an unreadable request, then an inline callback',
      code: `${CLIENT}\nclient.Get(request, (err, res) => {});`,
      errors: ERR,
    },
    {
      name: 'options without a deadline',
      code: `${CLIENT}\nclient.Get(request, new grpc.Metadata(), { waitForReady: true }, function () {});`,
      errors: ERR,
    },
    {
      name: 'a streaming call with no arguments',
      code: `${CLIENT}\nconst stream = client.Chat();`,
      errors: ERR,
    },
    {
      name: 'an insecure client, through a const credential',
      code: `const creds = grpc.credentials.createInsecure();\nconst client = new pkg.Orders(target, creds);\nclient.Get({ id }, () => {});`,
      errors: ERR,
    },
    {
      name: 'composed channel credentials',
      code: `const client = new Client(target, credentials.combineChannelCredentials(ssl, call));\nclient.Get({ id }, () => {});`,
      errors: ERR,
    },
    {
      name: 'a literal request and an array',
      code: `${CLIENT}\nclient.Get('id-1', [1], () => {});`,
      errors: ERR,
    },
  ],
});
