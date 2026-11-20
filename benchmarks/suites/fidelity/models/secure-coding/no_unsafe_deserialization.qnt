// Model of eslint-plugin-secure-coding/no-unsafe-deserialization (CWE-502).
// Contract: untrusted (request) data reaching a code-executing deserializer is
// reported: the string form of setTimeout, node-serialize unserialize, js-yaml
// load without a safe schema. `eval` and `new Function` are code injection
// (CWE-95), owned by node-security/detect-eval-with-expression, and are not
// reported here (two rules on one call is noise). Safe: JSON.parse, js-yaml
// load with JSON_SCHEMA, js-yaml safeLoad, the non-executing `yaml` package,
// setTimeout with a function. A `deserialize` call is a dangerous function when
// handed request data; the same call INSIDE a deserializer implementation
// (`super.deserialize(ctx)` in `static deserialize`) is protocol chaining and is
// not reported (present in every sample). A constant argument is not
// deserialization of untrusted data.
module no_unsafe_deserialization {
  type Sink = Eval | NewFunction | SetTimeoutStr | SetTimeoutFn | Unserialize | JsYamlLoad
            | JsYamlSafeSchema | JsYamlSafeLoad | YamlParse | JsonParse | DeserializeCall
  type Input = ReqBody | Const

  pure def reports(k: Sink, i: Input): bool =
    i == ReqBody and Set(SetTimeoutStr, Unserialize, JsYamlLoad, DeserializeCall).contains(k)

  var sink: Sink
  var input: Input
  var verdict: bool

  action step = {
    nondet k = Set(Eval, NewFunction, SetTimeoutStr, SetTimeoutFn, Unserialize, JsYamlLoad,
                   JsYamlSafeSchema, JsYamlSafeLoad, YamlParse, JsonParse, DeserializeCall).oneOf()
    nondet i = Set(ReqBody, Const).oneOf()
    all { sink' = k, input' = i, verdict' = reports(k, i) }
  }

  action init = step
}
