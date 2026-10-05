import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

// Explicit local review input only. Account processing remains stdin-only.
export async function readReviewFile(path) {
  if (typeof path !== 'string' || !path.endsWith('.json') || path.includes('\0')) throw new Error('Choose a private JSON review input file.');
  let handle;
  try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch { throw new Error('Review input is missing, inaccessible or a symbolic link. Choose the explicit regular JSON file.'); }
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.mode & 0o077 || (process.getuid && stat.uid !== process.getuid())) throw new Error('Review input must be a private regular file owned by your account (0600).');
    if (stat.size > 120000) throw new Error('Review input exceeds 120,000 bytes.');
    const buffer = Buffer.alloc(120001);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, size);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > 120000) throw new Error('Review input exceeds 120,000 bytes.');
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size)); }
    catch { throw new Error('Review input must contain valid UTF-8.'); }
  } finally { await handle.close(); }
}
