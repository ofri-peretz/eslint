// Model of eslint-plugin-react-features/no-find-dom-node.
// `findDOMNode` is react-dom's deprecated escape hatch (removed in React 19):
// every call to react-dom's export is reported, however the module names it
// (named, renamed, default / namespace / computed member, require, the UMD
// global `ReactDOM`), plain or optional call. A function of the same name the
// file declares itself, or imports from another module, is not React's.
// Left out: a bare `findDOMNode(x)` the file never declares or imports (the
// module is unknown; the rule keeps reading it by name).
module no_find_dom_node {
  type Spelling = Named | Renamed | Default | Namespace | Computed | Require | Umd
                | Shadowed | Foreign
  type Call = Plain | Optional

  pure def reports(sp: Spelling, c: Call): bool =
    not(Set(Shadowed, Foreign).contains(sp))

  var spelling: Spelling
  var call: Call
  var verdict: bool

  action step = {
    nondet sp = Set(Named, Renamed, Default, Namespace, Computed, Require, Umd,
                    Shadowed, Foreign).oneOf()
    nondet c = Set(Plain, Optional).oneOf()
    all { spelling' = sp, call' = c, verdict' = reports(sp, c) }
  }

  action init = step
}
