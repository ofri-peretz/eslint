/**
 * VULNERABLE - Computed member access reaches the same sink.
 */
const target = document.getElementById('out');
target['innerHTML'] = payload;
