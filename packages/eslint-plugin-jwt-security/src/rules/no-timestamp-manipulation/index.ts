/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-timestamp-manipulation
 *
 * Detects patterns that disable automatic timestamp (iat) generation.
 * This enables the "Back to the Future" replay attack (LightSEC 2025).
 *
 * CWE-294: Authentication Bypass by Capture-replay
 *
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  isSignOperation,
  isVerifyOperation,
  jwtConfigOf,
  resolveCallOptions,
  getOptionValue,
  staticNumber,
} from '../../utils';
import type { ResolvedObject } from '../../utils';
import type { NoTimestampManipulationOptions } from '../../types';

type MessageIds =
  | 'timestampDisabled'
  | 'noTimestampTrue'
  | 'ignoreExpiration'
  | 'excessiveClockTolerance';

type RuleOptions = [NoTimestampManipulationOptions?];

/** Five minutes: generous clock skew between two servers, and no more. */
const DEFAULT_MAX_CLOCK_TOLERANCE_SECONDS = 300;

export const noTimestampManipulation = createRule<RuleOptions, MessageIds>({
  name: 'no-timestamp-manipulation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-timestamp-manipulation.md',
      description:
        'Prevent disabling automatic timestamp generation which enables replay attacks',
      cwe: 'CWE-294',
      cvss: 7.5,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      timestampDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timestamp Generation Disabled',
        cwe: 'CWE-294',
        description:
          'noTimestamp:true disables iat claim, enabling replay attacks',
        severity: 'HIGH',
        fix: 'Remove noTimestamp option or set to false',
        documentationLink:
          'https://securitypattern.com/post/jwt-back-to-the-future',
      }),
      noTimestampTrue: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Back to the Future Attack Vector',
        cwe: 'CWE-294',
        description:
          'Disabling timestamps allows attackers to forge tokens valid in the future',
        severity: 'HIGH',
        fix: 'Always include iat claim for freshness validation',
        documentationLink:
          'https://securitypattern.com/post/jwt-back-to-the-future',
      }),
      ignoreExpiration: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Expiration Check Disabled',
        cwe: 'CWE-613',
        // CWE-613's catalogue default (5.4) is MEDIUM; a token that never
        // expires is the rule's own 7.5 / HIGH.
        cvss: 7.5,
        description:
          'ignoreExpiration:true accepts expired tokens, so a stolen token never stops working',
        severity: 'HIGH',
        fix: 'Remove ignoreExpiration; refresh the token instead of accepting an expired one',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      excessiveClockTolerance: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Excessive Clock Tolerance',
        cwe: 'CWE-613',
        cvss: 7.5,
        description:
          'A clockTolerance far beyond clock skew keeps expired tokens valid for that long',
        severity: 'HIGH',
        fix: 'Keep clockTolerance to seconds of skew (maxClockToleranceSeconds, default 300)',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxClockToleranceSeconds: {
            type: 'number',
            minimum: 0,
            default: DEFAULT_MAX_CLOCK_TOLERANCE_SECONDS,
            description:
              'Largest numeric clockTolerance (seconds) a verify may allow',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      maxClockToleranceSeconds: DEFAULT_MAX_CLOCK_TOLERANCE_SECONDS,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode;
    const { maxClockToleranceSeconds = DEFAULT_MAX_CLOCK_TOLERANCE_SECONDS } =
      context.options[0] ?? {};

    /** Report `options[name]` when it is the literal `true`. */
    const reportLiteralTrue = (
      options: ResolvedObject,
      name: string,
      messageId: MessageIds,
    ): void => {
      const value = getOptionValue(options, name);
      if (value?.type === 'Literal' && value.value === true) {
        context.report({ node: value, messageId });
      }
    };

    /**
     * passport-jwt's `new Strategy({ ignoreExpiration })` and fast-jwt's
     * `createVerifier({ ignoreExpiration })` take the same switch in a config
     * object.
     */
    const checkConfig = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): void => {
      const config = jwtConfigOf(node, sourceCode);
      if (config !== null) {
        reportLiteralTrue(
          config.options,
          'ignoreExpiration',
          'ignoreExpiration',
        );
      }
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        checkConfig(node);

        // Options resolved structurally: a const, an `as` cast, a spread.
        if (isSignOperation(node, sourceCode)) {
          const options = resolveCallOptions(node, sourceCode);
          if (options !== null) {
            reportLiteralTrue(options, 'noTimestamp', 'noTimestampTrue');
          }
          return;
        }

        /*
         * The verify-side twin of `noTimestamp`. `ignoreExpiration: true`
         * accepts a token whose `exp` has passed, which turns every leaked
         * token into a permanent one. It is copied from answers to "jwt
         * expired" errors and then shipped.
         */
        if (isVerifyOperation(node, sourceCode)) {
          const options = resolveCallOptions(node, sourceCode);
          if (options !== null) {
            reportLiteralTrue(options, 'ignoreExpiration', 'ignoreExpiration');
            /*
             * `clockTolerance` is skew allowance: seconds by which `exp` and
             * `nbf` are stretched. A year of "tolerance" is `ignoreExpiration`
             * by another name. Only a value that is a number in every run —
             * a literal, a same-file const, `+ - * /` over those — is judged;
             * jose's duration strings and runtime values are not.
             */
            const tolerance = getOptionValue(options, 'clockTolerance');
            const seconds =
              tolerance === undefined
                ? null
                : staticNumber(tolerance, sourceCode);
            if (seconds !== null && seconds > maxClockToleranceSeconds) {
              context.report({
                node: tolerance!,
                messageId: 'excessiveClockTolerance',
              });
            }
          }
        }
      },
      NewExpression: checkConfig,
    };
  },
});

export default noTimestampManipulation;
