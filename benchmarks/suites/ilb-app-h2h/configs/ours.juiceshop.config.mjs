// Juice Shop driver config. Its database layer is Sequelize (SQLite), so C = B + sequelize-security
// (the plan's choice). Own file so frozen configs of earlier apps are not edited.
import sequelizeSecurity from '../../../../packages/eslint-plugin-sequelize-security/dist/src/index.js';
import { B } from './ours.config.mjs';

export const C_LABEL = 'B + sequelize-security recommended';
export const C = {
  juiceshop: [...B, sequelizeSecurity.configs.recommended],
};
