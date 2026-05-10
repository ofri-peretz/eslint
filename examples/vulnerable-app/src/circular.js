// FLAGSHIP: import-next/no-cycle
// circular.js  ──imports──>  circular-helper.js  ──imports──>  circular.js
// import-next/no-cycle should detect the cycle on either side.

import { helperValue } from './circular-helper.js';

export const mainValue = 'main';

export function describe() {
  return `${mainValue} & ${helperValue}`;
}
