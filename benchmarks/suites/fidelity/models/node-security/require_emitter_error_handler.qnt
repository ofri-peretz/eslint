// Model of eslint-plugin-node-security/require-emitter-error-handler (CWE-248).
// http.request/get, https.request/get, child_process.spawn and fork return an
// emitter that throws from the event loop when it emits 'error' with no
// listener. exec and execFile never do: Node attaches its own listener inside
// them. The emitter is reported when it is used inline or bound and nothing
// registers an 'error' listener on it (on / once / addListener). A listener for
// another event does not count; one after the first use does. Being a pipe
// destination is not a listener, but `source.pipe(e)` evaluates to `e`, so a
// listener chained on that result is on the emitter. An emitter that is returned
// or handed to another function escapes and is not reported. How the module was imported
// (default import, named import with an alias, require) does not matter.
module require_emitter_error_handler {
  type Factory = HttpRequest | HttpGet | HttpsRequest | HttpsGet | Spawn | Fork | Exec | ExecFile
  type Use = Bare | OnError | OnceError | AddListenerError | OnClose | ErrorAfterUse | PipeDest | PipeThenOnError | Returned | PassedToFn
  type Spelling = DefaultImport | NamedImport | Require

  pure def throwsUnhandled(f: Factory): bool = match f {
    | Exec => false
    | ExecFile => false
    | _ => true
  }

  pure def listens(u: Use): bool = match u {
    | OnError => true
    | OnceError => true
    | AddListenerError => true
    | ErrorAfterUse => true
    | PipeThenOnError => true
    | _ => false
  }

  pure def escapes(u: Use): bool = match u {
    | Returned => true
    | PassedToFn => true
    | _ => false
  }

  pure def reports(f: Factory, u: Use): bool =
    throwsUnhandled(f) and not(listens(u)) and not(escapes(u))

  var factory: Factory
  var use: Use
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet f = Set(HttpRequest, HttpGet, HttpsRequest, HttpsGet, Spawn, Fork, Exec, ExecFile).oneOf()
    nondet u = Set(Bare, OnError, OnceError, AddListenerError, OnClose, ErrorAfterUse, PipeDest, PipeThenOnError, Returned, PassedToFn).oneOf()
    nondet sp = Set(DefaultImport, NamedImport, Require).oneOf()
    all { factory' = f, use' = u, spelling' = sp, verdict' = reports(f, u) }
  }

  action init = step
}
