/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: analytics-event-naming
 *
 * Vendor-neutral. Validates the first argument of analytics event-capture
 * calls against the naming grammar codified in ANALYTICS_PHILOSOPHY.md
 * principle 4:
 *
 *   `category:object_action`
 *
 * - `category` and `object` are lowercase snake_case identifiers.
 * - `action` is one of a fixed verb list (present tense): click, submit,
 *   view, add, remove, start, end, generate, send, cancel, fail, create,
 *   delete, update, invite.
 * - Vendor reserved events starting with `$` (e.g. PostHog `$pageview`,
 *   `$set`) are exempt.
 * - Template-literal event names are forbidden — they make the catalog
 *   unbounded (principle 3).
 *
 * Matched call shapes (covers PostHog, Segment, Mixpanel, Amplitude
 * conventions plus our own primitives):
 *
 * - `<obj>.capture(name, props)`  — PostHog
 * - `<obj>.track(name, props)`    — Segment / Mixpanel / Amplitude
 * - `track(name, props)`          — bare, our primitive
 *
 * Not matched:
 *
 * - `<obj>.identify(distinctId, props)` — first arg is a person id
 * - `<obj>.page(...)` / `pageview(...)` — event name is implicit
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'invalidEventName' | 'interpolatedEventName';
type RuleOptions = [];

// ANALYTICS_PHILOSOPHY.md principle 4 → fixed verb list. Edit there and
// here together.
const ACTION_VERBS = [
  'click',
  'submit',
  'view',
  'add',
  'remove',
  'start',
  'end',
  'generate',
  'send',
  'cancel',
  'fail',
  'create',
  'delete',
  'update',
  'invite',
].join('|');

const EVENT_NAME_RE = new RegExp(
  `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*_(${ACTION_VERBS})$|^\\$[a-z_]+$`,
);

export const analyticsEventNaming = createRule<RuleOptions, MessageIds>({
  name: 'analytics-event-naming',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/analytics-event-naming.md',
      description:
        'Analytics event names (track/capture) must follow ANALYTICS_PHILOSOPHY.md principle 4: lowercase snake_case, category:object_action, fixed verb list',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      invalidEventName: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid analytics event name',
        description:
          'Event "{{name}}" does not match category:object_action grammar (lowercase snake_case, action from fixed verb list).',
        severity: 'HIGH',
        fix: 'Rename to match `<category>:<object>_<verb>` where verb ∈ {click, submit, view, add, remove, start, end, generate, send, cancel, fail, create, delete, update, invite}. Vendor reserved events ($pageview, $set, …) are exempt.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/ANALYTICS_PHILOSOPHY.md',
      }),
      interpolatedEventName: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Interpolated analytics event name',
        description:
          'Event names must be static string literals. Template literals create an unbounded catalog (ANALYTICS_PHILOSOPHY.md principle 3).',
        severity: 'HIGH',
        fix: 'Move the dynamic part into an event property: track(\'category:object_view\', { slug }).',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/ANALYTICS_PHILOSOPHY.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function isCaptureLike(node: TSESTree.CallExpression): boolean {
      // <obj>.capture(...) — PostHog
      // <obj>.track(...)   — Segment / Mixpanel / Amplitude
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        (node.callee.property.name === 'capture' ||
          node.callee.property.name === 'track')
      ) {
        return true;
      }
      // bare track(...) — our primitive
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'track'
      ) {
        return true;
      }
      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isCaptureLike(node) || node.arguments.length === 0) return;
        const first = node.arguments[0];
        if (first.type === 'Literal' && typeof first.value === 'string') {
          if (!EVENT_NAME_RE.test(first.value)) {
            context.report({
              node: first,
              messageId: 'invalidEventName',
              data: { name: first.value },
            });
          }
          return;
        }
        if (first.type === 'TemplateLiteral' && first.expressions.length > 0) {
          context.report({
            node: first,
            messageId: 'interpolatedEventName',
          });
        }
      },
    };
  },
});
