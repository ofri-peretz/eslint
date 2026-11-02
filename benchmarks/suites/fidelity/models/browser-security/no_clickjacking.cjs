const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 22, // 11 shapes x detectTransparentOverlays
  traces: 300,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-clickjacking',
  filename: 'src/widget.tsx',
  key: (s) => `${tag(s.shape)}|detectOverlays=${s.detectOverlays}`,
  config: (s) => ({ detectTransparentOverlays: s.detectOverlays }),
  code: (s) =>
    ({
      LocalIframe:
        'export const W = () => <iframe src="/local-content.html"></iframe>;',
      ThirdPartyIframe:
        'export const W = () => <iframe src="https://widgets.example.net/x" />;',
      TransparentDiv:
        'export const W = () => <div style="opacity: 0; position: absolute; top: 0; left: 0;" />;',
      TransparentOverlay:
        'export const W = () => <iframe src="https://target.com/transfer" style="opacity: 0; position: absolute; top: 0; left: 0;" />;',
      FrameBuster: 'if (top != self) { top.location = self.location; }',
      UnguardedTopNav: "top.location = 'https://evil.test';",
      XfoAllowAll:
        "export function h(req: any, res: any) { res.setHeader('X-Frame-Options', 'ALLOWALL'); }",
      XfoDeny:
        "export function h(req: any, res: any) { res.setHeader('X-Frame-Options', 'DENY'); }",
      XfoSameOrigin:
        "export function h(req: any, res: any) { res.setHeader('X-Frame-Options', 'SAMEORIGIN'); }",
      CspNoFrameAncestors: `export const csp = "default-src 'self'";`,
      CspFrameAncestors: `export const csp = "default-src 'self'; frame-ancestors 'none'";`,
    })[tag(s.shape)],
  model: (s) => s.verdict,
};
