/**
 * Tests for analytics-event-naming rule.
 * Vendor-neutral. Matches track/capture call shapes across PostHog,
 * Segment, Mixpanel, Amplitude, and our bare track() primitive.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { analyticsEventNaming } from '../../rules/conventions/analytics-event-naming';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('analytics-event-naming', () => {
  ruleTester.run(
    'analytics-event-naming',
    analyticsEventNaming,
    {
      valid: [
        // Our bare track() primitive.
        { code: 'track("articles:card_click", { id: 1 });' },
        { code: 'track("articles:search_submit", { q: "x" });' },
        { code: 'track("homepage:hero_cta_click", {});' },
        { code: 'track("rule_page:doc_view", { slug: "x" });' },
        { code: 'track("signup_flow:submit_send", {});' },
        // PostHog convention.
        { code: 'posthog.capture("articles:card_click", { id: 1 });' },
        { code: 'ph.capture("homepage:hero_view", {});' },
        // PostHog reserved events ($-prefixed) — exempt.
        { code: 'posthog.capture("$pageview");' },
        { code: 'posthog.capture("$set", { is_internal_user: true });' },
        { code: 'posthog.capture("$identify");' },
        // Segment/Mixpanel/Amplitude convention.
        { code: 'analytics.track("articles:card_click", {});' },
        { code: 'mixpanel.track("articles:card_click", {});' },
        // .identify() is not validated — first arg is a person id.
        { code: 'posthog.identify("user-123", { email: "x@example.com" });' },
        { code: 'analytics.identify("CamelCaseUserId");' },
        // Non-analytics calls are ignored.
        { code: 'fetch("/api/anything");' },
        { code: 'callback(someValue);' },
      ],
      invalid: [
        // CamelCase event name.
        {
          code: 'track("ArticlesCardClick", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Missing colon (no category separator).
        {
          code: 'track("articles_card_click", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Past-tense verb (forbidden by philosophy principle 4).
        {
          code: 'track("articles:card_clicked", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Verb not in the fixed list.
        {
          code: 'track("articles:card_pressed", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Uppercase characters.
        {
          code: 'track("Articles:Card_Click", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Interpolated event name.
        {
          code: 'track(`articles:card_${verb}`, {});',
          errors: [{ messageId: 'interpolatedEventName' }],
        },
        // Same for posthog.capture.
        {
          code: 'posthog.capture("BAD_NAME", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
        // Same for analytics.track (Segment).
        {
          code: 'analytics.track("articles:card_clicked", {});',
          errors: [{ messageId: 'invalidEventName' }],
        },
      ],
    },
  );
});
