// Model of eslint-plugin-secure-coding/no-improper-sanitization (CWE-116).
// Contract: a hand-rolled escape that does not neutralise every dangerous
// character (`.replace(/</g, '&lt;')` alone, or a non-global string replace that
// only rewrites the first occurrence) reaching an output sink is reported. A
// recognised sanitizer (DOMPurify.sanitize, escape) or a replace chain covering
// all of < > " ' & is sufficient.
module no_improper_sanitization {
  type Sink = InnerHTML | OuterHTML | ResSend
  type Value = PartialReplace | FirstOnlyReplace | FullReplaceChain | DomPurify | EscapeFn

  pure def reports(v: Value): bool = Set(PartialReplace, FirstOnlyReplace).contains(v)

  var sink: Sink
  var value: Value
  var verdict: bool

  action step = {
    nondet k = Set(InnerHTML, OuterHTML, ResSend).oneOf()
    nondet v = Set(PartialReplace, FirstOnlyReplace, FullReplaceChain, DomPurify, EscapeFn).oneOf()
    all { sink' = k, value' = v, verdict' = reports(v) }
  }

  action init = step
}
