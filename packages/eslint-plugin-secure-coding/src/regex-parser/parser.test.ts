/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { describe, expect, it } from 'vitest';
import { parsePattern, RegExpParser, RegExpSyntaxError } from './index';

/** The tree without `parent` (a cycle), with a backreference's target as its start offset. */
const serialize = (node: unknown): string =>
  JSON.stringify(node, (key, value) =>
    key === 'parent'
      ? undefined
      : key === 'resolved'
        ? Array.isArray(value)
          ? value.map((g: { start: number }) => g.start)
          : (value as { start: number } | undefined)?.start
        : value,
  );

const flagsOf = (mode: string) => ({
  unicode: mode === 'u',
  unicodeSets: mode === 'v',
});

// [pattern, mode ('' | 'u' | 'v'), 'ok' | 'error', expected]
//
// Each row is what @eslint-community/regexpp 4.12.3 `RegExpParser#parsePattern`
// returned for the same input (the tree as JSON, or `message@index` for a
// SyntaxError), recorded from that library when it was replaced. The rows were
// chosen out of 900,000 candidates (real regex literals from node_modules plus
// grammar-aware garbage) as the smallest set that executes every block of the
// parser, so a vendored branch that no row reaches is a branch nobody checks.
const TABLE: Array<[string, string, 'ok' | 'error', string]> = [
  [
    '(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-',
    '',
    'error',
    'Invalid regular expression: /(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-/: Unterminated group@30',
  ],
  [
    '(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-',
    'u',
    'error',
    'Invalid regular expression: /(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-/u: Invalid property name@22',
  ],
  [
    '(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-',
    'v',
    'error',
    'Invalid regular expression: /(?-i:\\W0[^\\p{RGI_Emoji}]\ud83d\ude00&&\\-/v: Negated character class may contain strings@24',
  ],
  [
    '\\s)%\ude00[a&&b]\\/[[a]--[b]--[c]]',
    '',
    'error',
    "Invalid regular expression: /\\s)%\ude00[a&&b]\\/[[a]--[b]--[c]]/: Unmatched ')'@2",
  ],
  [
    '(?i-i:\\u{110000}\\w(?![\\q{ab}&&b]',
    '',
    'error',
    "Invalid regular expression: /(?i-i:\\u{110000}\\w(?![\\q{ab}&&b]/: Duplicated flag 'i'@5",
  ],
  [
    '(?<=[a&b][&&a][a&&]',
    '',
    'error',
    'Invalid regular expression: /(?<=[a&b][&&a][a&&]/: Unterminated group@19',
  ],
  [
    '(?<=[a&b][&&a][a&&]',
    'v',
    'error',
    'Invalid regular expression: /(?<=[a&b][&&a][a&&]/v: Invalid set operation in character class@10',
  ],
  [
    '(?<a>x)(?<a>y)[a&&b]\\uD83D\\uDE00',
    '',
    'error',
    'Invalid regular expression: /(?<a>x)(?<a>y)[a&&b]\\uD83D\\uDE00/: Duplicate capture group name@12',
  ],
  [
    '[\\k<a>]\\w|+{2,3}?(?i[!!]',
    '',
    'error',
    'Invalid regular expression: /[\\k<a>]\\w|+{2,3}?(?i[!!]/: Nothing to repeat@11',
  ],
  [
    '[\\k<a>]\\w|+{2,3}?(?i[!!]',
    'u',
    'error',
    'Invalid regular expression: /[\\k<a>]\\w|+{2,3}?(?i[!!]/u: Invalid escape@2',
  ],
  [
    '[\\k<a>]\\w|+{2,3}?(?i[!!]',
    'v',
    'error',
    'Invalid regular expression: /[\\k<a>]\\w|+{2,3}?(?i[!!]/v: Invalid escape@2',
  ],
  [
    '[\\1][!!][}]_(?!',
    '',
    'error',
    'Invalid regular expression: /[\\1][!!][}]_(?!/: Unterminated group@15',
  ],
  [
    '\\p{=x}?',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":7,"raw":"\\\\p{=x}?","alternatives":[{"type":"Alternative","start":0,"end":7,"raw":"\\\\p{=x}?","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\p","value":112},{"type":"Character","start":2,"end":3,"raw":"{","value":123},{"type":"Character","start":3,"end":4,"raw":"=","value":61},{"type":"Character","start":4,"end":5,"raw":"x","value":120},{"type":"Quantifier","start":5,"end":7,"raw":"}?","min":0,"max":1,"greedy":true,"element":{"type":"Character","start":5,"end":6,"raw":"}","value":125}}]}]}',
  ],
  [
    '\\p{=x}?',
    'u',
    'error',
    'Invalid regular expression: /\\p{=x}?/u: Invalid property name@3',
  ],
  [
    '[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(',
    '',
    'error',
    'Invalid regular expression: /[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(/: Range out of order in character class@14',
  ],
  [
    '[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(',
    'u',
    'error',
    'Invalid regular expression: /[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(/u: Range out of order in character class@14',
  ],
  [
    '[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(',
    'v',
    'error',
    'Invalid regular expression: /[\\u0100-\\u00ff][[a]--[b]--[c]]{2,3}?[\\u{1F600}-\\u{1F64F}]\\n(/v: Range out of order in character class@14',
  ],
  [
    '(?:(?<a>x)|(?<a>y)){2,3}-[a-\\d]+?',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":33,"raw":"(?:(?<a>x)|(?<a>y)){2,3}-[a-\\\\d]+?","alternatives":[{"type":"Alternative","start":0,"end":33,"raw":"(?:(?<a>x)|(?<a>y)){2,3}-[a-\\\\d]+?","elements":[{"type":"Quantifier","start":0,"end":24,"raw":"(?:(?<a>x)|(?<a>y)){2,3}","min":2,"max":3,"greedy":true,"element":{"type":"Group","start":0,"end":19,"raw":"(?:(?<a>x)|(?<a>y))","modifiers":null,"alternatives":[{"type":"Alternative","start":3,"end":10,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":3,"end":10,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":8,"end":9,"raw":"x","elements":[{"type":"Character","start":8,"end":9,"raw":"x","value":120}]}],"references":[]}]},{"type":"Alternative","start":11,"end":18,"raw":"(?<a>y)","elements":[{"type":"CapturingGroup","start":11,"end":18,"raw":"(?<a>y)","name":"a","alternatives":[{"type":"Alternative","start":16,"end":17,"raw":"y","elements":[{"type":"Character","start":16,"end":17,"raw":"y","value":121}]}],"references":[]}]}]}},{"type":"Character","start":24,"end":25,"raw":"-","value":45},{"type":"Quantifier","start":25,"end":33,"raw":"[a-\\\\d]+?","min":1,"max":null,"greedy":false,"element":{"type":"CharacterClass","start":25,"end":31,"raw":"[a-\\\\d]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":26,"end":27,"raw":"a","value":97},{"type":"Character","start":27,"end":28,"raw":"-","value":45},{"type":"CharacterSet","start":28,"end":30,"raw":"\\\\d","kind":"digit","negate":false}]}}]}]}',
  ],
  [
    '(?:(?<a>x)|(?<a>y)){2,3}-[a-\\d]+?',
    'u',
    'error',
    'Invalid regular expression: /(?:(?<a>x)|(?<a>y)){2,3}-[a-\\d]+?/u: Invalid character class@30',
  ],
  [
    '(?:(?<a>x)|(?<a>y)){2,3}-[a-\\d]+?',
    'v',
    'error',
    'Invalid regular expression: /(?:(?<a>x)|(?<a>y)){2,3}-[a-\\d]+?/v: Invalid character in character class@27',
  ],
  [
    '\ud835\udc9c\\p{L',
    'u',
    'error',
    'Invalid regular expression: /\ud835\udc9c\\p{L/u: Invalid property name@6',
  ],
  [
    '\\p{L}|(?<a\\u{200c}>\\p{Script=Greek}\\p{Script=Foo}[[a-z]--[aeiou]])',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":66,"raw":"\\\\p{L}|(?<a\\\\u{200c}>\\\\p{Script=Greek}\\\\p{Script=Foo}[[a-z]--[aeiou]])","alternatives":[{"type":"Alternative","start":0,"end":5,"raw":"\\\\p{L}","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\p","value":112},{"type":"Character","start":2,"end":3,"raw":"{","value":123},{"type":"Character","start":3,"end":4,"raw":"L","value":76},{"type":"Character","start":4,"end":5,"raw":"}","value":125}]},{"type":"Alternative","start":6,"end":66,"raw":"(?<a\\\\u{200c}>\\\\p{Script=Greek}\\\\p{Script=Foo}[[a-z]--[aeiou]])","elements":[{"type":"CapturingGroup","start":6,"end":66,"raw":"(?<a\\\\u{200c}>\\\\p{Script=Greek}\\\\p{Script=Foo}[[a-z]--[aeiou]])","name":"a\u200c","alternatives":[{"type":"Alternative","start":19,"end":65,"raw":"\\\\p{Script=Greek}\\\\p{Script=Foo}[[a-z]--[aeiou]]","elements":[{"type":"Character","start":19,"end":21,"raw":"\\\\p","value":112},{"type":"Character","start":21,"end":22,"raw":"{","value":123},{"type":"Character","start":22,"end":23,"raw":"S","value":83},{"type":"Character","start":23,"end":24,"raw":"c","value":99},{"type":"Character","start":24,"end":25,"raw":"r","value":114},{"type":"Character","start":25,"end":26,"raw":"i","value":105},{"type":"Character","start":26,"end":27,"raw":"p","value":112},{"type":"Character","start":27,"end":28,"raw":"t","value":116},{"type":"Character","start":28,"end":29,"raw":"=","value":61},{"type":"Character","start":29,"end":30,"raw":"G","value":71},{"type":"Character","start":30,"end":31,"raw":"r","value":114},{"type":"Character","start":31,"end":32,"raw":"e","value":101},{"type":"Character","start":32,"end":33,"raw":"e","value":101},{"type":"Character","start":33,"end":34,"raw":"k","value":107},{"type":"Character","start":34,"end":35,"raw":"}","value":125},{"type":"Character","start":35,"end":37,"raw":"\\\\p","value":112},{"type":"Character","start":37,"end":38,"raw":"{","value":123},{"type":"Character","start":38,"end":39,"raw":"S","value":83},{"type":"Character","start":39,"end":40,"raw":"c","value":99},{"type":"Character","start":40,"end":41,"raw":"r","value":114},{"type":"Character","start":41,"end":42,"raw":"i","value":105},{"type":"Character","start":42,"end":43,"raw":"p","value":112},{"type":"Character","start":43,"end":44,"raw":"t","value":116},{"type":"Character","start":44,"end":45,"raw":"=","value":61},{"type":"Character","start":45,"end":46,"raw":"F","value":70},{"type":"Character","start":46,"end":47,"raw":"o","value":111},{"type":"Character","start":47,"end":48,"raw":"o","value":111},{"type":"Character","start":48,"end":49,"raw":"}","value":125},{"type":"CharacterClass","start":49,"end":55,"raw":"[[a-z]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":50,"end":51,"raw":"[","value":91},{"type":"CharacterClassRange","start":51,"end":54,"raw":"a-z","min":{"type":"Character","start":51,"end":52,"raw":"a","value":97},"max":{"type":"Character","start":53,"end":54,"raw":"z","value":122}}]},{"type":"Character","start":55,"end":56,"raw":"-","value":45},{"type":"Character","start":56,"end":57,"raw":"-","value":45},{"type":"CharacterClass","start":57,"end":64,"raw":"[aeiou]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":58,"end":59,"raw":"a","value":97},{"type":"Character","start":59,"end":60,"raw":"e","value":101},{"type":"Character","start":60,"end":61,"raw":"i","value":105},{"type":"Character","start":61,"end":62,"raw":"o","value":111},{"type":"Character","start":62,"end":63,"raw":"u","value":117}]},{"type":"Character","start":64,"end":65,"raw":"]","value":93}]}],"references":[]}]}]}',
  ],
  [
    '\\p{L}|(?<a\\u{200c}>\\p{Script=Greek}\\p{Script=Foo}[[a-z]--[aeiou]])',
    'u',
    'error',
    'Invalid regular expression: /\\p{L}|(?<a\\u{200c}>\\p{Script=Greek}\\p{Script=Foo}[[a-z]--[aeiou]])/u: Invalid property name@48',
  ],
  [
    '\\d[\\w-\\d]\\c_[a&&b]9(?:(?<a>x)|(?<a>y))\\p{=x}',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":44,"raw":"\\\\d[\\\\w-\\\\d]\\\\c_[a&&b]9(?:(?<a>x)|(?<a>y))\\\\p{=x}","alternatives":[{"type":"Alternative","start":0,"end":44,"raw":"\\\\d[\\\\w-\\\\d]\\\\c_[a&&b]9(?:(?<a>x)|(?<a>y))\\\\p{=x}","elements":[{"type":"CharacterSet","start":0,"end":2,"raw":"\\\\d","kind":"digit","negate":false},{"type":"CharacterClass","start":2,"end":9,"raw":"[\\\\w-\\\\d]","unicodeSets":false,"negate":false,"elements":[{"type":"CharacterSet","start":3,"end":5,"raw":"\\\\w","kind":"word","negate":false},{"type":"Character","start":5,"end":6,"raw":"-","value":45},{"type":"CharacterSet","start":6,"end":8,"raw":"\\\\d","kind":"digit","negate":false}]},{"type":"Character","start":9,"end":10,"raw":"\\\\","value":92},{"type":"Character","start":10,"end":11,"raw":"c","value":99},{"type":"Character","start":11,"end":12,"raw":"_","value":95},{"type":"CharacterClass","start":12,"end":18,"raw":"[a&&b]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":13,"end":14,"raw":"a","value":97},{"type":"Character","start":14,"end":15,"raw":"&","value":38},{"type":"Character","start":15,"end":16,"raw":"&","value":38},{"type":"Character","start":16,"end":17,"raw":"b","value":98}]},{"type":"Character","start":18,"end":19,"raw":"9","value":57},{"type":"Group","start":19,"end":38,"raw":"(?:(?<a>x)|(?<a>y))","modifiers":null,"alternatives":[{"type":"Alternative","start":22,"end":29,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":22,"end":29,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":27,"end":28,"raw":"x","elements":[{"type":"Character","start":27,"end":28,"raw":"x","value":120}]}],"references":[]}]},{"type":"Alternative","start":30,"end":37,"raw":"(?<a>y)","elements":[{"type":"CapturingGroup","start":30,"end":37,"raw":"(?<a>y)","name":"a","alternatives":[{"type":"Alternative","start":35,"end":36,"raw":"y","elements":[{"type":"Character","start":35,"end":36,"raw":"y","value":121}]}],"references":[]}]}]},{"type":"Character","start":38,"end":40,"raw":"\\\\p","value":112},{"type":"Character","start":40,"end":41,"raw":"{","value":123},{"type":"Character","start":41,"end":42,"raw":"=","value":61},{"type":"Character","start":42,"end":43,"raw":"x","value":120},{"type":"Character","start":43,"end":44,"raw":"}","value":125}]}]}',
  ],
  [
    '.\\uD83Db',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":8,"raw":".\\\\uD83Db","alternatives":[{"type":"Alternative","start":0,"end":8,"raw":".\\\\uD83Db","elements":[{"type":"CharacterSet","start":0,"end":1,"raw":".","kind":"any"},{"type":"Character","start":1,"end":7,"raw":"\\\\uD83D","value":55357},{"type":"Character","start":7,"end":8,"raw":"b","value":98}]}]}',
  ],
  [
    '.\\uD83Db',
    'u',
    'ok',
    '{"type":"Pattern","start":0,"end":8,"raw":".\\\\uD83Db","alternatives":[{"type":"Alternative","start":0,"end":8,"raw":".\\\\uD83Db","elements":[{"type":"CharacterSet","start":0,"end":1,"raw":".","kind":"any"},{"type":"Character","start":1,"end":7,"raw":"\\\\uD83D","value":55357},{"type":"Character","start":7,"end":8,"raw":"b","value":98}]}]}',
  ],
  [
    '$\\p{ASCII}',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":10,"raw":"$\\\\p{ASCII}","alternatives":[{"type":"Alternative","start":0,"end":10,"raw":"$\\\\p{ASCII}","elements":[{"type":"Assertion","start":0,"end":1,"raw":"$","kind":"end"},{"type":"Character","start":1,"end":3,"raw":"\\\\p","value":112},{"type":"Character","start":3,"end":4,"raw":"{","value":123},{"type":"Character","start":4,"end":5,"raw":"A","value":65},{"type":"Character","start":5,"end":6,"raw":"S","value":83},{"type":"Character","start":6,"end":7,"raw":"C","value":67},{"type":"Character","start":7,"end":8,"raw":"I","value":73},{"type":"Character","start":8,"end":9,"raw":"I","value":73},{"type":"Character","start":9,"end":10,"raw":"}","value":125}]}]}',
  ],
  [
    '$\\p{ASCII}',
    'u',
    'ok',
    '{"type":"Pattern","start":0,"end":10,"raw":"$\\\\p{ASCII}","alternatives":[{"type":"Alternative","start":0,"end":10,"raw":"$\\\\p{ASCII}","elements":[{"type":"Assertion","start":0,"end":1,"raw":"$","kind":"end"},{"type":"CharacterSet","start":1,"end":10,"raw":"\\\\p{ASCII}","kind":"property","strings":false,"key":"ASCII","value":null,"negate":false}]}]}',
  ],
  [
    '[\\q{a|bc|}]{,3}[|]',
    'v',
    'error',
    'Invalid regular expression: /[\\q{a|bc|}]{,3}[|]/v: Incomplete quantifier@12',
  ],
  [
    '\\9[a&&b]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":8,"raw":"\\\\9[a&&b]","alternatives":[{"type":"Alternative","start":0,"end":8,"raw":"\\\\9[a&&b]","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\9","value":57},{"type":"CharacterClass","start":2,"end":8,"raw":"[a&&b]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":3,"end":4,"raw":"a","value":97},{"type":"Character","start":4,"end":5,"raw":"&","value":38},{"type":"Character","start":5,"end":6,"raw":"&","value":38},{"type":"Character","start":6,"end":7,"raw":"b","value":98}]}]}]}',
  ],
  [
    '\\9[a&&b]',
    'u',
    'error',
    'Invalid regular expression: /\\9[a&&b]/u: Invalid escape@2',
  ],
  [
    '\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00',
    '',
    'error',
    'Invalid regular expression: /\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00/: Invalid unicode escape@30',
  ],
  [
    '\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00',
    'u',
    'error',
    'Invalid regular expression: /\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00/u: Lone quantifier brackets@18',
  ],
  [
    '\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00',
    'v',
    'error',
    'Invalid regular expression: /\\P{Lu}[[a-z]&&[^b]]\\t[|](?<a\\u00/v: Invalid character in character class@22',
  ],
  [
    ':[\\-](?i:',
    'u',
    'error',
    'Invalid regular expression: /:[\\-](?i:/u: Unterminated group@9',
  ],
  [
    ':[\\-](?i:',
    'v',
    'error',
    'Invalid regular expression: /:[\\-](?i:/v: Unterminated group@9',
  ],
  [
    '(?-i:(?ims:',
    '',
    'error',
    'Invalid regular expression: /(?-i:(?ims:/: Unterminated group@11',
  ],
  [
    '<\\p{L}[a--b--c]',
    'v',
    'ok',
    '{"type":"Pattern","start":0,"end":15,"raw":"<\\\\p{L}[a--b--c]","alternatives":[{"type":"Alternative","start":0,"end":15,"raw":"<\\\\p{L}[a--b--c]","elements":[{"type":"Character","start":0,"end":1,"raw":"<","value":60},{"type":"CharacterSet","start":1,"end":6,"raw":"\\\\p{L}","kind":"property","strings":false,"key":"General_Category","value":"L","negate":false},{"type":"ExpressionCharacterClass","start":6,"end":15,"raw":"[a--b--c]","negate":false,"expression":{"type":"ClassSubtraction","start":7,"end":14,"raw":"a--b--c","left":{"type":"ClassSubtraction","start":7,"end":11,"raw":"a--b","left":{"type":"Character","start":7,"end":8,"raw":"a","value":97},"right":{"type":"Character","start":10,"end":11,"raw":"b","value":98}},"right":{"type":"Character","start":13,"end":14,"raw":"c","value":99}}}]}]}',
  ],
  [
    '[[a-z]--[aeiou]]*?\\p{',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":21,"raw":"[[a-z]--[aeiou]]*?\\\\p{","alternatives":[{"type":"Alternative","start":0,"end":21,"raw":"[[a-z]--[aeiou]]*?\\\\p{","elements":[{"type":"CharacterClass","start":0,"end":6,"raw":"[[a-z]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":1,"end":2,"raw":"[","value":91},{"type":"CharacterClassRange","start":2,"end":5,"raw":"a-z","min":{"type":"Character","start":2,"end":3,"raw":"a","value":97},"max":{"type":"Character","start":4,"end":5,"raw":"z","value":122}}]},{"type":"Character","start":6,"end":7,"raw":"-","value":45},{"type":"Character","start":7,"end":8,"raw":"-","value":45},{"type":"CharacterClass","start":8,"end":15,"raw":"[aeiou]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":9,"end":10,"raw":"a","value":97},{"type":"Character","start":10,"end":11,"raw":"e","value":101},{"type":"Character","start":11,"end":12,"raw":"i","value":105},{"type":"Character","start":12,"end":13,"raw":"o","value":111},{"type":"Character","start":13,"end":14,"raw":"u","value":117}]},{"type":"Quantifier","start":15,"end":18,"raw":"]*?","min":0,"max":null,"greedy":false,"element":{"type":"Character","start":15,"end":16,"raw":"]","value":93}},{"type":"Character","start":18,"end":20,"raw":"\\\\p","value":112},{"type":"Character","start":20,"end":21,"raw":"{","value":123}]}]}',
  ],
  [
    '&&[\\B]\\p{Lu=x}[[a-z]--[aeiou]](?i-s:{2,3}?',
    '',
    'error',
    'Invalid regular expression: /&&[\\B]\\p{Lu=x}[[a-z]--[aeiou]](?i-s:{2,3}?/: Nothing to repeat@41',
  ],
  [
    '{,3}9--(?<\\uD835>)',
    '',
    'error',
    'Invalid regular expression: /{,3}9--(?<\\uD835>)/: Invalid capture group name@10',
  ],
  [
    '{,3}9--(?<\\uD835>)',
    'u',
    'error',
    'Invalid regular expression: /{,3}9--(?<\\uD835>)/u: Lone quantifier brackets@1',
  ],
  [
    ',\\P{RGI_Emoji}Z\\D[\\-]\\p{Foo}',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":28,"raw":",\\\\P{RGI_Emoji}Z\\\\D[\\\\-]\\\\p{Foo}","alternatives":[{"type":"Alternative","start":0,"end":28,"raw":",\\\\P{RGI_Emoji}Z\\\\D[\\\\-]\\\\p{Foo}","elements":[{"type":"Character","start":0,"end":1,"raw":",","value":44},{"type":"Character","start":1,"end":3,"raw":"\\\\P","value":80},{"type":"Character","start":3,"end":4,"raw":"{","value":123},{"type":"Character","start":4,"end":5,"raw":"R","value":82},{"type":"Character","start":5,"end":6,"raw":"G","value":71},{"type":"Character","start":6,"end":7,"raw":"I","value":73},{"type":"Character","start":7,"end":8,"raw":"_","value":95},{"type":"Character","start":8,"end":9,"raw":"E","value":69},{"type":"Character","start":9,"end":10,"raw":"m","value":109},{"type":"Character","start":10,"end":11,"raw":"o","value":111},{"type":"Character","start":11,"end":12,"raw":"j","value":106},{"type":"Character","start":12,"end":13,"raw":"i","value":105},{"type":"Character","start":13,"end":14,"raw":"}","value":125},{"type":"Character","start":14,"end":15,"raw":"Z","value":90},{"type":"CharacterSet","start":15,"end":17,"raw":"\\\\D","kind":"digit","negate":true},{"type":"CharacterClass","start":17,"end":21,"raw":"[\\\\-]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":18,"end":20,"raw":"\\\\-","value":45}]},{"type":"Character","start":21,"end":23,"raw":"\\\\p","value":112},{"type":"Character","start":23,"end":24,"raw":"{","value":123},{"type":"Character","start":24,"end":25,"raw":"F","value":70},{"type":"Character","start":25,"end":26,"raw":"o","value":111},{"type":"Character","start":26,"end":27,"raw":"o","value":111},{"type":"Character","start":27,"end":28,"raw":"}","value":125}]}]}',
  ],
  [
    ',\\P{RGI_Emoji}Z\\D[\\-]\\p{Foo}',
    'v',
    'error',
    'Invalid regular expression: /,\\P{RGI_Emoji}Z\\D[\\-]\\p{Foo}/v: Invalid property name@14',
  ],
  [
    '(?<\ud835\udc9c>}',
    '',
    'error',
    'Invalid regular expression: /(?<\ud835\udc9c>}/: Unterminated group@7',
  ],
  [
    '[a&&]-a(?ims:)[\\u0100-\\u00ff]\\11',
    'v',
    'error',
    'Invalid regular expression: /[a&&]-a(?ims:)[\\u0100-\\u00ff]\\11/v: Invalid character in character class@4',
  ],
  [
    '[^',
    '',
    'error',
    'Invalid regular expression: /[^/: Unterminated character class@2',
  ],
  [
    '(?:\\w\\07',
    '',
    'error',
    'Invalid regular expression: /(?:\\w\\07/: Unterminated group@8',
  ],
  [
    '(?:\\w\\07',
    'u',
    'error',
    'Invalid regular expression: /(?:\\w\\07/u: Invalid escape@6',
  ],
  [
    '[a-z]+\\xZ[z-a][[a]]\\c\\p{Script=}',
    '',
    'error',
    'Invalid regular expression: /[a-z]+\\xZ[z-a][[a]]\\c\\p{Script=}/: Range out of order in character class@13',
  ],
  [
    '[a-z]+\\xZ[z-a][[a]]\\c\\p{Script=}',
    'u',
    'error',
    'Invalid regular expression: /[a-z]+\\xZ[z-a][[a]]\\c\\p{Script=}/u: Invalid escape@8',
  ],
  [
    '[a-\\d][[a-z]&&[^b]]$\\u00[\\d-z]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":30,"raw":"[a-\\\\d][[a-z]&&[^b]]$\\\\u00[\\\\d-z]","alternatives":[{"type":"Alternative","start":0,"end":30,"raw":"[a-\\\\d][[a-z]&&[^b]]$\\\\u00[\\\\d-z]","elements":[{"type":"CharacterClass","start":0,"end":6,"raw":"[a-\\\\d]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":1,"end":2,"raw":"a","value":97},{"type":"Character","start":2,"end":3,"raw":"-","value":45},{"type":"CharacterSet","start":3,"end":5,"raw":"\\\\d","kind":"digit","negate":false}]},{"type":"CharacterClass","start":6,"end":12,"raw":"[[a-z]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":7,"end":8,"raw":"[","value":91},{"type":"CharacterClassRange","start":8,"end":11,"raw":"a-z","min":{"type":"Character","start":8,"end":9,"raw":"a","value":97},"max":{"type":"Character","start":10,"end":11,"raw":"z","value":122}}]},{"type":"Character","start":12,"end":13,"raw":"&","value":38},{"type":"Character","start":13,"end":14,"raw":"&","value":38},{"type":"CharacterClass","start":14,"end":18,"raw":"[^b]","unicodeSets":false,"negate":true,"elements":[{"type":"Character","start":16,"end":17,"raw":"b","value":98}]},{"type":"Character","start":18,"end":19,"raw":"]","value":93},{"type":"Assertion","start":19,"end":20,"raw":"$","kind":"end"},{"type":"Character","start":20,"end":22,"raw":"\\\\u","value":117},{"type":"Character","start":22,"end":23,"raw":"0","value":48},{"type":"Character","start":23,"end":24,"raw":"0","value":48},{"type":"CharacterClass","start":24,"end":30,"raw":"[\\\\d-z]","unicodeSets":false,"negate":false,"elements":[{"type":"CharacterSet","start":25,"end":27,"raw":"\\\\d","kind":"digit","negate":false},{"type":"Character","start":27,"end":28,"raw":"-","value":45},{"type":"Character","start":28,"end":29,"raw":"z","value":122}]}]}]}',
  ],
  [
    'a-[a&&b&&c][a[b]c]\\k\\p{\\p{',
    'v',
    'error',
    'Invalid regular expression: /a-[a&&b&&c][a[b]c]\\k\\p{\\p{/v: Invalid named reference@20',
  ],
  [
    '[\\cA]&&[^[a]][](?i-s:@\\01',
    '',
    'error',
    'Invalid regular expression: /[\\cA]&&[^[a]][](?i-s:@\\01/: Unterminated group@25',
  ],
  [
    '[\\cA]&&[^[a]][](?i-s:@\\01',
    'v',
    'error',
    'Invalid regular expression: /[\\cA]&&[^[a]][](?i-s:@\\01/v: Invalid escape@23',
  ],
  [
    '\\\\\\k<7[^\\p{RGI_Emoji}][^[a[b]c]=',
    'u',
    'error',
    'Invalid regular expression: /\\\\\\k<7[^\\p{RGI_Emoji}][^[a[b]c]=/u: Invalid capture group name@5',
  ],
  [
    '{2,}[^\\q{ab}]',
    '',
    'error',
    'Invalid regular expression: /{2,}[^\\q{ab}]/: Nothing to repeat@4',
  ],
  [
    '(?<b>[a&&b&&c&&d]\\w[\\c1]b[^\\q{ab}]',
    '',
    'error',
    'Invalid regular expression: /(?<b>[a&&b&&c&&d]\\w[\\c1]b[^\\q{ab}]/: Unterminated group@34',
  ],
  [
    '(?<a-b>\\p{=x}\\p{Basic_Emoji}:\\k<',
    '',
    'error',
    'Invalid regular expression: /(?<a-b>\\p{=x}\\p{Basic_Emoji}:\\k</: Invalid capture group name@4',
  ],
  [
    '[[a]&&[b]&&[c]]\\0(?<$>\\01[^\\p{RGI_Emoji}][&&a]',
    '',
    'error',
    'Invalid regular expression: /[[a]&&[b]&&[c]]\\0(?<$>\\01[^\\p{RGI_Emoji}][&&a]/: Unterminated group@46',
  ],
  [
    '[a&&&b][)]\\p{Script=}[{]+(?x:',
    '',
    'error',
    'Invalid regular expression: /[a&&&b][)]\\p{Script=}[{]+(?x:/: Invalid group@26',
  ],
  [
    '\\S\\p{General_Category=Nd}\\p{Script=}\ud83d\ude00',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":38,"raw":"\\\\S\\\\p{General_Category=Nd}\\\\p{Script=}\ud83d\ude00","alternatives":[{"type":"Alternative","start":0,"end":38,"raw":"\\\\S\\\\p{General_Category=Nd}\\\\p{Script=}\ud83d\ude00","elements":[{"type":"CharacterSet","start":0,"end":2,"raw":"\\\\S","kind":"space","negate":true},{"type":"Character","start":2,"end":4,"raw":"\\\\p","value":112},{"type":"Character","start":4,"end":5,"raw":"{","value":123},{"type":"Character","start":5,"end":6,"raw":"G","value":71},{"type":"Character","start":6,"end":7,"raw":"e","value":101},{"type":"Character","start":7,"end":8,"raw":"n","value":110},{"type":"Character","start":8,"end":9,"raw":"e","value":101},{"type":"Character","start":9,"end":10,"raw":"r","value":114},{"type":"Character","start":10,"end":11,"raw":"a","value":97},{"type":"Character","start":11,"end":12,"raw":"l","value":108},{"type":"Character","start":12,"end":13,"raw":"_","value":95},{"type":"Character","start":13,"end":14,"raw":"C","value":67},{"type":"Character","start":14,"end":15,"raw":"a","value":97},{"type":"Character","start":15,"end":16,"raw":"t","value":116},{"type":"Character","start":16,"end":17,"raw":"e","value":101},{"type":"Character","start":17,"end":18,"raw":"g","value":103},{"type":"Character","start":18,"end":19,"raw":"o","value":111},{"type":"Character","start":19,"end":20,"raw":"r","value":114},{"type":"Character","start":20,"end":21,"raw":"y","value":121},{"type":"Character","start":21,"end":22,"raw":"=","value":61},{"type":"Character","start":22,"end":23,"raw":"N","value":78},{"type":"Character","start":23,"end":24,"raw":"d","value":100},{"type":"Character","start":24,"end":25,"raw":"}","value":125},{"type":"Character","start":25,"end":27,"raw":"\\\\p","value":112},{"type":"Character","start":27,"end":28,"raw":"{","value":123},{"type":"Character","start":28,"end":29,"raw":"S","value":83},{"type":"Character","start":29,"end":30,"raw":"c","value":99},{"type":"Character","start":30,"end":31,"raw":"r","value":114},{"type":"Character","start":31,"end":32,"raw":"i","value":105},{"type":"Character","start":32,"end":33,"raw":"p","value":112},{"type":"Character","start":33,"end":34,"raw":"t","value":116},{"type":"Character","start":34,"end":35,"raw":"=","value":61},{"type":"Character","start":35,"end":36,"raw":"}","value":125},{"type":"Character","start":36,"end":37,"raw":"\\ud83d","value":55357},{"type":"Character","start":37,"end":38,"raw":"\\ude00","value":56832}]}]}',
  ],
  [
    '[\\q{a|bc|}][(](?<b>\\uD83D',
    'v',
    'error',
    'Invalid regular expression: /[\\q{a|bc|}][(](?<b>\\uD83D/v: Invalid character in character class@12',
  ],
  [
    '--[\\b]\\S[\\q{ab}&&\\q{ab}&&a]\\x4\\01',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":33,"raw":"--[\\\\b]\\\\S[\\\\q{ab}&&\\\\q{ab}&&a]\\\\x4\\\\01","alternatives":[{"type":"Alternative","start":0,"end":33,"raw":"--[\\\\b]\\\\S[\\\\q{ab}&&\\\\q{ab}&&a]\\\\x4\\\\01","elements":[{"type":"Character","start":0,"end":1,"raw":"-","value":45},{"type":"Character","start":1,"end":2,"raw":"-","value":45},{"type":"CharacterClass","start":2,"end":6,"raw":"[\\\\b]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":3,"end":5,"raw":"\\\\b","value":8}]},{"type":"CharacterSet","start":6,"end":8,"raw":"\\\\S","kind":"space","negate":true},{"type":"CharacterClass","start":8,"end":27,"raw":"[\\\\q{ab}&&\\\\q{ab}&&a]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":9,"end":11,"raw":"\\\\q","value":113},{"type":"Character","start":11,"end":12,"raw":"{","value":123},{"type":"Character","start":12,"end":13,"raw":"a","value":97},{"type":"Character","start":13,"end":14,"raw":"b","value":98},{"type":"Character","start":14,"end":15,"raw":"}","value":125},{"type":"Character","start":15,"end":16,"raw":"&","value":38},{"type":"Character","start":16,"end":17,"raw":"&","value":38},{"type":"Character","start":17,"end":19,"raw":"\\\\q","value":113},{"type":"Character","start":19,"end":20,"raw":"{","value":123},{"type":"Character","start":20,"end":21,"raw":"a","value":97},{"type":"Character","start":21,"end":22,"raw":"b","value":98},{"type":"Character","start":22,"end":23,"raw":"}","value":125},{"type":"Character","start":23,"end":24,"raw":"&","value":38},{"type":"Character","start":24,"end":25,"raw":"&","value":38},{"type":"Character","start":25,"end":26,"raw":"a","value":97}]},{"type":"Character","start":27,"end":29,"raw":"\\\\x","value":120},{"type":"Character","start":29,"end":30,"raw":"4","value":52},{"type":"Character","start":30,"end":33,"raw":"\\\\01","value":1}]}]}',
  ],
  [
    '--[\\b]\\S[\\q{ab}&&\\q{ab}&&a]\\x4\\01',
    'v',
    'error',
    'Invalid regular expression: /--[\\b]\\S[\\q{ab}&&\\q{ab}&&a]\\x4\\01/v: Invalid escape@29',
  ],
  [
    'Z\\uD83D\\uDE00[\\p{L}--\\p{Lu}]\\u{\\s',
    'u',
    'error',
    'Invalid regular expression: /Z\\uD83D\\uDE00[\\p{L}--\\p{Lu}]\\u{\\s/u: Invalid character class@21',
  ],
  [
    '(?i-s:[a--b--c]~*?\\P{Lu}[\\k<a>]',
    '',
    'error',
    'Invalid regular expression: /(?i-s:[a--b--c]~*?\\P{Lu}[\\k<a>]/: Range out of order in character class@10',
  ],
  [
    '(?ii:b',
    '',
    'error',
    "Invalid regular expression: /(?ii:b/: Duplicated flag 'i'@2",
  ],
  [
    '\\x41\u00e9\\\\{\ud83d',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":9,"raw":"\\\\x41\u00e9\\\\\\\\{\\ud83d","alternatives":[{"type":"Alternative","start":0,"end":9,"raw":"\\\\x41\u00e9\\\\\\\\{\\ud83d","elements":[{"type":"Character","start":0,"end":4,"raw":"\\\\x41","value":65},{"type":"Character","start":4,"end":5,"raw":"\u00e9","value":233},{"type":"Character","start":5,"end":7,"raw":"\\\\\\\\","value":92},{"type":"Character","start":7,"end":8,"raw":"{","value":123},{"type":"Character","start":8,"end":9,"raw":"\\ud83d","value":55357}]}]}',
  ],
  [
    '[a[b]c]\\f[\\p{RGI_Emoji}][\\q{a|bc|}][a-z][\\q{ab}&&\\q{ab}&&a](?<=',
    '',
    'error',
    'Invalid regular expression: /[a[b]c]\\f[\\p{RGI_Emoji}][\\q{a|bc|}][a-z][\\q{ab}&&\\q{ab}&&a](?<=/: Unterminated group@63',
  ],
  [
    '\\c1\\p{L}[!!]\\b)[##]\\S',
    '',
    'error',
    "Invalid regular expression: /\\c1\\p{L}[!!]\\b)[##]\\S/: Unmatched ')'@14",
  ],
  [
    '\\P<\\1\\n',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":7,"raw":"\\\\P<\\\\1\\\\n","alternatives":[{"type":"Alternative","start":0,"end":7,"raw":"\\\\P<\\\\1\\\\n","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\P","value":80},{"type":"Character","start":2,"end":3,"raw":"<","value":60},{"type":"Character","start":3,"end":5,"raw":"\\\\1","value":1},{"type":"Character","start":5,"end":7,"raw":"\\\\n","value":10}]}]}',
  ],
  [
    '\\0\ud83d\ude00.[\\^](?<=\\k<b>[(]',
    'u',
    'error',
    'Invalid regular expression: /\\0\ud83d\ude00.[\\^](?<=\\k<b>[(]/u: Unterminated group@21',
  ],
  [
    '(?<\\u0061>(?<a[(?ims:_[^[a]][',
    '',
    'error',
    'Invalid regular expression: /(?<\\u0061>(?<a[(?ims:_[^[a]][/: Invalid capture group name@14',
  ],
  [
    '(?<\\u0061>(?<a[(?ims:_[^[a]][',
    'v',
    'error',
    'Invalid regular expression: /(?<\\u0061>(?<a[(?ims:_[^[a]][/v: Invalid capture group name@14',
  ],
  [
    '\\k<a>\\Wa-',
    'u',
    'error',
    'Invalid regular expression: /\\k<a>\\Wa-/u: Invalid named capture referenced@9',
  ],
  [
    '[a-z][^\\p{RGI_Emoji}]\\r[\\q{a}&&[b]--c]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":38,"raw":"[a-z][^\\\\p{RGI_Emoji}]\\\\r[\\\\q{a}&&[b]--c]","alternatives":[{"type":"Alternative","start":0,"end":38,"raw":"[a-z][^\\\\p{RGI_Emoji}]\\\\r[\\\\q{a}&&[b]--c]","elements":[{"type":"CharacterClass","start":0,"end":5,"raw":"[a-z]","unicodeSets":false,"negate":false,"elements":[{"type":"CharacterClassRange","start":1,"end":4,"raw":"a-z","min":{"type":"Character","start":1,"end":2,"raw":"a","value":97},"max":{"type":"Character","start":3,"end":4,"raw":"z","value":122}}]},{"type":"CharacterClass","start":5,"end":21,"raw":"[^\\\\p{RGI_Emoji}]","unicodeSets":false,"negate":true,"elements":[{"type":"Character","start":7,"end":9,"raw":"\\\\p","value":112},{"type":"Character","start":9,"end":10,"raw":"{","value":123},{"type":"Character","start":10,"end":11,"raw":"R","value":82},{"type":"Character","start":11,"end":12,"raw":"G","value":71},{"type":"Character","start":12,"end":13,"raw":"I","value":73},{"type":"Character","start":13,"end":14,"raw":"_","value":95},{"type":"Character","start":14,"end":15,"raw":"E","value":69},{"type":"Character","start":15,"end":16,"raw":"m","value":109},{"type":"Character","start":16,"end":17,"raw":"o","value":111},{"type":"Character","start":17,"end":18,"raw":"j","value":106},{"type":"Character","start":18,"end":19,"raw":"i","value":105},{"type":"Character","start":19,"end":20,"raw":"}","value":125}]},{"type":"Character","start":21,"end":23,"raw":"\\\\r","value":13},{"type":"CharacterClass","start":23,"end":34,"raw":"[\\\\q{a}&&[b]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":24,"end":26,"raw":"\\\\q","value":113},{"type":"Character","start":26,"end":27,"raw":"{","value":123},{"type":"Character","start":27,"end":28,"raw":"a","value":97},{"type":"Character","start":28,"end":29,"raw":"}","value":125},{"type":"Character","start":29,"end":30,"raw":"&","value":38},{"type":"Character","start":30,"end":31,"raw":"&","value":38},{"type":"Character","start":31,"end":32,"raw":"[","value":91},{"type":"Character","start":32,"end":33,"raw":"b","value":98}]},{"type":"Character","start":34,"end":35,"raw":"-","value":45},{"type":"Character","start":35,"end":36,"raw":"-","value":45},{"type":"Character","start":36,"end":37,"raw":"c","value":99},{"type":"Character","start":37,"end":38,"raw":"]","value":93}]}]}',
  ],
  [
    '\\/^',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":3,"raw":"\\\\/^","alternatives":[{"type":"Alternative","start":0,"end":3,"raw":"\\\\/^","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\/","value":47},{"type":"Assertion","start":2,"end":3,"raw":"^","kind":"start"}]}]}',
  ],
  [
    'a[^\\p{RGI_Emoji}]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":17,"raw":"a[^\\\\p{RGI_Emoji}]","alternatives":[{"type":"Alternative","start":0,"end":17,"raw":"a[^\\\\p{RGI_Emoji}]","elements":[{"type":"Character","start":0,"end":1,"raw":"a","value":97},{"type":"CharacterClass","start":1,"end":17,"raw":"[^\\\\p{RGI_Emoji}]","unicodeSets":false,"negate":true,"elements":[{"type":"Character","start":3,"end":5,"raw":"\\\\p","value":112},{"type":"Character","start":5,"end":6,"raw":"{","value":123},{"type":"Character","start":6,"end":7,"raw":"R","value":82},{"type":"Character","start":7,"end":8,"raw":"G","value":71},{"type":"Character","start":8,"end":9,"raw":"I","value":73},{"type":"Character","start":9,"end":10,"raw":"_","value":95},{"type":"Character","start":10,"end":11,"raw":"E","value":69},{"type":"Character","start":11,"end":12,"raw":"m","value":109},{"type":"Character","start":12,"end":13,"raw":"o","value":111},{"type":"Character","start":13,"end":14,"raw":"j","value":106},{"type":"Character","start":14,"end":15,"raw":"i","value":105},{"type":"Character","start":15,"end":16,"raw":"}","value":125}]}]}]}',
  ],
  [
    '[/]\\1\\b(?<$>[\\1]',
    '',
    'error',
    'Invalid regular expression: /[/]\\1\\b(?<$>[\\1]/: Unterminated group@16',
  ],
  [
    '(?<a>\\w+?\\k<b>{3,2}{2}',
    '',
    'error',
    'Invalid regular expression: /(?<a>\\w+?\\k<b>{3,2}{2}/: numbers out of order in {} quantifier@19',
  ],
  [
    '\\07\\p{(?:(?<a>x)|(?<a>y))@\\k<{2,3}',
    '',
    'error',
    'Invalid regular expression: /\\07\\p{(?:(?<a>x)|(?<a>y))@\\k<{2,3}/: Invalid capture group name@29',
  ],
  [
    '0*?\\p{=x}(?-:\\B[^\\p{RGI_Emoji}],',
    '',
    'error',
    'Invalid regular expression: /0*?\\p{=x}(?-:\\B[^\\p{RGI_Emoji}],/: Invalid empty flags@12',
  ],
  [
    '{\\B[][|]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":8,"raw":"{\\\\B[][|]","alternatives":[{"type":"Alternative","start":0,"end":8,"raw":"{\\\\B[][|]","elements":[{"type":"Character","start":0,"end":1,"raw":"{","value":123},{"type":"Assertion","start":1,"end":3,"raw":"\\\\B","kind":"word","negate":true},{"type":"CharacterClass","start":3,"end":5,"raw":"[]","unicodeSets":false,"negate":false,"elements":[]},{"type":"CharacterClass","start":5,"end":8,"raw":"[|]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":6,"end":7,"raw":"|","value":124}]}]}]}',
  ],
  [
    '[^\\q{ab}]+a-a-z[\\c]',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":19,"raw":"[^\\\\q{ab}]+a-a-z[\\\\c]","alternatives":[{"type":"Alternative","start":0,"end":19,"raw":"[^\\\\q{ab}]+a-a-z[\\\\c]","elements":[{"type":"Quantifier","start":0,"end":10,"raw":"[^\\\\q{ab}]+","min":1,"max":null,"greedy":true,"element":{"type":"CharacterClass","start":0,"end":9,"raw":"[^\\\\q{ab}]","unicodeSets":false,"negate":true,"elements":[{"type":"Character","start":2,"end":4,"raw":"\\\\q","value":113},{"type":"Character","start":4,"end":5,"raw":"{","value":123},{"type":"Character","start":5,"end":6,"raw":"a","value":97},{"type":"Character","start":6,"end":7,"raw":"b","value":98},{"type":"Character","start":7,"end":8,"raw":"}","value":125}]}},{"type":"Character","start":10,"end":11,"raw":"a","value":97},{"type":"Character","start":11,"end":12,"raw":"-","value":45},{"type":"Character","start":12,"end":13,"raw":"a","value":97},{"type":"Character","start":13,"end":14,"raw":"-","value":45},{"type":"Character","start":14,"end":15,"raw":"z","value":122},{"type":"CharacterClass","start":15,"end":19,"raw":"[\\\\c]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":16,"end":17,"raw":"\\\\","value":92},{"type":"Character","start":17,"end":18,"raw":"c","value":99}]}]}]}',
  ],
  [
    '[a[b]c][](?<\\uD835\\uDC9C>\\p{ASCII}',
    'u',
    'error',
    'Invalid regular expression: /[a[b]c][](?<\\uD835\\uDC9C>\\p{ASCII}/u: Lone quantifier brackets@6',
  ],
  [
    '(?<\\uD835>\ud835\udc9c\\v\\p{L}[[a-z]--[aeiou]]',
    'u',
    'error',
    'Invalid regular expression: /(?<\\uD835>\ud835\udc9c\\v\\p{L}[[a-z]--[aeiou]]/u: Invalid capture group name@3',
  ],
  [
    '\\x4(?=)',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":7,"raw":"\\\\x4(?=)","alternatives":[{"type":"Alternative","start":0,"end":7,"raw":"\\\\x4(?=)","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\x","value":120},{"type":"Character","start":2,"end":3,"raw":"4","value":52},{"type":"Assertion","start":3,"end":7,"raw":"(?=)","kind":"lookahead","negate":false,"alternatives":[{"type":"Alternative","start":6,"end":6,"raw":"","elements":[]}]}]}]}',
  ],
  [
    '[)]-[a--b]',
    'v',
    'error',
    'Invalid regular expression: /[)]-[a--b]/v: Invalid character in character class@1',
  ],
  [
    '[\\q{ab}--b--c]\\t(?i:\\x4',
    'v',
    'error',
    'Invalid regular expression: /[\\q{ab}--b--c]\\t(?i:\\x4/v: Invalid escape@22',
  ],
  [
    '[a&&b]\\b\\k<[\\q{\\p{Script=Foo}%\\c_',
    'u',
    'error',
    'Invalid regular expression: /[a&&b]\\b\\k<[\\q{\\p{Script=Foo}%\\c_/u: Invalid capture group name@11',
  ],
  [
    '[\\q{\\p{Any};(?i-i:.+',
    'v',
    'error',
    'Invalid regular expression: /[\\q{\\p{Any};(?i-i:.+/v: Unterminated class string disjunction@4',
  ],
  [
    '\\cA[a--]\\f',
    'v',
    'error',
    'Invalid regular expression: /\\cA[a--]\\f/v: Invalid character in character class@7',
  ],
  [
    '(?<a\\8\\k',
    'v',
    'error',
    'Invalid regular expression: /(?<a\\8\\k/v: Invalid capture group name@4',
  ],
  [
    '[[a-z]--[aeiou]]\\p{Script=}(?<\\uD835>',
    'v',
    'error',
    'Invalid regular expression: /[[a-z]--[aeiou]]\\p{Script=}(?<\\uD835>/v: Invalid property name@25',
  ],
  [
    '(?<b>\ud835\udc9c%[\\1]\\p{Script=Greek}[[a]--[b]--[c]][]',
    'u',
    'error',
    'Invalid regular expression: /(?<b>\ud835\udc9c%[\\1]\\p{Script=Greek}[[a]--[b]--[c]][]/u: Invalid escape@10',
  ],
  [
    '[\\q{ab}&&\\q{ab}&&a]+?[^\\p{RGI_Emoji}]',
    'v',
    'error',
    'Invalid regular expression: /[\\q{ab}&&\\q{ab}&&a]+?[^\\p{RGI_Emoji}]/v: Negated character class may contain strings@37',
  ],
  [
    '\\v[a[b]c](?<!(?<\\uD835>',
    '',
    'error',
    'Invalid regular expression: /\\v[a[b]c](?<!(?<\\uD835>/: Invalid capture group name@16',
  ],
  [
    '[\\B]\\f[\\k<a>](?:(?<a>x)|(?<a>y)){2}??(?<\ud835\udc9c>',
    'v',
    'error',
    'Invalid regular expression: /[\\B]\\f[\\k<a>](?:(?<a>x)|(?<a>y)){2}??(?<\ud835\udc9c>/v: Invalid escape@2',
  ],
  [
    '}[a\\-z]\\p{\\8\\P{Lu}(?<a',
    '',
    'error',
    'Invalid regular expression: /}[a\\-z]\\p{\\8\\P{Lu}(?<a/: Invalid capture group name@22',
  ],
  [
    '(?<a\\u{200c}>\\u{\\t[a&b][\\q{(?i-s:-',
    '',
    'error',
    'Invalid regular expression: /(?<a\\u{200c}>\\u{\\t[a&b][\\q{(?i-s:-/: Unterminated character class@34',
  ],
  [
    '[\\q{a|bc}&&\\q{bc}]{2,3}-([Z[\\q{ab}]',
    'v',
    'error',
    'Invalid regular expression: /[\\q{a|bc}&&\\q{bc}]{2,3}-([Z[\\q{ab}]/v: Unterminated character class@35',
  ],
  [
    '\\1(?<a>~)*',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":10,"raw":"\\\\1(?<a>~)*","alternatives":[{"type":"Alternative","start":0,"end":10,"raw":"\\\\1(?<a>~)*","elements":[{"type":"Backreference","start":0,"end":2,"raw":"\\\\1","ref":1,"ambiguous":false,"resolved":2},{"type":"Quantifier","start":2,"end":10,"raw":"(?<a>~)*","min":0,"max":null,"greedy":true,"element":{"type":"CapturingGroup","start":2,"end":9,"raw":"(?<a>~)","name":"a","alternatives":[{"type":"Alternative","start":7,"end":8,"raw":"~","elements":[{"type":"Character","start":7,"end":8,"raw":"~","value":126}]}],"references":[{"type":"Backreference","start":0,"end":2,"raw":"\\\\1","ref":1,"ambiguous":false,"resolved":2}]}}]}]}',
  ],
  [
    '(?x:\\b(?<$>$[[a]]\\p{Script=Greek}',
    'v',
    'error',
    'Invalid regular expression: /(?x:\\b(?<$>$[[a]]\\p{Script=Greek}/v: Invalid group@1',
  ],
  [
    '[a&&b&&c&&d]\\P{Lu}[][[a-z]--[aeiou]]',
    'v',
    'ok',
    '{"type":"Pattern","start":0,"end":36,"raw":"[a&&b&&c&&d]\\\\P{Lu}[][[a-z]--[aeiou]]","alternatives":[{"type":"Alternative","start":0,"end":36,"raw":"[a&&b&&c&&d]\\\\P{Lu}[][[a-z]--[aeiou]]","elements":[{"type":"ExpressionCharacterClass","start":0,"end":12,"raw":"[a&&b&&c&&d]","negate":false,"expression":{"type":"ClassIntersection","start":1,"end":11,"raw":"a&&b&&c&&d","left":{"type":"ClassIntersection","start":1,"end":8,"raw":"a&&b&&c","left":{"type":"ClassIntersection","start":1,"end":5,"raw":"a&&b","left":{"type":"Character","start":1,"end":2,"raw":"a","value":97},"right":{"type":"Character","start":4,"end":5,"raw":"b","value":98}},"right":{"type":"Character","start":7,"end":8,"raw":"c","value":99}},"right":{"type":"Character","start":10,"end":11,"raw":"d","value":100}}},{"type":"CharacterSet","start":12,"end":18,"raw":"\\\\P{Lu}","kind":"property","strings":false,"key":"General_Category","value":"Lu","negate":true},{"type":"CharacterClass","start":18,"end":20,"raw":"[]","unicodeSets":true,"negate":false,"elements":[]},{"type":"ExpressionCharacterClass","start":20,"end":36,"raw":"[[a-z]--[aeiou]]","negate":false,"expression":{"type":"ClassSubtraction","start":21,"end":35,"raw":"[a-z]--[aeiou]","left":{"type":"CharacterClass","start":21,"end":26,"raw":"[a-z]","unicodeSets":true,"negate":false,"elements":[{"type":"CharacterClassRange","start":22,"end":25,"raw":"a-z","min":{"type":"Character","start":22,"end":23,"raw":"a","value":97},"max":{"type":"Character","start":24,"end":25,"raw":"z","value":122}}]},"right":{"type":"CharacterClass","start":28,"end":35,"raw":"[aeiou]","unicodeSets":true,"negate":false,"elements":[{"type":"Character","start":29,"end":30,"raw":"a","value":97},{"type":"Character","start":30,"end":31,"raw":"e","value":101},{"type":"Character","start":31,"end":32,"raw":"i","value":105},{"type":"Character","start":32,"end":33,"raw":"o","value":111},{"type":"Character","start":33,"end":34,"raw":"u","value":117}]}}}]}]}',
  ],
  [
    '[\\q{ab}&&\\q{ab}&&a][\\p{L}--\\p{Lu}]*\ude00(?<>(?<a>x)(?<a>y)[a-\\d]',
    'v',
    'error',
    'Invalid regular expression: /[\\q{ab}&&\\q{ab}&&a][\\p{L}--\\p{Lu}]*\ude00(?<>(?<a>x)(?<a>y)[a-\\d]/v: Invalid capture group name@39',
  ],
  [
    '\\k<(?<aa-[\\q{\\b[\\q]',
    '',
    'error',
    'Invalid regular expression: /\\k<(?<aa-[\\q{\\b[\\q]/: Invalid capture group name@8',
  ],
  [
    '\\uD83D\\uD83D\\uDE00^',
    'u',
    'ok',
    '{"type":"Pattern","start":0,"end":19,"raw":"\\\\uD83D\\\\uD83D\\\\uDE00^","alternatives":[{"type":"Alternative","start":0,"end":19,"raw":"\\\\uD83D\\\\uD83D\\\\uDE00^","elements":[{"type":"Character","start":0,"end":6,"raw":"\\\\uD83D","value":55357},{"type":"Character","start":6,"end":18,"raw":"\\\\uD83D\\\\uDE00","value":128512},{"type":"Assertion","start":18,"end":19,"raw":"^","kind":"start"}]}]}',
  ],
  [
    ';\\p{RGI_Emoji}[^[a-\\d]',
    'v',
    'error',
    'Invalid regular expression: /;\\p{RGI_Emoji}[^[a-\\d]/v: Unterminated character class@18',
  ],
  [
    '\\-[\\q{\\k<[\\c1](?:(?<a>x)|(?<a>y))\\p{Script=Foo}',
    '',
    'error',
    'Invalid regular expression: /\\-[\\q{\\k<[\\c1](?:(?<a>x)|(?<a>y))\\p{Script=Foo}/: Invalid character in character class@6',
  ],
  [
    '[\\cA]\\P{Lu}[\\q{a}&&[b]--c]\\c(?<>(?<a-b>',
    'u',
    'error',
    'Invalid regular expression: /[\\cA]\\P{Lu}[\\q{a}&&[b]--c]\\c(?<>(?<a-b>/u: Invalid escape@13',
  ],
  [
    '[a&&&b]\\S',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":9,"raw":"[a&&&b]\\\\S","alternatives":[{"type":"Alternative","start":0,"end":9,"raw":"[a&&&b]\\\\S","elements":[{"type":"CharacterClass","start":0,"end":7,"raw":"[a&&&b]","unicodeSets":false,"negate":false,"elements":[{"type":"Character","start":1,"end":2,"raw":"a","value":97},{"type":"Character","start":2,"end":3,"raw":"&","value":38},{"type":"Character","start":3,"end":4,"raw":"&","value":38},{"type":"Character","start":4,"end":5,"raw":"&","value":38},{"type":"Character","start":5,"end":6,"raw":"b","value":98}]},{"type":"CharacterSet","start":7,"end":9,"raw":"\\\\S","kind":"space","negate":true}]}]}',
  ],
  [
    '\\W[\\q{a|bc|}]/&[\\w-\\d]',
    'v',
    'error',
    'Invalid regular expression: /\\W[\\q{a|bc|}]/&[\\w-\\d]/v: Invalid character in character class@18',
  ],
  [
    '(?ii:[^\\q{ab}]\\u0041[\\^]',
    '',
    'error',
    "Invalid regular expression: /(?ii:[^\\q{ab}]\\u0041[\\^]/: Duplicated flag 'i'@2",
  ],
  [
    '\\077\\p{L}\\p{RGI_Emoji}~',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":23,"raw":"\\\\077\\\\p{L}\\\\p{RGI_Emoji}~","alternatives":[{"type":"Alternative","start":0,"end":23,"raw":"\\\\077\\\\p{L}\\\\p{RGI_Emoji}~","elements":[{"type":"Character","start":0,"end":4,"raw":"\\\\077","value":63},{"type":"Character","start":4,"end":6,"raw":"\\\\p","value":112},{"type":"Character","start":6,"end":7,"raw":"{","value":123},{"type":"Character","start":7,"end":8,"raw":"L","value":76},{"type":"Character","start":8,"end":9,"raw":"}","value":125},{"type":"Character","start":9,"end":11,"raw":"\\\\p","value":112},{"type":"Character","start":11,"end":12,"raw":"{","value":123},{"type":"Character","start":12,"end":13,"raw":"R","value":82},{"type":"Character","start":13,"end":14,"raw":"G","value":71},{"type":"Character","start":14,"end":15,"raw":"I","value":73},{"type":"Character","start":15,"end":16,"raw":"_","value":95},{"type":"Character","start":16,"end":17,"raw":"E","value":69},{"type":"Character","start":17,"end":18,"raw":"m","value":109},{"type":"Character","start":18,"end":19,"raw":"o","value":111},{"type":"Character","start":19,"end":20,"raw":"j","value":106},{"type":"Character","start":20,"end":21,"raw":"i","value":105},{"type":"Character","start":21,"end":22,"raw":"}","value":125},{"type":"Character","start":22,"end":23,"raw":"~","value":126}]}]}',
  ],
  [
    '\\k<a>\\k<[^\\q{ab}]\\P (?<a9',
    '',
    'error',
    'Invalid regular expression: /\\k<a>\\k<[^\\q{ab}]\\P (?<a9/: Invalid capture group name@25',
  ],
  [
    '(?<a\ud83d\ude00\\2',
    '',
    'error',
    'Invalid regular expression: /(?<a\ud83d\ude00\\2/: Invalid capture group name@4',
  ],
  [
    '\\9(?:(?<a>x)|(?<a>y))\\9[(](?<\ud835\udc9c>(?<a>x)(?<a>y)\\8',
    '',
    'error',
    'Invalid regular expression: /\\9(?:(?<a>x)|(?<a>y))\\9[(](?<\ud835\udc9c>(?<a>x)(?<a>y)\\8/: Duplicate capture group name@37',
  ],
  [
    '\\q\\u{[^\\p{RGI_Emoji}]{2}\\s\\k<a>(?:(?<a>x)|(?<a>y))',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":50,"raw":"\\\\q\\\\u{[^\\\\p{RGI_Emoji}]{2}\\\\s\\\\k<a>(?:(?<a>x)|(?<a>y))","alternatives":[{"type":"Alternative","start":0,"end":50,"raw":"\\\\q\\\\u{[^\\\\p{RGI_Emoji}]{2}\\\\s\\\\k<a>(?:(?<a>x)|(?<a>y))","elements":[{"type":"Character","start":0,"end":2,"raw":"\\\\q","value":113},{"type":"Character","start":2,"end":4,"raw":"\\\\u","value":117},{"type":"Character","start":4,"end":5,"raw":"{","value":123},{"type":"Quantifier","start":5,"end":24,"raw":"[^\\\\p{RGI_Emoji}]{2}","min":2,"max":2,"greedy":true,"element":{"type":"CharacterClass","start":5,"end":21,"raw":"[^\\\\p{RGI_Emoji}]","unicodeSets":false,"negate":true,"elements":[{"type":"Character","start":7,"end":9,"raw":"\\\\p","value":112},{"type":"Character","start":9,"end":10,"raw":"{","value":123},{"type":"Character","start":10,"end":11,"raw":"R","value":82},{"type":"Character","start":11,"end":12,"raw":"G","value":71},{"type":"Character","start":12,"end":13,"raw":"I","value":73},{"type":"Character","start":13,"end":14,"raw":"_","value":95},{"type":"Character","start":14,"end":15,"raw":"E","value":69},{"type":"Character","start":15,"end":16,"raw":"m","value":109},{"type":"Character","start":16,"end":17,"raw":"o","value":111},{"type":"Character","start":17,"end":18,"raw":"j","value":106},{"type":"Character","start":18,"end":19,"raw":"i","value":105},{"type":"Character","start":19,"end":20,"raw":"}","value":125}]}},{"type":"CharacterSet","start":24,"end":26,"raw":"\\\\s","kind":"space","negate":false},{"type":"Backreference","start":26,"end":31,"raw":"\\\\k<a>","ref":"a","ambiguous":true,"resolved":[34,42]},{"type":"Group","start":31,"end":50,"raw":"(?:(?<a>x)|(?<a>y))","modifiers":null,"alternatives":[{"type":"Alternative","start":34,"end":41,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":34,"end":41,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":39,"end":40,"raw":"x","elements":[{"type":"Character","start":39,"end":40,"raw":"x","value":120}]}],"references":[{"type":"Backreference","start":26,"end":31,"raw":"\\\\k<a>","ref":"a","ambiguous":true,"resolved":[34,42]}]}]},{"type":"Alternative","start":42,"end":49,"raw":"(?<a>y)","elements":[{"type":"CapturingGroup","start":42,"end":49,"raw":"(?<a>y)","name":"a","alternatives":[{"type":"Alternative","start":47,"end":48,"raw":"y","elements":[{"type":"Character","start":47,"end":48,"raw":"y","value":121}]}],"references":[{"type":"Backreference","start":26,"end":31,"raw":"\\\\k<a>","ref":"a","ambiguous":true,"resolved":[34,42]}]}]}]}]}]}',
  ],
  [
    '\\n\\k<\\u0041[\\q{a|bc|}]\\07[\\u{1F600}-\\u{1F64F}][a&&b&&c&&d]',
    'u',
    'error',
    'Invalid regular expression: /\\n\\k<\\u0041[\\q{a|bc|}]\\07[\\u{1F600}-\\u{1F64F}][a&&b&&c&&d]/u: Invalid capture group name@11',
  ],
  [
    '\\B[--a]a-_\\p{RGI_Emoji}[a--b]\\.',
    '',
    'error',
    'Invalid regular expression: /\\B[--a]a-_\\p{RGI_Emoji}[a--b]\\./: Range out of order in character class@27',
  ],
  [
    '(?<aZ--[\\ud83d\\ude00-\\ud83d\\ude4f]',
    '',
    'error',
    'Invalid regular expression: /(?<aZ--[\\ud83d\\ude00-\\ud83d\\ude4f]/: Invalid capture group name@5',
  ],
  [
    '\\\\[[^\\q{ab}][\\q{a|bc|}]{2,3}9',
    'v',
    'error',
    'Invalid regular expression: /\\\\[[^\\q{ab}][\\q{a|bc|}]{2,3}9/v: Negated character class may contain strings@12',
  ],
  [
    '\\uD83D\\uDE00[\\q{a}](?-i:(?<\ud835\udc9c>(?<a<{2,3}?',
    '',
    'error',
    'Invalid regular expression: /\\uD83D\\uDE00[\\q{a}](?-i:(?<\ud835\udc9c>(?<a<{2,3}?/: Invalid capture group name@34',
  ],
  [
    '(?ii:[{]\\s',
    'u',
    'error',
    "Invalid regular expression: /(?ii:[{]\\s/u: Duplicated flag 'i'@2",
  ],
  [
    '\\p{scx=Latn}[!!]\\u00+?&(?<a_',
    '',
    'error',
    'Invalid regular expression: /\\p{scx=Latn}[!!]\\u00+?&(?<a_/: Invalid capture group name@28',
  ],
  [
    '7=\\',
    '',
    'error',
    'Invalid regular expression: /7=\\/: \\ at end of pattern@2',
  ],
  [
    '(?:){ {a}[[a]&&[b]&&[c]]',
    'u',
    'error',
    'Invalid regular expression: /(?:){ {a}[[a]&&[b]&&[c]]/u: Incomplete quantifier@5',
  ],
  [
    '\u00e9\\p{Basic_Emoji}[}]\\u9{2,3} ',
    'v',
    'error',
    'Invalid regular expression: /\u00e9\\p{Basic_Emoji}[}]\\u9{2,3} /v: Invalid character in character class@17',
  ],
  [
    '\\p{Foo}[z-a]',
    'v',
    'error',
    'Invalid regular expression: /\\p{Foo}[z-a]/v: Invalid property name@6',
  ],
  [
    '(?:(?:(?<a>x))|(?<a>x))|(?:(?<a>x))',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":35,"raw":"(?:(?:(?<a>x))|(?<a>x))|(?:(?<a>x))","alternatives":[{"type":"Alternative","start":0,"end":23,"raw":"(?:(?:(?<a>x))|(?<a>x))","elements":[{"type":"Group","start":0,"end":23,"raw":"(?:(?:(?<a>x))|(?<a>x))","modifiers":null,"alternatives":[{"type":"Alternative","start":3,"end":14,"raw":"(?:(?<a>x))","elements":[{"type":"Group","start":3,"end":14,"raw":"(?:(?<a>x))","modifiers":null,"alternatives":[{"type":"Alternative","start":6,"end":13,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":6,"end":13,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":11,"end":12,"raw":"x","elements":[{"type":"Character","start":11,"end":12,"raw":"x","value":120}]}],"references":[]}]}]}]},{"type":"Alternative","start":15,"end":22,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":15,"end":22,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":20,"end":21,"raw":"x","elements":[{"type":"Character","start":20,"end":21,"raw":"x","value":120}]}],"references":[]}]}]}]},{"type":"Alternative","start":24,"end":35,"raw":"(?:(?<a>x))","elements":[{"type":"Group","start":24,"end":35,"raw":"(?:(?<a>x))","modifiers":null,"alternatives":[{"type":"Alternative","start":27,"end":34,"raw":"(?<a>x)","elements":[{"type":"CapturingGroup","start":27,"end":34,"raw":"(?<a>x)","name":"a","alternatives":[{"type":"Alternative","start":32,"end":33,"raw":"x","elements":[{"type":"Character","start":32,"end":33,"raw":"x","value":120}]}],"references":[]}]}]}]}]}',
  ],
  [
    '{2,1}',
    '',
    'error',
    'Invalid regular expression: /{2,1}/: Nothing to repeat@5',
  ],
  [
    '(?<',
    '',
    'error',
    'Invalid regular expression: /(?</: Invalid capture group name@3',
  ],
  [
    '(?<',
    'u',
    'error',
    'Invalid regular expression: /(?</u: Invalid capture group name@3',
  ],
  [
    'a{1,2}',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":6,"raw":"a{1,2}","alternatives":[{"type":"Alternative","start":0,"end":6,"raw":"a{1,2}","elements":[{"type":"Quantifier","start":0,"end":6,"raw":"a{1,2}","min":1,"max":2,"greedy":true,"element":{"type":"Character","start":0,"end":1,"raw":"a","value":97}}]}]}',
  ],
  [
    'a{2}',
    'u',
    'ok',
    '{"type":"Pattern","start":0,"end":4,"raw":"a{2}","alternatives":[{"type":"Alternative","start":0,"end":4,"raw":"a{2}","elements":[{"type":"Quantifier","start":0,"end":4,"raw":"a{2}","min":2,"max":2,"greedy":true,"element":{"type":"Character","start":0,"end":1,"raw":"a","value":97}}]}]}',
  ],
  [
    'a{2,}?',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":6,"raw":"a{2,}?","alternatives":[{"type":"Alternative","start":0,"end":6,"raw":"a{2,}?","elements":[{"type":"Quantifier","start":0,"end":6,"raw":"a{2,}?","min":2,"max":null,"greedy":false,"element":{"type":"Character","start":0,"end":1,"raw":"a","value":97}}]}]}',
  ],
  [
    'a{1,2',
    '',
    'ok',
    '{"type":"Pattern","start":0,"end":5,"raw":"a{1,2","alternatives":[{"type":"Alternative","start":0,"end":5,"raw":"a{1,2","elements":[{"type":"Character","start":0,"end":1,"raw":"a","value":97},{"type":"Character","start":1,"end":2,"raw":"{","value":123},{"type":"Character","start":2,"end":3,"raw":"1","value":49},{"type":"Character","start":3,"end":4,"raw":",","value":44},{"type":"Character","start":4,"end":5,"raw":"2","value":50}]}]}',
  ],
  [
    'a{1,2',
    'u',
    'error',
    'Invalid regular expression: /a{1,2/u: Incomplete quantifier@5',
  ],
];

describe('parsePattern', () => {
  it.each(TABLE)('%j under /%s: %s', (source, mode, kind, expected) => {
    if (kind === 'ok') {
      expect(
        serialize(parsePattern(source, 0, source.length, flagsOf(mode))),
      ).toBe(expected);
      return;
    }
    let caught: unknown;
    try {
      parsePattern(source, 0, source.length, flagsOf(mode));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RegExpSyntaxError);
    const { message, index } = caught as RegExpSyntaxError & { index: number };
    expect(`${message}@${index}`).toBe(expected);
  });

  it('parses the slice [start, end) of a longer string', () => {
    const pattern = parsePattern('xx(a+)+yy', 2, 7, {});
    expect(pattern.raw).toBe('(a+)+');
    expect(pattern.start).toBe(2);
    expect(pattern.end).toBe(7);
  });

  it('accepts no flags at all, and the parser class mirrors the function', () => {
    expect(new RegExpParser().parsePattern('a|b').alternatives).toHaveLength(2);
    expect(
      new RegExpParser().parsePattern('\\p{L}', 0, 5, { unicode: true }).raw,
    ).toBe('\\p{L}');
  });

  it('u and v together is not a pattern mode', () => {
    expect(() =>
      parsePattern('a', 0, 1, { unicode: true, unicodeSets: true }),
    ).toThrow(/Invalid regular expression flags/);
  });
});
