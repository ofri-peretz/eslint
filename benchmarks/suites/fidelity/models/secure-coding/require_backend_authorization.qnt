// Model of eslint-plugin-secure-coding/require-backend-authorization (CWE-602).
// Contract: in code proven to run in a browser (an unresolved browser global),
// an `if` that gates on an authorization claim property (role, isAdmin,
// permissions; dot or computed-string spelling) is reported. A server module
// import suppresses it; a non-claim property and an HTTP status check are not
// claims.
module require_backend_authorization {
  type Env = Browser | Server
  type Check = RoleEq | IsAdmin | PermissionsIncludes | ComputedRole | NameEq | StatusCheck

  pure def reports(e: Env, c: Check): bool =
    e == Browser and Set(RoleEq, IsAdmin, PermissionsIncludes, ComputedRole).contains(c)

  var env: Env
  var check: Check
  var verdict: bool

  action step = {
    nondet e = Set(Browser, Server).oneOf()
    nondet c = Set(RoleEq, IsAdmin, PermissionsIncludes, ComputedRole, NameEq, StatusCheck).oneOf()
    all { env' = e, check' = c, verdict' = reports(e, c) }
  }

  action init = step
}
