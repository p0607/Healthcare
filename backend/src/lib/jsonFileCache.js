const fs = require('fs/promises');
const path = require('path');

/** In-process cache keyed by absolute file path + mtime. */
const store = new Map();

/**
 * Read a JSON file with mtime-based caching. Invalidates automatically when the file changes on disk.
 * @param {string} filePath
 * @param {{ parse?: (raw: string) => any, onMissing?: () => any }} [options]
 */
async function readJsonCached(filePath, options = {}) {
  const abs = path.resolve(filePath);
  const { parse = JSON.parse, onMissing } = options;

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (onMissing) return onMissing();
      throw err;
    }
    throw err;
  }

  const hit = store.get(abs);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;

  const raw = await fs.readFile(abs, 'utf8');
  const data = parse(raw);
  store.set(abs, { mtimeMs: stat.mtimeMs, data });
  return data;
}

function invalidateJsonCache(filePath) {
  store.delete(path.resolve(filePath));
}

module.exports = { readJsonCached, invalidateJsonCache };
