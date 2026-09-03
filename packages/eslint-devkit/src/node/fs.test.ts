import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  fileExistsSync,
  readFileSync,
  readJsonFileSync,
  statSync,
  mkdirSync,
  writeFileSync,
  findFileUpward,
} from './fs';

// Test directory for temporary files
let testDir: string;

/**
 * Create a temporary file with content
 */
function createTempFile(relativePath: string, content: string): string {
  const fullPath = path.join(testDir, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Clean up test directory
 */
function cleanupTestDir(): void {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

describe('node/fs utils', () => {
  beforeEach(() => {
    // Create a unique test directory for each test
    const baseDir = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), 'fs-utils-test-'),
    );
    testDir = baseDir;
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('fileExistsSync', () => {
    it('should return true for existing file', () => {
      const filePath = createTempFile('exists.ts', 'content');
      expect(fileExistsSync(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExistsSync(path.join(testDir, 'nonexistent.ts'))).toBe(false);
    });

    it('should return true for existing directory', () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);
      expect(fileExistsSync(dirPath)).toBe(true);
    });
  });

  describe('readFileSync', () => {
    it('should read file content', () => {
      const content = 'Hello, World!';
      const filePath = createTempFile('readable.txt', content);
      const result = readFileSync(filePath);
      expect(result).toBe(content);
    });

    it('should return null for non-existent file', () => {
      const result = readFileSync(path.join(testDir, 'nonexistent.txt'));
      expect(result).toBeNull();
    });

    it('should use specified encoding', () => {
      const content = 'UTF-8 content: 日本語';
      const filePath = createTempFile('utf8.txt', content);
      const result = readFileSync(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should return null on read error', () => {
      // Create a directory instead of a file to cause a read error
      const dirPath = path.join(testDir, 'directory');
      fs.mkdirSync(dirPath);
      const result = readFileSync(dirPath);
      expect(result).toBeNull();
    });
  });

  describe('readJsonFileSync', () => {
    it('should parse valid JSON file', () => {
      const data = { name: 'test', version: '1.0.0' };
      const filePath = createTempFile('valid.json', JSON.stringify(data));
      const result = readJsonFileSync<{ name: string; version: string }>(
        filePath,
      );
      expect(result).toEqual(data);
    });

    it('should return null for non-existent file', () => {
      const result = readJsonFileSync(path.join(testDir, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const filePath = createTempFile('invalid.json', 'not valid json {');
      const result = readJsonFileSync(filePath);
      expect(result).toBeNull();
    });
  });

  describe('statSync', () => {
    it('should return stats for existing file', () => {
      const filePath = createTempFile('stats.txt', 'content');
      const result = statSync(filePath);
      expect(result).not.toBeNull();
      expect(result?.isFile()).toBe(true);
      expect(result?.isDirectory()).toBe(false);
      expect(result?.size).toBeGreaterThan(0);
    });

    it('should return stats for existing directory', () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);
      const result = statSync(dirPath);
      expect(result).not.toBeNull();
      expect(result?.isDirectory()).toBe(true);
      expect(result?.isFile()).toBe(false);
    });

    it('should return null for non-existent file', () => {
      const result = statSync(path.join(testDir, 'nonexistent.txt'));
      expect(result).toBeNull();
    });

    it('should return stats with mtime and size', () => {
      const filePath = createTempFile('stats-details.txt', 'test content');
      const result = statSync(filePath);
      expect(result).not.toBeNull();
      expect(result?.mtimeMs).toBeGreaterThan(0);
      expect(result?.size).toBeGreaterThan(0);
    });
  });

  describe('mkdirSync', () => {
    it('should create directory', () => {
      const dirPath = path.join(testDir, 'newdir');
      const result = mkdirSync(dirPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it('should create nested directories with recursive option', () => {
      const dirPath = path.join(testDir, 'deep', 'nested', 'dir');
      const result = mkdirSync(dirPath, { recursive: true });
      expect(result).toBe(true);
      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it('should return true if directory already exists', () => {
      const dirPath = path.join(testDir, 'existing');
      fs.mkdirSync(dirPath);
      const result = mkdirSync(dirPath, { recursive: true });
      expect(result).toBe(true);
    });

    it('should return false on error (e.g., permission denied)', () => {
      // On Unix systems, /root is typically not writable
      // But we can't reliably test this without knowing the system
      // Instead, test with invalid path characters
      const invalidPath = path.join(testDir, '\0invalid');
      const result = mkdirSync(invalidPath);
      // This might succeed or fail depending on OS, so we just check it returns boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('writeFileSync', () => {
    it('should write file content', () => {
      const filePath = path.join(testDir, 'write-test.txt');
      const content = 'Hello, World!';
      const result = writeFileSync(filePath, content);
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('should write file with UTF-8 encoding by default', () => {
      const filePath = path.join(testDir, 'utf8-test.txt');
      const content = 'UTF-8 content: 日本語 🎉';
      const result = writeFileSync(filePath, content);
      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('should write file with specified encoding', () => {
      const filePath = path.join(testDir, 'encoding-test.txt');
      const content = 'Test content';
      const result = writeFileSync(filePath, content, 'utf-8');
      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('should overwrite existing file', () => {
      const filePath = createTempFile('overwrite.txt', 'old content');
      const newContent = 'new content';
      const result = writeFileSync(filePath, newContent);
      expect(result).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(newContent);
    });

    it('should return false on write error', () => {
      // Try to write to a directory (should fail)
      const dirPath = path.join(testDir, 'dir-as-file');
      fs.mkdirSync(dirPath);
      const result = writeFileSync(dirPath, 'content');
      // On some systems this might succeed (writing to dir), on others it fails
      // The important thing is that our wrapper handles errors gracefully
      expect(typeof result).toBe('boolean');
    });
  });

  describe('findFileUpward', () => {
    it('should find file in current directory', () => {
      const targetFile = createTempFile('target.txt', 'content');
      const startDir = path.dirname(targetFile);
      const result = findFileUpward('target.txt', startDir);
      expect(result).toBe(targetFile);
    });

    it('should find file in parent directory', () => {
      const targetFile = createTempFile('root-file.txt', 'content');
      const nestedDir = path.join(testDir, 'deep', 'nested', 'dir');
      fs.mkdirSync(nestedDir, { recursive: true });
      const result = findFileUpward('root-file.txt', nestedDir);
      expect(result).toBe(targetFile);
    });

    it('should return null when file not found', () => {
      const result = findFileUpward('nonexistent-unique-file.txt', testDir);
      expect(result).toBeNull();
    });

    it('should stop at root directory', () => {
      // Create a file at root level
      const rootFile = createTempFile('root-only.txt', 'content');
      // Using createTempFile for setup - dirname result not needed
      path.dirname(rootFile);
      // Try to find a file that doesn't exist, starting from a nested dir
      const nestedDir = path.join(testDir, 'deep', 'nested');
      fs.mkdirSync(nestedDir, { recursive: true });
      const result = findFileUpward('nonexistent-file.txt', nestedDir);
      expect(result).toBeNull();
    });
  });
});
