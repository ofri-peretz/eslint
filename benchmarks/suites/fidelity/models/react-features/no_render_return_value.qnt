// Model of eslint-plugin-react-features/no-render-return-value.
// react-dom's legacy `render` returns the root instance, which is deprecated
// (and null under concurrent rendering). Reported: a call to react-dom's
// `render`, through any spelling of the module (named, renamed, default /
// namespace / computed member, the UMD global `ReactDOM`), whose result the
// code uses: a variable initialiser, an assignment, a `return`, an argument.
// Not reported: the call as a statement (result discarded); a `render` the
// file declares itself, a local object's `render`, or one imported from
// another module.
// Left out: an arrow's implicit return (`() => ReactDOM.render(…)`), where the
// caller may discard the value; a bare `render(…)` the file never imports.
module no_render_return_value {
  type Spelling = Named | Renamed | Default | Namespace | Computed | Umd | Shadowed
                | LocalObject | Foreign
  type Use = Statement | VarInit | Assign | Return | Argument

  pure def isReactDom(s: Spelling): bool =
    not(Set(Shadowed, LocalObject, Foreign).contains(s))
  pure def reports(s: Spelling, u: Use): bool = isReactDom(s) and u != Statement

  var spelling: Spelling
  var use: Use
  var verdict: bool

  action step = {
    nondet s = Set(Named, Renamed, Default, Namespace, Computed, Umd, Shadowed, LocalObject,
                   Foreign).oneOf()
    nondet u = Set(Statement, VarInit, Assign, Return, Argument).oneOf()
    all { spelling' = s, use' = u, verdict' = reports(s, u) }
  }

  action init = step
}
