/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Object URLs released through something other than `revokeObjectURL(sameVar)`.
 *
 * Real code parks a URL in React state, a ref, or a cache and revokes it on
 * replace, on unmount, or on close. The rule paired creation and revocation by
 * binding only, so every one of those was reported as a leak: 1 of 1 on
 * triliumnext/trilium, 2 of 2 on tldraw, 5 of 5 on element-web.
 *
 * Each invalid case below is the same code with the release left out or aimed
 * somewhere else, because a route that is not proven must keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireBlobUrlRevocation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

const REACT = `import { useState, useEffect } from 'react';\n`;

describe('require-blob-url-revocation: releases that go through state, collections and helpers', () => {
  ruleTester.run('indirect-release', requireBlobUrlRevocation, {
    valid: [
      {
        name: 'a URL assigned to another binding that is revoked',
        code: `function open(blob) {
          const url = URL.createObjectURL(blob);
          let held;
          held = url;
          URL.revokeObjectURL(held);
        }`,
      },
      {
        name: 'a helper written as a function expression bound to a const',
        code: `const release = function (u) { URL.revokeObjectURL(u); };
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
      },
      {
        name: 'a helper that takes the URL as its second parameter',
        code: `function release(keep, u) { URL.revokeObjectURL(u); }
        function open(blob) { const url = URL.createObjectURL(blob); release(1, url); }`,
      },
      {
        name: 'a URL held in an alias of another binding that is revoked',
        code: `function open(blob) {
          const url = URL.createObjectURL(blob);
          const alias = url;
          URL.revokeObjectURL(alias);
        }`,
      },
      {
        name: 'a callback parameter visited by map over the stored collection',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.push(url); }
        function close() { urls.map((u) => URL.revokeObjectURL(u)); }`,
      },
      {
        name: 'a callback visited by filter and some over the stored collection',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.unshift(url); }
        function close() { urls.filter((u) => URL.revokeObjectURL(u)); urls.some((u) => URL.revokeObjectURL(u)); }`,
      },
      {
        name: 'a loop over keys() of the collection the URL was stored in',
        code: `const urls = new Map();
        function add(blob) { const url = URL.createObjectURL(blob); urls.set(url, 1); }
        function close() { for (const u of urls.keys()) URL.revokeObjectURL(u); }`,
      },
      {
        name: 'a loop over Object.entries of the collection',
        code: `const byId = {};
        function add(id, blob) { const url = URL.createObjectURL(blob); byId[id] = url; }
        function close() { for (const [, u] of Object.entries(byId)) URL.revokeObjectURL(u); }`,
      },
      {
        name: 'a state reset to a constant does not hide the revoke of the stored URL',
        code: `${REACT}function Preview() {
          const [preview, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          const reset = () => { setPreview(null); };
          useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
        }`,
      },
      {
        name: 'a URL stored under a literal key and revoked through entries()',
        code: `const cache = new Map();
        function add(blob) { const url = URL.createObjectURL(blob); cache.set('main', url); }
        function close() { for (const [, u] of cache.entries()) URL.revokeObjectURL(u); }`,
      },
      {
        name: 'a property path handed to a helper that revokes it',
        code: `function release(u) { URL.revokeObjectURL(u); }
        class Model {
          load(blob) { this.url = URL.createObjectURL(blob); }
          dispose() { release(this.url); }
        }`,
      },
      {
        // @source bearstudio/start-ui-web: URL stored in state, revoked on unmount
        name: 'a URL set into useState and the state revoked in the cleanup',
        code: `${REACT}function Preview({ file }) {
          const [preview, setPreview] = useState(null);
          const pick = (f) => {
            const url = URL.createObjectURL(f);
            setPreview(url);
          };
          useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
          return preview;
        }`,
      },
      {
        name: 'the same through React.useState from a namespace import',
        code: `import * as React from 'react';
        function Preview() {
          const [preview, setPreview] = React.useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          React.useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
        }`,
      },
      {
        // @source triliumnext/trilium print_preview.tsx: revoked via the ref
        name: 'a URL parked on a ref and revoked through an alias of that ref',
        code: `function Dialog(blob, pdfUrlRef) {
          const url = URL.createObjectURL(blob);
          pdfUrlRef.current = url;
          const old = pdfUrlRef.current;
          if (old) URL.revokeObjectURL(old);
        }`,
      },
      {
        // @source tldraw useLocalStore.ts: every cached URL revoked on close
        name: 'a URL stored in a Map and every member revoked in a loop',
        code: `const cache = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); cache.set(id, url); }
        function close() { for (const url of cache.values()) URL.revokeObjectURL(url); cache.clear(); }`,
      },
      {
        name: 'a URL pushed to an array and revoked in a forEach callback',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.push(url); }
        function close() { urls.forEach((u) => URL.revokeObjectURL(u)); }`,
      },
      {
        name: 'a URL stored by key and revoked through Object.values',
        code: `const byId = {};
        function add(id, blob) { const url = URL.createObjectURL(blob); byId[id] = url; }
        function close() { for (const u of Object.values(byId)) URL.revokeObjectURL(u); }`,
      },
      {
        name: 'a URL added to a Set and revoked through Array.from',
        code: `const live = new Set();
        function add(blob) { const url = URL.createObjectURL(blob); live.add(url); }
        function close() { for (const u of Array.from(live)) URL.revokeObjectURL(u); }`,
      },
      {
        // @source element-web UploadConfirmDialog view-model dispose
        name: 'a URL handed to a helper in this file that revokes it',
        code: `function release(u) { URL.revokeObjectURL(u); }
        function open(blob) { const url = URL.createObjectURL(blob); show(url); release(url); }`,
      },
      {
        name: 'a URL handed to an arrow helper with a default parameter',
        code: `const release = (u = null) => URL.revokeObjectURL(u);
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
      },
      {
        // @source element-web: a private field released in dispose
        name: 'a URL on a private field revoked in dispose',
        code: `class Model {
          #url = null;
          load(blob) { this.#url = URL.createObjectURL(blob); }
          dispose() { URL.revokeObjectURL(this.#url); }
        }`,
      },
    ],
    invalid: [
      {
        name: 'a setter that is the first element of the pair, revoked as if it were the state',
        code: `${REACT}function Preview() {
          const [setPreview, preview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(setPreview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a hook other than useState on a namespace import',
        code: `import * as React from 'react';
        function Preview() {
          const [preview, dispatch] = React.useReducer(reduce, null);
          const pick = (f) => { const url = URL.createObjectURL(f); dispatch(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a useState that is not declared anywhere',
        code: `function Preview() {
          const [preview, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a pair whose state is skipped',
        code: `${REACT}function Preview() {
          const [, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter from a loop over pairs, which has no initialiser to inspect',
        code: `function Preview(pairs) {
          for (const [preview, setPreview] of pairs) {
            const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a private field and a public field of the same name are different paths',
        code: `class Model {
          #url = null;
          url = null;
          load(blob) { this.#url = URL.createObjectURL(blob); }
          dispose() { URL.revokeObjectURL(this.url); }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a collection that cannot be named is not the same as another that cannot be named',
        code: `function add(id, blob) { const url = URL.createObjectURL(blob); getCache().set(id, url); }
        function close() { for (const u of getCache()) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a loop over the result of a plain function call enumerates no named collection',
        code: `const store = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); store.set(id, url); }
        function close() { for (const u of getList()) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a callback that is a named function expression revokes its own name, not a member',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.push(url); }
        function close() { urls.forEach(function release() { URL.revokeObjectURL(release); }); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL assigned to a binding that is never revoked',
        code: `function open(blob) {
          const url = URL.createObjectURL(blob);
          let held;
          held = url;
          log(held);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper whose name is declared twice, so it has no single meaning',
        code: `var release = (u) => URL.revokeObjectURL(u);
        var release = (u) => log(u);
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper declared without a value',
        code: `let release;
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper that is a parameter of the enclosing function',
        code: `function open(blob, release) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper bound to something that is not a function',
        code: `const release = makeRelease();
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a method call is not followed to a function of the same name',
        code: `function release(u) { URL.revokeObjectURL(u); }
        function open(blob, api) { const url = URL.createObjectURL(blob); api.release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a state setter handed in as a parameter',
        code: `const Preview = (setPreview) => {
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        };`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter and a state that are not a destructured pair',
        code: `${REACT}function Preview() {
          const [preview, setPreview, extra] = useState(null);
          const [setOther] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setOther(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a pair declared without a call to initialise it',
        code: `function Preview(pair) {
          const [preview, setPreview] = pair;
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a pair whose first element is not a plain name',
        code: `${REACT}function Preview() {
          const [{ preview }, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'an alias that is reassigned, so it is not the path it started as',
        code: `function Dialog(blob, a, b) {
          const url = URL.createObjectURL(blob);
          a.current = url;
          let old = a.current;
          old = b.current;
          URL.revokeObjectURL(old);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a loop variable of a for-in, which ranges over keys not members',
        code: `const urls = {};
        function add(id, blob) { const url = URL.createObjectURL(blob); urls[id] = url; }
        function close() { for (const u in urls) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a callback handed to a call that is not a method',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.push(url); }
        function close() { each(urls, (u) => URL.revokeObjectURL(u)); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a catch parameter is not a member of any collection',
        code: `function open(blob) {
          const url = URL.createObjectURL(blob);
          try { go(); } catch (e) { URL.revokeObjectURL(e); }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL stored in a collection that cannot be named',
        code: `function add(id, blob) { const url = URL.createObjectURL(blob); getCache().set(id, url); }
        function close(list) { for (const u of list) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL parked by a computed key on a collection that cannot be named',
        code: `function add(id, blob) { const url = URL.createObjectURL(blob); getCache()[id] = url; }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL parked on a property of a call result',
        code: `function add(blob) { const url = URL.createObjectURL(blob); getRef().current = url; }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a loop over a method that does not enumerate the collection',
        code: `const store = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); store.set(id, url); }
        function close() { for (const u of store.items()) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'Object.values called with no argument enumerates nothing',
        code: `const store = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); store.set(id, url); }
        function close() { for (const u of Object.values()) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a loop over a computed method of the collection',
        code: `const store = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); store.set(id, url); }
        function close(m) { for (const u of store[m]()) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a revoke of an imported value is not a revoke of the local handle',
        code: `import { shared } from './urls';
        function open(blob) { const url = URL.createObjectURL(blob); }
        function close() { URL.revokeObjectURL(shared); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper that destructures its argument, so no position is revoked',
        code: `function release({ u }) { URL.revokeObjectURL(u); }
        function open(blob) { const url = URL.createObjectURL(blob); release({ u: url }); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper called with fewer arguments than the revoked position',
        code: `function release(keep, u) { URL.revokeObjectURL(u); }
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a call that is not a hook',
        code: `function Preview(store) {
          const [preview, setPreview] = store.make();
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from useState reached through a call result',
        code: `function Preview(hooks) {
          const [preview, setPreview] = hooks().useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a hook that is not useState',
        code: `import { useReducer } from 'react';
        function Preview() {
          const [preview, dispatch] = useReducer(reduce, null);
          const pick = (f) => { const url = URL.createObjectURL(f); dispatch(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a default import that happens to be called useState',
        code: `import useState from './state';
        function Preview() {
          const [preview, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL set into state that nothing ever revokes',
        code: `${REACT}function Preview() {
          const [preview, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          return preview;
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter of a different state than the one revoked',
        code: `${REACT}function Preview() {
          const [preview, setPreview] = useState(null);
          const [other, setOther] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          useEffect(() => () => URL.revokeObjectURL(other), [other]);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter whose useState is defined locally, not imported from React',
        code: `function useState(x) { return [x, () => {}]; }
        function Preview() {
          const [preview, setPreview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter that is not the second element of the pair',
        code: `${REACT}function Preview() {
          const [setPreview, preview] = useState(null);
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a setter taken from a destructured object, not a state pair',
        code: `function Preview(store) {
          const { preview, setPreview } = store;
          const pick = (f) => { const url = URL.createObjectURL(f); setPreview(url); };
          URL.revokeObjectURL(preview);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL stored in a Map that nothing revokes',
        code: `const cache = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); cache.set(id, url); }
        function close() { cache.clear(); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL stored in one collection while another is revoked',
        code: `const cache = new Map();
        const other = [];
        function add(id, blob) { const url = URL.createObjectURL(blob); cache.set(id, url); }
        function close() { other.forEach((u) => URL.revokeObjectURL(u)); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a loop over a collection that is not the one the URL was stored in',
        code: `const cache = new Map();
        function add(id, blob) { const url = URL.createObjectURL(blob); cache.set(id, url); }
        function close(list) { for (const u of list) URL.revokeObjectURL(u); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a callback handed to a method that does not visit members',
        code: `const urls = [];
        function add(blob) { const url = URL.createObjectURL(blob); urls.push(url); }
        function close() { urls.reduce((acc, u) => URL.revokeObjectURL(u), 0); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a URL parked on a ref while a different ref is revoked',
        code: `function Dialog(blob, a, b) {
          const url = URL.createObjectURL(blob);
          a.current = url;
          URL.revokeObjectURL(b.current);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper that never revokes what it is handed',
        code: `function log(u) { console.log(u); }
        function open(blob) { const url = URL.createObjectURL(blob); log(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper that revokes the other argument, not the URL',
        code: `function release(keep, drop) { URL.revokeObjectURL(drop); }
        function open(blob) { const url = URL.createObjectURL(blob); release(url, 'x'); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a helper that is imported, so its body is not visible',
        code: `import { release } from './urls';
        function open(blob) { const url = URL.createObjectURL(blob); release(url); }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a private field that is never revoked',
        code: `class Model {
          #url = null;
          load(blob) { this.#url = URL.createObjectURL(blob); }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a revoked alias of a path that is not the one the URL was parked on',
        code: `function Dialog(blob, a, b) {
          const url = URL.createObjectURL(blob);
          a.current = url;
          const old = b.current;
          URL.revokeObjectURL(old);
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
    ],
  });
});
