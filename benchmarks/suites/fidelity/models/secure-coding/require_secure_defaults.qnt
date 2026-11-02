// Model of eslint-plugin-secure-coding/require-secure-defaults (CWE-1188).
// Contract: an exact config key whose `false` is insecure (strictSSL, httpOnly,
// requireTLS, sslValidate) set to literal false, or whose `true` is insecure
// (tlsAllowInvalidCertificates, ignoreHTTPSErrors, ...) set to literal true, is
// reported; `secure: false` only when cookie attributes corroborate a cookie.
// Identifier and string-literal key spellings are the same key. A non-literal
// value (isDev ? false : true) is a documented non-detection; a neutral key is
// never reported.
module require_secure_defaults {
  type Key = StrictSSL | HttpOnly | RequireTLS | SslValidate | TlsAllowInvalidCerts | IgnoreHttpsErrors
           | SecureInCookie | SecureAlone | Timeout
  type Value = True | False | NonLiteral
  type Spelling = IdentKey | StringKey

  pure def whenFalse(k: Key): bool = Set(StrictSSL, HttpOnly, RequireTLS, SslValidate, SecureInCookie).contains(k)
  pure def whenTrue(k: Key): bool = Set(TlsAllowInvalidCerts, IgnoreHttpsErrors).contains(k)

  pure def reports(k: Key, v: Value): bool =
    (whenFalse(k) and v == False) or (whenTrue(k) and v == True)

  var key: Key
  var value: Value
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet k = Set(StrictSSL, HttpOnly, RequireTLS, SslValidate, TlsAllowInvalidCerts, IgnoreHttpsErrors,
                   SecureInCookie, SecureAlone, Timeout).oneOf()
    nondet v = Set(True, False, NonLiteral).oneOf()
    nondet sp = Set(IdentKey, StringKey).oneOf()
    all { key' = k, value' = v, spelling' = sp, verdict' = reports(k, v) }
  }

  action init = step
}
