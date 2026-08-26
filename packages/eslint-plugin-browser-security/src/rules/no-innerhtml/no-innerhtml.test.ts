/**
 * Tests for no-innerhtml rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInnerhtml } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-innerhtml', noInnerhtml, {
  valid: [
    // --- `write`/`writeln` are DOM sinks only on a document ----------------
    // The method name alone is one of the most overloaded in JavaScript. 23 of
    // this rule's 73 corpus findings were Node streams — mostly Shopify/cli
    // printing progress to stdout, reported as XSS.
    { name: 'writing to stdout is not the DOM', code: 'process.stdout.write(`Preview URL: ${previewUrl}`)' },
    { code: 'process.stderr.write(`${message}\n`)' },
    { code: 'stdout.write(`Bundling ${extension.localIdentifier}...`)' },
    { code: 'options.stdout.write(`done ${name}`)' },
    { code: 'socket.write(payload)' },
    { code: 'res.write(chunk)' },
    { code: 'post.write(postData)' },
    { code: 'result.write(item, offset, length)' },
    // A receiver we cannot name at all — a call result, or a computed index —
    // is not a document, so it confers no sink.
    { code: 'getStream().write(data)' },
    { code: 'streams[0].write(data)' },
    // Owned by no-websocket-innerhtml. The generic rule must stay silent here
    // or the same range carries two findings in `recommended` — which is what
    // it did before the ownership gate, measured on the shipped tarball.
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => { element.innerHTML = event.data; };
      `,
    },
    // Same value, no identifiable source: this one IS ours, and stays reported
    // by the invalid case below. The two tests are complements.
    // Literal string assignment (allowed by default)
    {
      code: `element.innerHTML = '<div>Hello</div>';`,
    },
    // Template literal without expressions
    {
      code: 'element.innerHTML = `<div>Hello</div>`;',
    },
    // Using textContent (safe)
    {
      code: `element.textContent = userInput;`,
    },
    // Sanitized with DOMPurify
    {
      code: `element.innerHTML = DOMPurify.sanitize(userInput);`,
    },
    // Sanitized with custom sanitizer
    {
      code: `element.innerHTML = sanitize(userInput);`,
    },
    // Test file with allowInTests
    {
      code: `element.innerHTML = userInput;`,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // Not innerHTML
    {
      code: `element.className = userInput;`,
    },

    // --- Compiled constant templates ---------------------------------------
    // Corpus: okta/okta-signin-widget
    // src/v2/view-builder/views/captcha/CaptchaView.js:294 — reported as
    // "function call result" purely because the payload was a CallExpression.
    // The template text is a string literal in that same file and the call
    // passes it nothing, so no dynamic data exists anywhere in the expression.
    {
      code: `
        const template = hbs('<div class="captcha-footer"><span class="footer-text">hCaptcha</span></div>');
        footerContainer[0].insertAdjacentHTML('beforeend', template());
      `,
    },
    // Same shape, template literal with no interpolation.
    {
      code: [
        'const template = _.template(`<div class="row"></div>`);',
        'element.innerHTML = template();',
      ].join('\n'),
    },
    // Compiled and invoked in one expression.
    {
      code: `element.innerHTML = hbs('<p>static</p>')();`,
    },
  ],
  invalid: [
    // A document receiver is the real sink, in each spelling.
    {
      name: 'document.write of user input',
      code: 'document.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'document.writeln(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'window.document.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'iframe.contentDocument.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'el.ownerDocument.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // A local named `doc` is the conventional binding for a document.
    {
      code: 'doc.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // insertAdjacentHTML needs no receiver gate — nothing outside the DOM is
    // called that — so it still reports on any object.
    {
      code: "el.insertAdjacentHTML('beforeend', userInput)",
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },

    // Variable assignment
    {
      code: `element.innerHTML = userInput;`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Template literal with expression
    {
      code: 'element.innerHTML = `<div>${userInput}</div>`;',
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // outerHTML
    {
      code: `element.outerHTML = content;`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Function call result
    {
      code: `element.innerHTML = getData();`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Literal strings NOT allowed
    {
      code: `element.innerHTML = '<div>Hello</div>';`,
      options: [{ allowLiteralStrings: false }],
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Unknown sanitizer
    {
      code: `element.innerHTML = unknownSanitize(userInput);`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },

    // --- The constant-template narrowing must not become an FN -------------
    // Data baked in at construction: the template is not constant.
    {
      code: `
        const template = hbs(userTemplate);
        element.innerHTML = template();
      `,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // Interpolation at construction.
    {
      code: [
        'const template = hbs(`<div>${userInput}</div>`);',
        'element.innerHTML = template();',
      ].join('\n'),
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // Nothing to be constant about.
    {
      code: `
        const template = hbs();
        element.innerHTML = template();
      `,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // Data flowing in at the call site.
    {
      code: `
        const template = hbs('<div>{{name}}</div>');
        element.innerHTML = template(user);
      `,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // The binding holds something that is not a compile call at all.
    {
      code: `
        const render = () => buildMarkup();
        element.innerHTML = render();
      `,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // A method call names no binding we can resolve.
    {
      code: `element.innerHTML = renderer.render();`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // Compiled inline from a non-constant argument.
    {
      code: `element.innerHTML = hbs(userTemplate)();`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // `allowLiteralStrings: false` means "report constant HTML too", and a
    // compiled constant template rides the same switch as a literal.
    {
      code: `
        const template = hbs('<p>static</p>');
        element.innerHTML = template();
      `,
      options: [{ allowLiteralStrings: false }],
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
  ],
});

/**
 * REGRESSION LOCK — every shape found by the head-to-head corpus.
 *
 * `benchmarks/rule-corpus/browser-security__no-innerhtml/` scores this rule
 * against Mozilla's no-unsanitized, @microsoft/sdl and sonarjs on the same 44
 * files. Run it with:
 *
 *   npx tsx benchmarks/suites/ilb-rule-duel/run.mjs browser-security/no-innerhtml
 *
 * Every case below was a MEASURED defect, in the order it was found. The four
 * marked ADVERSARIAL came from a second wave written deliberately against the
 * already-tuned rule — the first wave reached 100% and that number meant
 * nothing until the rule had been attacked by fixtures it had not been fitted to.
 */
ruleTester.run('no-innerhtml-corpus-locks', noInnerhtml, {
  valid: [
    // Folded through a const binding — was a false positive.
    'const EMPTY_STATE = \'<p class="muted">Nothing yet</p>\'; el.innerHTML = EMPTY_STATE;',
    'const cls = \'badge\'; el.innerHTML = `<span class="${cls}">New</span>`;',
    // Entity-escaped inside a concatenation — the commonest hand-rolled defence.
    'import escapeHtml from "escape-html"; el.innerHTML = "<b>" + escapeHtml(user.name) + "</b>";',
    // An alias to an imported sanitiser is still sanitised.
    'import DOMPurify from "dompurify"; const purify = DOMPurify.sanitize; el.innerHTML = purify(user.bio);',
    // ADVERSARIAL: a `let` whose every write is a literal.
    'let markup = \'<p>one</p>\'; markup = \'<p>two</p>\'; el.innerHTML = markup;',
    // ADVERSARIAL: clearing a node, the most common innerHTML idiom of all.
    'document.getElementById("list").innerHTML = "";',
  ],
  invalid: [
    // Computed access — missed by this rule AND by every competitor measured.
    {
      code: 'const target = document.getElementById("out"); target["innerHTML"] = payload;',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // createContextualFragment parses HTML exactly as innerHTML does.
    {
      code: 'const frag = document.createRange().createContextualFragment(userMarkup); host.append(frag);',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // ADVERSARIAL: a LOCAL function wearing a trusted sanitiser's name. This is
    // the evasion a name-keyed allowlist invites, and it silenced the rule
    // completely until the callee had to resolve to something imported.
    {
      code: 'const escapeHtml = (s) => s; el.innerHTML = escapeHtml(user.bio);',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // ADVERSARIAL: the sink name reached through a const.
    {
      code: 'const PROP = "innerHTML"; document.getElementById("out")[PROP] = payload;',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // ADVERSARIAL: written without ever forming a member assignment.
    {
      code: 'Object.assign(document.getElementById("out"), { innerHTML: payload });',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      // Object.assign with the sink as a STRING-literal key.
      code: 'Object.assign(el, { "innerHTML": payload });',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // ADVERSARIAL: a `let` reassigned from the network. The mirror of the valid
    // `let` case above — the two differ only in WHAT the writes are.
    {
      code: 'let markup = "<p>loading</p>"; markup = await fetch("/api/html").then((r) => r.text()); el.innerHTML = markup;',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // The trustedSanitizers option, exercised in its overridden state.
    {
      code: 'import DOMPurify from "dompurify"; el.innerHTML = DOMPurify.sanitize(dirty);',
      options: [{ trustedSanitizers: ['myOwnSanitizer'] }],
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
  ],
});

/**
 * Edge paths of the corpus fixes.
 *
 * Each of these covers a defensive branch added while closing a measured
 * defect. They are deliberately in the rule's own suite rather than the corpus:
 * the corpus tests the VULNERABILITY, these test the implementation's edges.
 */
ruleTester.run('no-innerhtml-edge-paths', noInnerhtml, {
  valid: [
    // Sanitiser reached through a nested object — callee.object is not a bare
    // Identifier, so the qualified-name branch falls back to the property name.
    {
      code: 'el.innerHTML = lib.dom.sanitize(dirty);',
      options: [{ trustedSanitizers: ['sanitize'] }],
    },
    // A computed key that is not statically known: nothing to resolve, so the
    // rule cannot claim this is the innerHTML sink.
    'el[keyFromServer] = value;',
    // A computed key bound to a NON-string const: resolvable, but not a sink name.
    'const IDX = 0; el[IDX] = value;',
    // A numeric computed key: a Literal whose value is not a string.
    'el[0] = value;',
    // A key that is neither an Identifier nor a Literal.
    'Object.assign(el, { [`k${suffix}`]: incoming });',
    // Object.assign with a string-literal key that is not a sink.
    'Object.assign(el, { "className": incoming });',
    // Object.assign with a computed key — unnameable, so not claimed.
    'Object.assign(el, { [dynamicKey]: incoming });',
    // Computed METHOD name that is not statically known.
    'document[methodFromConfig](value);',
    // Object.assign whose second argument is not an object literal.
    'Object.assign(el, propsFromServer);',
    // Object.assign carrying a spread rather than a plain property.
    'Object.assign(el, { ...defaults });',
    // Object.assign to a property that is not a sink.
    'Object.assign(el, { className: incoming });',
    // A private field is a non-computed property that is NOT an Identifier, so
    // the rule cannot name it and must not report. Not the DOM sink despite the
    // spelling.
    'class Box { #innerHTML; set(v) { this.#innerHTML = v; } }',
    // An alias whose NAME is not itself in the sanitiser list — the only way to
    // reach the alias-resolution branch, since the default list happens to
    // contain `purify`.
    'import DOMPurify from "dompurify"; const clean = DOMPurify.sanitize; el.innerHTML = clean(dirty);',
  ],
  invalid: [
    // A `function` DECLARATION wearing a sanitiser name — the other half of the
    // fake-sanitiser evasion; the corpus fixture uses an arrow.
    {
      code: 'function escapeHtml(s) { return s; } el.innerHTML = escapeHtml(user.bio);',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // An identifier with no resolvable write is unresolved provenance, not a
    // proven constant.
    {
      code: 'el.innerHTML = neverAssigned;',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      // DECLARED but never written: the binding resolves, and there is still
      // nothing proving the value is a literal.
      code: 'let markup; el.innerHTML = markup;',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
  ],
});

/**
 * PARTITION LOCK — every sink shape must be reported by EXACTLY ONE rule.
 *
 * The innerHTML family divides work by taint SOURCE: a payload this package can
 * attribute (postMessage, FileReader, Worker, WebSocket) belongs to the
 * source-specific rule, everything else belongs here. That only works if the
 * sibling can actually reach the sink SHAPE.
 *
 * Adding computed access, `Object.assign` and `createContextualFragment` to
 * this rule silently broke it: those shapes are not modelled by the siblings,
 * so deferring on an attributed source meant NOBODY reported them. Probed with
 * all five family rules enabled, each produced ZERO findings.
 *
 * Widening one rule's sink list opened a hole in another rule's coverage. Any
 * change to this rule's sinks must re-run the family matrix:
 *
 *   npx tsx scripts/probe-rule.mts \
 *     browser-security/no-innerhtml browser-security/no-postmessage-innerhtml \
 *     browser-security/no-websocket-innerhtml browser-security/no-worker-message-innerhtml \
 *     browser-security/no-filereader-innerhtml -- '<snippet>'
 *
 * The cases below are the shapes this rule must KEEP owning even when the
 * source is attributed. They report here precisely because no sibling can.
 */
ruleTester.run('no-innerhtml-partition-holes', noInnerhtml, {
  valid: [
    // Plain dotted assignment with an attributed source: the sibling owns it.
    'window.addEventListener("message", (e) => { el.innerHTML = e.data; });',
    // insertAdjacentHTML is modelled by the siblings too.
    'window.addEventListener("message", (e) => { el.insertAdjacentHTML("beforeend", e.data); });',
  ],
  invalid: [
    {
      // FileReader: `payloadSource` does NOT attribute `e.target.result` in
      // this shape, and `no-filereader-innerhtml` is quiet on it — verified by
      // probing each rule alone. So this rule owns it, and coverage is intact.
      // Recorded because the obvious assumption (the source rule owns anything
      // touching a reader) is wrong, and asserting it would have pinned a hole.
      code: 'reader.onload = (e) => { el.innerHTML = e.target.result; };',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'window.addEventListener("message", (e) => { Object.assign(el, { innerHTML: e.data }); });',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'window.addEventListener("message", (e) => { el["innerHTML"] = e.data; });',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'window.addEventListener("message", (e) => { host.append(document.createRange().createContextualFragment(e.data)); });',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
  ],
});
