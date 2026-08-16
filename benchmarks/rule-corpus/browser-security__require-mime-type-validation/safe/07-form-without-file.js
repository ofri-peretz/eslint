/**
 * SAFE - A FormData post that carries no file. `append` and a `body` are the
 * upload sinks, but nothing here ever touched a FileList.
 */
export async function saveProfile(user) {
  const body = new FormData();
  body.append('name', user.name);
  body.append('bio', user.bio);
  return fetch('/api/profile', { method: 'POST', body });
}
