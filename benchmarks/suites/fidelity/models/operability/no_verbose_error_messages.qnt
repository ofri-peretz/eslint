// Model of eslint-plugin-operability/no-verbose-error-messages (CWE-209).
// A stack trace in a response tells the client the server's file layout,
// dependency versions and code paths. The rule reports a response send
// (`res.send` / `res.json`, dotted, subscripted, or after `res.status(...)`)
// whose FIRST argument carries an error's `.stack`:
//   - read directly (`err.stack`, `err['stack']`);
//   - through a const (`const s = err.stack`) or destructured out of the error
//     (`const { stack } = err`);
//   - as the value of any property of an object literal - plain, quoted or
//     renamed key, or nested one object deeper;
//   - interpolated into a template literal or joined with `+`.
// It does not report:
//   - `err.message` (the safe twin);
//   - a property NAMED `stack` whose value is not a stack (`stack: 'hidden'`)
//     - the key name is not the leak, the value is;
//   - a value the rule cannot see into (a parameter, `{ ...err }`: an Error's
//     own `stack` is not enumerable, so spread does not copy it).
// Left out: the receiver - any object's `send` / `json` is treated as a
// response; the rule does not resolve `res` to an HTTP response: candidate
// for change (fires on a guess).
module no_verbose_error_messages {
  type Sink = Send | SendSubscript | Json | StatusJson
  type Payload = Stack | StackSubscript | ConstBound | Destructured | InObject | QuotedKey
    | RenamedKey | Nested | Template | Concat | Message | LiteralStackKey | Unknown | Spread

  pure def leaksStack(p: Payload): bool =
    Set(Stack, StackSubscript, ConstBound, Destructured, InObject, QuotedKey, RenamedKey,
        Nested, Template, Concat).contains(p)

  var sink: Sink
  var payload: Payload
  var verdict: bool

  action step = {
    nondet s = Set(Send, SendSubscript, Json, StatusJson).oneOf()
    nondet p = Set(Stack, StackSubscript, ConstBound, Destructured, InObject, QuotedKey,
                   RenamedKey, Nested, Template, Concat, Message, LiteralStackKey, Unknown, Spread).oneOf()
    all { sink' = s, payload' = p, verdict' = leaksStack(p) }
  }

  action init = step
}
