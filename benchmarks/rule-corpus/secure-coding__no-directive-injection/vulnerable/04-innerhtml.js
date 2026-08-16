/**
 * VULNERABLE - The DOM half of the same weakness: markup assembled from the
 * request and written through innerHTML, so any directive or event attribute in
 * it is parsed and honoured.
 */
function renderComment(req) {
  const container = document.getElementById('comments');
  container.innerHTML = req.body.html;
  return container;
}

module.exports = { renderComment };
