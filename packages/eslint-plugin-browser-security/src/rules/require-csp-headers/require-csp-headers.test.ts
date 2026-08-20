/**
 * @fileoverview Tests for require-csp-headers
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import tsParser from '@typescript-eslint/parser';
import { requireCspHeaders } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-csp-headers', requireCspHeaders, {
  valid: [
    // JSON responses don't need CSP
    { code: "res.send({ data: 'json' })" },
    { code: "res.json({ status: 'ok' })" },
    // Non-HTML strings
    { code: "res.send('Hello World')" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Sending HTML without CSP
    { code: "res.send('<html><body>Hello</body></html>')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.send('<!DOCTYPE html><html></html>')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.send(`<html>${content}</html>`)", errors: [{ messageId: 'violationDetected' }] },
    // Render calls need CSP
    { code: "res.render('index')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.render('template', { data })", errors: [{ messageId: 'violationDetected' }] },
  ],
});

/**
 * Regression lock — helmet sets Content-Security-Policy by default, so it IS the fix this
 * rule recommends. Reporting `res.render()` in a file that already installs helmet tells the
 * reader to do what they have done; it fired on a clean benchmark fixture that called
 * `app.use(helmet())` three lines earlier.
 *
 * Detected from the AST (import / require binding), never from printed source.
 */
ruleTester.run('lock: helmet in scope suppresses the render reminder', requireCspHeaders, {
  valid: [
    { code: "import helmet from 'helmet'; app.use(helmet()); res.render('index');" },
    { code: "import { contentSecurityPolicy } from 'helmet/index'; app.use(contentSecurityPolicy()); res.render('index');" },
    { code: "const helmet = require('helmet'); app.use(helmet()); res.render('index');" },
  ],
  invalid: [
    // An unrelated import must not count as helmet.
    {
      code: "import express from 'express'; res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Nor an unrelated require, including one whose name merely starts similarly.
    {
      code: "const helmetish = require('helmetish'); res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A non-literal require argument cannot be resolved, so it is not evidence.
    {
      code: "const mod = require(name); res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * Regression lock — a CSP that IS established silences the rule.
 *
 * The rule only ever looked for a helmet binding, and only for `res.render`.
 * So a handler that set `Content-Security-Policy` on the line above
 * `res.send(html)` was still told "HTML response without Content-Security-
 * Policy header": the rule reporting its own remediation on the file that had
 * applied it. Every valid case here reported before the fix.
 */
ruleTester.run('lock: an established CSP silences the rule', requireCspHeaders, {
  valid: [
    {
      code: `app.get('/', (req, res) => { res.setHeader('Content-Security-Policy', "default-src 'self'"); res.send('<html></html>'); });`,
    },
    // Set by app-level middleware, DECLARED AFTER the route that relies on it.
    // A rule that decides at the call site reports on statement order.
    {
      code: `app.get('/', (req, res) => res.render('index')); app.use((req, res, next) => { res.setHeader('Content-Security-Policy', "default-src 'self'"); next(); });`,
    },
    // Lowercase, as HTTP/2 requires on the wire.
    {
      code: `app.get('/', (req, res) => { res.set('content-security-policy', "default-src 'self'"); res.send('<html></html>'); });`,
    },
    // A declarative block.
    {
      code: `const init = { headers: { 'Content-Security-Policy': "default-src 'self'" } }; res.render('index');`,
    },
  ],
  invalid: [
    // The counter-control: the same handler with no policy anywhere.
    {
      code: `app.get('/', (req, res) => { res.send('<html></html>'); });`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * Regression lock — a document is a document however it is assembled.
 *
 * The rule read only `res.send` with an inline literal or template, so a page
 * out of a constant, out of a table, out of a builder, streamed through
 * `res.write`, or emitted through a computed method was invisible. Five of the
 * eight corpus fixtures were missed on this alone.
 */
ruleTester.run('lock: emission shapes', requireCspHeaders, {
  valid: [
    // A FRAGMENT is not a document. Whatever served the page set its policy.
    { code: `res.send('<p>ok</p>');` },
    { code: `res.send('ok');` },
    { code: `res.json({ ok: true });` },
    // A serialised payload.
    { code: `res.send(JSON.stringify({ ok: true }));` },
  ],
  invalid: [
    { code: `res.end('<!DOCTYPE html><html></html>');`, errors: 1 },
    { code: `res.write('<!DOCTYPE html><html><body>');`, errors: 1 },
    { code: `const EMIT = 'send'; res[EMIT]('<html></html>');`, errors: 1 },
    { code: `const PAGE = '<!DOCTYPE html><html></html>'; res.send(PAGE);`, errors: 1 },
    {
      code: `const PAGES = ['<!DOCTYPE html><html>a</html>', '<!DOCTYPE html><html>b</html>']; res.send(PAGES[1]);`,
      errors: 1,
    },
    {
      code: `function page(body) { return \`<!DOCTYPE html><html>\${body}</html>\`; } res.send(page('hi'));`,
      errors: 1,
    },
  ],
});

/**
 * Regression lock — ADVERSARIAL shapes the first corpus wave did not reach.
 *
 * A page accumulated across statements has no single knowable value, so
 * resolving the binding correctly refuses — but the question was never "what
 * is this", it is "does a document reach the browser", and one write carrying
 * a doctype settles it. And a single-page app serves its document off disk,
 * with no markup in the file at all.
 */
ruleTester.run('lock: accumulated and file-served documents', requireCspHeaders, {
  valid: [
    // A path that is not a document.
    { code: `res.sendFile('/var/www/report.pdf');` },
    // `htmlSanitizer.js` must not read as a document because it contains the
    // letters "html" — the extension is compared, not searched for.
    { code: `res.sendFile(path.join(__dirname, 'htmlSanitizer.js'));` },
    // An unknowable chunk: a rule that cannot prove a document must not
    // demand a policy for one.
    { code: `upstream.on('data', (chunk) => { res.write(chunk); });` },
    // No body at all.
    { code: `res.statusCode = 204; res.end();` },
  ],
  invalid: [
    {
      code: `let page = '<!DOCTYPE html><html>'; page += rows(); page += '</html>'; res.send(page);`,
      errors: 1,
    },
    { code: `res.sendFile(path.join(__dirname, 'public', 'index.html'));`, errors: 1 },
    { code: `res.sendFile('/var/www/index.htm');`, errors: 1 },
    // The header name in a TODO is not an established policy — it is the
    // admission that there is none.
    {
      code: `app.get('/', (req, res) => {
        // TODO: add a Content-Security-Policy before this ships.
        res.send('<!DOCTYPE html><html></html>');
      });`,
      errors: 1,
    },
  ],
});

/** Edge shapes the folding, the walk and the partition must survive. */
ruleTester.run('edge shapes', requireCspHeaders, {
  valid: [
    // Non-string and unfoldable bodies.
    { code: `res.send(42);` },
    { code: `res.send(payload);` },
    { code: `res.send(a + b);` },
    { code: `res.write(chunk);` },
    // A re-assigned binding whose writes are all unknowable.
    { code: `let p = build(); p = render(); res.send(p);` },
    // A computed method that folds to something that is not an emit method.
    { code: `const M = 'json'; res[M]({ ok: true });` },
    // A computed method that cannot be folded at all.
    { code: `res[method](html);` },
    // A non-member callee.
    { code: `send('<html></html>');` },
    // An array index that is not a number, past the end, or a hole.
    { code: `const P = ['<html></html>']; res.send(P[k]);` },
    { code: `const P = ['<html></html>']; res.send(P[5]);` },
    { code: `const P = [, '<html></html>']; res.send(P[0]);` },
    // An unresolvable table.
    { code: `res.send(unknownPages[0]);` },
    // A builder that is not declared in this file, or returns nothing static.
    { code: `res.send(externalBuilder());` },
    { code: `function build() { return compute(); } res.send(build());` },
    // A builder bound to a non-function.
    { code: `const build = 42; res.send(build());` },
    // A builder with a bare `return`.
    { code: `function build() { return; } res.send(build());` },
    // A concise-body arrow builder that returns a fragment.
    { code: `const build = () => '<p>ok</p>'; res.send(build());` },
    // sendFile with an unfoldable path, and with no argument at all.
    { code: `res.sendFile(userPath);` },
    { code: `res.sendFile();` },
    // A path with no extension.
    { code: `res.sendFile('/var/www/index');` },
    // A CSP header name in a position that is NOT a header-name position.
    { code: `const label = 'Content-Security-Policy'; res.json({ label });` },
    // A CSP set with `writeHead`, whose object key is the header name.
    {
      code: `res.writeHead(200, { 'Content-Security-Policy': "default-src 'self'" }); res.end('<html></html>');`,
    },
  ],
  invalid: [
    // A CSP name as the value of a property that is not `key` establishes
    // nothing — the document is still unprotected.
    {
      code: `const row = { header: 'Content-Security-Policy' }; res.render('x');`,
      errors: 1,
    },
    // A builder written as an arrow with a block body.
    {
      code: `const build = () => { return '<!DOCTYPE html><html></html>'; }; res.send(build());`,
      errors: 1,
    },
    // A builder with a concise body.
    {
      code: `const build = () => '<!DOCTYPE html><html></html>'; res.send(build());`,
      errors: 1,
    },
    // A computed method folded from a constant.
    { code: `const M = 'end'; res[M]('<!DOCTYPE html><html></html>');`, errors: 1 },
  ],
});

/**
 * The `<meta http-equiv>` surface, which needs a JSX-capable parser.
 *
 * A policy delivered as a meta tag is a real CSP — it simply did not arrive as
 * a response header — so it must silence the rule exactly as `setHeader` does.
 */
const jsxRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

jsxRuleTester.run('meta http-equiv establishes a CSP', requireCspHeaders, {
  valid: [
    {
      code: `const m = <meta httpEquiv="Content-Security-Policy" content="default-src 'self'" />; res.render('x');`,
      filename: 'doc.tsx',
    },
    // The hyphenated spelling.
    {
      code: `const m = <meta http-equiv="Content-Security-Policy" content="default-src 'self'" />; res.render('x');`,
      filename: 'doc.tsx',
    },
  ],
  invalid: [
    // A different http-equiv establishes nothing.
    {
      code: `const m = <meta httpEquiv="X-UA-Compatible" content="IE=edge" />; res.render('x');`,
      filename: 'doc.tsx',
      errors: 1,
    },
    // A bare attribute, and a dynamic one, are not a policy.
    {
      code: `const m = <meta httpEquiv />; res.render('x');`,
      filename: 'doc.tsx',
      errors: 1,
    },
    {
      code: `const m = <meta httpEquiv={dynamic} />; res.render('x');`,
      filename: 'doc.tsx',
      errors: 1,
    },
  ],
});

/** The folds are BOUNDED, and the bound is the same in both directions. */
ruleTester.run('bounded folding', requireCspHeaders, {
  valid: [
    // Seven hops — past the bound, so the body is unreadable.
    {
      code: `const a = '<!DOCTYPE html><html></html>'; const b = a; const c = b; const d = c; const e = d; const f = e; const g = f; res.send(g);`,
    },
    // A deep array chain.
    {
      code: `const a = ['<!DOCTYPE html><html></html>']; const b = a; const c = b; const d = c; const e = d; const f = e; res.send(f[0]);`,
    },
  ],
  invalid: [
    // Two hops — inside the bound.
    {
      code: `const a = '<!DOCTYPE html><html></html>'; const b = a; res.send(b);`,
      errors: 1,
    },
  ],
});

/** The remaining folding and header-name positions. */
ruleTester.run('folding shapes', requireCspHeaders, {
  valid: [
    // A Next.js config entry establishes the policy.
    {
      code: `const c = { headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'" }] }; res.render('index');`,
    },
    // A name declared twice cannot be resolved to one function.
    {
      code: `function page() { return '<!DOCTYPE html><html></html>'; } var page = 1; res.send(page());`,
    },
    // A binding written only by a `for…of`, which carries no write expression.
    {
      code: `let page; for (page of pages) { record(page); } res.send(page);`,
    },
    // A container that is not a foldable array.
    { code: `res.send(getPages()[0]);` },
    { code: `const T = { a: 1 }; res.send(T[0]);` },
  ],
  invalid: [
    // A `key` property naming a DIFFERENT header establishes no policy.
    {
      code: `const c = { headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }; res.render('index');`,
      errors: 1,
    },
    // A nested page table, folded twice.
    {
      code: `const T = [['<!DOCTYPE html><html></html>']]; res.send(T[0][0]);`,
      errors: 1,
    },
  ],
});

/** The nested-table fold, in both directions. */
ruleTester.run('nested table folding', requireCspHeaders, {
  valid: [
    { code: `const T = [['<!DOCTYPE html><html></html>']]; res.send(T[0][k]);` },
    { code: `const T = [['<!DOCTYPE html><html></html>']]; res.send(T[9][0]);` },
    { code: `const T = [[, '<!DOCTYPE html><html></html>']]; res.send(T[0][0]);` },
    { code: `const T = [['<p>fragment</p>']]; res.send(T[0][0]);` },
  ],
  invalid: [],
});

/** The last folding and write-reference shapes. */
ruleTester.run('remaining shapes', requireCspHeaders, {
  valid: [
    // A nested table indexed by something unreadable.
    { code: `const T = [['<!DOCTYPE html><html></html>']]; res.send(T[k][0]);` },
    // An imported name is not a local builder.
    { code: `import page from './page'; res.send(page());` },
  ],
  invalid: [
    // No initialiser: the doctype arrives by a later assignment, and the read
    // reference at the send site must be skipped rather than mistaken for one.
    {
      code: `let page; page = '<!DOCTYPE html><html></html>'; res.send(page);`,
      errors: 1,
    },
  ],
});

/** A read of the binding BEFORE the write that gives it a document. */
ruleTester.run('read references are skipped', requireCspHeaders, {
  valid: [],
  invalid: [
    {
      code: `let page; record(page); page = '<!DOCTYPE html><html></html>'; res.send(page);`,
      errors: 1,
    },
  ],
});

/**
 * An update expression is a WRITE with no expression of its own — the scope
 * manager reports `writeExpr` as null for `page++`. The loop has to step over
 * it and keep looking rather than dereference it.
 */
ruleTester.run('writes without an expression', requireCspHeaders, {
  valid: [],
  invalid: [
    {
      code: `let page; page++; page = '<!DOCTYPE html><html></html>'; res.send(page);`,
      errors: 1,
    },
  ],
});

/**
 * The whole-program CSP scan is memoised, and a computed key is not a
 * header-name position.
 *
 * The scan runs at most once per file however many documents are emitted; the
 * second emission must reuse the answer rather than re-walk the program.
 */
ruleTester.run('memoised establishment scan', requireCspHeaders, {
  valid: [
    // One scan, one answer, both emissions silenced by it.
    {
      code: `res.setHeader('Content-Security-Policy', "default-src 'self'"); res.send('<html>a</html>'); res.send('<html>b</html>');`,
    },
  ],
  invalid: [
    // Two emissions, no policy: the second reads the memo, not the AST.
    {
      code: `res.send('<html>a</html>'); res.send('<html>b</html>');`,
      errors: 2,
    },
    // A COMPUTED key spelling the header establishes nothing — the name is not
    // in a header-name position, it is the result of an expression.
    {
      code: `const CSP = 'Content-Security-Policy'; const h = { [CSP]: "default-src 'self'" }; res.render('index');`,
      errors: 1,
    },
  ],
});
