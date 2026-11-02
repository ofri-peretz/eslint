// Model of eslint-plugin-browser-security/no-unescaped-url-parameter (CWE-79/CWE-74).
// An untrusted value (location / URL-container / DOM read, or a parameter of an
// EXPORTED function) interpolated unencoded into an encoding position (path,
// query, fragment) of a URL reports. A host hole, a relative string that never
// reaches a sink, an encoded value, arithmetic, a closed-set or number-typed
// parameter, a same-origin part, a constant, or a module-private helper's
// parameter does not. Test files report unless allowInTests.
module no_unescaped_url_parameter {
  type Source =
    | UrlParamVar
    | LocHash
    | Referrer
    | DomField
    | ExportedParam
    | PrivateParam
    | Encoded
    | ArithExported
    | ClosedSetExported
    | NumberExported
    | LocOrigin
    | StaticConst
  type Position = Query | Path | Fragment | ConcatQuery | Host | RelativeNoSink | RelativeFetch

  pure def untrusted(s: Source): bool = match s {
    | UrlParamVar => true
    | LocHash => true
    | Referrer => true
    | DomField => true
    | ExportedParam => true
    | _ => false
  }

  pure def encodingPosition(p: Position): bool = match p {
    | Host => false
    | RelativeNoSink => false
    | _ => true
  }

  pure def reports(s: Source, p: Position, testFile: bool, allowInTests: bool): bool =
    if (testFile and allowInTests) false
    else untrusted(s) and encodingPosition(p)

  var source: Source
  var position: Position
  var testFile: bool
  var allowInTests: bool
  var verdict: bool

  action step = {
    nondet s = Set(UrlParamVar, LocHash, Referrer, DomField, ExportedParam, PrivateParam, Encoded, ArithExported, ClosedSetExported, NumberExported, LocOrigin, StaticConst).oneOf()
    nondet p = Set(Query, Path, Fragment, ConcatQuery, Host, RelativeNoSink, RelativeFetch).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    all {
      source' = s, position' = p, testFile' = t, allowInTests' = a,
      verdict' = reports(s, p, t, a),
    }
  }

  action init = step
}
