/**
 * Second-order: the pattern is read from a database row, not from the request.
 *
 * Tenant admins author "content moderation rules" in the UI; the worker compiles
 * them. The taint entered the system on a different day through a different
 * endpoint, so nothing in this file looks like user input — and that is exactly
 * why "does the program prove this value?" is the right question rather than
 * "does it come from `req`?".
 */
import { moderationRuleRepository } from '../repositories/moderation-rule-repository.js';

export async function scanComment(comment) {
  const rules = await moderationRuleRepository.enabledFor(comment.tenantId);

  for (const rule of rules) {
    const expression = new RegExp(rule.pattern, rule.flags);
    if (expression.test(comment.body)) {
      return { blocked: true, ruleId: rule.id };
    }
  }

  return { blocked: false };
}
