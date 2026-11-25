// DVNA driver config. DVNA's database layer is Sequelize (package.json at the pin: sequelize ^4.13.10, mysql2),
// so C = B + sequelize-security. Kept in its own file so the frozen NodeGoat configs are not edited.
import sequelizeSecurity from '../../../../packages/eslint-plugin-sequelize-security/dist/src/index.js';
import { B } from './ours.config.mjs';

export const C_LABEL = 'B + sequelize-security recommended';
export const C = {
  dvna: [...B, sequelizeSecurity.configs.recommended],
};
