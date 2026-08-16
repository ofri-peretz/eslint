/**
 * SAFE - A LOCAL function wearing the routing hook's name. It resolves to no
 * routing import, so there is no evidence this `push` navigates anything.
 */
function useRouter() {
  return { push: (value) => console.log(value) };
}

const router = useRouter();
router.push(window.location.hash);
