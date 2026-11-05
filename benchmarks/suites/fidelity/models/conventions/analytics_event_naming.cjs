const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const NAME = {
  Valid: 'articles:card_click',
  Vendor: '$pageview',
  NotSnake: 'ArticlesCardClick',
  NoCategory: 'articles_card_click',
  BadVerb: 'articles:card_clicked',
};

/** [setup lines, the argument expression]. */
const ARG = {
  Quoted: (n) => [[], `'${n}'`],
  Template: (n) => [[], `\`${n}\``],
  ConstBound: (n) => [[`const EVENT = '${n}';`], 'EVENT'],
  Interpolated: () => [[], '`articles:${slug}_view`'],
  Unknown: () => [[], 'eventName'],
};

const CALLEE = {
  BareTrack: (a) => `track(${a}, { id: 1 });`,
  PosthogCapture: (a) => `posthog.capture(${a}, { id: 1 });`,
  PosthogSubscript: (a) => `posthog['capture'](${a}, { id: 1 });`,
  OtherCall: (a) => `logger.info(${a}, { id: 1 });`,
};

module.exports = {
  rule: 'analytics-event-naming',
  domain: 4 * 5 * 5,
  traces: 900,
  key: keyOf('callee', 'arg', 'name'),
  code: (s) => {
    const [setup, expr] = ARG[tag(s.arg)](NAME[tag(s.name)]);
    return src(
      "import posthog from 'posthog-js';",
      "import { track } from './analytics';",
      'declare const logger: { info(m: string, d: object): void };',
      setup,
      'export function report(slug: string, eventName: string) {',
      `  ${CALLEE[tag(s.callee)](expr)}`,
      '}',
    );
  },
};
