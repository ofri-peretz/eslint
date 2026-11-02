// Model of eslint-plugin-browser-security/no-disabled-certificate-validation (CWE-295).
// Turning TLS certificate validation off reports: rejectUnauthorized: false
// (https.Agent, tls.connect, axios httpsAgent, any key spelling), strictSSL:
// false (request), a checkServerIdentity that accepts everything, and
// NODE_TLS_REJECT_UNAUTHORIZED set to 0 (any member spelling - including
// TypeScript's `(process.env as any)` - string or number). The validated twins (true, '1', a custom CA) do not.
module no_disabled_certificate_validation {
  type Pattern =
    | AgentRejectFalse
    | AgentRejectTrue
    | AgentRejectFalseStrKey
    | AgentCaTrue
    | AxiosAgentFalse
    | TlsConnectFalse
    | RequestStrictSslFalse
    | RequestStrictSslTrue
    | CheckServerIdentityNoop
    | EnvTls0
    | EnvTls1
    | EnvBracket0
    | EnvNumber0
    | EnvCastAny0
  type Import = NoImport | RequireHttps | ImportNodeHttps

  pure def reports(p: Pattern, i: Import): bool = match p {
    | AgentRejectTrue => false
    | AgentCaTrue => false
    | RequestStrictSslTrue => false
    | EnvTls1 => false
    | _ => true
  }

  var pattern: Pattern
  var imp: Import
  var verdict: bool

  action step = {
    nondet p = Set(AgentRejectFalse, AgentRejectTrue, AgentRejectFalseStrKey, AgentCaTrue, AxiosAgentFalse, TlsConnectFalse, RequestStrictSslFalse, RequestStrictSslTrue, CheckServerIdentityNoop, EnvTls0, EnvTls1, EnvBracket0, EnvNumber0, EnvCastAny0).oneOf()
    nondet i = Set(NoImport, RequireHttps, ImportNodeHttps).oneOf()
    all { pattern' = p, imp' = i, verdict' = reports(p, i) }
  }

  action init = step
}
