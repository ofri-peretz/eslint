// Model of eslint-plugin-express-security/no-unsafe-csp-directives (CWE-79, CWE-1021, CWE-311).
// In a helmet CSP config (helmet({ contentSecurityPolicy: { directives } }) or
// helmet.contentSecurityPolicy({ directives }), whatever the helmet binding is
// called, including the named `contentSecurityPolicy` export), reported:
//   - 'unsafe-inline' / 'unsafe-eval' or a wildcard source (*, data:, http:,
//     https:) in default-src, script-src*, object-src, worker-src, style-src*
//     (style directives only while checkStyleSrc, default on);
//   - frameAncestors: ['*'];
//   - useDefaults: false with no frame-ancestors;
//   - upgradeInsecureRequests: null.
// camelCase and header spellings are equivalent. img-src / font-src are not
// policed. No Express evidence in the file: no report.
module no_unsafe_csp_directives {
  type Directive =
    | ScriptSrc | ScriptSrcHeader | ScriptSrcElem | DefaultSrc | ObjectSrc | WorkerSrc
    | StyleSrc | StyleSrcAttr | ImgSrc
  type Source = Self | UnsafeInline | UnsafeEval | Star | Data | Http | Https | Nonce | Host
  type Extra = NoExtra | FrameStar | FrameSelf | NoDefaultsNoFrame | NoDefaultsWithFrame | UpgradeNull
  type Ctx = HelmetCall | HelmetCsp | Renamed | Require | Named | StyleOff | NoExpress

  pure def policed(d: Directive, x: Ctx): bool = match d {
    | ImgSrc => false
    | StyleSrc => x != StyleOff
    | StyleSrcAttr => x != StyleOff
    | _ => true
  }
  pure def unsafeSource(s: Source): bool =
    s == UnsafeInline or s == UnsafeEval or s == Star or s == Data or s == Http or s == Https
  pure def unsafeExtra(e: Extra): bool =
    e == FrameStar or e == NoDefaultsNoFrame or e == UpgradeNull

  var directive: Directive
  var source: Source
  var extra: Extra
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet e = Set(NoExtra, NoExtra, NoExtra, NoExtra, FrameStar, FrameSelf, NoDefaultsNoFrame,
                   NoDefaultsWithFrame, UpgradeNull).oneOf()
    // The framing / upgrade shapes ride on a safe script-src 'self'.
    nondet d = (if (e == NoExtra) Set(ScriptSrc, ScriptSrcHeader, ScriptSrcElem, DefaultSrc, ObjectSrc,
                                      WorkerSrc, StyleSrc, StyleSrcAttr, ImgSrc)
                else Set(ScriptSrc)).oneOf()
    nondet s = (if (e == NoExtra) Set(Self, UnsafeInline, UnsafeEval, Star, Data, Http, Https, Nonce, Host)
                else Set(Self)).oneOf()
    nondet x = Set(HelmetCall, HelmetCsp, Renamed, Require, Named, StyleOff, NoExpress).oneOf()
    all {
      directive' = d, source' = s, extra' = e, ctx' = x,
      verdict' = (x != NoExpress and ((policed(d, x) and unsafeSource(s)) or unsafeExtra(e))),
    }
  }

  action init = step
}
