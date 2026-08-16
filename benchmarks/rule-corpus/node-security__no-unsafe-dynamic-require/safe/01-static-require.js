/**
 * SAFE - the specifier is written out in full. This is the baseline the rule
 * must never report, or every Node file in existence is a finding.
 */
const path = require('node:path');
const express = require('express');
const { json } = require('body-parser');

const app = express();
app.use(json());
app.set('views', path.join(__dirname, 'views'));

module.exports = app;
