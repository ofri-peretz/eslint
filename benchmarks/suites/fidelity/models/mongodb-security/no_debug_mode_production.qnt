// Model of eslint-plugin-mongodb-security/no-debug-mode-production (CWE-489).
// `mongoose.set('debug', ...)` that turns query logging on unconditionally —
// `true`, a logger callback, or the options-object form `set({ debug: true })`
// — logs query parameters (PII) in production. A value gated on
// `process.env.NODE_ENV`, `false`, and another setting are fine. Every way to
// reach Mongoose's `set` counts (default, namespace, require, renamed default,
// named `set`), and a receiver with no visible origin (`app.set` in a Mongo
// file) is still reported because it may be Mongoose; one provably created by
// `express()` / `express.Router()` is Express's own `debug` setting. A file
// with no Mongo is not judged.
module no_debug_mode_production {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Default | Namespace | Require | Renamed | NamedSet | Untraced | ExpressApp | ExpressRouter | NoImport
  type Value = True | Callback | ObjectTrue | False | EnvGated | EnvGatedLogger | ObjectFalse | ObjectEnvGated | OtherSetting

  pure def enables(v: Value): bool = match v {
    | True => true
    | Callback => true
    | ObjectTrue => true
    | False => false
    | EnvGated => false
    | EnvGatedLogger => false
    | ObjectFalse => false
    | ObjectEnvGated => false
    | OtherSetting => false
  }

  pure def mayBeMongoose(r: Receiver): bool =
    r != ExpressApp and r != ExpressRouter and r != NoImport

  pure def reports(r: Receiver, v: Value): bool = mayBeMongoose(r) and enables(v)

  var receiver: Receiver
  var value: Value
  var verdict: bool

  action step = {
    nondet r = Set(Default, Namespace, Require, Renamed, NamedSet, Untraced, ExpressApp, ExpressRouter, NoImport).oneOf()
    nondet v = Set(True, Callback, ObjectTrue, False, EnvGated, EnvGatedLogger, ObjectFalse, ObjectEnvGated, OtherSetting).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      value' = v,
      testCtx' = tc,
      verdict' = (reports(r, v) and not(exempt(tc))),
    }
  }

  action init = step
}
