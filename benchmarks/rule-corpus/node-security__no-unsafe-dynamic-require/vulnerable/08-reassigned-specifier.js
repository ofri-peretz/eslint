/**
 * VULNERABLE - the binding starts as a safe default and is overwritten from the
 * request before the call. Reading only the declarator answers './json' and
 * misses the write that matters.
 */
const express = require('express');

module.exports = function serializerFor(req) {
  let serializer = './serializers/json';
  if (req.headers.accept === 'application/xml') {
    serializer = req.headers['x-serializer'];
  }
  return require(serializer);
};
