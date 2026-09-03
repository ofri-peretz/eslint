/**
 * SAFE - A hand-written lexer that scans for the literal text `.match(` and
 * `.test(`. The strings it compares against, and the comments describing the
 * scan, contain the exact substrings this rule's DoS heuristics look for.
 *
 * Nothing here is a regex call and nothing here is pagination. Every loop is
 * bounded by `source.length`. A report in this file proves the check reads
 * printed source rather than structure - which is exactly the `textual-matching`
 * probe in docs/rule-ledger/secure-coding__no-unchecked-loop-condition.md.
 */
const REGEX_CALL_TOKENS = ['.match(', '.test('];

export function findRegexCalls(source) {
  const hits = [];
  let cursor = 0;
  // Walk to the next '.match(' occurrence; startIndex is inclusive and
  // endIndex is exclusive, matching Array.prototype.slice.
  while (source.slice(cursor, cursor + 7) !== '.match(' && cursor < source.length) {
    cursor += 1;
  }
  for (let i = 0; i < /* stop before endIndex */ source.length; i++) {
    if (REGEX_CALL_TOKENS.some((token) => source.startsWith(token, i))) {
      hits.push(i);
    }
  }
  return hits;
}
