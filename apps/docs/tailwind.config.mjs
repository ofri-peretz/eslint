import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      './src/**/*.{js,jsx,ts,tsx,mdx}',
      './content/**/*.{md,mdx}',
      // Scan fumadocs-ui from workspace root node_modules
      path.join(monorepoRoot, 'node_modules/fumadocs-ui/dist/**/*.js'),
      path.join(monorepoRoot, 'node_modules/fumadocs-ui/css/**/*.css'),
      // Also scan @fumadocs/ui (internal package) 
      path.join(monorepoRoot, 'node_modules/@fumadocs/ui/dist/**/*.js'),
      path.join(monorepoRoot, 'node_modules/@fumadocs/ui/css/**/*.css'),
    ],
  },
  // Removed safelist - using manual CSS rules in global.css instead
};
