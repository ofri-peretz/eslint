/**
 * SAFE (adversarial) - A local class that happens to be called `RegExp`. It is
 * not the global constructor and compiles nothing; the file shadows the builtin
 * entirely.
 *
 * JUDGEMENT: safe for THIS rule (CWE-400 is about the regex engine). Shadowing
 * a builtin is its own code smell and belongs to a different rule.
 */
class RegExp {
  constructor(descriptor) {
    this.descriptor = descriptor;
  }

  describe() {
    return `pattern(${this.descriptor})`;
  }
}

export function describePattern(req) {
  return new RegExp(req.query.pattern).describe();
}
