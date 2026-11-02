// Model of eslint-plugin-browser-security/no-credentials-in-query-params (CWE-598).
// A credential-named query parameter in a URL string reports; the same text in a
// request-body position (bodyProperties) does not. This rule owns EVERY
// password in the query string (?pwd= and ?passwd= included); no-password-in-url
// owns userinfo and fragment passwords. A name that only ENDS in a credential
// word as part of another concept (pageToken: a pagination cursor) is not one.
module no_credentials_in_query_params {
  type Key =
    | Password
    | UpperPassword
    | Token
    | Secret
    | ApiKey
    | ApiKeyCamel
    | ApiKeySnake
    | AccessToken
    | ClientSecret
    | Pwd
    | PageToken
    | Page
    | PathWordOnly
  type Placement = First | Later
  type Form = Str | Tpl
  type Pos = FetchArg | VarInit | BodyProp | DataProp | PayloadProp

  // RFC 6750 §2.3 names `access_token` as THE URI-query bearer credential, and
  // `client_secret` / `api_key` are the standard spellings of secret and apikey.
  pure def isCredential(k: Key): bool = match k {
    | Password => true
    | UpperPassword => true
    | Token => true
    | Secret => true
    | ApiKey => true
    | ApiKeyCamel => true
    | ApiKeySnake => true
    | AccessToken => true
    | ClientSecret => true
    | Pwd => true
    | PageToken => false
    | Page => false
    | PathWordOnly => false
  }

  pure def exempt(p: Pos, customBody: bool): bool = match p {
    | FetchArg => false
    | VarInit => false
    | BodyProp => true
    | DataProp => true
    | PayloadProp => customBody
  }

  pure def reports(k: Key, pl: Placement, f: Form, p: Pos, customBody: bool): bool =
    isCredential(k) and not(exempt(p, customBody))

  var key: Key
  var placement: Placement
  var form: Form
  var pos: Pos
  var customBody: bool
  var verdict: bool

  action step = {
    nondet k = Set(Password, UpperPassword, Token, Secret, ApiKey, ApiKeyCamel, ApiKeySnake, AccessToken, ClientSecret, Pwd, PageToken, Page, PathWordOnly).oneOf()
    nondet pl = Set(First, Later).oneOf()
    nondet f = Set(Str, Tpl).oneOf()
    nondet p = Set(FetchArg, VarInit, BodyProp, DataProp, PayloadProp).oneOf()
    nondet c = Set(true, false).oneOf()
    all {
      key' = k, placement' = pl, form' = f, pos' = p, customBody' = c,
      verdict' = reports(k, pl, f, p, c),
    }
  }

  action init = step
}
