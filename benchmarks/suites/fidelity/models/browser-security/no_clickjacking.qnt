// Model of eslint-plugin-browser-security/no-clickjacking (CWE-1021).
// DEPRECATED (meta.deprecated, replacedBy express-security/require-helmet;
// removed from `recommended`) but still exported and functional, so this models
// its deprecated contract as documented in docs/rules/no-clickjacking.md plus
// the CHANGELOG fixes (2.1.7: a declared protection counts only when its VALUE
// protects; #427: a guarded frame-buster is the remediation, not manipulation).
// Scope: a non-app-shell file; requireFrameBusting stays at its default.
//
// `trustedSources` is the allowlist of iframe `src` ORIGINS (the doc's own
// configuration example lists `https://trusted.com` beside `self`), so an
// iframe from any other origin is reported as unsafeIframeUsage whatever
// detectTransparentOverlays says; that option governs the separate
// invisible-overlay finding, modelled on a same-origin <div>.
// A declaration that does not forbid framing (X-Frame-Options ALLOWALL, a
// policy with no frame-ancestors) is reported where it is written unless
// the file declares real protection elsewhere.
module no_clickjacking {
  type Shape =
    | LocalIframe          // <iframe src="/local-content.html">      (doc: Correct)
    | ThirdPartyIframe     // <iframe src="https://widgets.example.net/x" />
    | TransparentOverlay   // <iframe src=<third party> style="opacity: 0; position: absolute">
    | TransparentDiv       // <div style="opacity: 0; position: absolute" />
    | FrameBuster          // if (top != self) { top.location = self.location; }
    | UnguardedTopNav      // top.location = 'https://evil.test';
    | XfoAllowAll          // setHeader('X-Frame-Options', 'ALLOWALL')  (doc: Incorrect)
    | XfoDeny
    | XfoSameOrigin
    | CspNoFrameAncestors  // "default-src 'self'"                       (doc: Incorrect)
    | CspFrameAncestors    // "default-src 'self'; frame-ancestors 'none'"

  pure def reports(s: Shape, detectOverlays: bool): bool = match s {
    | ThirdPartyIframe => true
    | TransparentOverlay => true
    | TransparentDiv => detectOverlays
    | UnguardedTopNav => true
    | XfoAllowAll => true
    | CspNoFrameAncestors => true
    | _ => false
  }

  var shape: Shape
  var detectOverlays: bool
  var verdict: bool

  action step = {
    nondet s = Set(LocalIframe, ThirdPartyIframe, TransparentOverlay, TransparentDiv, FrameBuster, UnguardedTopNav, XfoAllowAll, XfoDeny, XfoSameOrigin, CspNoFrameAncestors, CspFrameAncestors).oneOf()
    nondet d = Set(true, false).oneOf()
    all { shape' = s, detectOverlays' = d, verdict' = reports(s, d) }
  }

  action init = step
}
