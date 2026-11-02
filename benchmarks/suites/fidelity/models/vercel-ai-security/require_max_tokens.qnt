// Model of eslint-plugin-vercel-ai-security/require-max-tokens (CWE-770).
// A call to a target SDK function (default generateText, streamText,
// generateObject, streamObject — by exact name, through any import spelling)
// whose inline options carry no maxTokens / maxOutputTokens is reported. A
// spread may carry the limit. targetFunctions narrows the set.
module require_max_tokens {
  type Opts = NoLimit | MaxTokens | MaxOutputTokens | QuotedMaxTokens | SpreadBase
  type Fn = GenerateText | StreamText | GenerateObject | StreamObject | Embed | GenerateTextureAtlas
  type Spelling = Named | Namespace | Aliased

  pure def isTarget(f: Fn, onlyGenerateText: bool): bool =
    if (onlyGenerateText) f == GenerateText
    else f == GenerateText or f == StreamText or f == GenerateObject or f == StreamObject

  pure def reports(importsAi: bool, o: Opts, f: Fn, sp: Spelling, onlyGenerateText: bool): bool =
    importsAi and isTarget(f, onlyGenerateText) and o == NoLimit

  var importsAi: bool
  var opts: Opts
  var fn: Fn
  var spelling: Spelling
  var onlyGenerateText: bool
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet o = Set(NoLimit, MaxTokens, MaxOutputTokens, QuotedMaxTokens, SpreadBase).oneOf()
    nondet f = Set(GenerateText, StreamText, GenerateObject, StreamObject, Embed, GenerateTextureAtlas).oneOf()
    nondet sp = Set(Named, Namespace, Aliased).oneOf()
    nondet t = Set(true, false).oneOf()
    all {
      importsAi' = i, opts' = o, fn' = f, spelling' = sp, onlyGenerateText' = t,
      verdict' = reports(i, o, f, sp, t),
    }
  }

  action init = step
}
