// CWE-1007: Safe — the filler is spelled as a visible escape and Korean copy is real text
// @author      claude-sonnet-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-26
// This MUST NOT be flagged — the escape \u3164 is six visible characters, and the Hangul syllables and jamo U+3131/U+314F are ordinary visible Korean letters (FP lock for a range-based check)
const HANGUL_FILLER = '\u3164';

const GREETING = '안녕하세요';
const CONSONANT_GIYEOK = 'ㄱ';
const VOWEL_A = 'ㅏ';

function stripFiller(input) {
  return input.split(HANGUL_FILLER).join('');
}

function formatGreeting(name) {
  return `${GREETING}, ${stripFiller(name)} (${CONSONANT_GIYEOK}${VOWEL_A})`;
}
