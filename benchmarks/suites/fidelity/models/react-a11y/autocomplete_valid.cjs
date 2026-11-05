const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const VALUE = {
  On: 'on',
  Off: 'off',
  Email: 'email',
  Name: 'name',
  StreetAddress: 'street-address',
  ShippingPostal: 'shipping postal-code',
  SectionBillingEmail: 'section-blue billing email',
  HomeTel: 'home tel',
  WorkEmail: 'work email',
  OneTimeCode: 'one-time-code',
  UsernameWebauthn: 'username webauthn',
  Upper: 'EMAIL',
  Padded: ' email ',
  Foo: 'foo',
  Typo: 'emial',
  TwoFields: 'email name',
  HomeName: 'home name',
  BillingAlone: 'billing',
  TrueTok: 'true',
};
const ELEM = {
  Input: ['input', ['type="text"']],
  Select: ['select', []],
  Textarea: ['textarea', []],
  Component: ['TextInput', []],
  ComponentOpt: ['TextInput', []],
  Div: ['div', []],
};

module.exports = {
  rule: 'autocomplete-valid',
  // Values 19 x 2 attr spellings; Spellings 2 x 4; Elems 2 x 4.
  domain: 38 + 8 + 8,
  traces: 600,
  filename: FILE,
  key: (s) =>
    ['focus', 'value', 'spelling', 'elem', 'attrName']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.elem) === 'ComponentOpt'
      ? { inputComponents: ['TextInput'] }
      : undefined,
  code: (s) => {
    const [t, base] = ELEM[tag(s.elem)];
    const a = attr(
      tag(s.attrName) === 'Lower' ? 'autocomplete' : 'autoComplete',
      VALUE[tag(s.value)],
      tag(s.spelling),
    );
    return program(
      el(t, [...base, a], t === 'select' ? '<option>One</option>' : ''),
      {
        pre: ["import { TextInput } from './ui';"],
      },
    );
  },
};
