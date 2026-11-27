// Model of eslint-plugin-grpc-security/no-unbounded-message-size (CWE-770).
// gRPC's own size keys, grpc.max_receive_message_length and
// grpc.max_send_message_length, set to a value that evaluates to a negative
// number (no limit) or above 100 MiB. Any other key is not judged. The value
// is read from literals, arithmetic, shifts, consts and Infinity; a value from
// configuration or a bitwise expression is not judged. The place does not
// matter: server options, client options, an assignment onto an options
// object, a computed literal key.
module no_unbounded_message_size {
  type Key = Recv | Send | Other
  type Place = ServerOpts | ClientOpts | Assign | ComputedKey
  type Value =
    | MinusOne | Gig | ConstGig | Inf | Shift30
    | Exactly100 | Mb16 | Config | Bitwise

  pure def unbounded(v: Value): bool = match v {
    | MinusOne => true
    | Gig => true
    | ConstGig => true
    | Inf => true
    | Shift30 => true
    | Exactly100 => false
    | Mb16 => false
    | Config => false
    | Bitwise => false
  }

  pure def reports(k: Key, v: Value): bool = k != Other and unbounded(v)

  var key: Key
  var place: Place
  var value: Value
  var verdict: bool

  action step = {
    nondet k = Set(Recv, Send, Other).oneOf()
    nondet p = Set(ServerOpts, ClientOpts, Assign, ComputedKey).oneOf()
    nondet v = Set(
      MinusOne, Gig, ConstGig, Inf, Shift30, Exactly100, Mb16, Config, Bitwise,
    ).oneOf()
    all { key' = k, place' = p, value' = v, verdict' = reports(k, v) }
  }

  action init = step
}
