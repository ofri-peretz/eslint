const { tag } = require('../../lib.cjs');

const ENTITY_XML =
  '`<?xml version="1.0"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM "file:///etc/passwd">\n]>\n<data>&xxe;</data>`';

module.exports = {
  domain: 48,
  traces: 500,
  rule: 'no-xxe-injection',
  key: (s) =>
    `${tag(s.parser)}|${tag(s.input)}|${tag(s.opts)}|${tag(s.spelling)}`,
  config: () => ({}),
  code: (s) => {
    const imp = tag(s.spelling) === 'Import';
    const input = {
      Untrusted: 'req.body.xml',
      ConstXml: "'<a>1</a>'",
      ConstEntity: 'ENTITY',
    }[tag(s.input)];
    const opts = {
      NoOpts: '',
      NoentTrue: ', { noent: true }',
      NoentFalse: ', { noent: false }',
    }[tag(s.opts)];
    const header =
      tag(s.input) === 'ConstEntity' ? `const ENTITY = ${ENTITY_XML};\n` : '';
    let head, call;
    switch (tag(s.parser)) {
      case 'LibxmlNs':
        head = imp
          ? "import libxml from 'libxmljs';"
          : "const libxml = require('libxmljs');";
        call = `libxml.parseXmlString(${input}${opts})`;
        break;
      case 'LibxmlDestr':
        head = imp
          ? "import { parseXmlString } from 'libxmljs';"
          : "const { parseXmlString } = require('libxmljs');";
        call = `parseXmlString(${input}${opts})`;
        break;
      case 'Xml2js':
        head = imp
          ? "import * as xml2js from 'xml2js';"
          : "const xml2js = require('xml2js');";
        call = `xml2js.parseString(${input}, (err, out) => out)`;
        break;
      case 'FastXml':
        head = imp
          ? "import { XMLParser } from 'fast-xml-parser';"
          : "const { XMLParser } = require('fast-xml-parser');";
        call = `new XMLParser().parse(${input})`;
        break;
    }
    return `${head}\n${header}export function handler(req: any, res: any) {\n  const doc = ${call};\n  res.json(doc);\n}\n`;
  },
};
