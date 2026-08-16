/**
 * VULNERABLE - Assignment inside a loop body.
 */
for (const cell of document.querySelectorAll('td')) {
  cell.innerHTML = row[cell.dataset.key];
}
