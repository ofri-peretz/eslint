/**
 * SAFE (adversarial) - `totalTokens` is a COUNT. Every project that calls an
 * LLM has this file, and a usage counter is not a credential. A report here
 * proves the rule matches characters rather than words.
 */
function summarizeUsage(usage) {
  const summary = { ...usage };
  delete summary.totalTokens;
  delete summary.promptTokens;
  delete summary.completionTokens;
  return summary;
}

module.exports = { summarizeUsage };
