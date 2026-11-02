// Model of eslint-plugin-browser-security/require-postmessage-origin-check (CWE-346).
// Contract (docs/rules/require-postmessage-origin-check.md): a `message`
// handler registered inline must validate event.origin; a bare truthiness test
// of event.origin is not validation. Other event types are out of scope.
module require_postmessage_origin_check {
  type Reg = WinAEL | SelfAEL | BareAEL | WinOnMessage | ClickAEL
  type Check =
    | NoCheck       // uses event.data, never looks at origin
    | Truthy        // if (event.origin) { ... }  -- always truthy
    | StrictEq      // if (event.origin !== 'https://trusted.com') return;
    | Allowlist     // if (!ALLOWED.includes(event.origin)) return;
    | Destructured  // ({ origin, data }) => { if (origin !== '...') return; }
  type Form = Arrow | FnExpr
  type Ctx = Prod | TestDefault | TestFlipped

  pure def isMessageReg(r: Reg): bool = match r {
    | ClickAEL => false
    | _ => true
  }

  pure def validates(c: Check): bool = match c {
    | StrictEq => true
    | Allowlist => true
    | Destructured => true
    | _ => false
  }

  // allowInTests defaults to false.
  pure def skipped(c: Ctx): bool = c == TestFlipped

  pure def reports(r: Reg, c: Check, f: Form, x: Ctx): bool =
    not(skipped(x)) and isMessageReg(r) and not(validates(c))

  var reg: Reg
  var check: Check
  var form: Form
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(WinAEL, SelfAEL, BareAEL, WinOnMessage, ClickAEL).oneOf()
    nondet c = Set(NoCheck, Truthy, StrictEq, Allowlist, Destructured).oneOf()
    nondet f = Set(Arrow, FnExpr).oneOf()
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { reg' = r, check' = c, form' = f, ctx' = x, verdict' = reports(r, c, f, x) }
  }

  action init = step
}
