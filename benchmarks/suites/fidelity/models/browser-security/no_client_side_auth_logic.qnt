// Model of eslint-plugin-browser-security/no-client-side-auth-logic (CWE-602).
// An authorization decision made on the client reports:
//  - a condition reading web storage under an auth key (authKeywords, matched
//    as WHOLE key segments: isAdmin -> admin, but not roles / administrator);
//  - an equality comparison (===, ==, !==) of a credential property
//    (credentialProperties: password, secret, token) against a value.
// Configured lists here EXTEND the defaults (superuser / pin added).
module no_client_side_auth_logic {
  type Expr =
    | StoreAuthenticated
    | StoreIsAdmin
    | StoreIsAdminSnake
    | StoreUserRole
    | StoreRoles
    | StoreTheme
    | StoreAdministrator
    | StoreSuperuser
    | SessionIsAdmin
    | StoreComputed
    | CmpPassword
    | CmpToken
    | CmpSecretLoose
    | NeqPassword
    | CmpName
    | CmpPin
    | PasswordLength

  pure def reports(e: Expr, customAuth: bool, customCred: bool): bool = match e {
    | StoreAuthenticated => true
    | StoreIsAdmin => true
    | StoreIsAdminSnake => true
    | StoreUserRole => true
    | SessionIsAdmin => true
    | StoreComputed => true
    | StoreSuperuser => customAuth
    | CmpPassword => true
    | CmpToken => true
    | CmpSecretLoose => true
    | NeqPassword => true
    | CmpPin => customCred
    | _ => false
  }

  var expr: Expr
  var customAuth: bool
  var customCred: bool
  var verdict: bool

  action step = {
    nondet e = Set(StoreAuthenticated, StoreIsAdmin, StoreIsAdminSnake, StoreUserRole, StoreRoles, StoreTheme, StoreAdministrator, StoreSuperuser, SessionIsAdmin, StoreComputed, CmpPassword, CmpToken, CmpSecretLoose, NeqPassword, CmpName, CmpPin, PasswordLength).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet c = Set(true, false).oneOf()
    all { expr' = e, customAuth' = a, customCred' = c, verdict' = reports(e, a, c) }
  }

  action init = step
}
