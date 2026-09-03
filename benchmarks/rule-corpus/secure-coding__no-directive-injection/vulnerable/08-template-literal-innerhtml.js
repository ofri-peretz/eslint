/**
 * VULNERABLE - The markup is assembled in a template literal with the request
 * value interpolated into an attribute position, then written through
 * innerHTML. A closing quote in the value adds attributes of the caller's
 * choosing.
 */
function renderAvatar(req) {
  const slot = document.querySelector('#avatar');
  slot.innerHTML = `<img src="${req.query.src}" alt="${req.query.alt}" />`;
  return slot;
}

module.exports = { renderAvatar };
