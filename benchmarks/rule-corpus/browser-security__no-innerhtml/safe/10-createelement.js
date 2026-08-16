/**
 * SAFE - Building nodes through the DOM API cannot inject markup.
 */
const li = document.createElement('li');
li.textContent = entry.message;
document.getElementById('log').append(li);
