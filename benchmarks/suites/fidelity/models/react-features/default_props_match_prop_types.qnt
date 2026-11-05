// Model of eslint-plugin-react-features/default-props-match-prop-types.
// A default prop whose literal value has a different type from the prop's
// `prop-types` validator is reported: `PropTypes.string` with `42`,
// `PropTypes.number` with `"zero"`, `PropTypes.bool` with `0`. The validator is
// read by binding to the `prop-types` module (`PropTypes.x`, `PropTypes['x']`,
// a renamed default import, a named import, `.isRequired`), the key in either
// spelling, on a class's static fields or on `Comp.propTypes = ...` /
// `Comp.defaultProps = ...` assignments. `null` is a valid value for any
// non-required validator; a non-literal default and any other validator
// (`func`, `shape`, ...) are not judged.
module default_props_match_prop_types {
  type Validator = VString | VNumber | VBool | VFunc
  type Value = StrLit | Template | NumLit | Negative | BoolLit | NullLit | Dynamic
  type PtSpelling = Member | Computed | Renamed | NamedImport | IsRequired
  type Form = StaticField | Assigned
  type Key = Ident | Quoted

  pure def kind(v: Value): str =
    if (v == StrLit or v == Template) "string"
    else if (v == NumLit or v == Negative) "number"
    else if (v == BoolLit) "bool"
    else "other"
  pure def vkind(t: Validator): str =
    if (t == VString) "string" else if (t == VNumber) "number"
    else if (t == VBool) "bool" else "other"
  pure def reports(t: Validator, v: Value): bool =
    vkind(t) != "other" and kind(v) != "other" and vkind(t) != kind(v)

  var validator: Validator
  var value: Value
  var ptSpelling: PtSpelling
  var form: Form
  var key: Key
  var verdict: bool

  action step = {
    nondet t = Set(VString, VNumber, VBool, VFunc).oneOf()
    nondet v = Set(StrLit, Template, NumLit, Negative, BoolLit, NullLit, Dynamic).oneOf()
    nondet p = Set(Member, Computed, Renamed, NamedImport, IsRequired).oneOf()
    nondet f = Set(StaticField, Assigned).oneOf()
    nondet k = Set(Ident, Quoted).oneOf()
    all { validator' = t, value' = v, ptSpelling' = p, form' = f, key' = k,
          verdict' = reports(t, v) }
  }

  action init = step
}
