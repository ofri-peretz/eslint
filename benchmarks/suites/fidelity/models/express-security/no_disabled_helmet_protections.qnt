// Model of eslint-plugin-express-security/no-disabled-helmet-protections (CWE-693).
// helmet({ <protection>: false }) is reported for the header protections, in
// both the helmet <=6 and 7+ spellings. HSTS (owned by another rule) and
// protections that are not security headers (dnsPrefetchControl) are not.
// Only the `false` literal disables; a config object, `true` or an env
// expression does not. `allowDisabled` exempts the listed option names.
module no_disabled_helmet_protections {
  type Opt = Csp | Frameguard | XFrameOptions | NoSniff | XContentTypeOptions | ReferrerPolicy
           | HidePoweredBy | XPoweredBy | Corp | Coop | Hsts | DnsPrefetch
  type Val = False | ObjectCfg | True | EnvExpr
  type KeySpell = IdentKey | StringKey
  type Import = DefaultImport | RequireHelmet | RenamedImport
  type Mount = AppUse | RouterUse | MiddlewareArray

  pure def isProtection(o: Opt): bool = o != Hsts and o != DnsPrefetch
  // allowCsp: allowDisabled = ['contentSecurityPolicy'].
  pure def reports(o: Opt, v: Val, allowCsp: bool): bool =
    v == False and isProtection(o) and not(allowCsp and o == Csp)

  var opt: Opt
  var value: Val
  var keySpell: KeySpell
  var allowCsp: bool
  var imp: Import
  var mount: Mount
  var verdict: bool

  action step = {
    nondet o = Set(Csp, Frameguard, XFrameOptions, NoSniff, XContentTypeOptions, ReferrerPolicy,
                   HidePoweredBy, XPoweredBy, Corp, Coop, Hsts, DnsPrefetch).oneOf()
    nondet v = Set(False, ObjectCfg, True, EnvExpr).oneOf()
    // Spellings and the option are crossed with two disabled protections.
    val wide = (o == Csp or o == NoSniff) and v == False
    nondet k = (if (wide) Set(IdentKey, StringKey) else Set(IdentKey)).oneOf()
    nondet a = (if (wide) Set(true, false) else Set(false)).oneOf()
    nondet i = (if (wide) Set(DefaultImport, RequireHelmet, RenamedImport) else Set(DefaultImport)).oneOf()
    nondet m = (if (wide) Set(AppUse, RouterUse, MiddlewareArray) else Set(AppUse)).oneOf()
    all { opt' = o, value' = v, keySpell' = k, allowCsp' = a, imp' = i, mount' = m,
          verdict' = reports(o, v, a) }
  }

  action init = step
}
