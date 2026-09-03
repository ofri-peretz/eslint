/**
 * SAFE - The textual-matching probe. This rule is ledger-flagged for taking
 * decisions on `sourceCode.getText(condition)` rather than on the AST, so every
 * spelling it keys on appears here inside STRING LITERALS and COMMENTS, in a
 * file whose only real loop is bounded by a local constant.
 *
 * A report here proves the check reads printed text rather than structure:
 * text matching cannot tell a loop condition from the same words in prose.
 */
const CHANGELOG = [
  'Removed `while (true)` from the drain loop in v2.1.',
  'Loop bound `i < req.query.pages` is now clamped to MAX_PAGES.',
  'req.body.count no longer reaches any for-statement.',
  'Replaced do...while (remaining > 0) with a bounded scheduler.',
];

// The old code was: for (let i = 0; i < req.body.count; i++) { ... }
// It has been deleted. See vulnerable/02-binding-hop.js for the shape.
const ENTRY_LIMIT = 4;

function renderChangelog() {
  const lines = [];
  for (let i = 0; i < ENTRY_LIMIT; i++) {
    lines.push(`- ${CHANGELOG[i]}`);
  }
  return lines.join('\n');
}

module.exports = { renderChangelog, CHANGELOG };
