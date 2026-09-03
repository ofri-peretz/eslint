/**
 * VULNERABLE - `(\d+|\s)*`: an alternation under a star where one branch is
 * itself quantified. The engine can split one digit run at every boundary, and
 * a trailing character outside both branches makes every split fail. Seen in
 * duration and quantity parsers.
 */
export class DurationParser {
  static PATTERN = /^(\d+|\s)*$/;

  static isDuration(raw) {
    return DurationParser.PATTERN.test(raw);
  }
}
