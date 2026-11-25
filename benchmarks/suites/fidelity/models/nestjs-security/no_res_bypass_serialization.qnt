// Model of eslint-plugin-nestjs-security/no-res-bypass-serialization (CWE-200).
// A handler that injects the library response without passthrough and writes
// an object to it skips ClassSerializerInterceptor. Reported only where a
// serializer is visible (class/method interceptor, @SerializeOptions) or
// assumeGlobalSerializer is on. NestJS 12 adds a second serializer
// (StandardSchemaSerializerInterceptor) and, from 12.4, a second way past
// both: a returned web `Response` is sent as it is, so `return
// Response.json(user)` carries the object out unserialized. Only the global
// `Response` is the web one — a binding of that name imported into the file is
// something else.
module no_res_bypass_serialization {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type ResDeco =
    | NoRes
    | Res                  // @Res()
    | ResponseAlias        // @Response() — Nest's alias of @Res()
    | ResPassthrough       // @Res({ passthrough: true })
    | ResPassthroughFalse  // @Res({ passthrough: false })
  type Write =
    | JsonObj        // res.json(user)
    | SendObj        // res.send(user)
    | StatusJson     // res.status(200).json(user)
    | SendString     // res.send('ok')
    | SendFile       // res.sendFile(path)
    | Redirect       // res.redirect(url)
    | HandOff        // return this.svc.run(res)
    | NoWrite
  type Serializer =
    | NoSerializer | ClassInterceptor | MethodInterceptor | SerializeOpts
    | SchemaInterceptor   // @UseInterceptors(StandardSchemaSerializerInterceptor)
  // What a handler with no response parameter returns.
  type Returned =
    | Value          // return user
    | WebJson        // return Response.json(user)
    | WebJsonEmpty   // return Response.json({})
    | WebRedirect    // return Response.redirect(url)
    | ShadowedJson   // return Response.json(user), with `Response` imported

  pure def bypasses(d: ResDeco): bool = d == Res or d == ResponseAlias or d == ResPassthroughFalse
  pure def writesObject(w: Write): bool = w == JsonObj or w == SendObj or w == StatusJson

  pure def reports(d: ResDeco, w: Write, ret: Returned, s: Serializer, assumeGlobal: bool): bool =
    ((bypasses(d) and writesObject(w)) or ret == WebJson)
      and (s != NoSerializer or assumeGlobal)

  var resDeco: ResDeco
  var write: Write
  var returned: Returned
  var serializer: Serializer
  var assumeGlobal: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet d = Set(NoRes, Res, ResponseAlias, ResPassthrough, ResPassthroughFalse).oneOf()
    // A handler either takes the response and writes to it, or takes none and
    // returns something: the two dimensions are sampled on their own side.
    nondet w = (if (d == NoRes) Set(NoWrite)
                else Set(JsonObj, SendObj, StatusJson, SendString, SendFile, Redirect, HandOff, NoWrite)).oneOf()
    nondet rt = (if (d == NoRes) Set(Value, WebJson, WebJsonEmpty, WebRedirect, ShadowedJson)
                 else Set(Value)).oneOf()
    nondet s = Set(NoSerializer, ClassInterceptor, MethodInterceptor, SerializeOpts, SchemaInterceptor).oneOf()
    nondet g = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      resDeco' = d, write' = w, returned' = rt, serializer' = s, assumeGlobal' = g,
      testCtx' = tc, verdict' = (reports(d, w, rt, s, g) and not(exempt(tc))),
    }
  }

  action init = step
}
