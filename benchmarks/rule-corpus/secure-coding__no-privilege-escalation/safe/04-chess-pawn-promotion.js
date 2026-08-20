/**
 * SAFE - A chess engine. Pawn promotion is a move of the game; the "privilege"
 * being escalated belongs to a piece on a board, and the move is validated by
 * the engine's own legality check before it is applied.
 *
 * `promote` is one of the privilege-operation verbs, and this call takes its
 * argument from the request body - so a callee-name substring test reports a
 * board game as CWE-269.
 */
import { Chess } from 'chess.js';

export function applyMove(gameState, req) {
  const board = new Chess(gameState.fen);

  const move = board.move({
    from: req.body.from,
    to: req.body.to,
    promotion: req.body.promotion,
  });

  if (!move) {
    throw new Error('illegal move');
  }

  return promotePawn(board, req.body.promotion);
}

function promotePawn(board, piece) {
  return { fen: board.fen(), promotedTo: piece };
}
