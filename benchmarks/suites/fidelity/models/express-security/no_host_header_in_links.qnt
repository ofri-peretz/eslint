// Model of eslint-plugin-express-security/no-host-header-in-links (CWE-640).
// A Host-header read — req.headers.host / ['host'], X-Forwarded-Host,
// req.get('host'), req.header('host'), or req.hostname (Express derives it
// from Host) — directly or through a variable assigned from it, that flows
// into URL building is reported. URL building: a concat/template with a
// static `://` or leading `//` fragment, or a string passed to a mail-send
// call (`checkMailCallees`, default sendMail/send). Logging the host, or a
// constant origin, is safe. An if-guard comparing the host to one of
// `allowedHosts` suppresses the report.
module no_host_header_in_links {
  type Read = HostDot | HostBracket | XFwdHost | GetHost | HeaderFnHost | Hostname | EnvOrigin | UserAgent
  type Build = ConcatScheme | TemplateScheme | ProtoRelative | MailArg | CustomMail | LogOnly | PlainCopy
  type Flow = Direct | ViaVariable
  type Guard = NoIf | IfAllowed | IfOther
  type Focus = Reads | Builds | Flows | Guards

  pure def hostRead(r: Read): bool = r != EnvOrigin and r != UserAgent
  pure def urlBuild(b: Build, deliverOpt: bool): bool = match b {
    | CustomMail => deliverOpt
    | LogOnly => false
    | PlainCopy => false
    | _ => true
  }
  pure def reports(r: Read, b: Build, deliverOpt: bool, g: Guard, allowOpt: bool): bool =
    hostRead(r) and urlBuild(b, deliverOpt) and not(g == IfAllowed and allowOpt)

  var focus: Focus
  var read: Read
  var build: Build
  var flow: Flow
  var guard: Guard
  var deliverOpt: bool
  var allowOpt: bool
  var verdict: bool

  action step = {
    nondet f = Set(Reads, Builds, Flows, Guards).oneOf()
    nondet r = (if (f == Reads) Set(HostDot, HostBracket, XFwdHost, GetHost, HeaderFnHost, Hostname, EnvOrigin, UserAgent)
                else if (f == Flows) Set(HostDot, XFwdHost) else Set(HostDot)).oneOf()
    nondet b = (if (f == Builds) Set(ConcatScheme, TemplateScheme, ProtoRelative, MailArg, CustomMail, LogOnly, PlainCopy)
                else if (f == Flows) Set(ConcatScheme, TemplateScheme) else Set(ConcatScheme)).oneOf()
    nondet fl = (if (f == Flows) Set(Direct, ViaVariable) else if (f == Guards) Set(ViaVariable) else Set(Direct)).oneOf()
    nondet g = (if (f == Guards) Set(NoIf, IfAllowed, IfOther) else Set(NoIf)).oneOf()
    nondet d = (if (f == Builds and b == CustomMail) Set(true, false) else Set(false)).oneOf()
    nondet a = (if (f == Guards) Set(true, false) else Set(false)).oneOf()
    all { focus' = f, read' = r, build' = b, flow' = fl, guard' = g, deliverOpt' = d, allowOpt' = a,
          verdict' = reports(r, b, d, g, a) }
  }

  action init = step
}
