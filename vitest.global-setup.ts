/**
 * Vitest Global Setup
 * 
 * This setup runs before each test suite in a project. It ensures that the
 * project's coverage directory and .tmp subdirectory exist before Vitest's v8
 * coverage provider tries to create temporary files.
 * 
 * This prevents ENOENT errors when multiple test packages run in parallel.
 * 
 * Note: Each project's vitest config references this file, so it runs once per project.
 * We use __dirname to get the project-relative path and create only the local coverage dir.
 */
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export async function setup() {
  // Get the directory of the vitest config file (project root via relative path in config)
  // Since this file is at the workspace root, we need to handle the relative import path
  // Each project imports as: globalSetup: ['../../vitest.global-setup.ts']
  // So we traverse up from this file location
  
  const workspaceRoot = process.cwd();
  
  // Create the coverage/.tmp directory for the current project
  // This will be called from each project's vitest instance
  try {
    const coverageDir = resolve(workspaceRoot, 'coverage/.tmp');
    if (!existsSync(coverageDir)) {
      mkdirSync(coverageDir, { recursive: true });
    }
  } catch {
    // Silently ignore errors - directory might already exist or be created by another process
    // The important thing is that future operations won't fail on ENOENT
  }
}

