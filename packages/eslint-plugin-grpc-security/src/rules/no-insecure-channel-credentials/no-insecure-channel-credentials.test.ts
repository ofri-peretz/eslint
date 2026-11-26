/**
 * @fileoverview Tests for no-insecure-channel-credentials
 *
 * An insecure channel is reported only when the same file proves a secret
 * travels over it: a call on a client built with `credentials.createInsecure()`
 * carries Metadata holding an authorization, cookie or API-key header, or a
 * `Bearer` value. The target's host name is never read.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noInsecureChannelCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const ERR = [{ messageId: 'insecureChannel' as const }];
const CLIENT = `const client = new pkg.Accounts(target, grpc.credentials.createInsecure());`;
const MD = (add: string): string =>
  `const md = new grpc.Metadata();\n${add}\nclient.GetAccount({ id }, md, (err, res) => {});`;

ruleTester.run(
  'no-insecure-channel-credentials',
  noInsecureChannelCredentials,
  {
    valid: [
      {
        name: 'an insecure channel that carries no credential',
        code: `${CLIENT}\nclient.GetAccount({ id }, (err, res) => {});`,
      },
      {
        name: 'metadata with a non-credential header',
        code: `${CLIENT}\n${MD(`md.add('x-request-id', rid);`)}`,
      },
      {
        name: 'a credential header on a TLS channel',
        code: `const client = new pkg.Accounts(target, grpc.credentials.createSsl());\n${MD(`md.add('authorization', token);`)}`,
      },
      {
        name: 'credential metadata on a different client',
        code: `${CLIENT}\nconst other = new pkg.Accounts(target, secure);\nconst md = new grpc.Metadata();\nmd.add('authorization', token);\nother.GetAccount({ id }, md, cb);`,
      },
      {
        name: 'credential metadata built but never sent',
        code: `${CLIENT}\nconst md = new grpc.Metadata();\nmd.set('authorization', token);\nclient.GetAccount({ id }, cb);`,
      },
      {
        name: 'a header name the file computes',
        code: `${CLIENT}\n${MD(`md.add(name, token);`)}`,
      },
      {
        name: 'a metadata object the file did not build',
        code: `${CLIENT}\nmd.add('authorization', token);\nclient.GetAccount({ id }, md, cb);`,
      },
      {
        name: 'a client built with a credential the file cannot see',
        code: `const client = new pkg.Accounts(target, creds);\n${MD(`md.add('authorization', token);`)}`,
      },
      {
        name: 'an insecure server credential is not a channel',
        code: `const client = new pkg.Accounts(target, grpc.ServerCredentials.createInsecure());\n${MD(`md.add('authorization', token);`)}`,
      },
      {
        name: 'a value that only mentions bearer later on',
        code: `${CLIENT}\n${MD("md.add('x-note', 'not a Bearer');")}`,
      },
      {
        name: 'a client that is reassigned is not followed',
        code: `let client = new pkg.Accounts(target, grpc.credentials.createInsecure());\nclient = secureClient;\n${MD(`md.add('authorization', token);`)}`,
      },
      {
        name: 'an insecure client that is never bound to a name',
        code: `use(new pkg.Accounts(target, grpc.credentials.createInsecure()));`,
      },
      {
        name: 'a destructured client is not followed',
        code: `const { stub } = new pkg.Accounts(target, grpc.credentials.createInsecure());\nstub.Get(md);`,
      },
      {
        name: 'a header set with no arguments',
        code: `${CLIENT}\n${MD('md.add();')}`,
      },
      {
        name: 'a new Client with one argument',
        code: `const client = new pkg.Accounts(target);`,
      },
      {
        name: 'the client passed to a function, not called',
        code: `${CLIENT}\nconst md = new grpc.Metadata();\nmd.add('authorization', t);\nuse(client, md);`,
      },
      {
        name: 'metadata read, not written',
        code: `${CLIENT}\nconst md = new grpc.Metadata();\nlog(md.get('authorization'));\nclient.Get({}, md, cb);`,
      },
      {
        name: 'a new expression that is not Metadata',
        code: `${CLIENT}\nconst md = new Map();\nmd.set('authorization', t);\nclient.Get({}, md, cb);`,
      },
    ],
    invalid: [
      {
        name: 'an authorization header sent over an insecure channel',
        code: `${CLIENT}\n${MD(`md.add('authorization', \`Bearer \${token}\`);`)}`,
        errors: ERR,
      },
      {
        name: 'a cookie, set with a mixed-case name',
        code: `${CLIENT}\n${MD(`md.set('Cookie', session);`)}`,
        errors: ERR,
      },
      {
        name: 'a Bearer value under a custom header',
        code: `${CLIENT}\n${MD("md.add('x-token', `Bearer ${t}`);")}`,
        errors: ERR,
      },
      {
        name: 'credentials through a const and an imported namespace',
        code: `import { credentials, Metadata } from '@grpc/grpc-js';
const insecure = credentials.createInsecure();
const client = new Client(target, insecure);
const md = new Metadata();
md.add('x-api-key', key);
client.makeUnaryRequest('/svc/Get', ser, de, req, md, {}, cb);`,
        errors: ERR,
      },
      {
        name: 'streaming call with metadata as the first argument',
        code: `${CLIENT}\nconst md = new grpc.Metadata();\nmd.add('proxy-authorization', basic);\nconst stream = client.Watch(md);`,
        errors: ERR,
      },
    ],
  },
);
