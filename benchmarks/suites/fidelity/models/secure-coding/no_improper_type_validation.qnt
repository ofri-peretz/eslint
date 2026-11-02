// Model of eslint-plugin-secure-coding/no-improper-type-validation (CWE-1287).
// Contract: `typeof x === 'object'` with no null check is reported; with an
// explicit `x !== null &&` it is not. `instanceof` is reported only when
// allowInstanceofSameRealm is false (the option allows it otherwise).
// `x == true` (loose equality against an operand of unprovable type) is reported
// while checkLooseEquality. Array.isArray, strict equality and a non-object
// typeof check are the documented correct forms.
module no_improper_type_validation {
  type Kind = TypeofObjNoNull | TypeofObjNullChecked | TypeofString | InstanceofArray
            | InstanceofClass | ArrayIsArray | LooseEqTrue | StrictEqTrue

  pure def reports(k: Kind, allowSameRealm: bool, checkLoose: bool): bool = match k {
    | TypeofObjNoNull => true
    | TypeofObjNullChecked => false
    | TypeofString => false
    | InstanceofArray => not(allowSameRealm)
    | InstanceofClass => not(allowSameRealm)
    | ArrayIsArray => false
    | LooseEqTrue => checkLoose
    | StrictEqTrue => false
  }

  var kind: Kind
  var allowSameRealm: bool
  var checkLoose: bool
  var verdict: bool

  action step = {
    nondet k = Set(TypeofObjNoNull, TypeofObjNullChecked, TypeofString, InstanceofArray,
                   InstanceofClass, ArrayIsArray, LooseEqTrue, StrictEqTrue).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet c = Set(true, false).oneOf()
    all { kind' = k, allowSameRealm' = a, checkLoose' = c, verdict' = reports(k, a, c) }
  }

  action init = step
}
