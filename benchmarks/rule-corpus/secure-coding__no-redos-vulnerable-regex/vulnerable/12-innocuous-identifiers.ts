/**
 * VULNERABLE (adversarial, false-negative direction) - The catastrophic URL
 * validator from vulnerable/03, with every identifier renamed to something
 * boring: no `regex`, no `pattern`, no `validate`, no `url`. If detection
 * depends on what things are called, this file goes quiet. It should not: the
 * evidence is the automaton, not the vocabulary.
 */
export class Catalogue {
  private static readonly shape =
    /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  public accepts(entry: string): boolean {
    return Catalogue.shape.test(entry);
  }
}
