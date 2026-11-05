const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SPELLING = {
  Read: ['return el.innerText;'],
  Write: ["el.innerText = 'Hello';", 'return null;'],
  Subscript: ["return el['innerText'];"],
  Optional: ['return maybe?.innerText;'],
  Destructured: ['const { innerText } = el;', 'return innerText;'],
  DestructuredRenamed: ['const { innerText: text } = el;', 'return text;'],
  TextContent: ['return el.textContent;'],
  DynamicKey: ['return el[key];'],
  ObjectKey: ["return { innerText: 'Hello' };"],
  LocalName: ["const innerText = 'Hello';", 'return innerText;'],
};

module.exports = {
  rule: 'prefer-dom-node-text-content',
  domain: 10,
  traces: 200,
  key: keyOf('spelling'),
  code: (s) =>
    src(
      "export function read(el: HTMLElement, maybe: HTMLElement | null, key: 'id') {",
      SPELLING[tag(s.spelling)].map((l) => `  ${l}`),
      '}',
    ),
};
