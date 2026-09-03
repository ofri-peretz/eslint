// Sister file to circular.js — closes the import cycle.
import { mainValue } from './circular.js';

export const helperValue = `helper(${mainValue})`;
