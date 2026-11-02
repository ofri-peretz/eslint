// Model of eslint-plugin-vercel-ai-security/require-request-timeout (CWE-400).
// An AI SDK call whose inline options carry no timeout or abort signal is
// reported, as is a call with no options at all. Options built elsewhere or a
// spread may carry the timeout and are not.
module require_request_timeout {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Opts =
    | NoArgs              // generateText()
    | InlineNoTimeout     // { model, prompt }
    | InlineTimeout       // { …, timeout: 30000 }
    | InlineAbortSignal   // { …, abortSignal: controller.signal }
    | AbortSignalTimeout  // { …, abortSignal: AbortSignal.timeout(30000) }
    | SpreadBase          // { ...base, prompt }
    | OptsVar             // generateText(opts)
  type Fn = GenerateText | StreamText | GenerateObject
  type Spelling = Named | Namespace | Aliased

  pure def reports(importsAi: bool, o: Opts, f: Fn, sp: Spelling): bool =
    importsAi and (o == NoArgs or o == InlineNoTimeout)

  var importsAi: bool
  var opts: Opts
  var fn: Fn
  var spelling: Spelling
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet o = Set(NoArgs, InlineNoTimeout, InlineTimeout, InlineAbortSignal, AbortSignalTimeout, SpreadBase, OptsVar).oneOf()
    nondet f = Set(GenerateText, StreamText, GenerateObject).oneOf()
    nondet sp = Set(Named, Namespace, Aliased).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { importsAi' = i, opts' = o, fn' = f, spelling' = sp, testCtx' = tc, verdict' = (reports(i, o, f, sp) and not(exempt(tc))) }
  }

  action init = step
}
