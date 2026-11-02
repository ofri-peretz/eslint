// Model of eslint-plugin-vercel-ai-security/require-abort-signal (CWE-404).
// A target streaming call (default streamText, streamObject — by exact name,
// through any import spelling) whose inline options carry neither abortSignal
// nor signal is reported. A spread may carry the signal. targetFunctions
// replaces the set.
module require_abort_signal {
  type Opts = NoSignal | AbortSignalKey | SignalKey | ReqSignal | QuotedAbortSignal | SpreadBase
  type Fn = StreamText | StreamObject | GenerateText
  type Spelling = Named | Namespace | Aliased

  pure def isTarget(f: Fn, withGenerate: bool): bool =
    f == StreamText or f == StreamObject or (withGenerate and f == GenerateText)

  pure def reports(importsAi: bool, o: Opts, f: Fn, sp: Spelling, withGenerate: bool): bool =
    importsAi and isTarget(f, withGenerate) and o == NoSignal

  var importsAi: bool
  var opts: Opts
  var fn: Fn
  var spelling: Spelling
  var withGenerate: bool
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet o = Set(NoSignal, AbortSignalKey, SignalKey, ReqSignal, QuotedAbortSignal, SpreadBase).oneOf()
    nondet f = Set(StreamText, StreamObject, GenerateText).oneOf()
    nondet sp = Set(Named, Namespace, Aliased).oneOf()
    nondet t = Set(true, false).oneOf()
    all {
      importsAi' = i, opts' = o, fn' = f, spelling' = sp, withGenerate' = t,
      verdict' = reports(i, o, f, sp, t),
    }
  }

  action init = step
}
