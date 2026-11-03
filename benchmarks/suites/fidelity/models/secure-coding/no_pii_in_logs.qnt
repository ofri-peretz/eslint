// Model of eslint-plugin-secure-coding/no-pii-in-logs (CWE-359).
// Contract: PII reaching console.{log,error,warn,info} or logger output is
// reported: a member whose name is a PII term as a WHOLE word (user.email,
// customer.creditCard, record.ssn), JSON.stringify of a user object, or a
// literal email address; as an argument or interpolated. A numeric conversion
// (`+user.phone`) still carries the value. Not PII: user.id, a
// name that merely contains a term (user.emailer), a hashed value. console.debug
// is not in the default console sink list.
module no_pii_in_logs {
  type Sink = ConsoleLog | ConsoleError | ConsoleDebug | LoggerInfo
  type Value = UserEmail | CreditCard | Ssn | StringifyUser | LiteralEmail | NumericPhone | UserId | Emailer | Hashed
  type Shape = Arg | Template

  pure def reports(k: Sink, v: Value): bool =
    k != ConsoleDebug and Set(UserEmail, CreditCard, Ssn, StringifyUser, LiteralEmail, NumericPhone).contains(v)

  var sink: Sink
  var value: Value
  var shape: Shape
  var verdict: bool

  action step = {
    nondet k = Set(ConsoleLog, ConsoleError, ConsoleDebug, LoggerInfo).oneOf()
    nondet v = Set(UserEmail, CreditCard, Ssn, StringifyUser, LiteralEmail, NumericPhone, UserId, Emailer, Hashed).oneOf()
    nondet sh = Set(Arg, Template).oneOf()
    all { sink' = k, value' = v, shape' = sh, verdict' = reports(k, v) }
  }

  action init = step
}
