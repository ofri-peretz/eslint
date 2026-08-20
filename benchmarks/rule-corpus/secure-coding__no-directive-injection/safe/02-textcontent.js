/**
 * SAFE - The correct remediation for the innerHTML shape. `textContent` assigns
 * a string as text; the browser never parses it as markup, so no directive or
 * tag in the payload can take effect. Attacker input flows in freely and is
 * still inert.
 */
export function renderComment(container, comment) {
  const body = document.createElement('p');
  body.textContent = comment.authorSuppliedBody;
  container.replaceChildren(body);
  return body;
}
