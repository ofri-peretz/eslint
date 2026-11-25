/**
 * no-improper-sanitization: Angular's `DomSanitizer.bypassSecurityTrust*`.
 *
 * Measured on a training app (results tracked privately): both plugins stayed
 * silent on every `bypassSecurityTrustHtml(userValue)` in an Angular front end,
 * the framework's own documented way to turn its XSS protection off for one
 * value. The method names are the whole signal. What decides a finding is the
 * argument: text the developer typed is trusted by definition; anything that
 * arrives at runtime is what the call tells Angular not to sanitise.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const bypass = [{ messageId: 'angularSanitizerBypass' as const }];

describe('no-improper-sanitization (Angular sanitiser bypass)', () => {
  ruleTester.run('no-improper-sanitization', noImproperSanitization, {
    valid: [
      // ---- developer-typed input is the trusted case ----
      {
        name: 'string literal',
        code: "this.html = this.sanitizer.bypassSecurityTrustHtml('<b>Welcome</b>');",
      },
      {
        name: 'template literal with no substitutions',
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(`<b>Welcome</b>`);',
      },
      {
        name: 'concatenation of literals',
        code: "this.html = this.sanitizer.bypassSecurityTrustHtml('<b>' + 'Welcome' + '</b>');",
      },
      {
        name: 'a const initialised with a literal',
        code: `const BANNER = '<b>Welcome</b>';
          this.html = this.sanitizer.bypassSecurityTrustHtml(BANNER);`,
      },
      {
        name: 'a const initialised with a literal, as const',
        code: `const BANNER = '<b>Welcome</b>' as const;
          this.html = this.sanitizer.bypassSecurityTrustHtml(BANNER);`,
      },
      {
        name: 'a const built from other constants',
        code: `const OPEN = '<b>';
          const BANNER = OPEN + 'Welcome</b>';
          this.html = this.sanitizer.bypassSecurityTrustHtml(BANNER);`,
      },
      {
        name: 'a constant URL for a resource frame',
        code: "this.src = this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/abc');",
      },
      {
        name: 'a constant style string',
        code: "this.style = this.sanitizer.bypassSecurityTrustStyle('color: red');",
      },
      // ---- the value is sanitised before it is trusted ----
      {
        name: 'DOMPurify output',
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(value));',
      },
      {
        name: "Angular's own sanitize() output",
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(this.sanitizer.sanitize(SecurityContext.HTML, value) ?? "");',
      },
      // ---- lookalikes that are not the Angular API ----
      {
        name: 'a different method on the same receiver',
        code: 'this.html = this.sanitizer.sanitize(SecurityContext.HTML, value);',
      },
      {
        name: 'a method that only starts the same way',
        code: 'this.x = this.service.bypassSecurityTrustedHtml(value);',
      },
      {
        name: 'a bare function of that name is not a member call',
        code: 'bypassSecurityTrustHtml(value);',
      },
    ],
    invalid: [
      {
        name: 'a property of runtime data (an API row)',
        code: 'tableData[i].description = this.sanitizer.bypassSecurityTrustHtml(tableData[i].description);',
        errors: bypass,
      },
      {
        name: 'a plain identifier parameter',
        code: 'this.searchValue = this.sanitizer.bypassSecurityTrustHtml(queryParam);',
        errors: bypass,
      },
      {
        name: 'a template literal with a substitution',
        code: 'this.ip = this.sanitizer.bypassSecurityTrustHtml(`<small>${payload.data.lastLoginIp}</small>`);',
        errors: bypass,
      },
      {
        name: 'concatenation with a runtime value',
        code: "this.ip = this.sanitizer.bypassSecurityTrustHtml('<code>' + id + '</code>');",
        errors: bypass,
      },
      {
        name: 'Script',
        code: 'this.s = this.sanitizer.bypassSecurityTrustScript(code);',
        errors: bypass,
      },
      {
        name: 'Style',
        code: 'this.s = this.sanitizer.bypassSecurityTrustStyle(userStyle);',
        errors: bypass,
      },
      {
        name: 'Url',
        code: 'this.u = this.sanitizer.bypassSecurityTrustUrl(this.route.snapshot.queryParams.next);',
        errors: bypass,
      },
      {
        name: 'ResourceUrl',
        code: 'this.u = this.sanitizer.bypassSecurityTrustResourceUrl(url);',
        errors: bypass,
      },
      {
        name: 'a receiver that is not named sanitizer',
        code: 'this.h = this.dom.bypassSecurityTrustHtml(value);',
        errors: bypass,
      },
      {
        name: 'a let that is reassigned to runtime data is not constant',
        code: `let html = '<b>x</b>';
          html = value;
          this.html = this.sanitizer.bypassSecurityTrustHtml(html);`,
        errors: bypass,
      },
      {
        name: 'a const initialised from a call is not constant',
        code: `const html = render(value);
          this.html = this.sanitizer.bypassSecurityTrustHtml(html);`,
        errors: bypass,
      },
      {
        name: 'a sanitiser applied to something else does not cover the argument',
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(value + DOMPurify.sanitize(other));',
        errors: bypass,
      },
      {
        name: 'a computed member is the same method',
        code: "this.html = this.sanitizer['bypassSecurityTrustHtml'](value);",
        errors: bypass,
      },
      {
        name: 'a spread argument cannot be proven constant',
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(...args);',
        errors: bypass,
      },
      {
        name: 'a for-of const has no initialiser to trust',
        code: `for (const q of queries) {
          this.html = this.sanitizer.bypassSecurityTrustHtml(q);
        }`,
        errors: bypass,
      },
      {
        name: 'a destructured const is not a literal',
        code: `const { html } = response;
          this.html = this.sanitizer.bypassSecurityTrustHtml(html);`,
        errors: bypass,
      },
      {
        name: 'a regular expression is not trusted text',
        code: 'this.html = this.sanitizer.bypassSecurityTrustHtml(/<b>/);',
        errors: bypass,
      },
      {
        name: 'a chain of constants longer than the resolver follows',
        code: `const a0 = '<b>';
          const a1 = a0; const a2 = a1; const a3 = a2; const a4 = a3; const a5 = a4;
          const a6 = a5; const a7 = a6; const a8 = a7; const a9 = a8; const a10 = a9;
          this.html = this.sanitizer.bypassSecurityTrustHtml(a10);`,
        errors: bypass,
      },
    ],
  });
});
