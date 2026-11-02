// Model of eslint-plugin-secure-coding/no-format-string-injection (CWE-134).
// Contract: a format function's FIRST argument coming from user input (a request
// member, or a name in the user-input family) is reported. A literal or
// const-bound literal format string is not, even when untrusted data is passed
// as a later ARGUMENT (the documented mitigation). A neutral name is not user
// input under the documented name vocabulary.
module no_format_string_injection {
  type Fn = UtilFormat | UtilFormatDestr | ConsoleLog | Sprintf
  type Fmt = ReqBody | UserFormat | Literal | ConstBound | NeutralVar

  pure def reports(f: Fmt): bool = Set(ReqBody, UserFormat).contains(f)

  var fn: Fn
  var fmt: Fmt
  var verdict: bool

  action step = {
    nondet f = Set(UtilFormat, UtilFormatDestr, ConsoleLog, Sprintf).oneOf()
    nondet m = Set(ReqBody, UserFormat, Literal, ConstBound, NeutralVar).oneOf()
    all { fn' = f, fmt' = m, verdict' = reports(m) }
  }

  action init = step
}
