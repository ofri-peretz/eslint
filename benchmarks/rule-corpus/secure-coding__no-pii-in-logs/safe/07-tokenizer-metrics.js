/**
 * SAFE - An LLM prompt-budget monitor. `tokenizerName` and `promptEmailTemplateId`
 * are configuration, not personal data: the second is a template ID, the id of a
 * message shape, and holds no recipient.
 *
 * Included because `email` is a whole word here and the value is still not PII -
 * the honest verdict on this file is "quiet", and a rule that reports it is
 * reading the property name rather than the data.
 */
import { countTokens } from '../llm/tokenizer.js';

export function reportPromptBudget(prompt, config) {
  console.log('tokenizer', config.tokenizerName);
  console.log('template', config.promptEmailTemplateId);
  console.log('tokens', countTokens(prompt));
}
