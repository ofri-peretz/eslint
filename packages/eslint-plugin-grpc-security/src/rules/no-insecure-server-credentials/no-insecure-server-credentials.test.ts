/**
 * @fileoverview Tests for no-insecure-server-credentials
 *
 * An insecure server is reported only where the bind address proves it is
 * exposed: a wildcard host (`0.0.0.0`, `[::]`) or a bare port. Loopback and
 * unix sockets are network semantics, not guesses; a host from configuration
 * is not something the file proves, so it stays silent.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noInsecureServerCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const INSECURE = 'grpc.ServerCredentials.createInsecure()';
const bind = (addr: string, creds = INSECURE): string =>
  `server.bindAsync(${addr}, ${creds}, () => server.start());`;
const ERR = [{ messageId: 'insecureServer' as const }];

const lab = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../../benchmarks/corpus/CWE-319/safe/grpc-lab-bind-loopback.js',
  ),
  'utf8',
);

ruleTester.run('no-insecure-server-credentials', noInsecureServerCredentials, {
  valid: [
    {
      name: 'lab helper: insecure, bound to a 127.0.0.1 default parameter',
      // @found ofri-peretz/security-research:protocol-ctf/lib/grpc.mjs
      code: lab,
    },
    { name: 'loopback IPv4', code: bind(`'127.0.0.1:50051'`) },
    { name: 'anywhere in 127.0.0.0/8', code: bind('`127.8.0.1:${PORT}`') },
    { name: 'loopback IPv6', code: bind(`'[::1]:50051'`) },
    { name: 'a unix socket', code: bind(`'unix:///run/svc.sock'`) },
    {
      name: 'a host from the environment: the file does not prove exposure',
      code: bind('`${process.env.HOST}:50051`'),
    },
    { name: 'an address from configuration', code: bind('config.address') },
    {
      name: 'a named host is not judged by its name',
      code: bind(`'api.internal:50051'`),
    },
    {
      name: 'a wildcard bind with TLS credentials',
      code: bind(
        `'0.0.0.0:50051'`,
        'grpc.ServerCredentials.createSsl(ca, pairs)',
      ),
    },
    {
      name: 'credentials the file cannot see',
      code: bind(`'0.0.0.0:50051'`, 'creds'),
    },
    {
      name: 'a bindAsync with no arguments',
      code: `server.bindAsync();`,
    },
    {
      name: 'an insecure call of another class',
      code: bind(`'0.0.0.0:50051'`, 'grpc.credentials.createInsecure()'),
    },
    {
      name: 'a different method on the server',
      code: `server.listen('0.0.0.0:50051', ${INSECURE});`,
    },
    {
      name: 'a reassigned address is not followed',
      code: `let a = '0.0.0.0:1';\na = cfg();\n${bind('a')}`,
    },
    {
      name: 'an unclosed IPv6 bracket in the static part',
      code: bind('`[${host}]:50051`'),
    },
    {
      name: 'credentials from a call the rule cannot name',
      code: bind(`'0.0.0.0:50051'`, 'getCreds().createInsecure()'),
    },
    {
      name: 'a const cycle in the address ends, it does not loop',
      code: `const a = b;\nconst b = a;\n${bind('a')}`,
    },
    { name: 'an address that is not a string', code: bind('null') },
    {
      name: 'an address built with something other than +',
      code: bind('a - b'),
    },
    {
      name: 'an unknown host concatenated with a port',
      code: bind(`host + ':50051'`),
    },
  ],
  invalid: [
    { name: 'all IPv4 interfaces', code: bind(`'0.0.0.0:50051'`), errors: ERR },
    { name: 'all IPv6 interfaces', code: bind(`'[::]:50051'`), errors: ERR },
    { name: 'a bare port', code: bind('`:${PORT}`'), errors: ERR },
    { name: 'only digits', code: bind(`'50051'`), errors: ERR },
    {
      name: 'wildcard host from a const, port from the environment',
      code: `const HOST = '0.0.0.0';\n${bind('`${HOST}:${process.env.PORT}`')}`,
      errors: ERR,
    },
    {
      name: 'credentials through a const and a destructured import, sync bind',
      code: `import { ServerCredentials } from '@grpc/grpc-js';\nconst creds = ServerCredentials.createInsecure();\nserver.bind('0.0.0.0:50051', creds);`,
      errors: ERR,
    },
    {
      name: 'concatenated address',
      code: bind(`'0.0.0.0:' + PORT`),
      errors: ERR,
    },
    {
      name: 'a template whose every part is fixed',
      code: bind("`${'0.0.0.0'}:${50051}`"),
      errors: ERR,
    },
  ],
});
