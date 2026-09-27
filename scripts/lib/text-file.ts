/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * text-file.ts — read a file and write it back through ONE descriptor.
 *
 * The spelling this replaces is
 *
 *   const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : fallback;
 *   …
 *   fs.writeFileSync(f, next);
 *
 * which resolves the path three times. Anything that replaces, deletes or
 * re-links `f` between those calls makes the script read one file and write
 * another (`js/file-system-race`, CWE-367). Here the path is resolved exactly
 * once, by `openSync`; the read, the truncate and the write all go through the
 * descriptor that call returned, so they are guaranteed to hit the same inode.
 *
 * ENOENT/ENOTDIR are the only tolerated failures, reported as `text === null`
 * rather than thrown: "no baseline yet" is a normal state for every ratchet
 * here. Any other error (EACCES, EISDIR, …) still throws.
 */
import * as fs from 'node:fs';

/**
 * - `read`   — read-only. A missing file gives `text: null`.
 * - `edit`   — read + write an EXISTING file. A missing file gives `text: null`
 *              and `replace()` throws: the caller asked to edit, not create.
 * - `upsert` — read + write, creating the file (empty) if it is missing. A
 *              missing or zero-byte file gives `text: null`.
 */
export type TextFileMode = 'read' | 'edit' | 'upsert';

export interface TextFile {
  /** The contents at open time, or `null` if the file did not exist. */
  readonly text: string | null;
  /** Replace the whole contents, through the same descriptor that was read. */
  replace(next: string): void;
  /** Release the descriptor. Safe to call more than once. */
  close(): void;
}

/**
 * Codes meaning "there is no such file". ENOTDIR is the case where a path
 * component is a regular file (`rules/foo.ts/index.ts`) — `existsSync` answers
 * `false` there too, and callers replacing it rely on the same answer.
 */
const ABSENT = new Set(['ENOENT', 'ENOTDIR']);

const FLAGS: Record<TextFileMode, number> = {
  read: fs.constants.O_RDONLY,
  edit: fs.constants.O_RDWR,
  upsert: fs.constants.O_RDWR | fs.constants.O_CREAT,
};

function readAll(fd: number): string {
  const size = fs.fstatSync(fd).size;
  const buffer = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const n = fs.readSync(fd, buffer, offset, size - offset, offset);
    if (n === 0) break;
    offset += n;
  }
  return buffer.subarray(0, offset).toString('utf8');
}

function writeAll(fd: number, text: string): void {
  const buffer = Buffer.from(text, 'utf8');
  fs.ftruncateSync(fd, 0);
  let offset = 0;
  while (offset < buffer.length) {
    offset += fs.writeSync(fd, buffer, offset, buffer.length - offset, offset);
  }
}

/** Open `file` once; see {@link TextFileMode} for what each mode allows. */
export function openTextFile(file: string, mode: TextFileMode): TextFile {
  let fd: number;
  try {
    fd = fs.openSync(file, FLAGS[mode], 0o644);
  } catch (error) {
    if (!ABSENT.has((error as NodeJS.ErrnoException).code ?? '')) throw error;
    return {
      text: null,
      replace: () => {
        throw new Error(
          `${file} does not exist; cannot ${mode === 'read' ? 'write a read-only handle' : 'edit it'}`,
        );
      },
      close: () => {},
    };
  }

  const raw = readAll(fd);
  let open = true;
  return {
    text: mode === 'upsert' && raw === '' ? null : raw,
    replace(next) {
      if (mode === 'read') throw new Error(`${file} was opened read-only`);
      if (!open) throw new Error(`${file} is already closed`);
      writeAll(fd, next);
    },
    close() {
      if (!open) return;
      open = false;
      fs.closeSync(fd);
    },
  };
}

/**
 * Create `file` with `text`, failing if it already exists.
 *
 * `O_EXCL` makes "does it exist?" and "create it" one atomic step, so there is
 * no window in which a concurrent writer's file can be overwritten.
 *
 * @returns `false` when the file already existed (nothing was written).
 */
export function createTextFileExclusive(file: string, text: string): boolean {
  try {
    fs.writeFileSync(file, text, { flag: 'wx' });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}
