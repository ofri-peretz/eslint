/**
 * SAFE - Every quantifier here has a finite upper bound, and the ones that
 * repeat are anchored against disjoint neighbours. `{1,10}` looks like the
 * unbounded `+` to a text matcher and behaves nothing like it.
 */
const JIRA_KEY = /^[A-Z]{2,10}-[0-9]{1,10}$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export function parseIssueRef(raw) {
  return JIRA_KEY.test(raw) ? raw : null;
}

export function isColor(raw) {
  return HEX_COLOR.test(raw);
}

export function isIsoDate(raw) {
  return ISO_DATE.test(raw);
}
