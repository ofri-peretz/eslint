// Model of eslint-plugin-express-security/no-static-root-exposure (CWE-548).
// express.static() must serve a dedicated asset directory. Reported: the app
// root (__dirname, '.', '/', process.cwd(), path.join(__dirname) alone), a
// root that escapes it ('..', a '..' join segment), a non-literal join
// segment; serveIndex() always. A named subdirectory (literal, './public',
// path.join / path.resolve of __dirname or process.cwd()) is safe. With
// allowedRoots configured, a first segment outside that list is reported.
// The mount path and receiver (app / router) do not change the verdict.
// Narrowed (judgment): the allowlist is opt-in (Options default "—", empty)
// and allowedRoots REPLACES rather than extends; the doc's "Detection
// Patterns" row for path.join(__dirname, 'uploads') and its "Extend the
// Allowlist" heading predate that change.
module no_static_root_exposure {
  type Root =
    | Dirname | Dot | DotDot | Slash | Cwd | JoinDirnameOnly
    | JoinDotDot | JoinVar | JoinUploads
    | JoinPublic | LitPublic | LitDotSlashPublic | JoinCwdAssets | ResolvePublic
    | JoinWww | ServeIndex
  type Ctx =
    | Esm          // import express from 'express'; app.use(express.static(r))
    | Cjs          // const express = require('express')
    | Namespace    // import * as express from 'express'
    | Router       // express.Router().use(...)
    | Mount        // app.use('/static', express.static(r))
    | AllowWww     // allowedRoots: ['www']

  pure def exposes(r: Root, x: Ctx): bool = match r {
    | JoinPublic => x == AllowWww
    | LitPublic => x == AllowWww
    | LitDotSlashPublic => x == AllowWww
    | JoinCwdAssets => x == AllowWww
    | ResolvePublic => x == AllowWww
    | JoinUploads => x == AllowWww
    | JoinWww => false
    | _ => true
  }

  var root: Root
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(Dirname, Dot, DotDot, Slash, Cwd, JoinDirnameOnly, JoinDotDot, JoinVar, JoinUploads,
                   JoinPublic, LitPublic, LitDotSlashPublic, JoinCwdAssets, ResolvePublic, JoinWww, ServeIndex).oneOf()
    nondet x = Set(Esm, Cjs, Namespace, Router, Mount, AllowWww).oneOf()
    all { root' = r, ctx' = x, verdict' = exposes(r, x) }
  }

  action init = step
}
