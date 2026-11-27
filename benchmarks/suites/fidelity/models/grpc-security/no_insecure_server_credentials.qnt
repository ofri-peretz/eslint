// Model of eslint-plugin-grpc-security/no-insecure-server-credentials (CWE-319).
// bindAsync/bind with ServerCredentials.createInsecure() (inline, via a const,
// or an imported ServerCredentials) reports when the address proves every
// interface: 0.0.0.0, [::], or a bare port, including a fixed host with a
// port from the environment. Loopback, unix sockets, named and configured
// hosts are silent; so is any other credential.
module no_insecure_server_credentials {
  type Creds = Insecure | InsecureConst | InsecureImported | Ssl | Unknown | ChannelInsecure
  type Address =
    | Any4 | Any6 | BarePort | Any4EnvPort | Any4Concat
    | Loopback4 | Loopback6 | Unix | Named | EnvHost | Config
  type Method = BindAsync | Bind

  pure def insecure(c: Creds): bool =
    c == Insecure or c == InsecureConst or c == InsecureImported

  pure def exposed(a: Address): bool =
    a == Any4 or a == Any6 or a == BarePort or a == Any4EnvPort or a == Any4Concat

  pure def reports(c: Creds, a: Address): bool = insecure(c) and exposed(a)

  var creds: Creds
  var address: Address
  var method: Method
  var verdict: bool

  action step = {
    nondet c = Set(Insecure, InsecureConst, InsecureImported, Ssl, Unknown, ChannelInsecure).oneOf()
    nondet a = Set(
      Any4, Any6, BarePort, Any4EnvPort, Any4Concat,
      Loopback4, Loopback6, Unix, Named, EnvHost, Config,
    ).oneOf()
    nondet m = Set(BindAsync, Bind).oneOf()
    all { creds' = c, address' = a, method' = m, verdict' = reports(c, a) }
  }

  action init = step
}
