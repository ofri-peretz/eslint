// Model of eslint-plugin-browser-security/no-password-in-url (CWE-521).
// A URL string literal carrying a password in the userinfo
// (scheme://user:pass@host, for http, ftp and ws schemes) or as a
// password-named parameter in the FRAGMENT reports. A password-named QUERY
// parameter (?password=, ?pwd=, ?passwd=) is owned by
// no-credentials-in-query-params, per the documented partition, so this rule
// is silent on it. A username alone, a port colon, an '@' in the query, or
// the word "password" in a path segment does not report.
module no_password_in_url {
  type Url =
    | UserInfo
    | UserInfoPwWord
    | FtpUserInfo
    | QueryPassword
    | QueryPwd
    | QueryPasswd
    | FragmentPassword
    | UserOnly
    | NoCred
    | PathPassword
    | PortOnly
    | EmailInQuery
  type Pos = VarInit | FetchArg | LocationHref

  pure def reports(u: Url, p: Pos): bool = match u {
    | UserInfo => true
    | UserInfoPwWord => true
    | FtpUserInfo => true
    | QueryPassword => false
    | QueryPwd => false
    | QueryPasswd => false
    | FragmentPassword => true
    | UserOnly => false
    | NoCred => false
    | PathPassword => false
    | PortOnly => false
    | EmailInQuery => false
  }

  var url: Url
  var pos: Pos
  var verdict: bool

  action step = {
    nondet u = Set(UserInfo, UserInfoPwWord, FtpUserInfo, QueryPassword, QueryPwd, QueryPasswd, FragmentPassword, UserOnly, NoCred, PathPassword, PortOnly, EmailInQuery).oneOf()
    nondet p = Set(VarInit, FetchArg, LocationHref).oneOf()
    all { url' = u, pos' = p, verdict' = reports(u, p) }
  }

  action init = step
}
