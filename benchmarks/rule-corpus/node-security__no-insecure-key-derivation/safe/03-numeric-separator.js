/**
 * SAFE - the same number written with numeric separators. A digit grouping is
 * not a different value.
 */
import { pbkdf2Sync } from 'node:crypto';

export const derive = (password, salt) => pbkdf2Sync(password, salt, 1_200_000, 64, 'sha512');
