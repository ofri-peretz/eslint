// Model of eslint-plugin-nestjs-security/no-res-bypass-serialization (CWE-200).
// A handler that injects the library response without passthrough and writes
// an object to it skips ClassSerializerInterceptor. Reported only where a
// serializer is visible (class/method interceptor, @SerializeOptions) or
// assumeGlobalSerializer is on.
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
  type Serializer = NoSerializer | ClassInterceptor | MethodInterceptor | SerializeOpts

  pure def bypasses(d: ResDeco): bool = d == Res or d == ResponseAlias or d == ResPassthroughFalse
  pure def writesObject(w: Write): bool = w == JsonObj or w == SendObj or w == StatusJson

  pure def reports(d: ResDeco, w: Write, s: Serializer, assumeGlobal: bool): bool =
    bypasses(d) and writesObject(w) and (s != NoSerializer or assumeGlobal)

  var resDeco: ResDeco
  var write: Write
  var serializer: Serializer
  var assumeGlobal: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet d = Set(NoRes, Res, ResponseAlias, ResPassthrough, ResPassthroughFalse).oneOf()
    nondet w = Set(JsonObj, SendObj, StatusJson, SendString, SendFile, Redirect, HandOff, NoWrite).oneOf()
    nondet s = Set(NoSerializer, ClassInterceptor, MethodInterceptor, SerializeOpts).oneOf()
    nondet g = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      resDeco' = d, write' = w, serializer' = s, assumeGlobal' = g,
      testCtx' = tc, verdict' = (reports(d, w, s, g) and not(exempt(tc))),
    }
  }

  action init = step
}
