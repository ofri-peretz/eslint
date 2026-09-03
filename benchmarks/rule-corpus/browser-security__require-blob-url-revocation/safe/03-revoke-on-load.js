/**
 * SAFE - The handle lives on a property, and the load handler releases the same
 * property. Path in, path out.
 */
const preview = document.querySelector('#preview');

preview.onload = () => URL.revokeObjectURL(preview.src);

export function show(file) {
  preview.src = URL.createObjectURL(file);
}
