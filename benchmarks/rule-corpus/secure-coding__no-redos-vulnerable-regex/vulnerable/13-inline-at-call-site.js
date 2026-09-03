/**
 * VULNERABLE (adversarial) - The regex never reaches a variable. It appears as
 * an inline argument, as a class field initialiser, and as a default parameter
 * value. A rule that only visits `const X = /.../` declarations sees none of
 * these.
 */
export class TranscriptCleaner {
  static WORD_RUN = /^(\w+\s*)+$/;

  normalise(text, splitter = /^(\w+\s*)+$/) {
    return text.replace(/^(\w+\s*)+$/gm, (line) => line.trim()).split(splitter);
  }
}
