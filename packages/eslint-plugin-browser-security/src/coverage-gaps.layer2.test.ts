/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-2 coverage tests: rule listeners invoked directly with synthetic AST
 * objects for branches the real parser can never produce (missing `loc`,
 * empty `quasis`, sparse argument arrays, `options: [null]`).
 *
 * Uses `createWithMockContext` from @interlace/eslint-devkit.
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

import { noClickjacking } from './rules/no-clickjacking';
import { noInsecureRedirects } from './rules/no-insecure-redirects';
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noMissingCsrfProtection } from './rules/no-missing-csrf-protection';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';
import { noSensitiveCookieJs } from './rules/no-sensitive-cookie-js';
import { noSensitiveDataInCache } from './rules/no-sensitive-data-in-cache';
import { requireCspHeaders } from './rules/require-csp-headers';

type Listener = (node: unknown) => void;

function call(listeners: Record<string, unknown>, name: string, node: unknown) {
  (listeners[name] as Listener)(node);
}

describe('no-clickjacking (layer 2: synthetic nodes without loc)', () => {
  it('reports an unsafe iframe with missing loc as line 0 and skips non-string src literals', () => {
    const { listeners, reports } = createWithMockContext(noClickjacking, {
      sourceText: '',
    });

    // Non-string Literal src: hasSrc is set but srcValue stays empty.
    const nonStringSrc = {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'iframe' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'src' },
            value: { type: 'Literal', value: 5 },
          },
        ],
      },
      parent: null,
      loc: undefined,
    };
    call(listeners, 'JSXElement', nonStringSrc);
    expect(reports).toHaveLength(0);

    // Untrusted string src without loc: report data falls back to line "0".
    const evilIframe = {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'iframe' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'src' },
            value: { type: 'Literal', value: 'https://evil.example.com' },
          },
        ],
      },
      parent: null,
      loc: undefined,
    };
    call(listeners, 'JSXElement', evilIframe);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'unsafeIframeUsage',
      data: { line: '0' },
    });
  });

  it('reports frame manipulation without loc as line 0', () => {
    const { listeners, reports } = createWithMockContext(noClickjacking, {
      sourceText: '',
    });
    const member: Record<string, unknown> = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'top' },
      property: { type: 'Identifier', name: 'location' },
      loc: undefined,
    };
    const assignment = {
      type: 'AssignmentExpression',
      left: member,
      right: { type: 'Literal', value: 'about:blank' },
      parent: null,
    };
    member.parent = assignment;
    call(listeners, 'MemberExpression', member);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'frameManipulation',
      data: { line: '0' },
    });
  });

  it('reports transparent overlay literals and templates without loc as line 0', () => {
    const { listeners, reports } = createWithMockContext(noClickjacking, {
      sourceText: 'style opacity: 0',
    });
    call(listeners, 'Literal', {
      type: 'Literal',
      value: 'style= opacity: 0',
      parent: null,
      loc: undefined,
    });
    call(listeners, 'TemplateLiteral', {
      type: 'TemplateLiteral',
      quasis: [],
      expressions: [],
      parent: null,
      loc: undefined,
    });
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      messageId: 'transparentFrameOverlay',
      data: { line: '0' },
    });
    expect(reports[1]).toMatchObject({
      messageId: 'transparentFrameOverlay',
      data: { line: '0' },
    });
  });
});

describe('no-insecure-redirects (layer 2)', () => {
  function redirectCall(loc: unknown) {
    return {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'res' },
        property: { type: 'Identifier', name: 'redirect' },
      },
      arguments: [],
      parent: null,
      loc,
    };
  }

  it('treats null options as an empty options object', () => {
    const { listeners } = createWithMockContext(noInsecureRedirects, {
      options: [null],
      sourceText: 'res.redirect("/safe")',
    });
    expect(listeners.CallExpression).toBeTypeOf('function');
  });

  it('reports a user-input redirect when node.loc is missing (validation impossible)', () => {
    const { listeners, reports } = createWithMockContext(noInsecureRedirects, {
      sourceText: 'res.redirect(req.query.next)',
    });
    call(listeners, 'CallExpression', redirectCall(undefined));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'insecureRedirect' });
  });

  it('reports when loc.end is missing', () => {
    const { listeners, reports } = createWithMockContext(noInsecureRedirects, {
      sourceText: 'res.redirect(req.query.next)',
    });
    call(listeners, 'CallExpression', redirectCall({ start: { line: 1, column: 0 }, end: undefined }));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'insecureRedirect' });
  });
});

describe('no-missing-cors-check (layer 2)', () => {
  it('stops the config-variable scope walk on a parentless non-scope node', () => {
    const { listeners, reports } = createWithMockContext(noMissingCorsCheck, {
      sourceText: 'app.use(cors(corsConfig))',
    });
    // app.use(cors(corsConfig)) where the parent chain dead-ends before a
    // Program/function scope node — impossible through a real parse.
    const corsArg = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'cors' },
      arguments: [{ type: 'Identifier', name: 'corsConfig' }],
    };
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'app' },
        property: { type: 'Identifier', name: 'use' },
      },
      arguments: [corsArg],
      parent: { type: 'ExpressionStatement', parent: null },
    };
    call(listeners, 'CallExpression', node);
    expect(reports).toHaveLength(0);
  });
});

describe('no-missing-csrf-protection (layer 2)', () => {
  it('suggestion fix returns null when the first argument is missing', () => {
    const { listeners, reports } = createWithMockContext(noMissingCsrfProtection, {
      sourceText: '',
    });
    // Sparse arguments: length >= 2 but arguments[0] is undefined.
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'app' },
        property: { type: 'Identifier', name: 'post' },
      },
      arguments: [undefined, { type: 'Identifier', name: 'handler' }],
      parent: null,
    };
    call(listeners, 'CallExpression', node);
    expect(reports).toHaveLength(1);
    const report = reports[0] as TSESLint.ReportDescriptor<string> & {
      suggest: { messageId: string; fix: (f: unknown) => unknown }[];
    };
    expect(report.messageId).toBe('missingCsrfProtection');
    const inserted: unknown[] = [];
    const fixer = {
      insertTextAfter: (...args: unknown[]) => {
        inserted.push(args);
        return { range: [0, 0], text: ', csrf()' };
      },
    };
    expect(report.suggest[0].fix(fixer)).toBeNull();
    expect(inserted).toHaveLength(0);
  });
});

describe('no-missing-security-headers (layer 2)', () => {
  it('treats null options as an empty options object', () => {
    const { listeners, reports } = createWithMockContext(noMissingSecurityHeaders, {
      options: [null],
      sourceText: 'res.json({})',
    });
    // Sanity: listeners exist and a harmless node reports nothing.
    call(listeners, 'CallExpression', {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'go' },
      arguments: [],
      parent: null,
    });
    expect(reports).toHaveLength(0);
  });
});

describe('no-sensitive-cookie-js (layer 2)', () => {
  it('handles a template literal with no quasis', () => {
    const { listeners, reports } = createWithMockContext(noSensitiveCookieJs, {
      sourceText: '',
    });
    const node = {
      type: 'AssignmentExpression',
      left: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'document' },
        property: { type: 'Identifier', name: 'cookie' },
      },
      right: { type: 'TemplateLiteral', quasis: [], expressions: [] },
      parent: null,
    };
    call(listeners, 'AssignmentExpression', node);
    expect(reports).toHaveLength(0);
  });
});

describe('no-sensitive-data-in-cache (layer 2)', () => {
  it('treats a Literal key with undefined value as an empty key', () => {
    const { listeners, reports } = createWithMockContext(noSensitiveDataInCache, {
      sourceText: '',
    });
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'cache' },
        property: { type: 'Identifier', name: 'set' },
      },
      arguments: [{ type: 'Literal', value: undefined }],
      parent: null,
    };
    call(listeners, 'CallExpression', node);
    expect(reports).toHaveLength(0);
  });
});

describe('require-csp-headers (layer 2)', () => {
  function sendCall(arg: unknown) {
    return {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'res' },
        property: { type: 'Identifier', name: 'send' },
      },
      arguments: [arg],
      parent: null,
    };
  }

  it('handles template literals with no quasis and quasis without value', () => {
    const { listeners, reports } = createWithMockContext(requireCspHeaders, {
      sourceText: '',
    });
    call(
      listeners,
      'CallExpression',
      sendCall({ type: 'TemplateLiteral', quasis: [], expressions: [] }),
    );
    call(
      listeners,
      'CallExpression',
      sendCall({ type: 'TemplateLiteral', quasis: [{}], expressions: [] }),
    );
    expect(reports).toHaveLength(0);
  });
});
