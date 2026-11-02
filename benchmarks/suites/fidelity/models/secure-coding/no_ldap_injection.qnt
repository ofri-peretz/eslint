// Model of eslint-plugin-secure-coding/no-ldap-injection (CWE-90).
// Contract: in a file that loads an LDAP package (the documented file gate), an
// LDAP filter built by interpolation or concatenation of an unescaped value is
// reported, inline at the sink or assigned first. An LDAP escape function makes
// it safe; a constant filter has nothing to inject into.
module no_ldap_injection {
  type Gate = Ldapjs | Ldapts | NoLdap
  type Build = Template | Concat | Const
  type Wrap = Raw | Escaped
  type Value = ReqBody | PlainVar
  type Use = Inline | Assigned

  pure def reports(g: Gate, b: Build, w: Wrap): bool =
    g != NoLdap and b != Const and w == Raw

  var gate: Gate
  var build: Build
  var wrap: Wrap
  var value: Value
  var use: Use
  var verdict: bool

  action step = {
    nondet g = Set(Ldapjs, Ldapts, NoLdap).oneOf()
    nondet b = Set(Template, Concat, Const).oneOf()
    nondet w = Set(Raw, Escaped).oneOf()
    nondet v = Set(ReqBody, PlainVar).oneOf()
    nondet u = Set(Inline, Assigned).oneOf()
    all { gate' = g, build' = b, wrap' = w, value' = v, use' = u, verdict' = reports(g, b, w) }
  }

  action init = step
}
