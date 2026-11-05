// Model of eslint-plugin-react-features/require-default-props.
// In a React class component (by binding) every prop its `propTypes` object
// declares as optional (no `.isRequired`) needs a default in `defaultProps`;
// one with none is reported. With `forbidDefaultForRequired: true`, a default
// given for an `.isRequired` prop is reported too. Both statics are read in
// every spelling: `static propTypes`, `static ['propTypes']`, or
// `App.propTypes = …` after the class, and a prop key quoted or bare. A class
// that is not a React component is silent.
// Left out: candidate for change (fires on a guess): a `defaultProps` built
// with a spread (`{ ...base }` may carry the default). Also left out:
// function components, and a class extending an undeclared bare `Component`.
module require_default_props {
  type Req = Optional | Required
  type Dflt = NoDefault | InStatic | InAssigned
  type PropDecl = StaticField | ComputedField | Assigned
  type KeySpelling = Ident | Quoted
  type Super = Default | Renamed | Foreign
  type Opt = Defaults | Forbid

  pure def reports(r: Req, d: Dflt, s: Super, o: Opt): bool =
    s != Foreign and
    ((r == Optional and d == NoDefault) or (o == Forbid and r == Required and d != NoDefault))

  var req: Req
  var dflt: Dflt
  var propDecl: PropDecl
  var keySpelling: KeySpelling
  var sup: Super
  var opt: Opt
  var verdict: bool

  action step = {
    nondet r = Set(Optional, Required).oneOf()
    nondet d = Set(NoDefault, InStatic, InAssigned).oneOf()
    nondet p = Set(StaticField, ComputedField, Assigned).oneOf()
    nondet k = Set(Ident, Quoted).oneOf()
    nondet s = Set(Default, Renamed, Foreign).oneOf()
    nondet o = Set(Defaults, Forbid).oneOf()
    all { req' = r, dflt' = d, propDecl' = p, keySpelling' = k, sup' = s, opt' = o,
          verdict' = reports(r, d, s, o) }
  }

  action init = step
}
