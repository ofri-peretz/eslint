// Model of eslint-plugin-node-security/require-stream-error-handler (CWE-248).
// A .pipe() is reported when its source or destination is provably unhandled:
// a stream constructed inline, or a name bound to a stream constructor with no
// 'error' listener (on / once / addListener) anywhere in the file. A listener
// for another event does not count; a listener after the pipe does. pipeline()
// and two streams of unknown provenance are not reported. Any stream
// constructor counts: fs, a named fs import, zlib, new PassThrough().
module require_stream_error_handler {
  // allowInTests (default true): a test file is skipped unless the option is turned
  // off. TestDefault = src/app.test.ts with the option at its default
  // (silent), TestFlip = the same file with allowInTests: false (reported as usual).
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx
  type Shape = InlineSource | InlineDest | NamedUnhandled | NamedOnError | NamedOnceError | NamedErrorAfterPipe | NamedAddListener | NamedOnClose | Pipeline | BothParams
  type Ctor = FsMember | FsNamed | Zlib | PassThrough

  pure def reports(sh: Shape, c: Ctor): bool = match sh {
    | InlineSource => true
    | InlineDest => true
    | NamedUnhandled => true
    | NamedOnClose => true
    | _ => false
  }

  var shape: Shape
  var ctor: Ctor
  var verdict: bool

  action step = {
    nondet sh = Set(InlineSource, InlineDest, NamedUnhandled, NamedOnError, NamedOnceError, NamedErrorAfterPipe, NamedAddListener, NamedOnClose, Pipeline, BothParams).oneOf()
    nondet c = Set(FsMember, FsNamed, Zlib, PassThrough).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { shape' = sh, ctor' = c, testCtx' = tc, verdict' = (reports(sh, c) and not(exempt(tc))) }
  }

  action init = step
}
