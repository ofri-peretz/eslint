// Model of eslint-plugin-gemini-security/no-hardcoded-api-key (CWE-798).
// A key-shaped literal (>= 20 chars, letters and digits, no whitespace) used
// as a Gemini API key is a committed secret: `apiKey` in the @google/genai
// client options, or the positional key of the @google/generative-ai
// constructors (GoogleGenerativeAI, and the server-side GoogleAIFileManager /
// GoogleAICacheManager), renamed or required included. `project` is not a
// credential. The literal is reported when written inline, as an env
// fallback (?? / || / a ternary branch), in a const, and (options form) in a
// const options object, as shorthand or through a same-file spread.
// Stand-ins (placeholder, the SDK's own 'fake-api-key', x-fill, short, no
// digits, spaced), env reads, parameters, imports and a spread of a
// parameter are not keys. Another vendor's client in the same file, or a
// file with no Gemini import, is not judged.
module no_hardcoded_api_key {
  type Part = Values | Props | Gates
  type Form = Options | Positional
  type Value =
    | KeyLiteral | Placeholder | StandIn | XFill | Short | NoDigits | Spaced
    | Env | EnvNullish | EnvOr | Ternary | ConstKey | ConstOptions | Shorthand
    | Spread | Param | Imported | UnseenSpread
  type Prop = ApiKey | Project
  type Spelling =
    | Named | Renamed | Namespace | Require | RequireMember
    | Subclass | Wrapper | Legacy | LegacyRenamed | LegacyRequire
    | FileManager | CacheManager | Lookalike | NoImport | LegacyNoImport

  pure def committed(v: Value): bool = match v {
    | KeyLiteral => true
    | EnvNullish => true
    | EnvOr => true
    | Ternary => true
    | ConstKey => true
    | ConstOptions => true
    | Shorthand => true
    | Spread => true
    | _ => false
  }
  // Values that only exist as an options object.
  pure def optionsOnly(v: Value): bool =
    v == ConstOptions or v == Shorthand or v == Spread or v == UnseenSpread
  pure def positional(s: Spelling): bool = match s {
    | Legacy => true
    | LegacyRenamed => true
    | LegacyRequire => true
    | FileManager => true
    | CacheManager => true
    | LegacyNoImport => true
    | _ => false
  }
  pure def sdkClient(s: Spelling): bool =
    s != Lookalike and s != NoImport and s != LegacyNoImport

  pure def reports(v: Value, p: Prop, s: Spelling): bool =
    committed(v) and p == ApiKey and sdkClient(s)

  var part: Part
  var form: Form
  var value: Value
  var prop: Prop
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Props, Gates).oneOf()
    nondet f = (if (pt == Values) Set(Options, Positional) else Set(Options)).oneOf()
    nondet v = (if (pt == Values) Set(
      KeyLiteral, Placeholder, StandIn, XFill, Short, NoDigits, Spaced, Env,
      EnvNullish, EnvOr, Ternary, ConstKey, ConstOptions, Shorthand, Spread,
      Param, Imported, UnseenSpread,
    ).filter(x => f == Options or not(optionsOnly(x))) else Set(KeyLiteral, Env)).oneOf()
    nondet p = (if (pt == Props) Set(ApiKey, Project) else Set(ApiKey)).oneOf()
    nondet s = (if (pt == Gates) Set(
      Named, Renamed, Namespace, Require, RequireMember, Subclass, Wrapper,
      Legacy, LegacyRenamed, LegacyRequire, FileManager,
      CacheManager, Lookalike, NoImport, LegacyNoImport,
    ) else if (f == Positional) Set(Legacy) else Set(Named)).oneOf()
    all {
      part' = pt,
      form' = if (pt == Gates and positional(s)) Positional else f,
      value' = v,
      prop' = p,
      spelling' = s,
      verdict' = reports(v, p, s),
    }
  }

  action init = step
}
