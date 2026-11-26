/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * Derived from `@eslint-community/regexpp` v4.12.3 (`reader`, `group-specifiers`,
 * `validator`, `parser`), Copyright (c) 2018 Toru Nagashima, MIT License. See
 * THIRD_PARTY_NOTICES.md at the package root. Upstream:
 * https://github.com/eslint-community/regexpp; the commit is not recorded in the
 * published tarball (no `gitHead`); the npm release is the pin.
 *
 * What changed: regexpp is a parser, a validator, a visitor and a literal
 * scanner configurable by ECMAScript edition and strictness. The ReDoS rule
 * parses a pattern string under `u` / `v` / neither, so this keeps that one
 * path: the validator and the AST builder, fixed at the newest edition and
 * non-strict (Annex B) outside unicode mode. Gone: `parseLiteral`,
 * `parseFlags`, `validateLiteral`, the visitor, the `ecmaVersion` and `strict`
 * options (every `ecmaVersion >= N` test folded), the ES2018 group-name
 * tracker, the optional callbacks (the builder is the only handler), and the
 * `Flags` / `RegExpLiteral` nodes.
 *
 * Deliberately left as upstream compiled it, under `@ts-nocheck`: it is a port
 * of a third-party parser, tested against that parser rather than rewritten,
 * and re-typing 2,000 lines of it would add risk and no behaviour. The typed
 * surface is index.ts and ast.ts.
 */

// @ts-nocheck
import { isIdContinue, isIdStart } from './unicode-id';
import {
  isValidLoneUnicodeProperty,
  isValidLoneUnicodePropertyOfString,
  isValidUnicodeProperty,
} from './unicode-names';

const BACKSPACE = 0x08;
const CHARACTER_TABULATION = 0x09;
const LINE_FEED = 0x0a;
const LINE_TABULATION = 0x0b;
const FORM_FEED = 0x0c;
const CARRIAGE_RETURN = 0x0d;
const EXCLAMATION_MARK = 0x21;
const NUMBER_SIGN = 0x23;
const DOLLAR_SIGN = 0x24;
const PERCENT_SIGN = 0x25;
const AMPERSAND = 0x26;
const LEFT_PARENTHESIS = 0x28;
const RIGHT_PARENTHESIS = 0x29;
const ASTERISK = 0x2a;
const PLUS_SIGN = 0x2b;
const COMMA = 0x2c;
const HYPHEN_MINUS = 0x2d;
const FULL_STOP = 0x2e;
const SOLIDUS = 0x2f;
const DIGIT_ZERO = 0x30;
const DIGIT_ONE = 0x31;
const DIGIT_SEVEN = 0x37;
const DIGIT_NINE = 0x39;
const COLON = 0x3a;
const SEMICOLON = 0x3b;
const LESS_THAN_SIGN = 0x3c;
const EQUALS_SIGN = 0x3d;
const GREATER_THAN_SIGN = 0x3e;
const QUESTION_MARK = 0x3f;
const COMMERCIAL_AT = 0x40;
const LATIN_CAPITAL_LETTER_A = 0x41;
const LATIN_CAPITAL_LETTER_B = 0x42;
const LATIN_CAPITAL_LETTER_D = 0x44;
const LATIN_CAPITAL_LETTER_F = 0x46;
const LATIN_CAPITAL_LETTER_P = 0x50;
const LATIN_CAPITAL_LETTER_S = 0x53;
const LATIN_CAPITAL_LETTER_W = 0x57;
const LATIN_CAPITAL_LETTER_Z = 0x5a;
const LOW_LINE = 0x5f;
const LATIN_SMALL_LETTER_A = 0x61;
const LATIN_SMALL_LETTER_B = 0x62;
const LATIN_SMALL_LETTER_C = 0x63;
const LATIN_SMALL_LETTER_D = 0x64;
const LATIN_SMALL_LETTER_F = 0x66;
const LATIN_SMALL_LETTER_I = 0x69;
const LATIN_SMALL_LETTER_K = 0x6b;
const LATIN_SMALL_LETTER_M = 0x6d;
const LATIN_SMALL_LETTER_N = 0x6e;
const LATIN_SMALL_LETTER_P = 0x70;
const LATIN_SMALL_LETTER_Q = 0x71;
const LATIN_SMALL_LETTER_R = 0x72;
const LATIN_SMALL_LETTER_S = 0x73;
const LATIN_SMALL_LETTER_T = 0x74;
const LATIN_SMALL_LETTER_U = 0x75;
const LATIN_SMALL_LETTER_V = 0x76;
const LATIN_SMALL_LETTER_W = 0x77;
const LATIN_SMALL_LETTER_X = 0x78;
const LATIN_SMALL_LETTER_Z = 0x7a;
const LEFT_SQUARE_BRACKET = 0x5b;
const REVERSE_SOLIDUS = 0x5c;
const RIGHT_SQUARE_BRACKET = 0x5d;
const CIRCUMFLEX_ACCENT = 0x5e;
const GRAVE_ACCENT = 0x60;
const LEFT_CURLY_BRACKET = 0x7b;
const VERTICAL_LINE = 0x7c;
const RIGHT_CURLY_BRACKET = 0x7d;
const TILDE = 0x7e;
const ZERO_WIDTH_NON_JOINER = 0x200c;
const ZERO_WIDTH_JOINER = 0x200d;
const MIN_CODE_POINT = 0x00;
const MAX_CODE_POINT = 0x10ffff;
function isLatinLetter(code) {
  return (
    (code >= LATIN_CAPITAL_LETTER_A && code <= LATIN_CAPITAL_LETTER_Z) ||
    (code >= LATIN_SMALL_LETTER_A && code <= LATIN_SMALL_LETTER_Z)
  );
}
function isDecimalDigit(code) {
  return code >= DIGIT_ZERO && code <= DIGIT_NINE;
}
function isOctalDigit(code) {
  return code >= DIGIT_ZERO && code <= DIGIT_SEVEN;
}
function isHexDigit(code) {
  return (
    (code >= DIGIT_ZERO && code <= DIGIT_NINE) ||
    (code >= LATIN_CAPITAL_LETTER_A && code <= LATIN_CAPITAL_LETTER_F) ||
    (code >= LATIN_SMALL_LETTER_A && code <= LATIN_SMALL_LETTER_F)
  );
}
function isValidUnicode(code) {
  return code >= MIN_CODE_POINT && code <= MAX_CODE_POINT;
}
function digitToInt(code) {
  if (code >= LATIN_SMALL_LETTER_A && code <= LATIN_SMALL_LETTER_F) {
    return code - LATIN_SMALL_LETTER_A + 10;
  }
  if (code >= LATIN_CAPITAL_LETTER_A && code <= LATIN_CAPITAL_LETTER_F) {
    return code - LATIN_CAPITAL_LETTER_A + 10;
  }
  return code - DIGIT_ZERO;
}
function isLeadSurrogate(code) {
  return code >= 0xd800 && code <= 0xdbff;
}
function isTrailSurrogate(code) {
  return code >= 0xdc00 && code <= 0xdfff;
}
function combineSurrogatePair(lead, trail) {
  return (lead - 0xd800) * 0x400 + (trail - 0xdc00) + 0x10000;
}

class BranchID {
  constructor(parent, base) {
    this.parent = parent;
    this.base = base ?? this;
  }
  separatedFrom(other) {
    if (this.base === other.base && this !== other) {
      return true;
    }
    if (other.parent && this.separatedFrom(other.parent)) {
      return true;
    }
    return this.parent?.separatedFrom(other) ?? false;
  }
  child() {
    return new BranchID(this, null);
  }
  sibling() {
    return new BranchID(this.parent, this.base);
  }
}
class GroupSpecifiers {
  constructor() {
    this.branchID = new BranchID(null, null);
    this.groupNames = new Map();
  }
  clear() {
    this.branchID = new BranchID(null, null);
    this.groupNames.clear();
  }
  isEmpty() {
    return !this.groupNames.size;
  }
  enterDisjunction() {
    this.branchID = this.branchID.child();
  }
  enterAlternative(index) {
    if (index === 0) {
      return;
    }
    this.branchID = this.branchID.sibling();
  }
  leaveDisjunction() {
    this.branchID = this.branchID.parent;
  }
  hasInPattern(name) {
    return this.groupNames.has(name);
  }
  hasInScope(name) {
    const branches = this.groupNames.get(name);
    if (!branches) {
      return false;
    }
    for (const branch of branches) {
      if (!branch.separatedFrom(this.branchID)) {
        return true;
      }
    }
    return false;
  }
  addToScope(name) {
    const branches = this.groupNames.get(name);
    if (branches) {
      branches.push(this.branchID);
      return;
    }
    this.groupNames.set(name, [this.branchID]);
  }
}

const legacyImpl = {
  at(s, end, i) {
    return i < end ? s.charCodeAt(i) : -1;
  },
  width() {
    return 1;
  },
};
const unicodeImpl = {
  at(s, end, i) {
    return i < end ? s.codePointAt(i) : -1;
  },
  width(c) {
    return c > 0xffff ? 2 : 1;
  },
};
class Reader {
  constructor() {
    this._impl = legacyImpl;
    this._s = '';
    this._i = 0;
    this._end = 0;
    this._cp1 = -1;
    this._w1 = 1;
    this._cp2 = -1;
    this._w2 = 1;
    this._cp3 = -1;
    this._w3 = 1;
    this._cp4 = -1;
  }
  get source() {
    return this._s;
  }
  get index() {
    return this._i;
  }
  get currentCodePoint() {
    return this._cp1;
  }
  get nextCodePoint() {
    return this._cp2;
  }
  get nextCodePoint2() {
    return this._cp3;
  }
  get nextCodePoint3() {
    return this._cp4;
  }
  reset(source, start, end, uFlag) {
    this._impl = uFlag ? unicodeImpl : legacyImpl;
    this._s = source;
    this._end = end;
    this.rewind(start);
  }
  rewind(index) {
    const impl = this._impl;
    this._i = index;
    this._cp1 = impl.at(this._s, this._end, index);
    this._w1 = impl.width(this._cp1);
    this._cp2 = impl.at(this._s, this._end, index + this._w1);
    this._w2 = impl.width(this._cp2);
    this._cp3 = impl.at(this._s, this._end, index + this._w1 + this._w2);
    this._w3 = impl.width(this._cp3);
    this._cp4 = impl.at(
      this._s,
      this._end,
      index + this._w1 + this._w2 + this._w3,
    );
  }
  advance() {
    if (this._cp1 !== -1) {
      const impl = this._impl;
      this._i += this._w1;
      this._cp1 = this._cp2;
      this._w1 = this._w2;
      this._cp2 = this._cp3;
      this._w2 = impl.width(this._cp2);
      this._cp3 = this._cp4;
      this._w3 = impl.width(this._cp3);
      this._cp4 = impl.at(
        this._s,
        this._end,
        this._i + this._w1 + this._w2 + this._w3,
      );
    }
  }
  eat(cp) {
    if (this._cp1 === cp) {
      this.advance();
      return true;
    }
    return false;
  }
  eat2(cp1, cp2) {
    if (this._cp1 === cp1 && this._cp2 === cp2) {
      this.advance();
      this.advance();
      return true;
    }
    return false;
  }
  eat3(cp1, cp2, cp3) {
    if (this._cp1 === cp1 && this._cp2 === cp2 && this._cp3 === cp3) {
      this.advance();
      this.advance();
      this.advance();
      return true;
    }
    return false;
  }
}

class RegExpSyntaxError extends SyntaxError {
  constructor(message, index) {
    super(message);
    this.index = index;
  }
}
function newRegExpSyntaxError(source, start, end, flags, index, message) {
  const pattern = source.slice(start, end);
  const flagsText = `${flags.unicode ? 'u' : ''}${flags.unicodeSets ? 'v' : ''}`;
  return new RegExpSyntaxError(
    `Invalid regular expression: /${pattern}/${flagsText}: ${message}`,
    index,
  );
}

const SYNTAX_CHARACTER = new Set([
  CIRCUMFLEX_ACCENT,
  DOLLAR_SIGN,
  REVERSE_SOLIDUS,
  FULL_STOP,
  ASTERISK,
  PLUS_SIGN,
  QUESTION_MARK,
  LEFT_PARENTHESIS,
  RIGHT_PARENTHESIS,
  LEFT_SQUARE_BRACKET,
  RIGHT_SQUARE_BRACKET,
  LEFT_CURLY_BRACKET,
  RIGHT_CURLY_BRACKET,
  VERTICAL_LINE,
]);
const CLASS_SET_RESERVED_DOUBLE_PUNCTUATOR_CHARACTER = new Set([
  AMPERSAND,
  EXCLAMATION_MARK,
  NUMBER_SIGN,
  DOLLAR_SIGN,
  PERCENT_SIGN,
  ASTERISK,
  PLUS_SIGN,
  COMMA,
  FULL_STOP,
  COLON,
  SEMICOLON,
  LESS_THAN_SIGN,
  EQUALS_SIGN,
  GREATER_THAN_SIGN,
  QUESTION_MARK,
  COMMERCIAL_AT,
  CIRCUMFLEX_ACCENT,
  GRAVE_ACCENT,
  TILDE,
]);
const CLASS_SET_SYNTAX_CHARACTER = new Set([
  LEFT_PARENTHESIS,
  RIGHT_PARENTHESIS,
  LEFT_SQUARE_BRACKET,
  RIGHT_SQUARE_BRACKET,
  LEFT_CURLY_BRACKET,
  RIGHT_CURLY_BRACKET,
  SOLIDUS,
  HYPHEN_MINUS,
  REVERSE_SOLIDUS,
  VERTICAL_LINE,
]);
const CLASS_SET_RESERVED_PUNCTUATOR = new Set([
  AMPERSAND,
  HYPHEN_MINUS,
  EXCLAMATION_MARK,
  NUMBER_SIGN,
  PERCENT_SIGN,
  COMMA,
  COLON,
  SEMICOLON,
  LESS_THAN_SIGN,
  EQUALS_SIGN,
  GREATER_THAN_SIGN,
  COMMERCIAL_AT,
  GRAVE_ACCENT,
  TILDE,
]);
function isSyntaxCharacter(cp) {
  return SYNTAX_CHARACTER.has(cp);
}
function isClassSetReservedDoublePunctuatorCharacter(cp) {
  return CLASS_SET_RESERVED_DOUBLE_PUNCTUATOR_CHARACTER.has(cp);
}
function isClassSetSyntaxCharacter(cp) {
  return CLASS_SET_SYNTAX_CHARACTER.has(cp);
}
function isClassSetReservedPunctuator(cp) {
  return CLASS_SET_RESERVED_PUNCTUATOR.has(cp);
}
function isIdentifierStartChar(cp) {
  return isIdStart(cp) || cp === DOLLAR_SIGN || cp === LOW_LINE;
}
function isIdentifierPartChar(cp) {
  return (
    isIdContinue(cp) ||
    cp === DOLLAR_SIGN ||
    cp === ZERO_WIDTH_NON_JOINER ||
    cp === ZERO_WIDTH_JOINER
  );
}
function isUnicodePropertyNameCharacter(cp) {
  return isLatinLetter(cp) || cp === LOW_LINE;
}
function isUnicodePropertyValueCharacter(cp) {
  return isUnicodePropertyNameCharacter(cp) || isDecimalDigit(cp);
}
function isRegularExpressionModifier(ch) {
  return (
    ch === LATIN_SMALL_LETTER_I ||
    ch === LATIN_SMALL_LETTER_M ||
    ch === LATIN_SMALL_LETTER_S
  );
}
const TRAILING_MESSAGE = {
  [RIGHT_PARENTHESIS]: "Unmatched ')'",
  [REVERSE_SOLIDUS]: '\\ at end of pattern',
  [RIGHT_SQUARE_BRACKET]: 'Lone quantifier brackets',
  [RIGHT_CURLY_BRACKET]: 'Lone quantifier brackets',
};
const MODIFIER_LETTER = { ignoreCase: 'i', multiline: 'm', dotAll: 's' };
class RegExpValidator {
  constructor(handler) {
    this._reader = new Reader();
    this._unicodeMode = false;
    this._unicodeSetsMode = false;
    this._nFlag = false;
    this._lastIntValue = 0;
    this._lastRange = {
      min: 0,
      max: Number.POSITIVE_INFINITY,
    };
    this._lastStrValue = '';
    this._lastAssertionIsQuantifiable = false;
    this._numCapturingParens = 0;
    this._backreferenceNames = new Set();
    this._source = '';
    this._start = 0;
    this._end = 0;
    this._handler = handler;
    this._groupSpecifiers = new GroupSpecifiers();
  }
  validatePattern(source, start, end, flags) {
    this._source = source;
    this._start = start;
    this._end = end;
    const unicode = Boolean(flags.unicode);
    const unicodeSets = Boolean(flags.unicodeSets);
    if (unicode && unicodeSets) {
      this.raise('Invalid regular expression flags', {
        index: end + 1,
        unicode,
        unicodeSets,
      });
    }
    this._unicodeMode = unicode || unicodeSets;
    this._nFlag = unicode || unicodeSets;
    this._unicodeSetsMode = unicodeSets;
    this.reset(source, start, end);
    this.consumePattern();
    if (!this._nFlag && !this._groupSpecifiers.isEmpty()) {
      this._nFlag = true;
      this.rewind(start);
      this.consumePattern();
    }
  }
  get index() {
    return this._reader.index;
  }
  get currentCodePoint() {
    return this._reader.currentCodePoint;
  }
  get nextCodePoint() {
    return this._reader.nextCodePoint;
  }
  get nextCodePoint2() {
    return this._reader.nextCodePoint2;
  }
  get nextCodePoint3() {
    return this._reader.nextCodePoint3;
  }
  reset(source, start, end) {
    this._reader.reset(source, start, end, this._unicodeMode);
  }
  rewind(index) {
    this._reader.rewind(index);
  }
  advance() {
    this._reader.advance();
  }
  eat(cp) {
    return this._reader.eat(cp);
  }
  eat2(cp1, cp2) {
    return this._reader.eat2(cp1, cp2);
  }
  eat3(cp1, cp2, cp3) {
    return this._reader.eat3(cp1, cp2, cp3);
  }
  raise(message, context) {
    throw newRegExpSyntaxError(
      this._source,
      this._start,
      this._end,
      {
        unicode:
          context?.unicode ?? (this._unicodeMode && !this._unicodeSetsMode),
        unicodeSets: context?.unicodeSets ?? this._unicodeSetsMode,
      },
      context?.index ?? this.index,
      message,
    );
  }
  consumePattern() {
    const start = this.index;
    this._numCapturingParens = this.countCapturingParens();
    this._groupSpecifiers.clear();
    this._backreferenceNames.clear();
    this._handler.onPatternEnter(start);
    this.consumeDisjunction();
    const cp = this.currentCodePoint;
    if (cp !== -1) {
      // consumeDisjunction stops early only at one of these four.
      this.raise(TRAILING_MESSAGE[cp]);
    }
    for (const name of this._backreferenceNames) {
      if (!this._groupSpecifiers.hasInPattern(name)) {
        this.raise('Invalid named capture referenced');
      }
    }
    this._handler.onPatternLeave(start, this.index);
  }
  countCapturingParens() {
    const start = this.index;
    let inClass = false;
    let escaped = false;
    let count = 0;
    let cp = 0;
    while ((cp = this.currentCodePoint) !== -1) {
      if (escaped) {
        escaped = false;
      } else if (cp === REVERSE_SOLIDUS) {
        escaped = true;
      } else if (cp === LEFT_SQUARE_BRACKET) {
        inClass = true;
      } else if (cp === RIGHT_SQUARE_BRACKET) {
        inClass = false;
      } else if (
        cp === LEFT_PARENTHESIS &&
        !inClass &&
        (this.nextCodePoint !== QUESTION_MARK ||
          (this.nextCodePoint2 === LESS_THAN_SIGN &&
            this.nextCodePoint3 !== EQUALS_SIGN &&
            this.nextCodePoint3 !== EXCLAMATION_MARK))
      ) {
        count += 1;
      }
      this.advance();
    }
    this.rewind(start);
    return count;
  }
  consumeDisjunction() {
    let i = 0;
    this._groupSpecifiers.enterDisjunction();
    do {
      this.consumeAlternative(i++);
    } while (this.eat(VERTICAL_LINE));
    if (this.consumeQuantifier(true)) {
      this.raise('Nothing to repeat');
    }
    if (this.eat(LEFT_CURLY_BRACKET)) {
      this.raise('Lone quantifier brackets');
    }
    this._groupSpecifiers.leaveDisjunction();
  }
  consumeAlternative(i) {
    const start = this.index;
    this._groupSpecifiers.enterAlternative(i);
    this._handler.onAlternativeEnter(start, i);
    while (this.currentCodePoint !== -1 && this.consumeTerm()) {
      // each term is consumed (and reported to the handler) by the condition
    }
    this._handler.onAlternativeLeave(start, this.index, i);
  }
  consumeTerm() {
    if (this._unicodeMode) {
      return (
        this.consumeAssertion() ||
        (this.consumeAtom() && this.consumeOptionalQuantifier())
      );
    }
    return (
      (this.consumeAssertion() &&
        (!this._lastAssertionIsQuantifiable ||
          this.consumeOptionalQuantifier())) ||
      (this.consumeExtendedAtom() && this.consumeOptionalQuantifier())
    );
  }
  consumeOptionalQuantifier() {
    this.consumeQuantifier();
    return true;
  }
  consumeAssertion() {
    const start = this.index;
    this._lastAssertionIsQuantifiable = false;
    if (this.eat(CIRCUMFLEX_ACCENT)) {
      this._handler.onEdgeAssertion(start, this.index, 'start');
      return true;
    }
    if (this.eat(DOLLAR_SIGN)) {
      this._handler.onEdgeAssertion(start, this.index, 'end');
      return true;
    }
    if (this.eat2(REVERSE_SOLIDUS, LATIN_CAPITAL_LETTER_B)) {
      this._handler.onWordBoundaryAssertion(start, this.index, 'word', true);
      return true;
    }
    if (this.eat2(REVERSE_SOLIDUS, LATIN_SMALL_LETTER_B)) {
      this._handler.onWordBoundaryAssertion(start, this.index, 'word', false);
      return true;
    }
    if (this.eat2(LEFT_PARENTHESIS, QUESTION_MARK)) {
      const lookbehind = this.eat(LESS_THAN_SIGN);
      let negate = false;
      if (this.eat(EQUALS_SIGN) || (negate = this.eat(EXCLAMATION_MARK))) {
        const kind = lookbehind ? 'lookbehind' : 'lookahead';
        this._handler.onLookaroundAssertionEnter(start, kind, negate);
        this.consumeDisjunction();
        if (!this.eat(RIGHT_PARENTHESIS)) {
          this.raise('Unterminated group');
        }
        this._lastAssertionIsQuantifiable = !lookbehind && !this._unicodeMode;
        this._handler.onLookaroundAssertionLeave(
          start,
          this.index,
          kind,
          negate,
        );
        return true;
      }
      this.rewind(start);
    }
    return false;
  }
  consumeQuantifier(noConsume = false) {
    const start = this.index;
    let min = 0;
    let max = 0;
    let greedy = false;
    if (this.eat(ASTERISK)) {
      min = 0;
      max = Number.POSITIVE_INFINITY;
    } else if (this.eat(PLUS_SIGN)) {
      min = 1;
      max = Number.POSITIVE_INFINITY;
    } else if (this.eat(QUESTION_MARK)) {
      min = 0;
      max = 1;
    } else if (this.eatBracedQuantifier(noConsume)) {
      ({ min, max } = this._lastRange);
    } else {
      return false;
    }
    greedy = !this.eat(QUESTION_MARK);
    if (!noConsume) {
      this._handler.onQuantifier(start, this.index, min, max, greedy);
    }
    return true;
  }
  eatBracedQuantifier(noError) {
    const start = this.index;
    if (this.eat(LEFT_CURLY_BRACKET)) {
      if (this.eatDecimalDigits()) {
        const min = this._lastIntValue;
        let max = min;
        if (this.eat(COMMA)) {
          max = this.eatDecimalDigits()
            ? this._lastIntValue
            : Number.POSITIVE_INFINITY;
        }
        if (this.eat(RIGHT_CURLY_BRACKET)) {
          if (!noError && max < min) {
            this.raise('numbers out of order in {} quantifier');
          }
          this._lastRange = { min, max };
          return true;
        }
      }
      if (!noError && this._unicodeMode) {
        this.raise('Incomplete quantifier');
      }
      this.rewind(start);
    }
    return false;
  }
  consumeAtom() {
    return (
      this.consumePatternCharacter() ||
      this.consumeDot() ||
      this.consumeReverseSolidusAtomEscape() ||
      Boolean(this.consumeCharacterClass()) ||
      this.consumeCapturingGroup() ||
      this.consumeUncapturingGroup()
    );
  }
  consumeDot() {
    if (this.eat(FULL_STOP)) {
      this._handler.onAnyCharacterSet(this.index - 1, this.index, 'any');
      return true;
    }
    return false;
  }
  consumeReverseSolidusAtomEscape() {
    const start = this.index;
    if (this.eat(REVERSE_SOLIDUS)) {
      if (this.consumeAtomEscape()) {
        return true;
      }
      this.rewind(start);
    }
    return false;
  }
  consumeUncapturingGroup() {
    const start = this.index;
    if (this.eat2(LEFT_PARENTHESIS, QUESTION_MARK)) {
      this._handler.onGroupEnter(start);
      this.consumeModifiers();
      if (!this.eat(COLON)) {
        this.rewind(start + 1);
        this.raise('Invalid group');
      }
      this.consumeDisjunction();
      if (!this.eat(RIGHT_PARENTHESIS)) {
        this.raise('Unterminated group');
      }
      this._handler.onGroupLeave(start, this.index);
      return true;
    }
    return false;
  }
  consumeModifiers() {
    const start = this.index;
    const hasAddModifiers = this.eatModifiers();
    const addModifiersEnd = this.index;
    const hasHyphen = this.eat(HYPHEN_MINUS);
    if (!hasAddModifiers && !hasHyphen) {
      return false;
    }
    this._handler.onModifiersEnter(start);
    const addModifiers = this.parseModifiers(start, addModifiersEnd);
    this._handler.onAddModifiers(start, addModifiersEnd, addModifiers);
    if (hasHyphen) {
      const modifiersStart = this.index;
      if (
        !this.eatModifiers() &&
        !hasAddModifiers &&
        this.currentCodePoint === COLON
      ) {
        this.raise('Invalid empty flags');
      }
      const modifiers = this.parseModifiers(modifiersStart, this.index);
      for (const [flagName] of Object.entries(modifiers).filter(
        ([, enable]) => enable,
      )) {
        if (addModifiers[flagName]) {
          this.raise(`Duplicated flag '${MODIFIER_LETTER[flagName]}'`);
        }
      }
      this._handler.onRemoveModifiers(modifiersStart, this.index, modifiers);
    }
    this._handler.onModifiersLeave(start, this.index);
    return true;
  }
  consumeCapturingGroup() {
    const start = this.index;
    if (this.eat(LEFT_PARENTHESIS)) {
      let name = null;
      if (this.consumeGroupSpecifier()) {
        name = this._lastStrValue;
      } else if (this.currentCodePoint === QUESTION_MARK) {
        this.rewind(start);
        return false;
      }
      this._handler.onCapturingGroupEnter(start, name);
      this.consumeDisjunction();
      if (!this.eat(RIGHT_PARENTHESIS)) {
        this.raise('Unterminated group');
      }
      this._handler.onCapturingGroupLeave(start, this.index, name);
      return true;
    }
    return false;
  }
  consumeExtendedAtom() {
    return (
      this.consumeDot() ||
      this.consumeReverseSolidusAtomEscape() ||
      this.consumeReverseSolidusFollowedByC() ||
      Boolean(this.consumeCharacterClass()) ||
      this.consumeCapturingGroup() ||
      this.consumeUncapturingGroup() ||
      this.consumeInvalidBracedQuantifier() ||
      this.consumeExtendedPatternCharacter()
    );
  }
  consumeReverseSolidusFollowedByC() {
    const start = this.index;
    if (
      this.currentCodePoint === REVERSE_SOLIDUS &&
      this.nextCodePoint === LATIN_SMALL_LETTER_C
    ) {
      this._lastIntValue = this.currentCodePoint;
      this.advance();
      this._handler.onCharacter(start, this.index, REVERSE_SOLIDUS);
      return true;
    }
    return false;
  }
  consumeInvalidBracedQuantifier() {
    if (this.eatBracedQuantifier(true)) {
      this.raise('Nothing to repeat');
    }
    return false;
  }
  consumePatternCharacter() {
    const start = this.index;
    const cp = this.currentCodePoint;
    if (cp !== -1 && !isSyntaxCharacter(cp)) {
      this.advance();
      this._handler.onCharacter(start, this.index, cp);
      return true;
    }
    return false;
  }
  consumeExtendedPatternCharacter() {
    const start = this.index;
    const cp = this.currentCodePoint;
    if (
      cp !== -1 &&
      cp !== CIRCUMFLEX_ACCENT &&
      cp !== DOLLAR_SIGN &&
      cp !== REVERSE_SOLIDUS &&
      cp !== FULL_STOP &&
      cp !== ASTERISK &&
      cp !== PLUS_SIGN &&
      cp !== QUESTION_MARK &&
      cp !== LEFT_PARENTHESIS &&
      cp !== RIGHT_PARENTHESIS &&
      cp !== LEFT_SQUARE_BRACKET &&
      cp !== VERTICAL_LINE
    ) {
      this.advance();
      this._handler.onCharacter(start, this.index, cp);
      return true;
    }
    return false;
  }
  consumeGroupSpecifier() {
    const start = this.index;
    if (this.eat(QUESTION_MARK)) {
      if (this.eatGroupName()) {
        if (!this._groupSpecifiers.hasInScope(this._lastStrValue)) {
          this._groupSpecifiers.addToScope(this._lastStrValue);
          return true;
        }
        this.raise('Duplicate capture group name');
      }
      this.rewind(start);
    }
    return false;
  }
  consumeAtomEscape() {
    if (
      this.consumeBackreference() ||
      this.consumeCharacterClassEscape() ||
      this.consumeCharacterEscape() ||
      (this._nFlag && this.consumeKGroupName())
    ) {
      return true;
    }
    if (this._unicodeMode) {
      this.raise('Invalid escape');
    }
    return false;
  }
  consumeBackreference() {
    const start = this.index;
    if (this.eatDecimalEscape()) {
      const n = this._lastIntValue;
      if (n <= this._numCapturingParens) {
        this._handler.onBackreference(start - 1, this.index, n);
        return true;
      }
      if (this._unicodeMode) {
        this.raise('Invalid escape');
      }
      this.rewind(start);
    }
    return false;
  }
  consumeCharacterClassEscape() {
    var _a;
    const start = this.index;
    if (this.eat(LATIN_SMALL_LETTER_D)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'digit', false);
      return {};
    }
    if (this.eat(LATIN_CAPITAL_LETTER_D)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'digit', true);
      return {};
    }
    if (this.eat(LATIN_SMALL_LETTER_S)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'space', false);
      return {};
    }
    if (this.eat(LATIN_CAPITAL_LETTER_S)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'space', true);
      return {};
    }
    if (this.eat(LATIN_SMALL_LETTER_W)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'word', false);
      return {};
    }
    if (this.eat(LATIN_CAPITAL_LETTER_W)) {
      this._lastIntValue = -1;
      this._handler.onEscapeCharacterSet(start - 1, this.index, 'word', true);
      return {};
    }
    let negate = false;
    if (
      this._unicodeMode &&
      (this.eat(LATIN_SMALL_LETTER_P) ||
        (negate = this.eat(LATIN_CAPITAL_LETTER_P)))
    ) {
      this._lastIntValue = -1;
      let result = null;
      if (
        this.eat(LEFT_CURLY_BRACKET) &&
        (result = this.eatUnicodePropertyValueExpression()) &&
        this.eat(RIGHT_CURLY_BRACKET)
      ) {
        if (negate && result.strings) {
          this.raise('Invalid property name');
        }
        this._handler.onUnicodePropertyCharacterSet(
          start - 1,
          this.index,
          'property',
          result.key,
          result.value,
          negate,
          result.strings ?? false,
        );
        return { mayContainStrings: result.strings };
      }
      this.raise('Invalid property name');
    }
    return null;
  }
  consumeCharacterEscape() {
    const start = this.index;
    if (
      this.eatControlEscape() ||
      this.eatCControlLetter() ||
      this.eatZero() ||
      this.eatHexEscapeSequence() ||
      this.eatRegExpUnicodeEscapeSequence() ||
      (!this._unicodeMode &&
        !this._unicodeMode &&
        this.eatLegacyOctalEscapeSequence()) ||
      this.eatIdentityEscape()
    ) {
      this._handler.onCharacter(start - 1, this.index, this._lastIntValue);
      return true;
    }
    return false;
  }
  consumeKGroupName() {
    const start = this.index;
    if (this.eat(LATIN_SMALL_LETTER_K)) {
      if (this.eatGroupName()) {
        const groupName = this._lastStrValue;
        this._backreferenceNames.add(groupName);
        this._handler.onBackreference(start - 1, this.index, groupName);
        return true;
      }
      this.raise('Invalid named reference');
    }
    return false;
  }
  consumeCharacterClass() {
    const start = this.index;
    if (this.eat(LEFT_SQUARE_BRACKET)) {
      const negate = this.eat(CIRCUMFLEX_ACCENT);
      this._handler.onCharacterClassEnter(start, negate, this._unicodeSetsMode);
      const result = this.consumeClassContents();
      if (!this.eat(RIGHT_SQUARE_BRACKET)) {
        if (this.currentCodePoint === -1) {
          this.raise('Unterminated character class');
        }
        this.raise('Invalid character in character class');
      }
      if (negate && result.mayContainStrings) {
        this.raise('Negated character class may contain strings');
      }
      this._handler.onCharacterClassLeave(start, this.index, negate);
      return result;
    }
    return null;
  }
  consumeClassContents() {
    if (this._unicodeSetsMode) {
      if (this.currentCodePoint === RIGHT_SQUARE_BRACKET) {
        return {};
      }
      const result = this.consumeClassSetExpression();
      return result;
    }
    const strict = this._unicodeMode;
    for (;;) {
      const rangeStart = this.index;
      if (!this.consumeClassAtom()) {
        break;
      }
      const min = this._lastIntValue;
      if (!this.eat(HYPHEN_MINUS)) {
        continue;
      }
      this._handler.onCharacter(this.index - 1, this.index, HYPHEN_MINUS);
      if (!this.consumeClassAtom()) {
        break;
      }
      const max = this._lastIntValue;
      if (min === -1 || max === -1) {
        if (strict) {
          this.raise('Invalid character class');
        }
        continue;
      }
      if (min > max) {
        this.raise('Range out of order in character class');
      }
      this._handler.onCharacterClassRange(rangeStart, this.index, min, max);
    }
    return {};
  }
  consumeClassAtom() {
    const start = this.index;
    const cp = this.currentCodePoint;
    if (cp !== -1 && cp !== REVERSE_SOLIDUS && cp !== RIGHT_SQUARE_BRACKET) {
      this.advance();
      this._lastIntValue = cp;
      this._handler.onCharacter(start, this.index, this._lastIntValue);
      return true;
    }
    if (this.eat(REVERSE_SOLIDUS)) {
      if (this.consumeClassEscape()) {
        return true;
      }
      if (
        !this._unicodeMode &&
        this.currentCodePoint === LATIN_SMALL_LETTER_C
      ) {
        this._lastIntValue = REVERSE_SOLIDUS;
        this._handler.onCharacter(start, this.index, this._lastIntValue);
        return true;
      }
      if (this._unicodeMode) {
        this.raise('Invalid escape');
      }
      this.rewind(start);
    }
    return false;
  }
  consumeClassEscape() {
    const start = this.index;
    if (this.eat(LATIN_SMALL_LETTER_B)) {
      this._lastIntValue = BACKSPACE;
      this._handler.onCharacter(start - 1, this.index, this._lastIntValue);
      return true;
    }
    if (this._unicodeMode && this.eat(HYPHEN_MINUS)) {
      this._lastIntValue = HYPHEN_MINUS;
      this._handler.onCharacter(start - 1, this.index, this._lastIntValue);
      return true;
    }
    let cp = 0;
    if (
      !this._unicodeMode &&
      !this._unicodeMode &&
      this.currentCodePoint === LATIN_SMALL_LETTER_C &&
      (isDecimalDigit((cp = this.nextCodePoint)) || cp === LOW_LINE)
    ) {
      this.advance();
      this.advance();
      this._lastIntValue = cp % 0x20;
      this._handler.onCharacter(start - 1, this.index, this._lastIntValue);
      return true;
    }
    return (
      Boolean(this.consumeCharacterClassEscape()) ||
      this.consumeCharacterEscape()
    );
  }
  consumeClassSetExpression() {
    const start = this.index;
    let mayContainStrings = false;
    let result = null;
    if (this.consumeClassSetCharacter()) {
      if (this.consumeClassSetRangeFromOperator(start)) {
        this.consumeClassUnionRight({});
        return {};
      }
      mayContainStrings = false;
    } else if ((result = this.consumeClassSetOperand())) {
      mayContainStrings = result.mayContainStrings;
    } else {
      const cp = this.currentCodePoint;
      if (cp === REVERSE_SOLIDUS) {
        this.advance();
        this.raise('Invalid escape');
      }
      if (
        cp === this.nextCodePoint &&
        isClassSetReservedDoublePunctuatorCharacter(cp)
      ) {
        this.raise('Invalid set operation in character class');
      }
      this.raise('Invalid character in character class');
    }
    if (this.eat2(AMPERSAND, AMPERSAND)) {
      while (
        this.currentCodePoint !== AMPERSAND &&
        (result = this.consumeClassSetOperand())
      ) {
        this._handler.onClassIntersection(start, this.index);
        if (!result.mayContainStrings) {
          mayContainStrings = false;
        }
        if (this.eat2(AMPERSAND, AMPERSAND)) {
          continue;
        }
        return { mayContainStrings };
      }
      this.raise('Invalid character in character class');
    }
    if (this.eat2(HYPHEN_MINUS, HYPHEN_MINUS)) {
      while (this.consumeClassSetOperand()) {
        this._handler.onClassSubtraction(start, this.index);
        if (this.eat2(HYPHEN_MINUS, HYPHEN_MINUS)) {
          continue;
        }
        return { mayContainStrings };
      }
      this.raise('Invalid character in character class');
    }
    return this.consumeClassUnionRight({ mayContainStrings });
  }
  consumeClassUnionRight(leftResult) {
    let mayContainStrings = leftResult.mayContainStrings;
    for (;;) {
      const start = this.index;
      if (this.consumeClassSetCharacter()) {
        this.consumeClassSetRangeFromOperator(start);
        continue;
      }
      const result = this.consumeClassSetOperand();
      if (result) {
        if (result.mayContainStrings) {
          mayContainStrings = true;
        }
        continue;
      }
      break;
    }
    return { mayContainStrings };
  }
  consumeClassSetRangeFromOperator(start) {
    const currentStart = this.index;
    const min = this._lastIntValue;
    if (this.eat(HYPHEN_MINUS)) {
      if (this.consumeClassSetCharacter()) {
        const max = this._lastIntValue;
        if (min > max) {
          this.raise('Range out of order in character class');
        }
        this._handler.onCharacterClassRange(start, this.index, min, max);
        return true;
      }
      this.rewind(currentStart);
    }
    return false;
  }
  consumeClassSetOperand() {
    let result = null;
    if ((result = this.consumeNestedClass())) {
      return result;
    }
    if ((result = this.consumeClassStringDisjunction())) {
      return result;
    }
    if (this.consumeClassSetCharacter()) {
      return {};
    }
    return null;
  }
  consumeNestedClass() {
    const start = this.index;
    if (this.eat(LEFT_SQUARE_BRACKET)) {
      const negate = this.eat(CIRCUMFLEX_ACCENT);
      this._handler.onCharacterClassEnter(start, negate, true);
      const result = this.consumeClassContents();
      if (!this.eat(RIGHT_SQUARE_BRACKET)) {
        this.raise('Unterminated character class');
      }
      if (negate && result.mayContainStrings) {
        this.raise('Negated character class may contain strings');
      }
      this._handler.onCharacterClassLeave(start, this.index, negate);
      return result;
    }
    if (this.eat(REVERSE_SOLIDUS)) {
      const result = this.consumeCharacterClassEscape();
      if (result) {
        return result;
      }
      this.rewind(start);
    }
    return null;
  }
  consumeClassStringDisjunction() {
    const start = this.index;
    if (this.eat3(REVERSE_SOLIDUS, LATIN_SMALL_LETTER_Q, LEFT_CURLY_BRACKET)) {
      this._handler.onClassStringDisjunctionEnter(start);
      let i = 0;
      let mayContainStrings = false;
      do {
        if (this.consumeClassString(i++).mayContainStrings) {
          mayContainStrings = true;
        }
      } while (this.eat(VERTICAL_LINE));
      if (this.eat(RIGHT_CURLY_BRACKET)) {
        this._handler.onClassStringDisjunctionLeave(start, this.index);
        return { mayContainStrings };
      }
      this.raise('Unterminated class string disjunction');
    }
    return null;
  }
  consumeClassString(i) {
    const start = this.index;
    let count = 0;
    this._handler.onStringAlternativeEnter(start, i);
    while (this.currentCodePoint !== -1 && this.consumeClassSetCharacter()) {
      count++;
    }
    this._handler.onStringAlternativeLeave(start, this.index, i);
    return { mayContainStrings: count !== 1 };
  }
  consumeClassSetCharacter() {
    const start = this.index;
    const cp = this.currentCodePoint;
    if (
      cp !== this.nextCodePoint ||
      !isClassSetReservedDoublePunctuatorCharacter(cp)
    ) {
      if (cp !== -1 && !isClassSetSyntaxCharacter(cp)) {
        this._lastIntValue = cp;
        this.advance();
        this._handler.onCharacter(start, this.index, this._lastIntValue);
        return true;
      }
    }
    if (this.eat(REVERSE_SOLIDUS)) {
      if (this.consumeCharacterEscape()) {
        return true;
      }
      if (isClassSetReservedPunctuator(this.currentCodePoint)) {
        this._lastIntValue = this.currentCodePoint;
        this.advance();
        this._handler.onCharacter(start, this.index, this._lastIntValue);
        return true;
      }
      if (this.eat(LATIN_SMALL_LETTER_B)) {
        this._lastIntValue = BACKSPACE;
        this._handler.onCharacter(start, this.index, this._lastIntValue);
        return true;
      }
      this.rewind(start);
    }
    return false;
  }
  eatGroupName() {
    if (this.eat(LESS_THAN_SIGN)) {
      if (this.eatRegExpIdentifierName() && this.eat(GREATER_THAN_SIGN)) {
        return true;
      }
      this.raise('Invalid capture group name');
    }
    return false;
  }
  eatRegExpIdentifierName() {
    if (this.eatRegExpIdentifierStart()) {
      this._lastStrValue = String.fromCodePoint(this._lastIntValue);
      while (this.eatRegExpIdentifierPart()) {
        this._lastStrValue += String.fromCodePoint(this._lastIntValue);
      }
      return true;
    }
    return false;
  }
  eatRegExpIdentifierStart() {
    const start = this.index;
    const forceUFlag = !this._unicodeMode;
    let cp = this.currentCodePoint;
    this.advance();
    if (
      cp === REVERSE_SOLIDUS &&
      this.eatRegExpUnicodeEscapeSequence(forceUFlag)
    ) {
      cp = this._lastIntValue;
    } else if (
      forceUFlag &&
      isLeadSurrogate(cp) &&
      isTrailSurrogate(this.currentCodePoint)
    ) {
      cp = combineSurrogatePair(cp, this.currentCodePoint);
      this.advance();
    }
    if (isIdentifierStartChar(cp)) {
      this._lastIntValue = cp;
      return true;
    }
    if (this.index !== start) {
      this.rewind(start);
    }
    return false;
  }
  eatRegExpIdentifierPart() {
    const start = this.index;
    const forceUFlag = !this._unicodeMode;
    let cp = this.currentCodePoint;
    this.advance();
    if (
      cp === REVERSE_SOLIDUS &&
      this.eatRegExpUnicodeEscapeSequence(forceUFlag)
    ) {
      cp = this._lastIntValue;
    } else if (
      forceUFlag &&
      isLeadSurrogate(cp) &&
      isTrailSurrogate(this.currentCodePoint)
    ) {
      cp = combineSurrogatePair(cp, this.currentCodePoint);
      this.advance();
    }
    if (isIdentifierPartChar(cp)) {
      this._lastIntValue = cp;
      return true;
    }
    if (this.index !== start) {
      this.rewind(start);
    }
    return false;
  }
  eatCControlLetter() {
    const start = this.index;
    if (this.eat(LATIN_SMALL_LETTER_C)) {
      if (this.eatControlLetter()) {
        return true;
      }
      this.rewind(start);
    }
    return false;
  }
  eatZero() {
    if (
      this.currentCodePoint === DIGIT_ZERO &&
      !isDecimalDigit(this.nextCodePoint)
    ) {
      this._lastIntValue = 0;
      this.advance();
      return true;
    }
    return false;
  }
  eatControlEscape() {
    if (this.eat(LATIN_SMALL_LETTER_F)) {
      this._lastIntValue = FORM_FEED;
      return true;
    }
    if (this.eat(LATIN_SMALL_LETTER_N)) {
      this._lastIntValue = LINE_FEED;
      return true;
    }
    if (this.eat(LATIN_SMALL_LETTER_R)) {
      this._lastIntValue = CARRIAGE_RETURN;
      return true;
    }
    if (this.eat(LATIN_SMALL_LETTER_T)) {
      this._lastIntValue = CHARACTER_TABULATION;
      return true;
    }
    if (this.eat(LATIN_SMALL_LETTER_V)) {
      this._lastIntValue = LINE_TABULATION;
      return true;
    }
    return false;
  }
  eatControlLetter() {
    const cp = this.currentCodePoint;
    if (isLatinLetter(cp)) {
      this.advance();
      this._lastIntValue = cp % 0x20;
      return true;
    }
    return false;
  }
  eatRegExpUnicodeEscapeSequence(forceUFlag = false) {
    const start = this.index;
    const uFlag = forceUFlag || this._unicodeMode;
    if (this.eat(LATIN_SMALL_LETTER_U)) {
      if (
        (uFlag && this.eatRegExpUnicodeSurrogatePairEscape()) ||
        this.eatFixedHexDigits(4) ||
        (uFlag && this.eatRegExpUnicodeCodePointEscape())
      ) {
        return true;
      }
      if (uFlag) {
        this.raise('Invalid unicode escape');
      }
      this.rewind(start);
    }
    return false;
  }
  eatRegExpUnicodeSurrogatePairEscape() {
    const start = this.index;
    if (this.eatFixedHexDigits(4)) {
      const lead = this._lastIntValue;
      if (
        isLeadSurrogate(lead) &&
        this.eat(REVERSE_SOLIDUS) &&
        this.eat(LATIN_SMALL_LETTER_U) &&
        this.eatFixedHexDigits(4)
      ) {
        const trail = this._lastIntValue;
        if (isTrailSurrogate(trail)) {
          this._lastIntValue = combineSurrogatePair(lead, trail);
          return true;
        }
      }
      this.rewind(start);
    }
    return false;
  }
  eatRegExpUnicodeCodePointEscape() {
    const start = this.index;
    if (
      this.eat(LEFT_CURLY_BRACKET) &&
      this.eatHexDigits() &&
      this.eat(RIGHT_CURLY_BRACKET) &&
      isValidUnicode(this._lastIntValue)
    ) {
      return true;
    }
    this.rewind(start);
    return false;
  }
  eatIdentityEscape() {
    const cp = this.currentCodePoint;
    if (this.isValidIdentityEscape(cp)) {
      this._lastIntValue = cp;
      this.advance();
      return true;
    }
    return false;
  }
  isValidIdentityEscape(cp) {
    if (cp === -1) {
      return false;
    }
    if (this._unicodeMode) {
      return isSyntaxCharacter(cp) || cp === SOLIDUS;
    }
    if (this._nFlag) {
      return !(cp === LATIN_SMALL_LETTER_C || cp === LATIN_SMALL_LETTER_K);
    }
    return cp !== LATIN_SMALL_LETTER_C;
  }
  eatDecimalEscape() {
    this._lastIntValue = 0;
    let cp = this.currentCodePoint;
    if (cp >= DIGIT_ONE && cp <= DIGIT_NINE) {
      do {
        this._lastIntValue = 10 * this._lastIntValue + (cp - DIGIT_ZERO);
        this.advance();
      } while ((cp = this.currentCodePoint) >= DIGIT_ZERO && cp <= DIGIT_NINE);
      return true;
    }
    return false;
  }
  eatUnicodePropertyValueExpression() {
    const start = this.index;
    if (this.eatUnicodePropertyName() && this.eat(EQUALS_SIGN)) {
      const key = this._lastStrValue;
      if (this.eatUnicodePropertyValue()) {
        const value = this._lastStrValue;
        if (isValidUnicodeProperty(key, value)) {
          return {
            key,
            value,
          };
        }
        this.raise('Invalid property name');
      }
    }
    this.rewind(start);
    if (this.eatLoneUnicodePropertyNameOrValue()) {
      const nameOrValue = this._lastStrValue;
      if (isValidUnicodeProperty('General_Category', nameOrValue)) {
        return {
          key: 'General_Category',
          value: nameOrValue,
        };
      }
      if (isValidLoneUnicodeProperty(nameOrValue)) {
        return {
          key: nameOrValue,
          value: null,
        };
      }
      if (
        this._unicodeSetsMode &&
        isValidLoneUnicodePropertyOfString(nameOrValue)
      ) {
        return {
          key: nameOrValue,
          value: null,
          strings: true,
        };
      }
      this.raise('Invalid property name');
    }
    return null;
  }
  eatUnicodePropertyName() {
    this._lastStrValue = '';
    while (isUnicodePropertyNameCharacter(this.currentCodePoint)) {
      this._lastStrValue += String.fromCodePoint(this.currentCodePoint);
      this.advance();
    }
    return this._lastStrValue !== '';
  }
  eatUnicodePropertyValue() {
    this._lastStrValue = '';
    while (isUnicodePropertyValueCharacter(this.currentCodePoint)) {
      this._lastStrValue += String.fromCodePoint(this.currentCodePoint);
      this.advance();
    }
    return this._lastStrValue !== '';
  }
  eatLoneUnicodePropertyNameOrValue() {
    return this.eatUnicodePropertyValue();
  }
  eatHexEscapeSequence() {
    const start = this.index;
    if (this.eat(LATIN_SMALL_LETTER_X)) {
      if (this.eatFixedHexDigits(2)) {
        return true;
      }
      if (this._unicodeMode) {
        this.raise('Invalid escape');
      }
      this.rewind(start);
    }
    return false;
  }
  eatDecimalDigits() {
    const start = this.index;
    this._lastIntValue = 0;
    while (isDecimalDigit(this.currentCodePoint)) {
      this._lastIntValue =
        10 * this._lastIntValue + digitToInt(this.currentCodePoint);
      this.advance();
    }
    return this.index !== start;
  }
  eatHexDigits() {
    const start = this.index;
    this._lastIntValue = 0;
    while (isHexDigit(this.currentCodePoint)) {
      this._lastIntValue =
        16 * this._lastIntValue + digitToInt(this.currentCodePoint);
      this.advance();
    }
    return this.index !== start;
  }
  eatLegacyOctalEscapeSequence() {
    if (this.eatOctalDigit()) {
      const n1 = this._lastIntValue;
      if (this.eatOctalDigit()) {
        const n2 = this._lastIntValue;
        if (n1 <= 3 && this.eatOctalDigit()) {
          this._lastIntValue = n1 * 64 + n2 * 8 + this._lastIntValue;
        } else {
          this._lastIntValue = n1 * 8 + n2;
        }
      } else {
        this._lastIntValue = n1;
      }
      return true;
    }
    return false;
  }
  eatOctalDigit() {
    const cp = this.currentCodePoint;
    if (isOctalDigit(cp)) {
      this.advance();
      this._lastIntValue = cp - DIGIT_ZERO;
      return true;
    }
    this._lastIntValue = 0;
    return false;
  }
  eatFixedHexDigits(length) {
    const start = this.index;
    this._lastIntValue = 0;
    for (let i = 0; i < length; ++i) {
      const cp = this.currentCodePoint;
      if (!isHexDigit(cp)) {
        this.rewind(start);
        return false;
      }
      this._lastIntValue = 16 * this._lastIntValue + digitToInt(cp);
      this.advance();
    }
    return true;
  }
  eatModifiers() {
    let ate = false;
    while (isRegularExpressionModifier(this.currentCodePoint)) {
      this.advance();
      ate = true;
    }
    return ate;
  }
  parseModifiers(start, end) {
    const flags = { ignoreCase: false, multiline: false, dotAll: false };
    for (let i = start; i < end; ++i) {
      const char = this._reader.source[i];
      const prop =
        char === 'i' ? 'ignoreCase' : char === 'm' ? 'multiline' : 'dotAll';
      if (flags[prop]) {
        this.raise(`Duplicated flag '${char}'`, { index: start });
      }
      flags[prop] = true;
    }
    return flags;
  }
}

const DUMMY_PATTERN = {};

const DUMMY_CAPTURING_GROUP = {};

class RegExpParserState {
  constructor(source) {
    this._node = DUMMY_PATTERN;
    this._expressionBufferMap = new Map();
    this._backreferences = [];
    this._capturingGroups = [];
    this.source = source;
  }
  get pattern() {
    return this._node;
  }
  onPatternEnter(start) {
    this._node = {
      type: 'Pattern',
      parent: null,
      start,
      end: start,
      raw: '',
      alternatives: [],
    };
    this._backreferences.length = 0;
    this._capturingGroups.length = 0;
  }
  onPatternLeave(start, end) {
    this._node.end = end;
    this._node.raw = this.source.slice(start, end);
    for (const reference of this._backreferences) {
      const ref = reference.ref;
      const groups =
        typeof ref === 'number'
          ? [this._capturingGroups[ref - 1]]
          : this._capturingGroups.filter((g) => g.name === ref);
      if (groups.length === 1) {
        const group = groups[0];
        reference.ambiguous = false;
        reference.resolved = group;
      } else {
        reference.ambiguous = true;
        reference.resolved = groups;
      }
      for (const group of groups) {
        group.references.push(reference);
      }
    }
  }
  onAlternativeEnter(start) {
    const parent = this._node;
    this._node = {
      type: 'Alternative',
      parent,
      start,
      end: start,
      raw: '',
      elements: [],
    };
    parent.alternatives.push(this._node);
  }
  onAlternativeLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onGroupEnter(start) {
    const parent = this._node;
    const group = {
      type: 'Group',
      parent,
      start,
      end: start,
      raw: '',
      modifiers: null,
      alternatives: [],
    };
    this._node = group;
    parent.elements.push(this._node);
  }
  onGroupLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onModifiersEnter(start) {
    const parent = this._node;
    this._node = {
      type: 'Modifiers',
      parent,
      start,
      end: start,
      raw: '',
      add: null,
      remove: null,
    };
    parent.modifiers = this._node;
  }
  onModifiersLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onAddModifiers(start, end, { ignoreCase, multiline, dotAll }) {
    const parent = this._node;
    parent.add = {
      type: 'ModifierFlags',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      ignoreCase,
      multiline,
      dotAll,
    };
  }
  onRemoveModifiers(start, end, { ignoreCase, multiline, dotAll }) {
    const parent = this._node;
    parent.remove = {
      type: 'ModifierFlags',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      ignoreCase,
      multiline,
      dotAll,
    };
  }
  onCapturingGroupEnter(start, name) {
    const parent = this._node;
    this._node = {
      type: 'CapturingGroup',
      parent,
      start,
      end: start,
      raw: '',
      name,
      alternatives: [],
      references: [],
    };
    parent.elements.push(this._node);
    this._capturingGroups.push(this._node);
  }
  onCapturingGroupLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onQuantifier(start, end, min, max, greedy) {
    const parent = this._node;
    const element = parent.elements.pop();
    const node = {
      type: 'Quantifier',
      parent,
      start: element.start,
      end,
      raw: this.source.slice(element.start, end),
      min,
      max,
      greedy,
      element,
    };
    parent.elements.push(node);
    element.parent = node;
  }
  onLookaroundAssertionEnter(start, kind, negate) {
    const parent = this._node;
    const node = (this._node = {
      type: 'Assertion',
      parent,
      start,
      end: start,
      raw: '',
      kind,
      negate,
      alternatives: [],
    });
    parent.elements.push(node);
  }
  onLookaroundAssertionLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onEdgeAssertion(start, end, kind) {
    const parent = this._node;
    parent.elements.push({
      type: 'Assertion',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      kind,
    });
  }
  onWordBoundaryAssertion(start, end, kind, negate) {
    const parent = this._node;
    parent.elements.push({
      type: 'Assertion',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      kind,
      negate,
    });
  }
  onAnyCharacterSet(start, end, kind) {
    const parent = this._node;
    parent.elements.push({
      type: 'CharacterSet',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      kind,
    });
  }
  onEscapeCharacterSet(start, end, kind, negate) {
    const parent = this._node;
    parent.elements.push({
      type: 'CharacterSet',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      kind,
      negate,
    });
  }
  onUnicodePropertyCharacterSet(start, end, kind, key, value, negate, strings) {
    const parent = this._node;
    const base = {
      type: 'CharacterSet',
      parent: null,
      start,
      end,
      raw: this.source.slice(start, end),
      kind,
      strings: null,
      key,
    };
    if (strings) {
      parent.elements.push(
        Object.assign(Object.assign({}, base), {
          parent,
          strings,
          value,
          negate,
        }),
      );
    } else {
      parent.elements.push(
        Object.assign(Object.assign({}, base), {
          parent,
          strings,
          value,
          negate,
        }),
      );
    }
  }
  onCharacter(start, end, value) {
    const parent = this._node;
    parent.elements.push({
      type: 'Character',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      value,
    });
  }
  onBackreference(start, end, ref) {
    const parent = this._node;
    const node = {
      type: 'Backreference',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      ref,
      ambiguous: false,
      resolved: DUMMY_CAPTURING_GROUP,
    };
    parent.elements.push(node);
    this._backreferences.push(node);
  }
  onCharacterClassEnter(start, negate, unicodeSets) {
    const parent = this._node;
    const base = {
      type: 'CharacterClass',
      parent,
      start,
      end: start,
      raw: '',
      unicodeSets,
      negate,
      elements: [],
    };
    if (parent.type === 'Alternative') {
      const node = Object.assign(Object.assign({}, base), { parent });
      this._node = node;
      parent.elements.push(node);
    } else {
      const node = Object.assign(Object.assign({}, base), {
        parent,
        unicodeSets,
      });
      this._node = node;
      parent.elements.push(node);
    }
  }
  onCharacterClassLeave(start, end) {
    const node = this._node;
    const parent = node.parent;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = parent;
    const expression = this._expressionBufferMap.get(node);
    if (!expression) {
      return;
    }
    this._expressionBufferMap.delete(node);
    const newNode = {
      type: 'ExpressionCharacterClass',
      parent,
      start: node.start,
      end: node.end,
      raw: node.raw,
      negate: node.negate,
      expression,
    };
    expression.parent = newNode;
    // The expression class replaces the plain class that was pushed when it opened.
    parent.elements.pop();
    parent.elements.push(newNode);
  }
  onCharacterClassRange(start, end) {
    const parent = this._node;
    const elements = parent.elements;
    const max = elements.pop();
    if (!parent.unicodeSets) {
      elements.pop();
    }
    const min = elements.pop();
    const node = {
      type: 'CharacterClassRange',
      parent,
      start,
      end,
      raw: this.source.slice(start, end),
      min,
      max,
    };
    min.parent = node;
    max.parent = node;
    elements.push(node);
  }
  onClassIntersection(start, end) {
    const parent = this._node;
    const right = parent.elements.pop();
    const left = this._expressionBufferMap.get(parent) ?? parent.elements.pop();
    const node = {
      type: 'ClassIntersection',
      parent: parent,
      start,
      end,
      raw: this.source.slice(start, end),
      left,
      right,
    };
    left.parent = node;
    right.parent = node;
    this._expressionBufferMap.set(parent, node);
  }
  onClassSubtraction(start, end) {
    const parent = this._node;
    const right = parent.elements.pop();
    const left = this._expressionBufferMap.get(parent) ?? parent.elements.pop();
    const node = {
      type: 'ClassSubtraction',
      parent: parent,
      start,
      end,
      raw: this.source.slice(start, end),
      left,
      right,
    };
    left.parent = node;
    right.parent = node;
    this._expressionBufferMap.set(parent, node);
  }
  onClassStringDisjunctionEnter(start) {
    const parent = this._node;
    this._node = {
      type: 'ClassStringDisjunction',
      parent,
      start,
      end: start,
      raw: '',
      alternatives: [],
    };
    parent.elements.push(this._node);
  }
  onClassStringDisjunctionLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
  onStringAlternativeEnter(start) {
    const parent = this._node;
    this._node = {
      type: 'StringAlternative',
      parent,
      start,
      end: start,
      raw: '',
      elements: [],
    };
    parent.alternatives.push(this._node);
  }
  onStringAlternativeLeave(start, end) {
    const node = this._node;
    node.end = end;
    node.raw = this.source.slice(start, end);
    this._node = node.parent;
  }
}

export { RegExpParserState, RegExpSyntaxError, RegExpValidator };
