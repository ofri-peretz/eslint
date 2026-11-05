const { tag, num } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const WITHDRAW = [
  'withdraw(amount: number) {',
  "  if (amount <= 0) throw new Error('Amount must be positive');",
  "  if (this.balance < amount) throw new Error('Insufficient funds');",
  '  this.balance -= amount;',
  '}',
];
const DEPOSIT = [
  'deposit(amount: number) {',
  "  if (amount <= 0) throw new Error('Amount must be positive');",
  '  this.balance += amount;',
  '}',
];
const GETSET = [
  'getBalance() {',
  '  return this.balance;',
  '}',
  'setBalance(amount: number) {',
  '  this.balance = amount;',
  '}',
];

const MEMBERS = {
  AccessorsOnly: [
    'get amount() {',
    '  return this.balance;',
    '}',
    'set amount(value: number) {',
    '  this.balance = value;',
    '}',
  ],
  GetSetMethods: GETSET,
  FieldsOnly: ['owner = "";'],
  OneBusiness: [...WITHDRAW, ...GETSET],
  TwoBusiness: [...WITHDRAW, ...DEPOSIT],
  ArrowBusiness: [
    'withdraw = (amount: number) => {',
    "  if (this.balance < amount) throw new Error('Insufficient funds');",
    '  this.balance -= amount;',
    '};',
    ...GETSET,
  ],
};

module.exports = {
  rule: 'ddd-anemic-domain-model',
  // Shapes 6 x 2 x 3; Dtos 2 x 2 x 2; Paths 2 x 2 x 2.
  domain: 36 + 8 + 8,
  traces: 800,
  key: keyOf(
    'focus',
    'members',
    'minBusinessMethods',
    'form',
    'dtoName',
    'ignoreDtos',
    'path',
    'everywhere',
  ),
  filename: (s) =>
    tag(s.path) === 'Domain'
      ? 'src/domain/bank-account.ts'
      : 'src/services/bank-account.ts',
  config: (s) => {
    const o = {};
    if (num(s.minBusinessMethods) !== 1)
      o.minBusinessMethods = num(s.minBusinessMethods);
    if (!s.ignoreDtos) o.ignoreDtos = false;
    if (s.everywhere) o.domainPaths = [];
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const name = s.dtoName ? 'BankAccountDto' : 'BankAccount';
    const body = [
      'private balance = 0;',
      'constructor(opening: number) {',
      '  this.balance = opening;',
      '}',
      ...MEMBERS[tag(s.members)],
    ].map((l) => `  ${l}`);
    switch (tag(s.form)) {
      case 'Expression':
        return src(`export const Account = class ${name} {`, body, '};');
      case 'Anonymous':
        return src('export default class {', body, '}');
      default:
        return src(`export class ${name} {`, body, '}');
    }
  },
};
