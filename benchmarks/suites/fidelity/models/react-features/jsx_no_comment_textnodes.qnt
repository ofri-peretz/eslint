// Model of eslint-plugin-react-features/jsx-no-comment-textnodes.
// JSX has no comment syntax between tags: `<div>// note</div>` renders the
// characters on the page. Reported: JSX text, a child of an element or of a
// fragment, with a line that starts with `//` or `/*`.
// Not reported: the same characters in braces (a string expression), in an
// attribute value, or in the middle of a line of text (a URL).
module jsx_no_comment_textnodes {
  type Place = Child | FragmentChild | Braced | Attribute
  type Text = LineComment | BlockComment | SecondLine | Url | Words

  pure def startsLine(t: Text): bool =
    Set(LineComment, BlockComment, SecondLine).contains(t)
  pure def isJsxText(p: Place): bool = p == Child or p == FragmentChild
  pure def reports(p: Place, t: Text): bool = isJsxText(p) and startsLine(t)

  var place: Place
  var text: Text
  var verdict: bool

  action step = {
    nondet p = Set(Child, FragmentChild, Braced, Attribute).oneOf()
    nondet t = Set(LineComment, BlockComment, SecondLine, Url, Words).oneOf()
    all { place' = p, text' = t, verdict' = reports(p, t) }
  }

  action init = step
}
