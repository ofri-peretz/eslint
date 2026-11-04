// Model of eslint-plugin-postgresql-security/check-query-params (CWE-89 family:
// a query whose bind values do not match its placeholders).
// pg sends `$n` placeholders and the values array separately, and the server
// rejects a bind message whose count differs from the statement's. When the
// statement is static text (a string literal or a template with no
// interpolation) and the values are an array literal, a highest placeholder
// index that differs from the number of values is reported: a missing value,
// an extra value, or placeholders with no values at all (no second argument,
// or only the result callback). A `PREPARE name AS ... $1` declares its
// parameters and binds none. A repeated `$1` and a `$1::int` cast count
// once. A spread array has a count the file cannot know and is not judged.
// Files with no PostgreSQL import are not judged.
// Narrowed: values sent to a statement with NO `$n` are left out. The rule
// deliberately abstains there, since a pg file that also drives a `?`-placeholder
// client (a MySQL replica) cannot be told apart by the text alone.
module check_query_params {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | NoImport
  type Call =
    | Missing | Extra | PlaceholdersNoValues | CallbackNoValues
    | TemplateMissing | ConfigMissing
    | Match1 | Match2 | Repeated | CastMatch | TemplateMatch | ConfigMatch
    | Spread | NoParams | Prepare

  pure def mismatched(c: Call): bool = match c {
    | Missing => true
    | Extra => true
    | CallbackNoValues => true
    | PlaceholdersNoValues => true
    | TemplateMissing => true
    | ConfigMissing => true
    | Match1 => false
    | Match2 => false
    | Repeated => false
    | CastMatch => false
    | TemplateMatch => false
    | ConfigMatch => false
    | Spread => false
    | Prepare => false
    | NoParams => false
  }

  pure def reports(d: Driver, c: Call): bool = d != NoImport and mismatched(c)

  var driver: Driver
  var call: Call
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, NoImport,
    ).oneOf()
    nondet c = Set(
      Missing, Extra, PlaceholdersNoValues, CallbackNoValues,
      TemplateMissing, ConfigMissing,
      Match1, Match2, Repeated, CastMatch, TemplateMatch, ConfigMatch,
      Spread, NoParams, Prepare,
    ).oneOf()
    all { driver' = d, call' = c, verdict' = reports(d, c) }
  }

  action init = step
}
