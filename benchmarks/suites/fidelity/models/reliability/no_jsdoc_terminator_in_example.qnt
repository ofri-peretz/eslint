// Model of eslint-plugin-reliability/no-jsdoc-terminator-in-example.
// The contract: report a comment terminator written inside a JSDoc `@example`.
// A block comment ends at its FIRST terminator, so in any file that parses, no
// block comment's text contains one: the doc's "incorrect" inputs are parse
// errors, which the parser already reports, never findings. What remains are
// the safe spellings an `@example` uses to show the pattern - split across a
// concatenation, a fenced block, an escaped slash, a spaced star - and line
// comments, which may hold the two characters but are not JSDoc. Every one is
// silent; the rule is deprecated for exactly this reason.
module no_jsdoc_terminator_in_example {
  type Content = SplitConcat | FencedEscaped | EscapedSlash | SpacedStar | GlobQuoted | NoPattern
  type Host = FunctionJsdoc | MethodJsdoc | PlainBlock | LineComments

  pure def reports(c: Content, h: Host): bool = false

  var content: Content
  var host: Host
  var verdict: bool

  action step = {
    nondet c = Set(SplitConcat, FencedEscaped, EscapedSlash, SpacedStar, GlobQuoted, NoPattern).oneOf()
    nondet h = Set(FunctionJsdoc, MethodJsdoc, PlainBlock, LineComments).oneOf()
    all { content' = c, host' = h, verdict' = reports(c, h) }
  }

  action init = step
}
