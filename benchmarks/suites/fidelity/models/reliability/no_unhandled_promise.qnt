// Model of eslint-plugin-reliability/no-unhandled-promise.
// A promise nobody holds and nobody attaches a rejection handler to fails
// silently (or crashes the process on `unhandledRejection`). The rule reports
// a promise-producing call whose value is thrown away without a rejection
// handler. It decides "promise-producing" from what the file shows
// (`requirePromiseEvidence`, default true): a function declared `async` in
// scope (declaration or arrow), `new Promise`, a `Promise` static, a `.then`
// chain, a parameter annotated to return a Promise, or a name the consumer
// lists in `promiseReturning` (default `['fetch']`). With the option off, any
// call not known to be synchronous counts. A non-async local function and an
// unknown call are silent by default.
// Handled: `.catch(handler)`, `.then(ok, fail)`, a `.catch` anywhere below a
// `.finally`, `await` (the rejection propagates to the caller), `return`,
// holding the value (assigning it, `Promise.all([...])`).
// Unhandled: a bare call statement, `.then(ok)` alone, `.finally(f)` alone,
// `.catch()` with no handler, a promise handed to `console.log` (which only
// prints it), and a call inside `try` that is not awaited
// (the try block has already exited when the promise rejects). `void p` is a
// discard unless `ignoreVoidExpressions` (default false).
// Handing the promise to a call the file cannot see into (`track(p)`) is
// left out of this model (see the PR).
// `ignoreInTests` (default true) exempts test files.
module no_unhandled_promise {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Focus = Producers | Handlings | VoidOpt | EvidenceOpts
  type Producer = AsyncDecl | AsyncArrow | NewPromise | PromiseStatic | ThenChain | Fetch
                | AnnotatedParam | UnknownCall | SyncLocal
  type Handling = Bare | Catch | ThenTwoArgs | ThenOnly | FinallyOnly | CatchNoArg
                | CatchThenFinally | Awaited | Returned | Assigned | PassedToLog | InTryNoAwait
                | InTryAwait | PromiseAll | Voided
  type Listed = DefaultList | ListsLoadUser

  pure def producesPromise(p: Producer, listed: Listed, requireEvidence: bool): bool =
    Set(AsyncDecl, AsyncArrow, NewPromise, PromiseStatic, ThenChain, Fetch, AnnotatedParam).contains(p)
    or (p == UnknownCall and (listed == ListsLoadUser or not(requireEvidence)))
  pure def unhandled(h: Handling, ignoreVoid: bool): bool =
    Set(Bare, ThenOnly, FinallyOnly, CatchNoArg, PassedToLog, InTryNoAwait).contains(h)
    or (h == Voided and not(ignoreVoid))
  pure def reports(p: Producer, h: Handling, ignoreVoid: bool, listed: Listed,
                   requireEvidence: bool): bool =
    producesPromise(p, listed, requireEvidence) and unhandled(h, ignoreVoid)

  var focus: Focus
  var producer: Producer
  var handling: Handling
  var ignoreVoidExpressions: bool
  var listed: Listed
  var requirePromiseEvidence: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Producers, Handlings, VoidOpt, EvidenceOpts).oneOf()
    nondet p = (if (fo == Producers)
                  Set(AsyncDecl, AsyncArrow, NewPromise, PromiseStatic, ThenChain, Fetch,
                      AnnotatedParam, UnknownCall, SyncLocal)
                else if (fo == Handlings) Set(AsyncDecl, ThenChain)
                else if (fo == VoidOpt) Set(AsyncDecl)
                else Set(UnknownCall)).oneOf()
    nondet h = (if (fo == Producers) Set(Bare, Catch)
                else if (fo == Handlings)
                  Set(Bare, Catch, ThenTwoArgs, ThenOnly, FinallyOnly, CatchNoArg,
                      CatchThenFinally, Awaited, Returned, Assigned, PassedToLog, InTryNoAwait,
                      InTryAwait, PromiseAll, Voided)
                else if (fo == VoidOpt) Set(Voided)
                else Set(Bare)).oneOf()
    nondet iv = (if (fo == VoidOpt) Set(false, true) else Set(false)).oneOf()
    nondet ls = (if (fo == EvidenceOpts) Set(DefaultList, ListsLoadUser) else Set(DefaultList)).oneOf()
    nondet re = (if (fo == EvidenceOpts) Set(true, false) else Set(true)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, producer' = p, handling' = h, ignoreVoidExpressions' = iv, listed' = ls,
          requirePromiseEvidence' = re, testCtx' = tc,
          verdict' = (reports(p, h, iv, ls, re) and not(exempt(tc))) }
  }

  action init = step
}
