// Model of eslint-plugin-mcp-sdk-security/no-predictable-session-id (CWE-330).
// A Streamable HTTP server transport (v1 StreamableHTTPServerTransport, v2
// NodeStreamableHTTPServerTransport / WebStandardStreamableHTTPServerTransport)
// whose inline `sessionIdGenerator` returns only guessable values — a
// counter, Date.now / new Date / performance.now / process.hrtime,
// Math.random, a literal, or a module-level const (computed once, so the same
// for every session), kept predictable through templates, String(), Math
// rounding and string / date methods — is reported. The generator may be an
// arrow, a method shorthand, a same-file function passed by name, a same-file
// helper it calls, or `Date.now` passed by reference; a TypeScript cast or
// `satisfies` on the generator or the options changes nothing. Any CSPRNG anywhere in
// the value (crypto randomUUID / randomBytes / getRandomValues, the global
// crypto, uuid v4 / v7, nanoid) is fine. The rule abstains on an imported
// generator, a method on an object, a let read without update, an env
// variable, a conditional, options in a variable or with a spread, and a
// per-request const closed over. A same-named local class and a file with no
// MCP package are not judged.
module no_predictable_session_id {
  type Part = Generators | Transports
  type Gen =
    | Counter | PreIncrement | DateNow | DateNowBase36 | NewDateIso | PerfNow | Hrtime
    | MathRandom | MathRandomFloor | Literal | ModuleConstRandom | DateNowRef | DateNowCast | OptionsCast
    | MethodDateNow | NamedFnRandom | HelperTimestamp | LocalConstTimestamp
    | RandomUuid | RandomUuidRef | GlobalCrypto | RandomBytesHex | UuidV4 | UuidV7 | Nanoid
    | TimestampPlusUuid | ImportedGen | ObjectMethod | LetNoUpdate | EnvValue | Conditional
    | PerRequestConst | OptionsVar | OptionsSpread
  type Transport = V1 | V1Require | NodeV2 | WebV2 | LocalClass | NoMcp

  pure def predictable(g: Gen): bool = match g {
    | Counter => true
    | PreIncrement => true
    | DateNow => true
    | DateNowBase36 => true
    | NewDateIso => true
    | PerfNow => true
    | Hrtime => true
    | MathRandom => true
    | MathRandomFloor => true
    | Literal => true
    | ModuleConstRandom => true
    | DateNowRef => true
    | DateNowCast => true
    | OptionsCast => true
    | MethodDateNow => true
    | NamedFnRandom => true
    | HelperTimestamp => true
    | LocalConstTimestamp => true
    | _ => false
  }
  pure def sdkTransport(t: Transport): bool = t != LocalClass and t != NoMcp

  pure def reports(g: Gen, t: Transport): bool = sdkTransport(t) and predictable(g)

  var part: Part
  var gen: Gen
  var transport: Transport
  var verdict: bool

  action step = {
    nondet p = Set(Generators, Transports).oneOf()
    nondet g = (if (p == Generators) Set(Counter, PreIncrement, DateNow, DateNowBase36, NewDateIso, PerfNow, Hrtime, MathRandom, MathRandomFloor, Literal, ModuleConstRandom, DateNowRef, DateNowCast, OptionsCast, MethodDateNow, NamedFnRandom, HelperTimestamp, LocalConstTimestamp, RandomUuid, RandomUuidRef, GlobalCrypto, RandomBytesHex, UuidV4, UuidV7, Nanoid, TimestampPlusUuid, ImportedGen, ObjectMethod, LetNoUpdate, EnvValue, Conditional, PerRequestConst, OptionsVar, OptionsSpread) else Set(DateNow, MathRandom, Literal, RandomUuid)).oneOf()
    nondet t = (if (p == Generators) Set(V1) else Set(V1, V1Require, NodeV2, WebV2, LocalClass, NoMcp)).oneOf()
    all {
      part' = p,
      gen' = g,
      transport' = t,
      verdict' = reports(g, t),
    }
  }

  action init = step
}
