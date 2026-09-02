/**
 * Comprehensive tests for no-missing-security-headers rule
 * Security: CWE-693 - Detects missing security headers in HTTP responses
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingSecurityHeaders } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-missing-security-headers', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - security headers set', noMissingSecurityHeaders, {
      valid: [
        // All required headers
        {
          name: 'the security headers are set',
          code: `
            res.setHeader('Content-Security-Policy', 'default-src self');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          `,
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Security Headers', () => {
    ruleTester.run('invalid - missing headers', noMissingSecurityHeaders, {
      valid: [],
      invalid: [
        {
          name: 'a response that sets headers but none of the security ones',
          code: 'res.setHeader("X-Custom", "value");',
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
        {
          code: 'res.setHeader("Content-Security-Policy", "default-src self");',
          errors: [{ messageId: 'missingSecurityHeader' }], // Missing other headers
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMissingSecurityHeaders, {
      valid: [
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
      ],
    });

    ruleTester.run('options - requiredHeaders', noMissingSecurityHeaders, {
      valid: [
        {
          code: 'res.setHeader("Custom-Header", "value");',
          options: [{ requiredHeaders: ['Custom-Header'] }],
        },
      ],
      invalid: [
        {
          code: 'res.setHeader("Other-Header", "value");',
          options: [{ requiredHeaders: ['Custom-Header'] }],
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
      ],
    });
  });
});


/**
 * Regression lock — CSP / X-Frame-Options / X-Content-Type-Options protect a RENDERED
 * DOCUMENT. A scope whose only headers are transport or caching concerns has no document to
 * frame or inject into, so demanding them there is noise: the rule fired on a plain
 * `res.setHeader('Set-Cookie', …)` helper that renders nothing.
 *
 * Deliberately narrow. An EARLIER attempt required proof of a `res.send`/`render` call in
 * scope and broke 9 tests — a RuleTester snippet sets a header without sending anything
 * because the snippet is truncated, not because the handler serves no document.
 */
ruleTester.run('lock: transport-only headers are not a document response', noMissingSecurityHeaders, {
  valid: [
    { code: "function setSession(res, id) { res.setHeader('Set-Cookie', 'sid=' + id); }" },
    { code: "function noStore(res) { res.setHeader('Cache-Control', 'no-store'); }" },
    { code: "function redirect(res, to) { res.setHeader('Location', to); }" },
  ],
  invalid: [
    // A security header in the mix means this IS a document response — the others are missing.
    { code: "function h(res) { res.setHeader('X-Frame-Options', 'DENY'); }", errors: 1 },
  ],
});

/**
 * Regression lock — `set` is a method name, not evidence of an HTTP response.
 *
 * `set` sat in the trigger list beside `setHeader` and `header`, so the rule
 * reported `featureFlags.set('newCheckout', true)` as "Missing security
 * headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options"
 * at CVSS 7.5. It now needs the first argument to name a header it knows.
 */
ruleTester.run('lock: .set() must name a header', noMissingSecurityHeaders, {
  valid: [
    // The reported false positive, and its neighbours.
    { code: "featureFlags.set('newCheckout', true);" },
    { code: "const cache = new Map(); cache.set('user:42', profile);" },
    { code: "formData.set('email', 'a@b.test');" },
    { code: "store.set('theme', 'dark');" },
    // A dynamic key proves nothing either way, so the rule abstains.
    { code: 'res.set(headerName, headerValue);' },
    // A `set` on a document header alongside the rest of the trio is fine.
    {
      code: `
        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('X-Frame-Options', 'DENY');
        res.set('X-Content-Type-Options', 'nosniff');
      `,
    },
    // Express's own header alias, same trio.
    {
      code: `
        res.header('Content-Security-Policy', "default-src 'self'");
        res.header('X-Frame-Options', 'DENY');
        res.header('X-Content-Type-Options', 'nosniff');
      `,
    },
  ],
  invalid: [
    // `res.set` with a real header name still triggers the rule.
    { code: "res.set('Content-Type', 'text/html');", errors: 1 },
    { code: "res.set('X-Frame-Options', 'DENY');", errors: 1 },
    { code: "res.header('Content-Type', 'text/html');", errors: 1 },
    // A header the closed list has never heard of is still recognised when the
    // project configured it via requiredHeaders.
    {
      code: "res.set('X-Tenant-Policy', 'strict');",
      options: [{ requiredHeaders: ['X-Tenant-Policy', 'X-Frame-Options'] }],
      errors: 1,
    },
  ],
});

/**
 * Regression lock — header names are CASE-INSENSITIVE.
 *
 * RFC 9110 §5.1 makes them case-insensitive and HTTP/2 requires them lowercase
 * on the wire, which is the spelling every fetch-based runtime normalises to.
 * The rule compared them case-SENSITIVELY, so a handler that set all three
 * correctly in lowercase reported "Missing security headers:
 * Content-Security-Policy, X-Frame-Options, X-Content-Type-Options" at CVSS
 * 7.5 — the rule flagging its own remediation.
 */
ruleTester.run('lock: header names compare case-insensitively', noMissingSecurityHeaders, {
  valid: [
    {
      code: `
        res.setHeader('content-security-policy', "default-src 'self'");
        res.setHeader('x-frame-options', 'DENY');
        res.setHeader('x-content-type-options', 'nosniff');
      `,
    },
    {
      code: `
        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('x-frame-options', 'DENY');
        res.set('X-CONTENT-TYPE-OPTIONS', 'nosniff');
      `,
    },
  ],
  invalid: [
    // The counter-control: lowercase and genuinely incomplete.
    { code: "res.setHeader('x-frame-options', 'DENY');", errors: 1 },
  ],
});

/**
 * Regression lock — an unknown is not an absence.
 *
 * The scope walk descended only through Program / function bodies /
 * BlockStatement / ExpressionStatement, so a header set inside an `if` or a
 * `for` was invisible and the rule demanded headers that were three lines
 * below it. Every valid case here reported before the fix.
 */
ruleTester.run('lock: headers set in a branch or a loop are still set', noMissingSecurityHeaders, {
  valid: [
    {
      code: `
        app.use((req, res, next) => {
          res.setHeader('Content-Security-Policy', "default-src 'self'");
          if (process.env.NODE_ENV === 'production') {
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          }
          next();
        });
      `,
    },
    // A name the rule cannot read makes the whole scope unreadable.
    {
      code: `
        app.use((req, res, next) => {
          for (const [name, value] of Object.entries(HEADERS)) {
            res.setHeader(name, value);
          }
          next();
        });
      `,
    },
    { code: 'function apply(res, name, value) { res.setHeader(name, value); }' },
  ],
  invalid: [
    // A constant name IS readable, and resolves through scope rather than
    // through its spelling.
    {
      code: `const FRAME_HEADER = 'X-Frame-Options'; function h(res) { res.setHeader(FRAME_HEADER, 'DENY'); }`,
      errors: 1,
    },
    // So is an entry reached by index out of a const table.
    {
      code: `const H = [['X-Frame-Options', 'DENY']]; function h(res) { res.setHeader(H[0][0], H[0][1]); }`,
      errors: 1,
    },
    // A thin wrapper is readable from its call sites.
    {
      code: `
        function setSecurityHeader(res, name, value) { res.setHeader(name, value); }
        setSecurityHeader(res, 'X-Frame-Options', 'DENY');
      `,
      errors: 1,
    },
  ],
});

/**
 * Regression lock — the response says what it is serving.
 *
 * CSP, X-Frame-Options and X-Content-Type-Options all govern a rendered
 * document. On `application/json` there is nothing for them to do, and the
 * rule reported every JSON endpoint that declared its own Content-Type.
 */
ruleTester.run('lock: a non-document media type ends the question', noMissingSecurityHeaders, {
  valid: [
    { code: `res.setHeader('Content-Type', 'application/json; charset=utf-8');` },
    { code: `res.setHeader('Content-Type', 'text/plain');` },
  ],
  invalid: [
    { code: `res.setHeader('Content-Type', 'text/html; charset=utf-8');`, errors: 1 },
  ],
});

/**
 * Regression lock — header blocks written as DATA.
 *
 * A `ResponseInit`, Node's `writeHead` and a Next.js config entry all ship the
 * identical wire result with no `setHeader` call to trigger on, so the rule
 * saw none of them. A `headers` object on an outgoing REQUEST is not one of
 * them, and a spread makes a block unenumerable.
 */
ruleTester.run('lock: declarative header blocks', noMissingSecurityHeaders, {
  valid: [
    // An outgoing request, not a response.
    { code: `fetch('/api', { headers: { 'Content-Type': 'application/json' } });` },
    // A spread hides keys, so the block cannot be enumerated.
    {
      code: `new Response(html, { headers: { ...SECURE_DEFAULTS, 'X-Request-Id': id } });`,
    },
    // A complete declarative block.
    {
      code: `new Response(html, { headers: { 'Content-Security-Policy': "default-src 'self'", 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' } });`,
    },
  ],
  invalid: [
    {
      code: `new Response(html, { headers: { 'Content-Type': 'text/html', 'X-Frame-Options': 'DENY' } });`,
      errors: 1,
    },
    {
      code: `res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });`,
      errors: 1,
    },
    {
      code: `module.exports = { async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]; } };`,
      errors: 1,
    },
  ],
});

/** Edge shapes the folding, the walk and the declarative reader must survive. */
ruleTester.run('edge shapes', noMissingSecurityHeaders, {
  valid: [
    // Header names that cannot be read make the scope unreadable.
    { code: `res.setHeader(42, 'x');` },
    { code: `res.setHeader(name.toUpperCase(), 'x');` },
    { code: `res.setHeader(HEADERS[k], 'x');` },
    { code: `const H = { a: 1 }; res.setHeader(H[0], 'x');` },
    { code: `res.setHeader(unknownTable[0], 'x');` },
    { code: `const H = ['x']; res.setHeader(H[5], 'x');` },
    { code: `const H = [, 'x']; res.setHeader(H[0], 'x');` },
    { code: `const H = [42]; res.setHeader(H[0], 'x');` },
    // A parameter whose call sites are not all readable.
    {
      code: `function apply(res, name) { res.setHeader(name, 'x'); } apply(res, dynamic);`,
    },
    // A parameter of a function that has no findable call sites.
    {
      code: `export function apply(res, name) { res.setHeader(name, 'x'); }`,
    },
    // A call site that does not pass the argument at all.
    {
      code: `function apply(res, name) { res.setHeader(name, 'x'); } apply(res);`,
    },
    // A parameter of an anonymous callback — no binding to find call sites by.
    {
      code: `items.forEach(function (name) { res.setHeader(name, 'x'); });`,
    },
    // The function reference used as a value, not called.
    {
      code: `function apply(res, name) { res.setHeader(name, 'x'); } register(apply);`,
    },
    // A non-document media type ends the question, however it is written.
    { code: `res.setHeader('Content-Type', 'application/json');` },
    { code: `const CT = 'application/json'; res.setHeader('Content-Type', CT);` },
    // A `headers` property that is not a response header block.
    { code: `fetch(url, { headers: { 'X-Frame-Options': 'DENY' } });` },
    { code: `const o = { headers: { 'X-Frame-Options': 'DENY' } };` },
    // A computed `headers` key.
    { code: `const o = { [h]: { 'X-Frame-Options': 'DENY' } };` },
    // A `headers` value that is neither object nor array.
    { code: `new Response(b, { headers: h });` },
    // An empty declarative block.
    { code: `new Response(b, { headers: {} });` },
    { code: `new Response(b, { headers: [] });` },
    // Array entries that are not `{ key, value }` objects.
    { code: `const c = { headers: [null, 'x', { notKey: 'X-Frame-Options' }] };` },
    // A `key` whose value is not a string.
    { code: `const c = { headers: [{ key: 42, value: 'x' }] };` },
    // A computed key inside a declarative block.
    { code: `new Response(b, { headers: { [k]: 'v', 'X-Frame-Options': 'DENY' } });` },
    // A response factory that is not one we know.
    { code: `Response.clone(b, { headers: { 'X-Frame-Options': 'DENY' } });` },
    { code: `Whatever.json(b, { headers: { 'X-Frame-Options': 'DENY' } });` },
    { code: `make(b, { headers: { 'X-Frame-Options': 'DENY' } });` },
    { code: `new Whatever(b, { headers: { 'X-Frame-Options': 'DENY' } });` },
    { code: `const init = { headers: { 'X-Frame-Options': 'DENY' } };` },
    { code: `a.b.json(x, { headers: { 'X-Frame-Options': 'DENY' } });` },
    // A factory chosen at RUNTIME names nothing to match — unlike
    // `NextResponse['next']`, there is no key here to read.
    { name: 'a factory chosen at RUNTIME names nothing to match — unlike', code: `NextResponse[make](b, { headers: { 'X-Frame-Options': 'DENY' } });` },
    // writeHead with no header object, and a computed / wrong method name.
    { code: `res.writeHead(204);` },
    { code: `res[m](200, { 'X-Frame-Options': 'DENY' });` },
    // A declarative block of transport-only headers.
    { code: `new Response(b, { headers: { 'Set-Cookie': 'a=1' } });` },
    // A declarative block declaring a non-document media type.
    {
      code: `new Response(b, { headers: { 'Content-Type': 'application/json', 'X-Frame-Options': 'DENY' } });`,
    },
    // A shorthand key inside a declarative block.
    { code: `new Response(b, { headers: { etag } });` },
  ],
  invalid: [
    // A `ResponseInit` proven by its `status` sibling rather than by a callee.
    {
      code: `respond({ status: 200, headers: { 'X-Frame-Options': 'DENY' } });`,
      errors: 1,
    },
    {
      code: `respond({ statusText: 'OK', headers: { 'X-Frame-Options': 'DENY' } });`,
      errors: 1,
    },
    // Every response factory we recognise, in either notation.
    { code: `Response.json(b, { headers: { 'X-Frame-Options': 'DENY' } });`, errors: 1 },
    { code: `NextResponse.next({ headers: { 'X-Frame-Options': 'DENY' } });`, errors: 1 },
    { name: 'every response factory we recognise, in either notation', code: `NextResponse['next']({ headers: { 'X-Frame-Options': 'DENY' } });`, errors: 1 },
    // A nested table folded twice.
    {
      code: `const H = [['X-Frame-Options', 'DENY']]; res.setHeader(H[0][0], H[0][1]);`,
      errors: 1,
    },
    // A document media type declared in a block.
    {
      code: `new Response(b, { headers: { 'Content-Type': 'image/svg+xml' } });`,
      errors: 1,
    },
    // Content-Type named with no value: the media type is unreadable, so it
    // settles nothing and the scope is still a document response.
    { code: `res.setHeader('Content-Type');`, errors: 1 },
  ],
});

/** The folds are BOUNDED. */
ruleTester.run('bounded folding', noMissingSecurityHeaders, {
  valid: [
    // Past the bound the name is unreadable, so the scope is unjudgeable.
    {
      code: `const a = 'X-Frame-Options'; const b = a; const c = b; const d = c; const e = d; res.setHeader(e, 'DENY');`,
    },
    {
      code: `const a = [['X-Frame-Options']]; const b = a; const c = b; const d = c; res.setHeader(c[0][0], 'DENY');`,
    },
  ],
  invalid: [
    // Inside the bound the name resolves and the missing ones are named.
    {
      code: `const a = 'X-Frame-Options'; const b = a; res.setHeader(b, 'DENY');`,
      errors: 1,
    },
  ],
});

/** The last folding, parameter and declarative-block shapes. */
ruleTester.run('remaining shapes', noMissingSecurityHeaders, {
  valid: [
    // A nested table indexed by something unreadable.
    { code: `const H = [['X-Frame-Options']]; res.setHeader(H[k][0], 'DENY');` },
    // A DESTRUCTURED parameter: the binding is not one of the function's
    // params, so its call sites cannot be matched by position.
    {
      code: `function apply(res, { name }) { res.setHeader(name, 'x'); } apply(res, { name: 'X-Frame-Options' });`,
    },
    // A function expression with no binding to find call sites by.
    {
      code: `handlers.apply = function (res, name) { res.setHeader(name, 'x'); };`,
    },
    // A `headers` key that is neither an identifier nor a string.
    { code: `const o = { 42: { 'X-Frame-Options': 'DENY' } };` },
    // Array entries that are holes, non-objects, computed, or keyed oddly.
    { code: `const c = { headers: [, 'x', { notKey: 'X-Frame-Options' }] };` },
    { code: `const c = { headers: [{ [k]: 'X-Frame-Options' }] };` },
    { code: `const c = { headers: [{ 42: 'X-Frame-Options' }] };` },
    // A ResponseInit whose object key is neither a string nor an identifier.
    { code: `new Response(b, { headers: { 42: 'v' } });` },
    // A `headers` property whose owner is not an object literal at all.
    { code: `const headers = { 'X-Frame-Options': 'DENY' };` },
    // A content-type entry that is a spread, computed, or oddly keyed.
    { code: `res.writeHead(200, { [k]: 'v', 'X-Frame-Options': 'DENY' });` },
    { code: `res.writeHead(200, { ...base, 'X-Frame-Options': 'DENY' });` },
    // writeHead with an empty block.
    { code: `res.writeHead(200, {});` },
  ],
  invalid: [
    // A writeHead block keyed by a non-string literal alongside a real header.
    { code: `res.writeHead(200, { 42: 'v', 'X-Frame-Options': 'DENY' });`, errors: 1 },
  ],
});

/** The last two shapes: a const-bound helper, and a spread content-type block. */
ruleTester.run('final shapes', noMissingSecurityHeaders, {
  valid: [
    // A spread or a computed key makes a writeHead block unenumerable, so it
    // is not judged at all rather than judged on the keys that happen to show.
    { code: `res.writeHead(200, { ...base });` },
    { code: `res.writeHead(200, { [k]: 1, 'Content-Type': 'text/html' });` },
  ],
  invalid: [
    // A thin wrapper bound to a `const`, rather than declared with `function`.
    // Its call sites are still findable through the declarator.
    {
      code: `const apply = function (res, name) { res.setHeader(name, 'x'); }; apply(res, 'X-Frame-Options');`,
      errors: 1,
    },
    // A writeHead block whose content-type entry sits after a NON-STRING key.
    // A computed key would make the block unenumerable (see the valid case
    // above); a numeric one is merely skipped, and the media type is still
    // read in the same pass that collects the names.
    {
      code: `res.writeHead(200, { 42: 1, 'Content-Type': 'text/html' });`,
      errors: 1,
    },
  ],
});

/** The media type declared inside a Next.js `{ key, value }` header array. */
ruleTester.run('declarative array media type', noMissingSecurityHeaders, {
  valid: [
    // A non-document media type ends the question here exactly as it does for
    // a call or a ResponseInit.
    {
      code: `const c = { headers: [{ key: 'Content-Type', value: 'application/json' }] };`,
    },
  ],
  invalid: [
    // A document media type keeps it open.
    {
      code: `const c = { headers: [{ key: 'Content-Type', value: 'text/html' }] };`,
      errors: 1,
    },
    // No `value` sibling at all: the media type is unreadable, so it settles
    // nothing.
    { code: `const c = { headers: [{ key: 'Content-Type' }] };`, errors: 1 },
    // A `value` sibling that is spread in, computed, or written as a string
    // key is likewise not a readable media type.
    { code: `const c = { headers: [{ key: 'Content-Type', ...rest }] };`, errors: 1 },
    { code: `const c = { headers: [{ key: 'Content-Type', [k]: 'text/html' }] };`, errors: 1 },
    { code: `const c = { headers: [{ key: 'Content-Type', 'value': 'application/json' }] };`, errors: 1 },
  ],
});
