import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createTextFileExclusive, openTextFile } from '../lib/text-file.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(join(tmpdir(), 'text-file-test-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('openTextFile', () => {
  it('reads and replaces an existing file, truncating longer old contents', () => {
    const file = join(root, 'a.json');
    fs.writeFileSync(file, 'a much longer original body');
    const handle = openTextFile(file, 'edit');
    try {
      expect(handle.text).toBe('a much longer original body');
      handle.replace('short');
    } finally {
      handle.close();
    }
    expect(fs.readFileSync(file, 'utf8')).toBe('short');
  });

  it('writes to the inode it read, even if the path is swapped in between', () => {
    // The race the helper exists to close: the path is re-pointed after the
    // read. A path-based writeFileSync would clobber the replacement.
    const file = join(root, 'b.json');
    fs.writeFileSync(file, 'original');
    const handle = openTextFile(file, 'edit');
    fs.renameSync(file, join(root, 'b.moved'));
    fs.writeFileSync(file, 'someone else');
    handle.replace('ours');
    handle.close();
    expect(fs.readFileSync(file, 'utf8')).toBe('someone else');
    expect(fs.readFileSync(join(root, 'b.moved'), 'utf8')).toBe('ours');
  });

  it('reports a missing file as null in read and edit mode without creating it', () => {
    const file = join(root, 'missing.json');
    const read = openTextFile(file, 'read');
    const edit = openTextFile(file, 'edit');
    expect(read.text).toBeNull();
    expect(edit.text).toBeNull();
    expect(() => edit.replace('x')).toThrow(/does not exist/);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('treats a path through a regular file (ENOTDIR) as missing, like existsSync', () => {
    const file = join(root, 'plain.ts');
    fs.writeFileSync(file, 'x');
    expect(openTextFile(join(file, 'index.ts'), 'read').text).toBeNull();
  });

  it('still throws for a failure that is not absence', () => {
    expect(() => openTextFile(root, 'edit')).toThrow(/EISDIR/);
  });

  it('upsert creates a missing file and writes it', () => {
    const file = join(root, 'new.json');
    const handle = openTextFile(file, 'upsert');
    expect(handle.text).toBeNull();
    handle.replace('{"a":1}\n');
    handle.close();
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1}\n');
  });

  it('refuses to write through a read-only handle', () => {
    const file = join(root, 'ro.json');
    fs.writeFileSync(file, 'x');
    const handle = openTextFile(file, 'read');
    expect(() => handle.replace('y')).toThrow(/read-only/);
    handle.close();
    expect(fs.readFileSync(file, 'utf8')).toBe('x');
  });

  it('round-trips multi-byte text', () => {
    const file = join(root, 'utf8.txt');
    fs.writeFileSync(file, '⛔ ✅ — é');
    const handle = openTextFile(file, 'edit');
    expect(handle.text).toBe('⛔ ✅ — é');
    handle.replace('★ ü');
    handle.close();
    expect(fs.readFileSync(file, 'utf8')).toBe('★ ü');
  });
});

describe('createTextFileExclusive', () => {
  it('creates a new file and refuses to overwrite an existing one', () => {
    const file = join(root, 'fixture.js');
    expect(createTextFileExclusive(file, 'first')).toBe(true);
    expect(createTextFileExclusive(file, 'second')).toBe(false);
    expect(fs.readFileSync(file, 'utf8')).toBe('first');
  });
});
