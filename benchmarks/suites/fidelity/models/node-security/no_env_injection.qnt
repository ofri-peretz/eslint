// Model of eslint-plugin-node-security/no-env-injection (CWE-99).
// Contract (docs): a write to process.env under a key traced (up to three
// binding hops, through destructuring) back to a request root (req, request,
// ctx, event; plus extraRequestRoots) is reported, as is Object.assign of a
// request object onto process.env. Silent: a literal key (dot or bracket), a
// lookup in a closed local allowlist, Object.assign of a literal object, a key
// that is a plain parameter. extraRequestRoots adds roots to the defaults.
module no_env_injection {
  type Write = DirectReq | DestructuredReq | AliasOneHop | ThreeHops | AllowlistLookup
             | DotLiteral | BracketLiteral | AssignReq | AssignLiteral | CtxRoot
             | EventRoot | ParamKey | PayloadRoot

  pure def reports(w: Write, extraPayload: bool): bool = match w {
    | DirectReq => true
    | DestructuredReq => true
    | AliasOneHop => true
    | ThreeHops => true
    | AllowlistLookup => false
    | DotLiteral => false
    | BracketLiteral => false
    | AssignReq => true
    | AssignLiteral => false
    | CtxRoot => true
    | EventRoot => true
    | ParamKey => false
    | PayloadRoot => extraPayload
  }

  var write: Write
  var extraPayload: bool
  var verdict: bool

  action step = {
    nondet w = Set(DirectReq, DestructuredReq, AliasOneHop, ThreeHops, AllowlistLookup,
                   DotLiteral, BracketLiteral, AssignReq, AssignLiteral, CtxRoot,
                   EventRoot, ParamKey, PayloadRoot).oneOf()
    nondet e = Set(true, false).oneOf()
    all { write' = w, extraPayload' = e, verdict' = reports(w, e) }
  }

  action init = step
}
