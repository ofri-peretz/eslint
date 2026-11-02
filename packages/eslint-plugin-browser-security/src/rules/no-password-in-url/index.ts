/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent passwords in URLs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import {
  createRule,
  formatLLMMessage,
  identifierWords,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * Every `http(s)://…` occurrence in a string, with its AUTHORITY isolated.
 *
 * The authority is everything between `//` and the first `/`, `?`, `#` or
 * whitespace. Isolating it is what makes the credential test honest: the
 * previous pattern was `/https?:\/\/[^:]+:[^@]+@/`, which had no idea where
 * the authority ended, so
 *
 * ```js
 * const url = 'https://example.com:8080/threads/a@b';
 * ```
 *
 * matched — `example.com` for the user, `8080/threads/a` for the password —
 * and a port plus an `@` anywhere later in the path was reported as
 * credentials in a URL at CVSS 6.5.
 */
const HTTP_URL = /\b(?:https?|ftps?|wss?):\/\/([^/?#\s'"`<>]*)/gi;

/*
 * The scheme list is the URLs a browser or `fetch` sends — http, ftp and
 * websocket, each with its TLS twin. `ftp://deploy:hunter2@files…` puts the
 * password in the same userinfo position `https://` does, and matching only
 * `https?` made it invisible. Database connection strings
 * (`postgres://u:p@db`) are deliberately absent: they are server
 * configuration, never navigated or logged as a URL, and a hardcoded one is the
 * hardcoded-credentials rules' finding.
 *
 * ## Rule partition
 *
 * Owns the two places a URL carries a password that are NOT its query string:
 * the userinfo (`scheme://user:pass@host`) and a password-named parameter in the
 * FRAGMENT (`#password=…`, `#pwd=…`). A password in the QUERY string
 * (`?password=`, `?pwd=`) is `no-credentials-in-query-params`' finding — one
 * fact, one report.
 */

/** Password words a fragment parameter name ends in. Each is a single word. */
const PASSWORD_WORDS: ReadonlySet<string> = new Set([
  'password',
  'passwd',
  'pwd',
  'passphrase',
]);

/** `name=` parameters in a fragment: `#a=1&password=x` gives `a`, `password`. */
// The U+0001 interpolation sentinel is matched on purpose (see above).
// oxlint-disable-next-line no-control-regex
const FRAGMENT_PARAMETER = /[#&]([^=&#\s\u0001]+)=/g;

/** Does the fragment of this string carry a password-named parameter? */
function hasFragmentPassword(value: string): boolean {
  // With no `#`, `slice(-1)` keeps one character — too short for `#name=`.
  return [...value.slice(value.indexOf('#')).matchAll(FRAGMENT_PARAMETER)].some(
    ([, name]) =>
      identifierWords(name)
        .slice(-1)
        .some((word) => PASSWORD_WORDS.has(word)),
  );
}

/**
 * A stand-in for a value we cannot read, chosen so it cannot be mistaken for
 * a URL delimiter. U+0001 is not `/`, `?`, `#`, `@`, `:` or whitespace, so
 * folding an interpolation into it preserves the STRUCTURE of the URL while
 * saying nothing about the content.
 */
const OPAQUE = '\u0001';

/**
 * The URL text an expression builds, with unknown parts folded to a placeholder.
 *
 * The rule visited `Literal` and nothing else, so three ways of writing the
 * identical credentialled URL were invisible:
 *
 * ```js
 * const A = `https://svc:s3cr3t@host/api`;          // template, no expressions
 * fetch(`https://svc:${password}@host/api`);        // the secret interpolated
 * fetch('https://svc:s3cr3t' + '@' + HOST + '/api'); // split so no literal has it
 * ```
 *
 * What makes a URL CWE-521 is the **userinfo position**, and that position
 * survives all three. Folding to a placeholder keeps the delimiters — which is
 * all the authority parse needs — without ever inspecting or guessing the
 * value that will land there.
 *
 * Returns `null` when nothing string-shaped can be recovered.
 */
function foldUrlText(node: TSESTree.Node): string | null {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? node.value : null;

    case 'TemplateLiteral': {
      let text = '';
      node.quasis.forEach((quasi, index) => {
        // `cooked` is null for an invalid escape as of @typescript-eslint
        // 8.68.0; 8.54.0 handed back the raw text. `check` below is wired to a
        // `TemplateLiteral` visitor, so a TAGGED template reaches this fold and
        // the credential must stay readable.
        text += quasi.value.cooked ?? quasi.value.raw;
        if (index < node.expressions.length) {
          text += foldUrlText(node.expressions[index]) ?? OPAQUE;
        }
      });
      return text;
    }

    case 'BinaryExpression': {
      if (node.operator !== '+') return null;
      // Two unreadable halves fold to placeholders only, which no URL test
      // can match, so there is no need to tell them apart from `null`.
      return (
        (foldUrlText(node.left as TSESTree.Node) ?? OPAQUE) +
        (foldUrlText(node.right) ?? OPAQUE)
      );
    }

    default:
      return null;
  }
}

/** Does any URL in this string carry `user:password@` in its authority? */
function hasUserinfoPassword(value: string): boolean {
  for (const match of value.matchAll(HTTP_URL)) {
    const authority = match[1];
    const at = authority.lastIndexOf('@');
    if (at <= 0) continue;
    const userinfo = authority.slice(0, at);
    // A password is the part after the colon. `https://token@host` carries a
    // username only, which CWE-521 is not about. The username may be empty:
    // `https://:secret@host` still sends `secret` as the password.
    const colon = userinfo.indexOf(':');
    if (colon !== -1 && colon < userinfo.length - 1) return true;
  }
  return false;
}

export const noPasswordInUrl = createRule<RuleOptions, MessageIds>({
  name: 'no-password-in-url',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-password-in-url.md',
      description: 'Prevent passwords in URLs',
      cwe: 'CWE-521',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-521',
        description:
          'Prevent passwords in URLs detected - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/521.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }

    /**
     * Is this node a PIECE of a larger string expression?
     *
     * The outermost node is the one that owns the report. Without this, one
     * `'https://u:p@host' + path` would report twice — once for the whole
     * concatenation and once for the literal inside it — and this repo has
     * already shipped a rule pinning two errors from one line as correct.
     */
    function isNestedStringPart(node: TSESTree.Node): boolean {
      const parent = node.parent;
      return (
        parent !== undefined &&
        ((parent.type === 'BinaryExpression' && parent.operator === '+') ||
          parent.type === 'TemplateLiteral')
      );
    }

    function check(node: TSESTree.Node) {
      if (isNestedStringPart(node)) return;
      const text = foldUrlText(node);
      if (
        text !== null &&
        (hasUserinfoPassword(text) || hasFragmentPassword(text))
      ) {
        report(node);
      }
    }

    return {
      Literal: check,
      TemplateLiteral: check,
      BinaryExpression: check,
    };
  },
});
