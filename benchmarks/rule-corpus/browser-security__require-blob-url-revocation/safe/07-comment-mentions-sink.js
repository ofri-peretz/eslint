/**
 * SAFE - The sink appears only in a comment.
 */
// URL.createObjectURL(file) would pin the Blob; read it into a data URL instead.
export function toDataUrl(file) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return reader;
}
