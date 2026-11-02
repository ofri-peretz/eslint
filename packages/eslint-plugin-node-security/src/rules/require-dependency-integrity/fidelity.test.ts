/**
 * require-dependency-integrity — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/require_dependency_integrity.qnt):
 * a CDN `<script>` / `<link>` written as JSX was never checked, because the
 * rule only scanned string and template literals.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDependencyIntegrity } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const JQUERY =
  'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';

describe('require-dependency-integrity fidelity', () => {
  ruleTester.run('JSX resource tags', requireDependencyIntegrity, {
    valid: [
      {
        name: 'a JSX CDN script with integrity is fine',
        code: `export const Head = () => <script src="${JQUERY}" integrity="sha384-abc" crossOrigin="anonymous" />;`,
      },
      {
        name: 'a self-hosted JSX script is not a CDN resource',
        code: `export const Head = () => <script src="/assets/app.js" />;`,
      },
      {
        name: 'a JSX preconnect link takes no integrity',
        code: `export const Head = () => <link rel="preconnect" href="https://cdn.jsdelivr.net" />;`,
      },
      {
        name: 'a JSX script with a spread may carry integrity, so the rule abstains',
        code: `export const Head = (props: any) => <script src="${JQUERY}" {...props} />;`,
      },
      {
        name: 'a namespaced JSX attribute makes the element unknowable',
        code: `export const Head = () => <script xlink:href="x" src="${JQUERY}" />;`,
      },
      {
        name: 'a JSX member element is not a host script tag',
        code: `export const Head = () => <Html.script src="${JQUERY}" />;`,
      },
      {
        name: 'an unresolvable JSX src is not judged',
        code: `export const Head = (url: string) => <script src={url} />;`,
      },
      {
        name: 'an unresolvable template JSX src is not judged',
        code: `export const Head = (base: string) => <script src={\`\${base}/jquery.min.js\`} />;`,
      },
      {
        name: 'an empty JSX expression src is not judged',
        code: `export const Head = () => <script src={} />;`,
      },
      {
        name: 'a JSX element other than script or link is not a resource tag',
        code: `export const Head = () => <img src="${JQUERY}" />;`,
      },
      {
        name: 'a JSX anchor to a CDN file is a link for the user, not a loaded resource',
        code: `export const Nav = () => <a href="https://cdn.jsdelivr.net/npm/a.css">styles</a>;`,
      },
      {
        name: 'an unresolvable JSX integrity is still an integrity attribute',
        code: `export const Head = (sri: string) => <script src="${JQUERY}" integrity={sri} />;`,
      },
      {
        name: 'an unresolvable JSX rel may exclude integrity, so the rule abstains',
        code: `export const Head = (rel: string) => <link rel={rel} href="https://cdn.jsdelivr.net/npm/a.css" />;`,
      },
      {
        name: 'an unresolvable JSX preload destination may exclude integrity, so the rule abstains',
        code: `export const Head = (kind: string) => <link rel="preload" as={kind} href="https://cdn.jsdelivr.net/npm/a.js" />;`,
      },
      {
        // JSX allows an element as an attribute value; it is no URL string.
        name: 'a JSX element written as the src value is no URL',
        code: `export const Head = () => <script src=<b /> />;`,
      },
      {
        name: 'an unresolvable JSX href is not judged',
        code: `export const Head = (href: string) => <link rel="stylesheet" href={href} />;`,
      },
    ],
    invalid: [
      {
        name: 'a JSX CDN script without integrity is reported',
        code: `export const Head = () => <script src="${JQUERY}" />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSX CDN stylesheet link without integrity is reported',
        code: `export const Head = () => <link rel="stylesheet" href="https://unpkg.com/bootstrap@5.1.3/dist/css/bootstrap.min.css" />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSX CDN script whose src is a resolvable constant is reported',
        code: `const SRC = 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js';
export const Head = () => <script src={SRC} async />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSX CDN script whose src is a static template is reported',
        code: `export const Head = () => <script src={\`${JQUERY}\`} />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSX CDN script whose src template interpolates a constant base is reported',
        code: `const CDN = 'https://cdn.jsdelivr.net/npm';
export const Head = () => <script src={\`\${CDN}/lodash.min.js\`} />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        // \`nonce\` says nothing about integrity, and an unknown value of it
        // cannot make the element carry a hash it does not have.
        // @found quint fidelity model
        name: 'FN: an unresolvable JSX nonce does not hide a missing integrity',
        code: `export const Head = (nonce: string) => <script src="${JQUERY}" nonce={nonce} />;`,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
