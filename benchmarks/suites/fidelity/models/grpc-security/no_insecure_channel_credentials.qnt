// Model of eslint-plugin-grpc-security/no-insecure-channel-credentials (CWE-319).
// A client built with credentials.createInsecure() (inline, via a const, or an
// imported `credentials`) reports when a call on it passes a Metadata the file
// fills with a credential: an authorization, proxy-authorization, cookie or
// x-api-key header (any case), or a Bearer value. A TLS or unknown credential,
// a header that is not a credential, a computed header name, metadata that is
// never sent or sent on another client, or a non-Metadata map is silent.
module no_insecure_channel_credentials {
  type Creds = Insecure | InsecureConst | InsecureImported | Ssl | Unknown
  type Header = Authorization | Cookie | ApiKey | BearerValue | RequestId | Computed
  type Send = SameClient | OtherClient | NotSent | NotMetadata
  type Setter = Add | SetH

  pure def insecure(c: Creds): bool =
    c == Insecure or c == InsecureConst or c == InsecureImported

  pure def credential(h: Header): bool =
    h == Authorization or h == Cookie or h == ApiKey or h == BearerValue

  pure def reports(c: Creds, h: Header, s: Send): bool =
    insecure(c) and credential(h) and s == SameClient

  var creds: Creds
  var header: Header
  var send: Send
  var setter: Setter
  var verdict: bool

  action step = {
    nondet c = Set(Insecure, InsecureConst, InsecureImported, Ssl, Unknown).oneOf()
    nondet h = Set(Authorization, Cookie, ApiKey, BearerValue, RequestId, Computed).oneOf()
    nondet s = Set(SameClient, OtherClient, NotSent, NotMetadata).oneOf()
    nondet st = Set(Add, SetH).oneOf()
    all {
      creds' = c, header' = h, send' = s, setter' = st,
      verdict' = reports(c, h, s),
    }
  }

  action init = step
}
