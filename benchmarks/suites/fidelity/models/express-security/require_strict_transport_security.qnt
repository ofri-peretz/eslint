// Model of eslint-plugin-express-security/require-strict-transport-security (CWE-319).
// Only an explicit weakening of helmet's HSTS is reported: the header turned
// off (hsts / strictTransportSecurity: false), a literal maxAge below
// `minMaxAge` (default 15552000, six months; 0 clears HSTS), or
// includeSubDomains: false while `requireSubDomains` (default true) holds. An
// omitted option or an options object without maxAge keeps helmet's default
// (365 days, includeSubDomains) and is never reported. The same applies to
// helmet({ hsts }), helmet({ strictTransportSecurity }), helmet.hsts(),
// helmet.strictTransportSecurity(), helmet's named strictTransportSecurity
// export, a renamed default import and require('helmet').
module require_strict_transport_security {
  type Config =
    | Omitted | HstsFalse | HstsTrue | EmptyObj
    | MaxAge0 | MaxAge300 | BelowFloor | Floor | Year
    | YearSubFalse | YearSubTrue | SubFalseOnly
  type Form =
    | HelmetHsts         // helmet({ hsts: X })
    | HelmetSts          // helmet({ strictTransportSecurity: X })
    | RenamedHelmet      // import securityHeaders from 'helmet'; securityHeaders({ hsts: X })
    | RequireHelmet      // const helmet = require('helmet'); helmet({ hsts: X })
    | HstsFactory        // helmet.hsts(X)
    | StsFactory         // helmet.strictTransportSecurity(X)
    | NamedSts           // import { strictTransportSecurity } from 'helmet'; strictTransportSecurity(X)
  type Opts = Defaults | MinYear | NoSubRequired
  type Slice = Forms | Options

  // The literal maxAge in seconds; -1 when none is written.
  pure def maxAge(c: Config): int = match c {
    | MaxAge0 => 0 | MaxAge300 => 300 | BelowFloor => 15551999 | Floor => 15552000
    | Year => 31536000 | YearSubFalse => 31536000 | YearSubTrue => 31536000
    | _ => -1
  }
  pure def minimum(o: Opts): int = if (o == MinYear) 31536000 else 15552000
  pure def subOff(c: Config): bool = c == YearSubFalse or c == SubFalseOnly

  pure def reports(c: Config, o: Opts): bool =
    c == HstsFalse
      or (maxAge(c) >= 0 and maxAge(c) < minimum(o))
      or (subOff(c) and o != NoSubRequired)

  pure def factory(f: Form): bool = f == HstsFactory or f == StsFactory or f == NamedSts

  var config: Config
  var form: Form
  var opts: Opts
  var verdict: bool

  action step = {
    nondet sl = Set(Forms, Options).oneOf()
    nondet f = (if (sl == Forms)
                  Set(HelmetHsts, HelmetSts, RenamedHelmet, RequireHelmet, HstsFactory, StsFactory, NamedSts)
                else Set(HelmetHsts)).oneOf()
    // A factory takes an options object: the boolean configs do not apply.
    nondet c = (if (factory(f))
                  Set(Omitted, EmptyObj, MaxAge0, MaxAge300, BelowFloor, Floor, Year,
                      YearSubFalse, YearSubTrue, SubFalseOnly)
                else Set(Omitted, HstsFalse, HstsTrue, EmptyObj, MaxAge0, MaxAge300, BelowFloor, Floor,
                         Year, YearSubFalse, YearSubTrue, SubFalseOnly)).oneOf()
    nondet o = (if (sl == Options) Set(Defaults, MinYear, NoSubRequired) else Set(Defaults)).oneOf()
    all { config' = c, form' = f, opts' = o, verdict' = reports(c, o) }
  }

  action init = step
}
