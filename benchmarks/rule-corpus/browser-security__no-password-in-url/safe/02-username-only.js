/**
 * SAFE - A username with NO password. `https://token@host` is a different
 * weakness; CWE-521 is about password strength and exposure.
 */
fetch('https://deploybot@git.acme-corp.io/repo.git');
