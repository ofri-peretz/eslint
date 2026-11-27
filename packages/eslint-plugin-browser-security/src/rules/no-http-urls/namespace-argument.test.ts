/**
 * A string consumed as a DOM namespace is an identifier, not a destination.
 *
 * Decided by the call that receives it (`getAttributeNS(ns, …)`), not by the
 * authority that minted it, so a namespace nobody has listed is covered and a
 * constant that is also fetched keeps reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHttpUrls } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-http-urls (namespace argument)', noHttpUrls, {
  valid: [
    {
      // @source element-hq/element-web utils/media/xmp.ts:14
      // @found real-source scan
      name: 'FP: a constant read only as the namespace of getAttributeNS',
      code: `const GCONTAINER = 'http://ns.google.com/photos/1.0/container/';
        export const mime = (el) => el.getAttributeNS(GCONTAINER, 'Mime');`,
    },
    {
      // @source element-hq/element-web utils/media/xmp.ts:15
      // @found real-source scan
      name: 'FP: a constant read as the namespace of several DOM calls',
      code: `const NS = 'http://ns.example-vendor.net/v1/';
        export const a = (d) => d.getElementsByTagNameNS(NS, 'Item');
        export const b = (d) => d.createElementNS(NS, 'x:Item');`,
    },
    {
      name: 'a literal written in the namespace position of setAttributeNS',
      code: `el.setAttributeNS('http://ns.example-vendor.net/v1/', 'x:id', '1');`,
    },
    {
      name: 'a literal written in the namespace position of createElementNS',
      code: `const node = document.createElementNS('http://vendor.example.net/draw', 'shape');`,
    },
    {
      name: 'a template namespace is one string in the namespace position',
      code: 'el.getAttributeNS(`http://ns.example-vendor.net/${version}/`, "id");',
    },
  ],
  invalid: [
    {
      name: 'the same constant is also fetched, so it is a destination again',
      code: `const NS = 'http://ns.example-vendor.net/v1/';
        export const a = (d) => d.getElementsByTagNameNS(NS, 'Item');
        export const load = () => fetchIt(NS);`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a constant that is never read as a namespace',
      code: `const NS = 'http://ns.example-vendor.net/v1/';
        export default NS;`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a constant that is never read at all',
      code: `const NS = 'http://ns.example-vendor.net/v1/';`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a URL passed to a method chosen at runtime',
      code: `el[method]('http://ns.example-vendor.net/v1/', 'x');`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a URL in the LOCAL-NAME position, not the namespace position',
      code: `el.getAttributeNS(null, 'http://ns.example-vendor.net/v1/');`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a URL handed to a method that merely resembles a namespace call',
      code: `client.getAttribute('http://ns.example-vendor.net/v1/');`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a URL passed to a bare function named like a namespace method',
      code: `getAttributeNS('http://ns.example-vendor.net/v1/', 'x');`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a let that is reassigned has no single value',
      code: `let NS = 'http://ns.example-vendor.net/v1/';
        export const a = (d) => d.getAttributeNS(NS, 'x');
        NS = other;
        send(NS);`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});
