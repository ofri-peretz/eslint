// Model of eslint-plugin-react-features/no-adjacent-inline-elements.
// Two inline host elements (`<em>`, `<b>`, `<a>`, `<span>`, ...) rendered
// with nothing between them run together. Reported when nothing is written
// between them, or only an empty `{/* comment */}`. Separated, so silent: a
// space, text, a braced string `{' '}`, and a dynamic child the file cannot
// see (`{value}`). A block element or a component on either side is not
// judged. Children of a fragment are siblings the same way.
// Judgment call (silent): elements on their own lines. JSX drops that
// whitespace, but the doc's own "correct" example lays such spans out with a
// flex gap, which the file cannot see.
module no_adjacent_inline_elements {
  type Between = Nothing | Space | Newline | Text | BracedSpace | Dynamic | Comment
  type Pair = InlineInline | InlineBlock | CompInline
  type Parent = Element | Fragment

  pure def reports(b: Between, p: Pair): bool =
    p == InlineInline and Set(Nothing, Comment).contains(b)

  var between: Between
  var pair: Pair
  var parent: Parent
  var verdict: bool

  action step = {
    nondet b = Set(Nothing, Space, Newline, Text, BracedSpace, Dynamic, Comment).oneOf()
    nondet p = Set(InlineInline, InlineBlock, CompInline).oneOf()
    nondet pa = Set(Element, Fragment).oneOf()
    all { between' = b, pair' = p, parent' = pa, verdict' = reports(b, p) }
  }

  action init = step
}
