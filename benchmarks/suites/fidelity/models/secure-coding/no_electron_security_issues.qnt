// Model of eslint-plugin-secure-coding/no-electron-security-issues (CWE-16).
// Contract: an Electron window's webPreferences that disables a protection is
// reported: nodeIntegration true, contextIsolation false, webSecurity false,
// sandbox false, allowRunningInsecureContent true. The secure value of each is
// not. Same verdict for a named import, a namespace require, and BrowserView.
module no_electron_security_issues {
  type Prop = NodeIntegration | ContextIsolation | WebSecurity | Sandbox | AllowInsecureContent
  type Ctor = BrowserWindowImport | ElectronRequire | BrowserViewImport

  pure def reports(insecure: bool): bool = insecure

  var prop: Prop
  var insecure: bool
  var ctor: Ctor
  var verdict: bool

  action step = {
    nondet p = Set(NodeIntegration, ContextIsolation, WebSecurity, Sandbox, AllowInsecureContent).oneOf()
    nondet i = Set(true, false).oneOf()
    nondet c = Set(BrowserWindowImport, ElectronRequire, BrowserViewImport).oneOf()
    all { prop' = p, insecure' = i, ctor' = c, verdict' = reports(i) }
  }

  action init = step
}
