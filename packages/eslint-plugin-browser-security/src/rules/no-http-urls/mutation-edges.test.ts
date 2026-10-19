/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHttpUrls } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-http-urls (mutation edges)', noHttpUrls, {
  valid: [
    {
      name: 'an unparseable URL falls back to a substring match against ANY allowed host',
      code: "const api = 'http://localhost:PORT/api';",
    },
    {
      name: 'a full http URL compared with === is a guard, not a destination',
      code: "if (url === 'http://legacy.acme-corp.io') redirect();",
    },
    {
      name: 'a full http URL passed to startsWith is a guard, not a destination',
      code: "if (url.startsWith('http://legacy.acme-corp.io/')) redirect();",
    },
    {
      name: 'an empty authority is a bare scheme even when its query names a host',
      code: "const u = 'http://?next=http://acme-corp.io';",
    },
    {
      name: 'a template whose authority is fully interpolated has no host to judge',
      code: 'const u = `http://${host}:${port}`;',
    },
    {
      name: 'a template with an empty authority before a path has no host to judge',
      code: 'const u = `http:///${p}`;',
    },
  ],
  invalid: [
    {
      name: 'with no allowed hosts and no ports the plain message is used',
      code: "const api = 'http://api.acme-corp.io';",
      options: [{ allowedHosts: [] }],
      errors: [{ messageId: 'insecureHttp' }],
    },
    {
      name: 'allowed ports alone are enough to use the with-exception message',
      code: "const api = 'http://api.acme-corp.io';",
      options: [{ allowedHosts: [], allowedPorts: [3000] }],
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a template with a written-down host still reports',
      code: 'const u = `http://api.${env}.acme-corp.io/x`;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});
