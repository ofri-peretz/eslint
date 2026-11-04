const { tag, withTestFile } = require('../../lib.cjs');

const FIELDS = {
  TypeOnly: '{ name: { type: String } }',
  DefaultOnly: "{ role: { type: String, default: 'user' } }",
  MixedValidated:
    '{ email: { type: String, required: true }, nickname: { type: String } }',
  Required: '{ name: { type: String, required: true } }',
  Enum: "{ role: { type: String, enum: ['user', 'admin'], default: 'user' } }",
  Match: '{ email: { type: String, match: /^[^\\s@]+@[^\\s@]+$/ } }',
  MinMax: '{ age: { type: Number, min: 0, max: 150 } }',
  MaxLength: '{ bio: { type: String, maxlength: 500 } }',
  MinLength: '{ password: { type: String, minlength: 12 } }',
  Validate:
    "{ age: { type: Number, validate: { validator: Number.isInteger, message: 'Age must be an integer' } } }",
  AllValidated:
    "{ email: { type: String, required: true, maxlength: 255 }, role: { type: String, enum: ['user', 'admin'] } }",
};

// Spelling -> [head, constructor expression]
const SPELLINGS = {
  Named: ["import { Schema } from 'mongoose';", 'Schema'],
  Renamed: [
    "import { Schema as MongooseSchema } from 'mongoose';",
    'MongooseSchema',
  ],
  MongooseMember: ["import mongoose from 'mongoose';", 'mongoose.Schema'],
  Require: ["const mongoose = require('mongoose');", 'mongoose.Schema'],
  OtherLibrary: [
    "import mongoose from 'mongoose';\nimport { Schema } from 'avsc';\nexport const conn = mongoose.connection;",
    'Schema',
  ],
  Relative: ["import { Schema } from './schema';", 'Schema'],
};

const base = {
  rule: 'require-schema-validation',
  domain: 66, // 6 spellings x 11 field sets
  traces: 450,
  key: (s) => `${tag(s.spelling)}|${tag(s.shape)}`,
  code: (s) => {
    const [head, ctor] = SPELLINGS[tag(s.spelling)];
    return `${head}\nexport const userSchema = new ${ctor}(${FIELDS[tag(s.shape)]});\n`;
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
