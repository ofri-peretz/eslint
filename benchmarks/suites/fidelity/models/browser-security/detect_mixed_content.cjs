const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 45,
  traces: 600,
  pkg: 'eslint-plugin-browser-security',
  rule: 'detect-mixed-content',
  filename: 'src/app.tsx',
  key: (s) => `${tag(s.pos)}|${tag(s.url)}`,
  code: (s) => {
    const u = {
      Http: 'http://example.com/logo.png',
      Https: 'https://example.com/logo.png',
      ProtoRel: '//cdn.example.com/asset.js',
      XmlNs: 'http://www.w3.org/2000/svg',
      UpperHttp: 'HTTP://EXAMPLE.COM/logo.png',
    }[tag(s.url)];
    const body = {
      JsxImgSrc: `export const C = () => <img src="${u}" />;`,
      JsxScriptSrc: `export const C = () => <script src="${u}"></script>;`,
      ElSrcAssign: `export function f(img: HTMLImageElement) { img.src = '${u}'; }`,
      SetAttrSrc: `export function f(img: HTMLImageElement) { img.setAttribute('src', '${u}'); }`,
      ImportScripts: `importScripts('${u}');`,
      BareConst: `export const imageUrl = '${u}';`,
      FetchArg: `export function f() { return fetch('${u}'); }`,
      JsxAnchorHref: `export const C = () => <a href="${u}">home</a>;`,
      CreateElementNS: `export const el = document.createElementNS('${u}', 'svg');`,
    }[tag(s.pos)];
    return ['declare function importScripts(u: string): void;', body].join(
      '\n',
    );
  },
  model: (s) => s.verdict,
};
