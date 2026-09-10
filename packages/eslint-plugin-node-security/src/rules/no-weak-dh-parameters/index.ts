/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-weak-dh-parameters
 *
 * Diffie-Hellman and ECDH key agreement with parameters too small to resist
 * a precomputation attack.
 *
 * The plugin declares `crypto` as part of its target surface and had no rule
 * that named a single Diffie-Hellman API — `createDiffieHellman`,
 * `createDiffieHellmanGroup`, `getDiffieHellman`, `diffieHellman` and
 * `createECDH` appeared nowhere in its sources, while the published
 * API-surface coverage figure said 70%. That figure was a hand-typed
 * constant; the measurement that replaced it is what surfaced this gap.
 *
 * CWE-326: Inadequate Encryption Strength
 *
 * @see https://weakdh.org — Logjam (CVE-2015-4000)
 * @see https://cwe.mitre.org/data/definitions/326.html
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isTestFilePath,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import {
  resolveConstant,
  resolveConstantString,
} from '../../utils/const-value';

type MessageIds = 'weakModpGroup' | 'weakPrimeLength' | 'weakCurve';

export interface Options {
  /** Smallest acceptable DH prime, in bits. Default: 2048 */
  minPrimeBits?: number;
  /** Curves to treat as weak beyond the built-in list. Default: [] */
  additionalWeakCurves?: string[];
  /** Allow weak parameters in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * @protocol-constant The RFC 2409 / RFC 3526 group registry. `modp1` names the
 * 768-bit group to Node, to OpenSSL and to every peer on the wire, so the
 * string IS the parameter and its size is not a matter of local opinion.
 * Making the table consumer-editable would let a deployment delete the entry
 * for the group it is actually using and silence the finding this rule exists
 * to produce — which is the failure the escape is written to prevent, not an
 * example of the flexibility it grants. `minPrimeBits` is the knob: it moves
 * the threshold, and cannot remove a group from the registry.
 *
 * The RFC 2409 / RFC 3526 MODP groups, by modulus size.
 *
 * These are protocol constants, not names a consumer chose — `modp1` means
 * the 768-bit group to Node, to OpenSSL and to every peer on the wire, so
 * matching on the string is matching on the parameter itself. Logjam showed
 * 768-bit is breakable by a small budget and 1024-bit by a state-level one;
 * both are precomputation attacks against a *fixed* group, which is exactly
 * what a named group is.
 *
 * `modp14` (2048) and above are not listed: they are the reason a threshold
 * exists rather than a blocklist.
 */
const MODP_GROUP_BITS: ReadonlyMap<string, number> = new Map([
  ['modp1', 768],
  ['modp2', 1024],
  ['modp5', 1536],
  ['modp14', 2048],
  ['modp15', 3072],
  ['modp16', 4096],
  ['modp17', 6144],
  ['modp18', 8192],
]);

/**
 * @protocol-constant Curve names from the SEC, ANSI X9.62 and Brainpool
 * registries, as Node spells them in `crypto.getCurves()`. A curve's field
 * size is a property of the curve, not of the codebase using it, so the
 * membership here is not a heuristic a consumer should be able to overturn.
 * `additionalWeakCurves` extends the set and deliberately cannot shrink it:
 * a consumer may declare more curves unacceptable, never fewer.
 *
 * Named curves whose field size is under 224 bits.
 *
 * 224 is the floor because it is the smallest curve size NIST SP 800-57 still
 * admits, and `secp224r1` sits exactly on it. Everything here is below that:
 * the binary-field `sect*` curves, the small `secp*` and `prime*` curves, and
 * the two smallest Brainpool curves. `additionalWeakCurves` extends the list
 * without a release, because which curves a given deployment will accept is a
 * policy question and not one this rule should settle.
 */
const WEAK_CURVES: ReadonlySet<string> = new Set([
  'secp112r1',
  'secp112r2',
  'secp128r1',
  'secp128r2',
  'secp160k1',
  'secp160r1',
  'secp160r2',
  'secp192k1',
  'prime192v1',
  'prime192v2',
  'prime192v3',
  'sect113r1',
  'sect113r2',
  'sect131r1',
  'sect131r2',
  'sect163k1',
  'sect163r1',
  'sect163r2',
  'sect193r1',
  'sect193r2',
  'brainpoolP160r1',
  'brainpoolP192r1',
]);

/**
 * @protocol-constant Node's own call signature — the two `node:crypto` exports
 * that accept a MODP group name. This is an API surface, not a vocabulary;
 * letting a consumer edit it would let them re-assert the very calls the rule
 * reads.
 *
 * `getDiffieHellman('modp2')` and its alias both take a group name.
 */
const GROUP_APIS: ReadonlySet<string> = new Set([
  'getDiffieHellman',
  'createDiffieHellmanGroup',
]);

/**
 * @protocol-constant Node's own call signature for generating DH parameters.
 * An API surface rather than a word list, for the same reason as GROUP_APIS.
 *
 * `createDiffieHellman(1024)` takes a prime length in bits.
 */
const PRIME_LENGTH_APIS: ReadonlySet<string> = new Set(['createDiffieHellman']);

/**
 * @protocol-constant Node's own call signature for ECDH. An API surface rather
 * than a word list, for the same reason as GROUP_APIS.
 *
 * `createECDH('secp192k1')` takes a curve name.
 */
const CURVE_APIS: ReadonlySet<string> = new Set(['createECDH']);

/** The callee's own name, whether it is `crypto.f(…)` or a bare `f(…)`. */
function calleeName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
    return propertyName(node.callee);
  }
  if (node.callee.type === AST_NODE_TYPES.Identifier) {
    return node.callee.name;
  }
  return null;
}

export const noWeakDhParameters = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-dh-parameters',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-weak-dh-parameters.md',
      description:
        'Disallow Diffie-Hellman and ECDH parameters below a safe strength',
      cwe: 'CWE-326',
      // The devkit's canonical band for CWE-326. A rule does not get to label
      // its own findings more severe than the CWE it claims — that is what
      // `Severity labels must agree with the CVSS band they render` enforces,
      // and it caught this rule asserting HIGH over a 5.9 score.
      cvss: 5.9,
    },
    hasSuggestions: false,
    messages: {
      weakModpGroup: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Diffie-Hellman group',
        cwe: 'CWE-326',
        description:
          'MODP group {{group}} is {{bits}}-bit, below the {{minimum}}-bit floor. A named group is a fixed prime, so one precomputation breaks every session that used it — this is the Logjam attack.',
        severity: 'MEDIUM',
        fix: "Use crypto.getDiffieHellman('modp14') or larger, or prefer ECDH on a modern curve",
        documentationLink: 'https://weakdh.org',
      }),
      weakPrimeLength: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Diffie-Hellman prime length',
        cwe: 'CWE-326',
        description:
          'A {{bits}}-bit Diffie-Hellman prime is below the {{minimum}}-bit floor.',
        severity: 'MEDIUM',
        fix: 'crypto.createDiffieHellman({{minimum}})',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptocreatediffiehellmanprimelength-generator',
      }),
      weakCurve: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak elliptic curve',
        cwe: 'CWE-326',
        description:
          'Curve {{curve}} has a field size under 224 bits and does not offer contemporary security margins.',
        severity: 'MEDIUM',
        fix: "crypto.createECDH('prime256v1'), or 'secp384r1' for a larger margin",
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptocreateecdhcurvename',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minPrimeBits: {
            type: 'integer',
            minimum: 0,
            default: 2048,
            description: 'Smallest acceptable Diffie-Hellman prime, in bits',
          },
          additionalWeakCurves: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Curves to treat as weak beyond the built-in list',
          },
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow weak parameters in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { minPrimeBits: 2048, additionalWeakCurves: [], allowInTests: false },
  ],
  create(context) {
    const {
      minPrimeBits = 2048,
      additionalWeakCurves = [],
      allowInTests = false,
    } = context.options[0] ?? {};

    if (allowInTests && isTestFilePath(context.filename)) return {};

    const weakCurves = new Set([...WEAK_CURVES, ...additionalWeakCurves]);

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        const name = calleeName(node);
        if (name === null) return;

        const firstArg = node.arguments[0];
        if (firstArg === undefined) return;

        if (namesOneOf(name, GROUP_APIS)) {
          const resolved = resolveConstantString(context.sourceCode, firstArg);
          if (resolved === null) return;
          const bits = MODP_GROUP_BITS.get(resolved.value);
          // An unknown group name is not a weak one. Reporting names we have
          // no size for would turn every future RFC group into a finding.
          if (bits === undefined || bits >= minPrimeBits) return;
          context.report({
            node: firstArg,
            messageId: 'weakModpGroup',
            data: {
              group: resolved.value,
              bits: String(bits),
              minimum: String(minPrimeBits),
            },
          });
          return;
        }

        if (namesOneOf(name, PRIME_LENGTH_APIS)) {
          /*
           * `createDiffieHellman` is overloaded: a NUMBER is a prime length to
           * generate, a STRING or Buffer is a prime already chosen elsewhere.
           * Only the numeric form states a strength here; judging the other
           * would mean reading the prime, which is not something a structural
           * rule can do.
           */
          const resolved = resolveConstant(context.sourceCode, firstArg);
          if (resolved === null || typeof resolved.value !== 'number') return;
          if (resolved.value >= minPrimeBits) return;
          context.report({
            node: firstArg,
            messageId: 'weakPrimeLength',
            data: {
              bits: String(resolved.value),
              minimum: String(minPrimeBits),
            },
          });
          return;
        }

        if (namesOneOf(name, CURVE_APIS)) {
          const resolved = resolveConstantString(context.sourceCode, firstArg);
          if (resolved === null) return;
          if (!weakCurves.has(resolved.value)) return;
          context.report({
            node: firstArg,
            messageId: 'weakCurve',
            data: { curve: resolved.value },
          });
        }
      },
    };
  },
});
