/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow credentials in URL query parameters
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  objectKeyName,
  formatLLMMessage,
  identifierWords,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

/**
 * Parameter names that ARE a credential only when they are the whole name.
 *
 * `?token=` and `?auth=` are credentials; `?pageToken=`, `?stateToken=` and
 * `?auth_type=` are pagination, OAuth state and a mode switch.
 */
const WHOLE_NAME_CREDENTIALS = new Set(['token', 'auth']);

/**
 * Credential words a parameter name ENDS in, as whole words.
 *
 * Matching only `?token=` / `&secret=` missed every prefixed spelling of the
 * same credential: `access_token` is the RFC 6750 §2.3 URI-query bearer token
 * itself, and `client_secret` / `api_key` are the standard spellings of secret
 * and apikey. A suffix, not any position: `secret_name` names a secret, it does
 * not carry one.
 */
const DEFAULT_CREDENTIAL_SUFFIXES: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'passphrase',
  'secret',
  'apikey',
  'api key',
  'access token',
  'refresh token',
  'id token',
  'auth token',
  'session token',
  'bearer token',
  'private token',
];

/**
 * Does this query-parameter name carry a credential?
 *
 * `suffixes` is the configured credential vocabulary, already split into words.
 */
function isCredentialParam(
  name: string,
  suffixes: readonly (readonly string[])[],
): boolean {
  const words = identifierWords(name);
  if (WHOLE_NAME_CREDENTIALS.has(words.join(' '))) return true;
  return suffixes.some(
    (suffix) =>
      suffix.length <= words.length &&
      suffix.every(
        (word, i) => words[words.length - suffix.length + i] === word,
      ),
  );
}

/**
 * The name of every `?name=` / `&name=` parameter in a string.
 *
 * U+0001 marks an interpolation, so a name that straddles one (`?${k}token=`)
 * is not a name this rule can read and is never matched.
 */
// The U+0001 interpolation sentinel is matched on purpose (see above).
// oxlint-disable-next-line no-control-regex
const QUERY_PARAMETER = /[?&]([^=&?#\s\u0001]+)=/g;

/**
 * Property names whose value is a REQUEST BODY, not a URL.
 *
 * `body` is the fetch/undici convention, `data` is axios, `form`/`formData` are got
 * and request. A form-encoded body is where credentials are SUPPOSED to go:
 * RFC 6749 §2.3.1 prescribes exactly
 *
 *   body: `client_id=${id}&client_secret=${secret}&token=${token}`
 *
 * for OAuth 2.0 token introspection and the client-credentials grant. Reporting it
 * says "use a POST body instead" to code already using a POST body.
 */
const DEFAULT_BODY_PROPERTIES = ['body', 'data', 'form', 'formData'];

export interface Options {
  /**
   * Property names whose value is a request BODY rather than a URL.
   *
   * Defaults to `['body', 'data', 'form', 'formData']` — fetch/undici, axios, got
   * and request respectively. Extend it for a client that names the payload
   * something else; a string in one of these positions is form-encoded data, not a
   * query string, and credentials belong there.
   */
  bodyProperties?: string[];
  /**
   * Credential words a parameter name ENDS in, matched as whole words.
   * **Replaces** the default (`password`, `passwd`, `pwd`, `passphrase`,
   * `secret`, `apikey`, `api key`, `access token`, `refresh token`, `id token`,
   * `auth token`, `session token`, `bearer token`, `private token`). Any
   * spelling works — `apiKey`, `api_key` and `api key` are the same words.
   * A bare `?token=` or `?auth=` is reported regardless.
   */
  credentialSuffixes?: string[];
}

type RuleOptions = [Options?];

export const noCredentialsInQueryParams = createRule<RuleOptions, MessageIds>({
  name: 'no-credentials-in-query-params',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-credentials-in-query-params.md',
      description: 'Disallow credentials in URL query parameters',
      cwe: 'CWE-598',
      cvss: 9.8,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentials in Query Parameters',
        cwe: 'CWE-598',
        description:
          'Credentials detected in URL query parameters - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Use secure methods: POST body, headers (Authorization), or secure cookies',
        documentationLink: 'https://cwe.mitre.org/data/definitions/598.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          bodyProperties: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_BODY_PROPERTIES,
            description:
              'Property names whose value is a request body rather than a URL',
          },
          credentialSuffixes: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_CREDENTIAL_SUFFIXES],
            description:
              'Credential words a query-parameter name ends in (replaces the default)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      bodyProperties: DEFAULT_BODY_PROPERTIES,
      credentialSuffixes: [...DEFAULT_CREDENTIAL_SUFFIXES],
    },
  ],
  createOnce(context) {
    let bodyPropertyNames: ReadonlySet<string>;
    let credentialSuffixWords: readonly (readonly string[])[];
    /**
     * Path segments of the out-of-band verification flows.
     *
     * A password-reset link carries its token in the query because there is no
     * other channel — the recipient is not authenticated yet, so a header or a
     * cookie is not available, and the link has to survive being pasted from an
     * email client. The token is single-use and short-lived, which is what makes
     * the design acceptable; every mainstream framework ships it this way.
     *
     * Reporting it says "use the Authorization header instead", which cannot be
     * done. This is deliberately narrow: it exempts `token=` only, and only when
     * the path names one of these flows, so `?apikey=`, `?password=` and a bare
     * `?token=` on an API endpoint all still report.
     */
    const OUT_OF_BAND_FLOWS =
      /\/(reset|reset-password|forgot|verify|verify-email|confirm|activate|unsubscribe|magic-?link)\b/;

    /**
     * Does this URL carry a credential we should report?
     *
     * Every present parameter is considered, not just the first: a reset link
     * that ALSO carries `&apikey=` is still a finding, and short-circuiting on
     * the exempt `token=` would have hidden it.
     */
    function hasReportableCredential(url: string): boolean {
      return [...url.matchAll(QUERY_PARAMETER)].some(
        ([, name]) =>
          isCredentialParam(name, credentialSuffixWords) &&
          !(name.toLowerCase() === 'token' && OUT_OF_BAND_FLOWS.test(url)),
      );
    }

    /**
     * Is this string the value of a request-body property, or fed to a body builder?
     *
     * Structural, not textual: a query string and a form-encoded body are the same
     * characters, so only the position distinguishes them.
     */
    function isRequestBody(node: TSESTree.Node): boolean {
      // Asserted rather than guarded. ESLint sets `parent` on every node it
      // visits; the type is optional only because TSESTree shares it with detached
      // nodes that never reach a visitor. A runtime guard here is a branch no input
      // can take, and this package holds genuine 100% coverage — it carries no
      // ignore comments anywhere, so an unreachable branch is a real gate failure
      // rather than a metric to wave through.
      const parent = node.parent as TSESTree.Node;

      if (
        parent.type === AST_NODE_TYPES.Property &&
        parent.value === node &&
        !parent.computed
      ) {
        // `body:` and `'body':` name the same property.
        const key = objectKeyName(parent);
        if (key !== null && bodyPropertyNames.has(key)) return true;
      }

      // `new URLSearchParams(`a=1&token=x`)` builds a body, not a location.
      if (
        parent.type === AST_NODE_TYPES.NewExpression &&
        parent.callee.type === AST_NODE_TYPES.Identifier &&
        parent.callee.name === 'URLSearchParams'
      ) {
        return true;
      }

      return false;
    }

    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }

    return {
      before() {
        const {
          bodyProperties = DEFAULT_BODY_PROPERTIES,
          credentialSuffixes = DEFAULT_CREDENTIAL_SUFFIXES,
        } = context.options[0] ?? {};
        bodyPropertyNames = new Set(bodyProperties);
        credentialSuffixWords = credentialSuffixes.map(identifierWords);
      },
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          // Original case: `identifierWords` splits `apiKey` on the case
          // boundary, which lowercasing first would erase.
          if (hasReportableCredential(node.value) && !isRequestBody(node)) {
            report(node);
          }
        }
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Read the STATIC text, not `sourceCode.getText(node)`.
        //
        // getText returns the template's source, interpolations included, so
        // `${maskToken(session.accessToken)}` contributed the characters of its
        // own source code to the match. Combined with the missing `?`/`&`
        // prefix below, that made this branch fire on
        //
        //   outputDebug(`Loaded session for ${store}: token=${maskToken(t)}`)
        //
        // — a debug log, not a URL, whose value is explicitly MASKED. Reporting
        // it was wrong twice over. (Repo doctrine: match the AST, never printed
        // source.)
        //
        // A placeholder marks each interpolation so `?` + `token=` cannot be
        // formed by accident across a boundary.
        const INTERPOLATION = '\u0001';
        const text = node.quasis
          // `raw` is always populated; `cooked` is null only for an invalid
          // escape in a TAGGED template, which a URL string never is.
          .map((q) => q.value.raw)
          .join(INTERPOLATION);

        // Same test the Literal branch uses. The asymmetry was the bug: a
        // literal needed `?token=` or `&token=`, a template matched a bare
        // `token=` anywhere — including the `: token=` of a log line.
        if (hasReportableCredential(text) && !isRequestBody(node)) {
          report(node);
        }
      },
    };
  },
});
