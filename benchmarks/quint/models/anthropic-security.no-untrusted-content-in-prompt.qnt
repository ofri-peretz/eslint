// Model of the requests `anthropic-security/no-untrusted-content-in-prompt` must judge: a
// value reaches one instruction slot, through an inline or a const request,
// on the SDK client or on a same-file object that only shares the path. The
// contract (rule doc): report instruction text that is built from request
// data; stay silent on text the file fixes.
module anthropic_security_no_untrusted_content_in_prompt {
  type Value = Static | ReqField | ConstOfReq | ConstStatic | StaticHelper | HelperOfReq | TemplateMixed | TemplateStatic | DateInterp | ImportedConst | WholeParam | EnvInterp
  type Slot = SystemString | SystemBlocks | BatchParams
  type Carrier = InlineRequest | RequestConst
  type Receiver = SdkClient | LocalObject

  var value: Value
  var slot: Slot
  var carrier: Carrier
  var receiver: Receiver
  var expected: bool

  // Text that can carry a request's words into the instructions. Static text,
  // consts and helpers of static text, dates, imported constants and operator
  // env are not; a whole-value parameter is a wrapper the file cannot see past
  // (documented abstention).
  pure def dynamicText(v: Value): bool =
    Set(ReqField, ConstOfReq, HelperOfReq, TemplateMixed).contains(v)

  pure def shouldReport(v: Value, s: Slot, c: Carrier, r: Receiver): bool =
    r == SdkClient and dynamicText(v)

  action init = all {
    nondet value0 = Set(Static, ReqField, ConstOfReq, ConstStatic, StaticHelper, HelperOfReq, TemplateMixed, TemplateStatic, DateInterp, ImportedConst, WholeParam, EnvInterp).oneOf()
    nondet slot0 = Set(SystemString, SystemBlocks, BatchParams).oneOf()
    nondet carrier0 = Set(InlineRequest, RequestConst).oneOf()
    nondet receiver0 = Set(SdkClient, LocalObject).oneOf()
    all {
      value' = value0,
      slot' = slot0,
      carrier' = carrier0,
      receiver' = receiver0,
      expected' = shouldReport(value0, slot0, carrier0, receiver0),
    }
  }

  action step = all {
    value' = value,
    slot' = slot,
    carrier' = carrier,
    receiver' = receiver,
    expected' = expected,
  }
}
