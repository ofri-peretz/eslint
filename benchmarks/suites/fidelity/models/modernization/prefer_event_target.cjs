const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [declarations, the constructor expression the code uses]
const SPELLING = {
  NamedImport: [["import { EventEmitter } from 'events';"], 'EventEmitter'],
  RenamedImport: [["import { EventEmitter as Bus } from 'events';"], 'Bus'],
  NodePrefixImport: [
    ["import { EventEmitter } from 'node:events';"],
    'EventEmitter',
  ],
  DefaultImport: [["import Emitter from 'node:events';"], 'Emitter'],
  NamespaceMember: [["import * as ev from 'events';"], 'ev.EventEmitter'],
  RequireDestructure: [
    ["const { EventEmitter } = require('events');"],
    'EventEmitter',
  ],
  RequireQuotedKey: [
    ["const { 'EventEmitter': Bus } = require('events');"],
    'Bus',
  ],
  RequireRoot: [["const Emitter = require('node:events');"], 'Emitter'],
  RequireMember: [[], "require('events').EventEmitter"],
  AngularImport: [
    ["import { EventEmitter } from '@angular/core';"],
    'EventEmitter',
  ],
  LocalClass: [['class EventEmitter { on() {} }'], 'EventEmitter'],
  ParamNamedEvents: [[], 'events.EventEmitter'],
  OnceImport: [["import { once } from 'events';", 'void once;'], 'EventTarget'],
  ExtendsEventTarget: [[], 'EventTarget'],
};

module.exports = {
  rule: 'prefer-event-target',
  domain: 14 * 2 * 2,
  traces: 700,
  key: keyOf('spelling', 'use', 'allowEventEmitter'),
  config: (s) =>
    s.allowEventEmitter ? { allowEventEmitter: true } : undefined,
  code: (s) => {
    const [decls, ctor] = SPELLING[tag(s.spelling)];
    const make = (c) =>
      tag(s.use) === 'Extends'
        ? [`  class Bus2 extends (${c}) {}`, '  return new Bus2();']
        : [`  return new (${c})();`];
    return src(decls, 'export function make(events: any) {', make(ctor), '}');
  },
};
