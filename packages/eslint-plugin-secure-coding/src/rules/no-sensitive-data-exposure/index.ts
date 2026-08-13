/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-data-exposure
 * Detects PII/credentials in logs, responses, or error messages
 * Priority 5: Security with Data Flow Analysis
 * CWE-532: Information Exposure Through Log Files
 * 
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'sensitiveDataExposure'
  | 'redactData'
  | 'useMasking'
  | 'removeFromLogs';

export interface Options {
  /** Sensitive data patterns. Default: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'] */
  sensitivePatterns?: string[];
  
  /** Check console.log statements. Default: true */
  checkConsoleLog?: boolean;
  
  /** Check error messages. Default: true */
  checkErrorMessages?: boolean;
  
  /** Check API responses. Default: true */
  checkApiResponses?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if string contains sensitive data patterns.
 * Handles camelCase (secretKey), snake_case (secret_key), and plain text.
 */
/**
 * Does a *standalone string literal* carry a credential?
 *
 * Distinct from `containsSensitiveData`, and deliberately so — they answer
 * different questions. An identifier named `password` is sensitive because of
 * what it holds, so the plain word match is right there. A string literal is
 * sensitive only when it carries a value; merely naming the concept is not a
 * leak. These were all reported on the wild corpus:
 *
 *   throw new Error('Token not found')                  token.service.js:58
 *   throw new Error('Invalid token type')               passport.js:14
 *   throw new Error('Password must contain at least
 *                   one letter and one number')         user.model.js:33
 *
 * The last is a validation message quoting a policy. None contains a
 * credential; each mentions one. Requiring `<word><separator><value>` keeps
 * `'password: hunter2'` reported and lets prose through, while
 * `'password: ' + password` stays caught by the identifier check on the
 * concatenation's right-hand side — which is why that path must keep using
 * the plain word match.
 */
function literalCarriesSecret(text: string, patterns: string[]): boolean {
  const normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return patterns.some((pattern) => {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    // Word, then a ':' or '=', then something non-empty.
    //
    // The gap between the word and the separator is at most ONE further short
    // word, which is what a multi-word label looks like ('phone number: ',
    // 'secret key: '). It used to be `[^:=\n]{0,24}` — 24 characters of
    // anything — and that is wide enough to swallow a clause. Shopify CLI
    // bin/github-utils.js:14 is the case:
    //
    //   console.warn(`Soft-error fetching password from dev: ${error.message}…`)
    //
    // "password" … "from dev" … ":" … an interpolation. The rule read that as
    // "label, separator, value" and reported a credential leak on a line that
    // logs an error message. A label sits against its separator; a sentence
    // that happens to contain a colon later does not become one.
    return new RegExp(
      `\\b${flexPattern}\\b[ _-]{0,2}(?:[a-z0-9]{1,12}[ _-]{0,2})?[:=]\\s*\\S`,
      'i',
    ).test(normalized);
  });
}

/**
 * Does a literal on the LEFT of a `+` label the value on its right?
 *
 * `'password: ' + password` and `'token=' + refreshToken` do: the literal ends
 * at the separator and the value follows. Prose that merely ends with the word
 * does not:
 *
 *   throw new Error('Error generating JWT token ' + err)
 *       twilio-node src/jwt/validation/ValidationToken.ts:145
 *
 * `err` is an exception, not a token; the sentence names the operation that
 * failed. The left-literal paths used the bare word match, which cannot tell
 * "here comes the secret" from "the word appeared in a sentence", so requiring
 * the separator is the whole distinction.
 */
function literalLabelsValue(text: string, patterns: string[]): string | null {
  const normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  for (const pattern of patterns) {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    if (new RegExp(`\\b${flexPattern}\\b\\s*[:=]\\s*$`, 'i').test(normalized)) {
      return pattern;
    }
  }
  return null;
}

/**
 * The trailing segment of these names describes the concept rather than
 * holding it. `apiKeyMsg` is a sentence about an API key; `passwordError` is
 * an error, not a password.
 *
 *   throw new Error("accountSid must start with AC" + apiKeyMsg)
 *       twilio-node src/base/BaseTwilio.ts:165
 *
 * `apiKeyMsg` holds ". The given SID indicates an API Key which requires …".
 * A credential-ish name is necessary but not sufficient — the same reasoning
 * `no-hardcoded-credentials` applies to values, applied to names.
 */
const DESCRIPTOR_SEGMENTS = new Set([
  'msg', 'message', 'error', 'err', 'label', 'prompt', 'hint',
  'description', 'desc', 'regex', 'pattern', 'placeholder',
  'warning', 'notice',
]);

/**
 * Does an IDENTIFIER (or property name) name a secret it actually holds?
 *
 * Only for names — never for prose. A string literal's words are checked by
 * `literalCarriesSecret`, which asks a different question.
 */
function identifierNamesSecret(name: string, patterns: string[]): string | null {
  const matched = containsSensitiveData(name, patterns);
  if (!matched) return null;
  const last = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(-1)
    .join('');
  return DESCRIPTOR_SEGMENTS.has(last) ? null : matched;
}

/**
 * Does this property access name a secret? `user.password`, `cfg['apiKey']`.
 *
 * The property is what carries the value, so it is checked first. The object
 * is checked too, because `credentials.value` names the secret on the left.
 * Computed access is read only when the key is a string literal — `obj[k]`
 * names nothing, and guessing would report on every dynamic lookup.
 */
function memberCarriesSecret(
  node: TSESTree.MemberExpression,
  patterns: string[]
): string | null {
  const prop = node.property;
  // `node.computed` is the whole distinction. In `user.password` the property
  // Identifier IS the name; in `user[password]` the identically-shaped node is
  // a *variable holding* the name, and reading it would report `obj[password]`
  // for a lookup whose key nobody can see statically.
  const propName = node.computed
    ? prop.type === AST_NODE_TYPES.Literal && typeof prop.value === 'string'
      ? prop.value
      : null
    : prop.type === AST_NODE_TYPES.Identifier
      ? prop.name
      : null;
  const fromProp = propName ? identifierNamesSecret(propName, patterns) : null;
  if (fromProp) return fromProp;
  return node.object.type === AST_NODE_TYPES.Identifier
    ? identifierNamesSecret(node.object.name, patterns)
    : null;
}

function containsSensitiveData(
  text: string,
  patterns: string[]
): string | null {
  // Normalize camelCase → space separated for matching (secretKey → secret key)
  const normalized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

  for (const pattern of patterns) {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow spaces or underscores as word separators (e.g. 'credit card' matches 'credit_card')
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    if (new RegExp(`\\b${flexPattern}\\b`, 'i').test(normalized)) {
      return pattern;
    }
  }
  return null;
}


/**
 * The same three advisory suggestions are offered at every report site. They
 * carry no autofix — redacting a value is a judgement the author has to make —
 * so they are defined once rather than reconstructed per site.
 */
const REDACTION_SUGGESTIONS = [
  { messageId: 'redactData' as const, fix: () => null },
  { messageId: 'useMasking' as const, fix: () => null },
  { messageId: 'removeFromLogs' as const, fix: () => null },
];

export const noSensitiveDataExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-exposure',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sensitive-data-exposure.md',
      description: 'Detects PII/credentials in logs, responses, or error messages',
      cwe: 'CWE-532',
      cvss: 5.3,
    },
    hasSuggestions: true,
    messages: {
      sensitiveDataExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive data exposure',
        cwe: 'CWE-532',
        description: 'Sensitive data detected in {{context}}: {{dataType}}',
        severity: 'HIGH',
        fix: 'Redact or mask sensitive data before logging/exposing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      redactData: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Redact Data',
        description: 'Redact sensitive data before logging',
        severity: 'LOW',
        fix: 'Redact sensitive fields before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      useMasking: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Masking',
        description: 'Use data masking function',
        severity: 'LOW',
        fix: 'maskSensitive(data)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      removeFromLogs: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove From Logs',
        description: 'Remove sensitive data from logs and errors',
        severity: 'LOW',
        fix: 'Filter sensitive data before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
            description: 'Sensitive data patterns',
          },
          checkConsoleLog: {
            type: 'boolean',
            default: true,
            description: 'Check console.log statements',
          },
          checkErrorMessages: {
            type: 'boolean',
            default: true,
            description: 'Check error messages',
          },
          checkApiResponses: {
            type: 'boolean',
            default: true,
            description: 'Check API responses',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sensitivePatterns: ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
      checkConsoleLog: true,
      checkErrorMessages: true,
      checkApiResponses: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
sensitivePatterns = ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
      checkConsoleLog = true,
      checkErrorMessages = true,
    
}: Options = options || {};

    /**
     * Check CallExpression for logging calls with sensitive data
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check if it's a logging call (console.*, logger.*)
      const isLoggingCall = (() => {
        if (node.callee.type === 'MemberExpression') {
          const object = node.callee.object;
          const property = node.callee.property;
          if (property.type === 'Identifier') {
            const methodName = property.name.toLowerCase();
            if (['log', 'info', 'warn', 'error', 'debug', 'trace'].includes(methodName)) {
              // Check if it's console.* or logger.*
              if (object.type === 'Identifier') {
                const objName = object.name.toLowerCase();
                if (objName === 'console' || objName === 'logger') {
                  return true;
                }
              }
            }
          }
        } else if (node.callee.type === 'Identifier') {
          // `log(…)`, `customLogger(…)`, `logDebug(…)` — a bare function whose
          // NAME says it logs.
          //
          // Word boundaries, not substrings. `'completeLogin'.includes('log')`
          // is true, so Shopify CLI's `completeLogin(page, url, email,
          // password)` was read as a logging call and its `password` argument
          // reported — 7 of this rule's 12 wild-corpus findings, on a function
          // that submits a login form and logs nothing.
          //
          // `login`, `logout`, `dialog`, `catalog`, `blog` all contain "log"
          // and none of them is a logger.
          const words = node.callee.name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .toLowerCase()
            .split(/[^a-z0-9]+/);
          if (words.includes('log') || words.includes('logger')) {
            return true;
          }
        }
        return false;
      })();

      if (isLoggingCall && checkConsoleLog) {

        // Check if any argument contains sensitive data
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            const matchedPattern = literalCarriesSecret(text, sensitivePatterns)
              ? containsSensitiveData(text, sensitivePatterns)
              : null;
            if (matchedPattern) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: matchedPattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            // `console.log('password: ' + password)` — the classic credential
            // leak to logs, and the case this rule most exists for. The
            // logging path handled only Literal and Identifier arguments, so
            // a concatenation of the two was silent: a pre-existing false
            // negative, mirrored from the `new Error(...)` path below which
            // already checked both sides.
            const side =
              (arg.left?.type === 'Literal' &&
              typeof arg.left.value === 'string' &&
              literalLabelsValue(arg.left.value, sensitivePatterns)
                ? { node: arg.left, pattern: literalLabelsValue(arg.left.value, sensitivePatterns) }
                : undefined) ??
              (arg.right?.type === 'Identifier' &&
              identifierNamesSecret(arg.right.name, sensitivePatterns)
                ? { node: arg.right, pattern: identifierNamesSecret(arg.right.name, sensitivePatterns) }
                : undefined);

            if (side?.pattern) {
              context.report({
                node: side.node,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: side.pattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === AST_NODE_TYPES.MemberExpression) {
            // `console.log(user.password)` — the shape the rule most exists
            // for, and it was silent. The logging path read Literal, `+` and
            // Identifier arguments only, so every property access carrying a
            // secret walked straight through. The `+` arm above was added for
            // the same class of gap; this is the other half of it.
            const matchedMember = memberCarriesSecret(arg, sensitivePatterns);
            if (matchedMember) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: { context: 'logs', dataType: matchedMember },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === AST_NODE_TYPES.TemplateLiteral) {
            // `` console.log(`token=${t}`) `` — an interpolation is exactly the
            // evidence the static-string guard looks for: unlike a constant,
            // a template splices a runtime value into the log line.
            //
            // Both halves are read. The interpolated expression names the
            // secret in `${apiKey}`; the surrounding text names it in
            // `` `password: ${value}` ``, where the expression is anonymous and
            // only the label says what is being logged.
            const fromExpression = arg.expressions
              .map((e) =>
                e.type === AST_NODE_TYPES.Identifier
                  ? identifierNamesSecret(e.name, sensitivePatterns)
                  : e.type === AST_NODE_TYPES.MemberExpression
                    ? memberCarriesSecret(e, sensitivePatterns)
                    : null,
              )
              .find((m): m is string => Boolean(m));
            // Only when something is actually interpolated: a template with no
            // expressions is a constant string, and reporting it would be the
            // prose false positive this guard exists to prevent.
            //
            // The quasis are joined with a placeholder standing in for each
            // interpolation, rather than tested one by one. `` `token=${t}` ``
            // splits into `token=` and ``, and neither half satisfies
            // "label, separator, then a value" — the value is the hole between
            // them. Substituting a non-space character for that hole makes the
            // same guard read the template the way a person does.
            const INTERPOLATION = '\u0001'; // cannot occur in source text
            const joined = arg.quasis
              .map((q) => q.value.cooked)
              .join(INTERPOLATION);
            // Only when something is actually interpolated: a template with no
            // expressions is a constant string, and reporting it would be the
            // prose false positive this guard exists to prevent.
            const fromText =
              arg.expressions.length > 0 &&
              literalCarriesSecret(joined, sensitivePatterns)
                ? containsSensitiveData(joined, sensitivePatterns)
                : null;
            const matchedTemplate = fromExpression ?? fromText;
            if (matchedTemplate) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: { context: 'logs', dataType: matchedTemplate },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === AST_NODE_TYPES.Identifier && arg.name) {
            const matchedPattern2 = identifierNamesSecret(arg.name, sensitivePatterns);
            if (matchedPattern2) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: matchedPattern2,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          }
        }
      }
    }
    
    /**
     * Check NewExpression for Error with sensitive data
     */
    function checkNewExpression(node: TSESTree.NewExpression) {
      if (!checkErrorMessages) {
        return;
      }

      if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Error') {
        // Check all arguments for sensitive data (report only once per error)
        for (const arg of node.arguments) {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            const matchedErrPattern = literalCarriesSecret(text, sensitivePatterns)
              ? containsSensitiveData(text, sensitivePatterns)
              : null;
            if (matchedErrPattern) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'error messages',
                  dataType: matchedErrPattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per error
            }
          } else if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            // Check left side if it's a literal
            if (arg.left && arg.left.type === 'Literal' && typeof arg.left.value === 'string') {
              const leftText = arg.left.value;
              // Not `literalCarriesSecret` here: in `'password: ' + password`
              // the label is on the left and the value on the right, so the
              // left literal legitimately ends at the separator — and it must
              // END there. See literalLabelsValue.
              const leftMatchedPattern = literalLabelsValue(leftText, sensitivePatterns);
              if (leftMatchedPattern) {
                context.report({
                  node: arg.left,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: leftMatchedPattern,
                  },
                  suggest: REDACTION_SUGGESTIONS,
                });
                return; // Only report once per error
              }
            }
            // Check right side if it's an identifier
            if (arg.right && arg.right.type === 'Identifier' && arg.right.name) {
              const rightMatchedPattern = identifierNamesSecret(arg.right.name, sensitivePatterns);
              if (rightMatchedPattern) {
                context.report({
                  node: arg.right,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: rightMatchedPattern,
                  },
                  suggest: REDACTION_SUGGESTIONS,
                });
                return; // Only report once per error
              }
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      NewExpression: checkNewExpression,
    };
  },
});


