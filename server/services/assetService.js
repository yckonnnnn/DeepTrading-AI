import pool from '../db/pool.js';

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

export const buildAssetFilename = (mimeType, originalName = '') => {
  const fallbackExt = originalName.includes('.')
    ? `.${originalName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : '';
  const ext = EXTENSION_BY_MIME[mimeType] || fallbackExt || '.bin';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `kline-${unique}${ext}`;
};

export const saveAsset = async ({ filename, contentType, buffer }) => {
  await pool.execute(
    `INSERT INTO uploaded_assets (filename, content_type, size_bytes, data)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (filename) DO UPDATE
       SET content_type = EXCLUDED.content_type,
           size_bytes = EXCLUDED.size_bytes,
           data = EXCLUDED.data`,
    [filename, contentType || null, buffer.length, buffer]
  );
  return { filename, url: `/uploads/${filename}`, size: buffer.length };
};

export const getAsset = async (filename) => {
  const [rows] = await pool.execute(
    'SELECT filename, content_type, data FROM uploaded_assets WHERE filename = ? LIMIT 1',
    [filename]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};
