// Model of eslint-plugin-conventions/consistent-existence-index-check.
// One question - does the object have this property - has three families of
// spelling: `key in obj`; the `hasOwnProperty` family (`obj.hasOwnProperty(k)`,
// `obj['hasOwnProperty'](k)`, `Object.prototype.hasOwnProperty.call(obj, k)`);
// and `Object.hasOwn(obj, k)` (also reached as `globalThis.Object.hasOwn`).
// `preferred` (default `Object.hasOwn`) picks one family; the rule reports
// every check written in another. It does not report:
//   - a check already in the preferred family;
//   - `#field in obj` (a private brand check no other form can express) and
//     `for (const k in obj)` (iteration, not a check);
//   - a `hasOwn` method of some other object.
module consistent_existence_index_check {
  type Form = In | InPrivate | ForIn | OwnMethod | OwnSubscript | ProtoCall
    | HasOwn | HasOwnGlobalThis | OtherHasOwn
  type Preferred = PrefHasOwn | PrefIn | PrefHasOwnProperty

  pure def family(f: Form): str =
    if (f == In) "in"
    else if (Set(OwnMethod, OwnSubscript, ProtoCall).contains(f)) "hasOwnProperty"
    else if (Set(HasOwn, HasOwnGlobalThis).contains(f)) "Object.hasOwn"
    else "none"

  pure def name(p: Preferred): str =
    if (p == PrefIn) "in" else if (p == PrefHasOwnProperty) "hasOwnProperty" else "Object.hasOwn"

  pure def reports(f: Form, p: Preferred): bool = family(f) != "none" and family(f) != name(p)

  var form: Form
  var preferred: Preferred
  var verdict: bool

  action step = {
    nondet f = Set(In, InPrivate, ForIn, OwnMethod, OwnSubscript, ProtoCall,
                   HasOwn, HasOwnGlobalThis, OtherHasOwn).oneOf()
    nondet p = Set(PrefHasOwn, PrefIn, PrefHasOwnProperty).oneOf()
    all { form' = f, preferred' = p, verdict' = reports(f, p) }
  }

  action init = step
}
