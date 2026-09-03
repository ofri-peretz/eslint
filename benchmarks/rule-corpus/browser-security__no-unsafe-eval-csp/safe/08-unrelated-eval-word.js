/** SAFE - "eval" appears as an ordinary English word in unrelated product
 *  copy and as part of an identifier. Neither is a CSP directive. */
const evaluationCriteria = ['speed', 'safety'];
const banner = 'Free evaluation — no unsafe assumptions, no credit card.';

export function renderEvaluation() {
  return { banner, evaluationCriteria };
}
