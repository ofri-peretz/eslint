// Model of eslint-plugin-grpc-security/no-credential-metadata-logging (CWE-532).
// A log call (global console, a pino() result, a winston.createLogger()
// result) whose argument contains gRPC metadata: the whole call.metadata, its
// getMap() or toJSON(), a credential header's value (authorization, cookie,
// x-api-key, any case), or a credential key read off the map. A non-credential
// header, a computed name, a presence check, or an audit sink that is not a
// logger is silent. Wrapping (an object, a template, String()) does not
// change the verdict.
module no_credential_metadata_logging {
  type Logger = Console | Pino | Winston | Audit | LocalConsole
  type Value =
    | Whole | GetMap | ToJson | AuthGet | CookieGet | ApiKeyIndexed | MapCookie
    | RequestId | ComputedName | Presence | Request
  type Wrap = Bare | InObject | InTemplate | Stringified

  pure def isLogger(l: Logger): bool = l == Console or l == Pino or l == Winston

  pure def leaks(v: Value): bool = match v {
    | Whole => true
    | GetMap => true
    | ToJson => true
    | AuthGet => true
    | CookieGet => true
    | ApiKeyIndexed => true
    | MapCookie => true
    | RequestId => false
    | ComputedName => false
    | Presence => false
    | Request => false
  }

  pure def reports(l: Logger, v: Value): bool = isLogger(l) and leaks(v)

  var logger: Logger
  var value: Value
  var wrap: Wrap
  var verdict: bool

  action step = {
    nondet l = Set(Console, Pino, Winston, Audit, LocalConsole).oneOf()
    nondet v = Set(
      Whole, GetMap, ToJson, AuthGet, CookieGet, ApiKeyIndexed, MapCookie,
      RequestId, ComputedName, Presence, Request,
    ).oneOf()
    nondet w = Set(Bare, InObject, InTemplate, Stringified).oneOf()
    all { logger' = l, value' = v, wrap' = w, verdict' = reports(l, v) }
  }

  action init = step
}
