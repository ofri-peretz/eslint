---
title: analytics-event-naming
description: "Analytics event names (track/capture) must follow ANALYTICS_PHILOSOPHY.md principle 4: lowercase snake_case, category:object_action, fixed verb list"
tags: ['quality', 'conventions']
category: quality
autofix: false
---

> Enforce the `category:object_action` grammar on every analytics event name

<!-- @rule-summary -->

Analytics event names (track/capture) must follow ANALYTICS_PHILOSOPHY.md principle 4: lowercase snake_case, category:object_action, fixed verb list
<!-- @/rule-summary -->

## Rule Details

Analytics events are a published schema: every dashboard, insight, funnel and
alert downstream depends on their names. A name that drifts from the grammar is
a silent fork of that schema — `articles_card_click` and `articles:card_click`
become two events that never aggregate together.

The rule checks the first argument of `track(...)` and `posthog.capture(...)`:

- lowercase snake_case only
- a `category:` prefix followed by `object_action`
- the action verb must come from the fixed verb list (e.g. `click`, `view`,
  `submit`) — invented synonyms like `clicked` or `pressed` are rejected so the
  same interaction never ships under two spellings

The name is read in every spelling the code fixes it: a quoted string, a
template literal without placeholders, and a `const` bound to either
(`const EVENT = 'articles:card_click'; track(EVENT)`). Vendor-reserved events
(`$pageview`, `$set`, …) are exempt.

A template literal WITH a placeholder (`` track(`articles:${slug}_view`) ``)
is reported as `interpolatedEventName`: it mints an unbounded catalog of
event names. Move the dynamic part into an event property instead.

A name the code does not fix — a parameter, a value from another module — is
not reported: an unknown name is not a finding.

## Examples

### ❌ Incorrect

```js
track('ArticlesCardClick', {});      // not snake_case
track('articles_card_click', {});    // missing category separator
track('articles:card_clicked', {});  // verb not in the fixed list
track(`articles:${slug}_view`, {});   // interpolated name
```

### ✅ Correct

```js
track('articles:card_click', { id: 1 });
track('homepage:hero_cta_click', {});
posthog.capture('articles:search_submit', { q: 'x' });
```

## Configuration Examples

### Basic Usage

```js
// eslint.config.js
{
  rules: {
    'conventions/analytics-event-naming': 'error',
  },
}
```

## When Not To Use It

A codebase with a pre-existing event taxonomy it cannot migrate. Renaming a
published event orphans its history — for that codebase, freeze this rule off
rather than half-adopting the grammar.
