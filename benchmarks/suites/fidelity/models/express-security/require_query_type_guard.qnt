// Model of eslint-plugin-express-security/require-query-type-guard (CWE-843).
// qs gives every req.query value as string | string[] | object, so a string
// method (replace, trim, toLowerCase, split, substring, slice, startsWith,
// endsWith, includes, match, toUpperCase) on a raw query value, directly or
// through a variable assigned from it, is reported unless the value is proven
// a string first: a typeof guard (inline or early return), an Array.isArray +
// typeof rejection, a coercer (String by default) or a validator (parse /
// safeParse by default). A guard on another property clears nothing. The
// `coercers` / `validators` options replace their defaults; the non-default
// run uses coercers ['String', 'toStr'] and validators ['validate'], so
// `v = schema.parse(v)` no longer clears and `v = check.validate(v)` does.
// The request parameter name, the bracket spelling and app vs router do not
// change the verdict. Documented false negatives (destructuring, req['query'],
// cross-function flow) are not modelled.
module require_query_type_guard {
  type Method =
    | Replace | Trim | ToLowerCase | Split | Substring | Slice | StartsWith | EndsWith
    | Includes | MatchM | ToUpperCase
    | ToStringM          // not a string-only method: safe on every qs shape
  type Flow = Direct | Tainted
  type Guard =
    | NoGuard
    | TypeofAnd          // typeof v === 'string' && v.m()
    | TypeofReturn       // if (typeof v !== 'string') return …; v.m()
    | IsArrayReject      // if (Array.isArray(v) || typeof v !== 'string') return …
    | CoerceAtSource     // String(req.query.x)
    | OtherProp          // typeof req.query.other === 'string' && <x>.m()
    | ReassignString     // let v = req.query.x; v = String(v)
    | ReassignParse      // v = schema.parse(v)
    | ReassignValidate   // v = check.validate(v)
    | ReassignToStr      // v = toStr(v)
  type Access = Dot | Bracket
  type Param = Req | Request
  type Recv = App | Router
  type Opts = Defaults | Custom

  pure def stringMethod(m: Method): bool = m != ToStringM

  pure def guarded(g: Guard, o: Opts): bool = match g {
    | NoGuard => false
    | TypeofAnd => true
    | TypeofReturn => true
    | IsArrayReject => true
    | CoerceAtSource => true
    | OtherProp => false
    | ReassignString => true
    | ReassignParse => o == Defaults
    | ReassignValidate => o == Custom
    | ReassignToStr => o == Custom
  }

  pure def isReassign(g: Guard): bool =
    g == ReassignString or g == ReassignParse or g == ReassignValidate or g == ReassignToStr

  pure def full(f: Flow, g: Guard, a: Access, p: Param, r: Recv, o: Opts): bool =
    f == Direct and g == NoGuard and a == Dot and p == Req and r == App and o == Defaults

  var method: Method
  var flow: Flow
  var guard: Guard
  var access: Access
  var param: Param
  var recv: Recv
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Direct, Tainted).oneOf()
    // Reassignment guards only exist for a variable.
    nondet g = (if (f == Direct) Set(NoGuard, TypeofAnd, TypeofReturn, IsArrayReject, CoerceAtSource, OtherProp)
                else Set(NoGuard, TypeofAnd, TypeofReturn, IsArrayReject, CoerceAtSource, OtherProp,
                         ReassignString, ReassignParse, ReassignValidate, ReassignToStr)).oneOf()
    nondet a = Set(Dot, Bracket).oneOf()
    nondet p = Set(Req, Request).oneOf()
    nondet r = Set(App, Router).oneOf()
    nondet o = Set(Defaults, Custom).oneOf()
    // Every method is sampled on the plain unguarded call; the other
    // dimensions use trim.
    nondet m = (if (full(f, g, a, p, r, o))
                  Set(Replace, Trim, ToLowerCase, Split, Substring, Slice, StartsWith, EndsWith,
                      Includes, MatchM, ToUpperCase, ToStringM)
                else Set(Trim)).oneOf()
    all {
      method' = m, flow' = f, guard' = g, access' = a, param' = p, recv' = r, opts' = o,
      verdict' = (stringMethod(m) and not(guarded(g, o))),
    }
  }

  action init = step
}
