// Model of eslint-plugin-browser-security/no-permissive-cors (CWE-942).
// DEPRECATED (replacedBy express-security/no-permissive-cors) but still
// exported and documented as active, so this models the documented contract:
// an explicit '*' origin - cors({ origin: '*' }) under any binding name of the
// cors import, or Access-Control-Allow-Origin: * via setHeader / header / set
// in any header-name case - reports. A fixed origin or a validating function
// does not. (Origin reflection is a documented false negative: not modelled.)
module no_permissive_cors {
  type Cfg =
    | CorsWildcard
    | CorsLiteral
    | CorsFn
    | HeaderWildcard
    | HeaderWildcardLower
    | ResHeaderWildcard
    | ResSetWildcard
    | HeaderSpecific
  type Import = Require | ImportDefault | ImportRenamed

  pure def reports(c: Cfg, i: Import): bool = match c {
    | CorsWildcard => true
    | HeaderWildcard => true
    | HeaderWildcardLower => true
    | ResHeaderWildcard => true
    | ResSetWildcard => true
    | _ => false
  }

  var cfg: Cfg
  var imp: Import
  var verdict: bool

  action step = {
    nondet c = Set(CorsWildcard, CorsLiteral, CorsFn, HeaderWildcard, HeaderWildcardLower, ResHeaderWildcard, ResSetWildcard, HeaderSpecific).oneOf()
    nondet i = Set(Require, ImportDefault, ImportRenamed).oneOf()
    all { cfg' = c, imp' = i, verdict' = reports(c, i) }
  }

  action init = step
}
