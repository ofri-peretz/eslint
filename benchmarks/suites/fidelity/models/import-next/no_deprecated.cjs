const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** The class `Old`, exported, with its mark. */
const DECL = {
  JsDoc: ['/** @deprecated Use New instead. */', 'export class Old {}'],
  Custom: ['/** @obsolete */', 'export class Old {}'],
  Decorator: ['@deprecated', 'export class Old {}'],
  NoMark: ['export class Old {}'],
};
const DECORATOR = 'function deprecated(target: unknown) { return target; }';

/** How the use site names `Old`, and what it shadows. */
const REF = {
  Local: { ref: 'Old', shadow: 'Old' },
  ImportNamed: { ref: 'Old', shadow: 'Old' },
  ImportRenamed: { ref: 'O2', shadow: 'O2' },
  ImportNamespace: { ref: 'm.Old', shadow: 'm' },
};

const IMPORT = {
  Local: [],
  ImportNamed: ["import { Old } from './dep';"],
  ImportRenamed: ["import { Old as O2 } from './dep';"],
  ImportNamespace: ["import * as m from './dep';"],
};

function usage(u, { ref, shadow }) {
  switch (u) {
    case 'New':
      return [`export const v = new ${ref}();`];
    case 'Reference':
      return [`export const v = ${ref};`];
    case 'Shadowed':
      return [`export const f = (${shadow}: any) => ${ref};`];
    case 'ObjectKey':
      return ['export const o = { Old: 1 };'];
    default:
      return ['export const v = 1;'];
  }
}

const OPTS = {
  Defaults: undefined,
  AllowListed: { allow: ['Old'] },
  JsDocOff: { checkJSDoc: false },
  DecoratorsOff: { checkDecorators: false },
  CustomMarker: { deprecationMarkers: ['@obsolete'] },
};

const declFile = (mark) =>
  src(mark === 'Decorator' ? [DECORATOR] : [], DECL[mark]);

module.exports = {
  rule: 'no-deprecated',
  typed: true,
  domain: 4 * 4 * 5 * 5,
  traces: 3200,
  key: keyOf('where', 'mark', 'usage', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  files: (s) =>
    tag(s.where) === 'Local' ? {} : { 'src/dep.ts': declFile(tag(s.mark)) },
  code: (s) => {
    const where = tag(s.where);
    return src(
      IMPORT[where],
      where === 'Local' ? declFile(tag(s.mark)).trimEnd().split('\n') : [],
      usage(tag(s.usage), REF[where]),
    );
  },
};
