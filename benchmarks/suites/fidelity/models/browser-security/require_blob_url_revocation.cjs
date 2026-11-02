const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 96,
  traces: 1000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'require-blob-url-revocation',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.create)}|${tag(s.binding)}|${tag(s.revoke)}|${tag(s.scope)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const create =
      tag(s.create) === 'UrlCreate'
        ? 'URL.createObjectURL(blob)'
        : 'window.URL.createObjectURL(blob)';
    const use =
      tag(s.binding) === 'Const'
        ? [`const url = ${create};`, 'img.src = url;']
        : [`img.src = ${create};`];
    const rev = {
      NoRevoke: [],
      RevokeInCallback: ['img.onload = () => URL.revokeObjectURL(url);'],
      RevokeImmediate: ['URL.revokeObjectURL(url);'],
      RevokeOther: ['URL.revokeObjectURL(otherUrl);'],
    }[tag(s.revoke)];
    const body = [...use, ...rev].join(' ');
    const head = [
      'declare const img: HTMLImageElement;',
      'declare const otherUrl: string;',
      'declare const files: Blob[];',
      'declare const blob: Blob;',
    ];
    if (tag(s.binding) === 'Direct') head.push('declare const url: string;');
    const wrapped =
      tag(s.scope) === 'TopLevel'
        ? `export function show() { ${body} }`
        : `files.forEach((blob) => { ${body} });`;
    return [...head, wrapped].join('\n');
  },
  model: (s) => s.verdict,
};
