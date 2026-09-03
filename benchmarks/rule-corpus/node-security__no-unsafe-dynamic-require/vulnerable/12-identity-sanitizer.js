/**
 * VULNERABLE (adversarial) - a local helper wearing a trustworthy name. It
 * lower-cases and trims; it does not constrain the path at all. A wrapper does
 * not launder its argument, and the name of the wrapper is not evidence.
 */
const express = require('express');

function sanitizeModuleName(value) {
  return String(value).trim().toLowerCase();
}

module.exports = function loadAdapter(req) {
  const name = sanitizeModuleName(req.query.adapter);
  return require('./adapters/' + name);
};
