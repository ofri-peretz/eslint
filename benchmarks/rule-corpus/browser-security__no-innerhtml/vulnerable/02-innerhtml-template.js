/**
 * VULNERABLE - Interpolated into a template literal - still injected verbatim.
 */
function render(user) {
  document.querySelector('#card').innerHTML = `<h2>${user.bio}</h2>`;
}
