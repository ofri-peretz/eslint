/**
 * @fileoverview Tests for no-credential-metadata-logging
 *
 * The anchor is the gRPC Metadata API: a handler's `call.metadata`, or a
 * `new Metadata()` the file builds. Logging the whole object, its
 * `getMap()` / `toJSON()`, or a credential header's value (authorization,
 * cookie, …) puts the credential in the logs. The logger is `console` or a
 * receiver built from a logging library's export.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noCredentialMetadataLogging } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const handler = (body: string): string =>
  `server.addService(svc, {\n  Get(call, cb) {\n    ${body}\n  },\n});`;
const ERR = [{ messageId: 'credentialLogged' as const }];

ruleTester.run('no-credential-metadata-logging', noCredentialMetadataLogging, {
  valid: [
    {
      name: 'a non-credential header',
      code: handler(
        `console.log('request', call.metadata.get('x-request-id'));`,
      ),
    },
    {
      name: 'a non-credential key read off the map',
      code: handler(`console.log(call.metadata.getMap()['x-request-id']);`),
    },
    {
      name: 'a computed key read off the map',
      code: handler(`console.log(call.metadata.getMap()[key]);`),
    },
    {
      name: 'only whether the header is present',
      code: handler(
        `console.log(call.metadata.get('authorization').length > 0);`,
      ),
    },
    {
      name: 'the request, not the metadata',
      code: handler(`console.log(call.request);`),
    },
    {
      name: 'not a handler: metadata of an object nobody registers',
      code: `export function f(call) { console.log(call.metadata.getMap()); }`,
    },
    {
      name: 'a function that is not a logger',
      code: handler(`audit.write(call.metadata.getMap());`),
    },
    {
      name: 'a local console',
      code: handler(
        `const console = sink;\nconsole.log(call.metadata.getMap());`,
      ),
    },
    {
      name: 'a logger from a module that is not a logging library',
      code: `import log from './log';\n${handler(`log.info(call.metadata.getMap());`)}`,
    },
    {
      name: 'a method of the metadata that is not a dump',
      code: handler(`console.log(call.metadata.clone());`),
    },
    {
      name: 'a header name the file computes',
      code: handler(`console.log(call.metadata.get(name));`),
    },
    {
      name: 'a Map built by the file is not Metadata',
      code: `const md = new Map();\nconsole.log(md);`,
    },
    {
      name: 'a get with no header name',
      code: handler(`console.log(call.metadata.get());`),
    },
    {
      name: 'a const cycle ends, it does not loop',
      code: handler(
        `const a = b;\nconst b = c;\nconst c = d;\nconst d = e;\nconst e = a;\nconsole.log(a);`,
      ),
    },
    {
      name: 'a literal',
      code: handler(`console.log(1, 'done');`),
    },
  ],
  invalid: [
    {
      name: 'the whole metadata of a call',
      code: handler(`console.log('metadata', call.metadata);`),
      errors: ERR,
    },
    {
      name: 'getMap() in an object',
      code: handler(`console.info({ headers: call.metadata.getMap() });`),
      errors: ERR,
    },
    {
      name: 'toJSON() through a const',
      code: handler(`const all = call.metadata.toJSON();\nconsole.debug(all);`),
      errors: ERR,
    },
    {
      name: 'the authorization value in a template',
      code: handler(
        `console.log(\`auth=\${call.metadata.get('Authorization')[0]}\`);`,
      ),
      errors: ERR,
    },
    {
      name: 'a cookie read off the map, with JSON.stringify',
      code: handler(
        `console.warn(JSON.stringify(call.metadata.getMap().cookie));`,
      ),
      errors: ERR,
    },
    {
      name: 'a pino logger and destructured metadata',
      code: `import pino from 'pino';\nconst logger = pino();\nserver.addService(svc, { Get({ metadata }, cb) { logger.info({ md: metadata.getMap() }, 'call'); } });`,
      errors: ERR,
    },
    {
      name: 'client-side metadata the file builds',
      code: `import { Metadata } from '@grpc/grpc-js';\nconst md = new Metadata();\nmd.add('authorization', token);\nconsole.log('sending', md.toJSON());`,
      errors: ERR,
    },
    {
      name: 'a winston logger created with createLogger, an api key in an array',
      code: `const winston = require('winston');\nconst log = winston.createLogger({});\n${handler(`log.error([call.metadata.get('x-api-key'), 1]);`)}`,
      errors: ERR,
    },
    {
      name: 'spread into the log call, and a ternary',
      code: handler(`console.log(...(verbose ? [call.metadata] : []));`),
      errors: ERR,
    },
    {
      name: 'String() around a cookie value',
      code: handler(`console.log(String(call.metadata.get('cookie')));`),
      errors: ERR,
    },
    {
      name: 'the map spread into an object',
      code: handler(`console.log({ ...call.metadata.getMap() });`),
      errors: ERR,
    },
    {
      name: 'a token concatenated into a message',
      code: handler(
        `console.log('auth ' + call.metadata.get('authorization')[0]);`,
      ),
      errors: ERR,
    },
    {
      name: 'a token with a fallback',
      code: handler(
        `console.log(call.metadata.get('authorization')[0] || 'none');`,
      ),
      errors: ERR,
    },
  ],
});
