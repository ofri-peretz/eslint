// Model of eslint-plugin-vercel-ai-security/require-error-handling (CWE-755).
// An AI SDK call (through any import spelling) must sit inside a try with a
// catch. streamText / streamObject do not throw: their `onError` option is
// their error handling. try/finally without catch handles nothing, and a try
// around a callback that is not awaited does not catch its rejection.
module require_error_handling {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Fn = GenerateText | GenerateObject | StreamText | StreamObject
  type Handling =
    | NoHandling
    | TryCatch
    | TryFinally          // try { … } finally { … } — no catch
    | OnErrorOption       // { …, onError: (e) => log(e) }
    | TryAroundCallback   // try { items.forEach(async (i) => { await call }) } catch {}
  type Spelling = Named | Namespace | Aliased

  pure def isStream(f: Fn): bool = f == StreamText or f == StreamObject

  pure def handled(f: Fn, h: Handling): bool = match h {
    | NoHandling => false
    | TryCatch => true
    | TryFinally => false
    | OnErrorOption => isStream(f)
    | TryAroundCallback => false
  }

  pure def reports(importsAi: bool, f: Fn, h: Handling, sp: Spelling): bool =
    importsAi and not(handled(f, h))

  var importsAi: bool
  var fn: Fn
  var handling: Handling
  var spelling: Spelling
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet f = Set(GenerateText, GenerateObject, StreamText, StreamObject).oneOf()
    nondet h = Set(NoHandling, TryCatch, TryFinally, OnErrorOption, TryAroundCallback).oneOf()
    nondet sp = Set(Named, Namespace, Aliased).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { importsAi' = i, fn' = f, handling' = h, spelling' = sp, testCtx' = tc, verdict' = (reports(i, f, h, sp) and not(exempt(tc))) }
  }

  action init = step
}
