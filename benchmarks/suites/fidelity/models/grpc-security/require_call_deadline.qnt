// Model of eslint-plugin-grpc-security/require-call-deadline (CWE-400).
// A call on a client built with gRPC channel credentials (inline createSsl,
// a const createInsecure, combineChannelCredentials) reports unless an
// options object carries a deadline, or an argument the file cannot read sits
// where options could go (a later identifier, a lone identifier with no
// callback, a spread object). Lifecycle methods and clients built with
// unseen credentials are not judged.
module require_call_deadline {
  type Client = SslInline | InsecureConst | Composed | UnknownCreds
  type Args =
    | ReqCallback | UnknownReqCallback | ReqOptsDeadline | ReqMdOptsDeadline
    | ReqOptsNoDeadline | ReqUnknownCb | LoneUnknown | NoArgs | ReqSpreadOpts
  type Method = Rpc | Close

  pure def isClient(c: Client): bool = c != UnknownCreds

  pure def lacks(a: Args): bool = match a {
    | ReqCallback => true
    | UnknownReqCallback => true
    | ReqOptsDeadline => false
    | ReqMdOptsDeadline => false
    | ReqOptsNoDeadline => true
    | ReqUnknownCb => false
    | LoneUnknown => false
    | NoArgs => true
    | ReqSpreadOpts => false
  }

  pure def reports(c: Client, a: Args, m: Method): bool =
    isClient(c) and m == Rpc and lacks(a)

  var client: Client
  var args: Args
  var method: Method
  var verdict: bool

  action step = {
    nondet c = Set(SslInline, InsecureConst, Composed, UnknownCreds).oneOf()
    nondet a = Set(
      ReqCallback, UnknownReqCallback, ReqOptsDeadline, ReqMdOptsDeadline,
      ReqOptsNoDeadline, ReqUnknownCb, LoneUnknown, NoArgs, ReqSpreadOpts,
    ).oneOf()
    nondet m = Set(Rpc, Close).oneOf()
    all { client' = c, args' = a, method' = m, verdict' = reports(c, a, m) }
  }

  action init = step
}
