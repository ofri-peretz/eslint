// Model of eslint-plugin-secure-coding/no-unguarded-uri-decode (CWE-248).
// decodeURIComponent / decodeURI throw URIError on a malformed escape. A call
// on request or location input is reported unless a try block WITH a catch,
// in the same function, surrounds it. A try/finally does not catch; a try in
// an outer function does not guard a callback that runs later.
// Input: a route parameter, a query value behind a fallback, a split of
// req.url, a value destructured from req.params, Koa's ctx.path, the page's
// location.hash, document.cookie, and the raw pathname of new URL(req.url).
// Not input: searchParams.get() (already decoded), a configured URL from
// process.env (throws at startup, where the throw is the report), a bare
// function parameter, and a value converted with Number().
// A string literal is decided at lint time: one that fails to decode is
// reported wherever it stands, one that decodes never is. A shadowed
// decodeURIComponent is not the global and is never reported.
module no_unguarded_uri_decode {
  type Arg = ReqParams | ReqQueryFallback | ReqUrlSplit | Destructured | KoaPath
           | LocationHash | DocCookie | UrlPathname
           | SearchParamsGet | EnvPassword | FnParam | Converted
           | ValidLiteral | MalformedLiteral | Shadowed
  type Guard = NoGuard | TryCatch | TryFinally | OuterTry
  type Decoder = Component | Whole

  pure def isInput(a: Arg): bool =
    Set(ReqParams, ReqQueryFallback, ReqUrlSplit, Destructured, KoaPath,
        LocationHash, DocCookie, UrlPathname).contains(a)

  pure def reports(a: Arg, g: Guard, d: Decoder): bool =
    a == MalformedLiteral or (isInput(a) and g != TryCatch)

  var arg: Arg
  var guard: Guard
  var decoder: Decoder
  var verdict: bool

  action step = {
    nondet a = Set(ReqParams, ReqQueryFallback, ReqUrlSplit, Destructured, KoaPath,
                   LocationHash, DocCookie, UrlPathname,
                   SearchParamsGet, EnvPassword, FnParam, Converted,
                   ValidLiteral, MalformedLiteral, Shadowed).oneOf()
    nondet g = Set(NoGuard, TryCatch, TryFinally, OuterTry).oneOf()
    nondet d = Set(Component, Whole).oneOf()
    all { arg' = a, guard' = g, decoder' = d, verdict' = reports(a, g, d) }
  }

  action init = step
}
