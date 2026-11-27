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
        name: 'a URL added to a Set and revoked through a spread copy',
        code: `const live = new Set();
        function add(blob) { const url = URL.createObjectURL(blob); live.add(url); }
        function close() { [...live].forEach((u) => URL.revokeObjectURL(u)); }`,
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
        name: 'a URL on this handed to a method of the same class that revokes it',
        code: `class Model {
          load(blob) { this.url = URL.createObjectURL(blob); }
          dispose() { this.release(this.url); }
          release(u) { URL.revokeObjectURL(u); }
        }`,
      },
      {
        name: 'a URL handed to a class property arrow that revokes it',
        code: `class Model {
          release = (u) => URL.revokeObjectURL(u);
          load(blob) { const url = URL.createObjectURL(blob); this.release(url); }
        }`,
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
        name: 'a method call on this with no such method in the class',
        code: `class Model {
          load(blob) { const url = URL.createObjectURL(blob); this.release(url); }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a method call on an object other than this',
        code: `class Model {
          release(u) { URL.revokeObjectURL(u); }
          load(blob, other) { const url = URL.createObjectURL(blob); other.release(url); }
        }`,
        errors: [{ messageId: 'missingRevoke' }],
      },
      {
        name: 'a this call outside any class',
        code: `function load(blob) { const url = URL.createObjectURL(blob); this.release(url); }`,
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
