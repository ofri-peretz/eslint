// Model of eslint-plugin-express-security/no-missing-security-headers (CWE-693).
// DEPRECATED (replacedBy require-helmet) but still exported; the doc carries
// only the options table, so the contract is that table plus the shared
// browser-security contract: a handler that explicitly SETS response headers
// and omits one of requiredHeaders (default CSP, X-Frame-Options,
// X-Content-Type-Options) reports. A handler setting no header is not judged.
// Narrowed (judgment, deprecated rule): "every response must set" them, so a
// handler setting only Cache-Control also reports here (browser-security's
// copy exempts transport/caching-only scopes; this copy gets no new work).
// Header names are case-insensitive; any Express setter spelling counts
// (setHeader / set / header / set({...})). No Express evidence: no report.
// Test files are skipped while ignoreInTests (default true).
module no_missing_security_headers {
  type Extra = NoExtra | ContentType | CacheControl
  type Ctx =
    | DefCanon        // res.setHeader('Content-Security-Policy', ...)
    | DefLower        // res.setHeader('content-security-policy', ...)
    | DefResSet       // res.set(name, value)
    | DefResHeader    // res.header(name, value)
    | DefSetObject    // res.set({ name: value, ... })
    | DefRequire      // const express = require('express')
    | DefRouter       // express.Router() handler
    | DefNoExpress    // node:http handler, no Express in the file
    | TestDefault     // test file, ignoreInTests default (true)
    | TestFlip        // test file, ignoreInTests: false
    | XfoOnly         // requiredHeaders: ['X-Frame-Options']

  pure def reports(csp: bool, xfo: bool, xcto: bool, e: Extra, x: Ctx): bool =
    if (x == DefNoExpress or x == TestDefault) false
    else {
      val setsDocHeader = csp or xfo or xcto or e != NoExtra
      val missing = if (x == XfoOnly) not(xfo) else not(csp and xfo and xcto)
      setsDocHeader and missing
    }

  var csp: bool
  var xfo: bool
  var xcto: bool
  var extra: Extra
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet a = Set(true, false).oneOf()
    nondet b = Set(true, false).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet e = Set(NoExtra, ContentType, CacheControl).oneOf()
    nondet x = Set(DefCanon, DefLower, DefResSet, DefResHeader, DefSetObject, DefRequire, DefRouter,
                   DefNoExpress, TestDefault, TestFlip, XfoOnly).oneOf()
    all { csp' = a, xfo' = b, xcto' = c, extra' = e, ctx' = x, verdict' = reports(a, b, c, e, x) }
  }

  action init = step
}
