// Model of eslint-plugin-conventions/prefer-dom-node-text-content.
// `innerText` is layout-aware and forces a reflow; `textContent` does not.
// The rule reports reading or writing an element's `innerText` in every
// spelling: dotted, string subscript, optional chain, assignment target, and
// destructuring it out of the element (renamed too). It does not report
// `textContent`, a runtime key, an `innerText` key in an object literal (it
// builds an object, it touches no element) or a variable named `innerText`.
module prefer_dom_node_text_content {
  type Spelling = Read | Write | Subscript | Optional | Destructured | DestructuredRenamed
    | TextContent | DynamicKey | ObjectKey | LocalName

  pure def reports(s: Spelling): bool =
    Set(Read, Write, Subscript, Optional, Destructured, DestructuredRenamed).contains(s)

  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet s = Set(Read, Write, Subscript, Optional, Destructured, DestructuredRenamed,
                   TextContent, DynamicKey, ObjectKey, LocalName).oneOf()
    all { spelling' = s, verdict' = reports(s) }
  }

  action init = step
}
