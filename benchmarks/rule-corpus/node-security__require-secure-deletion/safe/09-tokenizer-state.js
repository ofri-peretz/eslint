/**
 * SAFE (adversarial) - a parser's tokenizer state. `tokenizer` contains
 * `token`, and a lexer's scratch state is not a credential. Every parser in the
 * ecosystem has this line.
 */
function resetParser(parser) {
  delete parser.tokenizerState;
  delete parser.tokenBuffer;
  return parser;
}

module.exports = { resetParser };
