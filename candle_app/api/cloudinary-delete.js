import { v2 as cloudinary } from 'cloudinary';

function normalizeCloudinaryPublicId(rawId) {
  if (!rawId) return null;
  let id = `${rawId}`.trim();

  if (id.includes('::')) {
    const parts = id.split('::').map((part) => part.trim()).filter(Boolean);
    id = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  try {
    const parsed = new URL(id);
    const path = parsed.pathname.replace(/^\/+/, '');
    const parts = path.split('/');
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 1 < parts.length) {
      id = parts.slice(uploadIndex + 1).join('/');
    } else {
      id = parts.join('/');
    }
  } catch (e) {
    // Not a URL, ignore.
  }

  const extMatch = id.match(/\.(jpg|jpeg|png|webp|gif|avif|bmp|tiff)$/i);
  if (extMatch) {
    id = id.slice(0, -extMatch[0].length);
  }

  return id;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const rawPublicId = body?.public_id;

    console.log('[API] cloudinary-delete request', { rawPublicId });

    if (!rawPublicId) {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    const publicId = normalizeCloudinaryPublicId(rawPublicId);
    if (!publicId) {
      return res.status(400).json({ error: 'Invalid public_id', value: rawPublicId });
    }

    let result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    console.log('[API] cloudinary-delete result', { publicId, result });

    if (result.result === 'not found') {
      // Try folder fallback from settings and from received value.
      const folder = (process.env.CLOUDINARY_FOLDER || '').replace(/\/+$/, '');
      const attempts = [];

      if (folder && !publicId.startsWith(`${folder}/`)) {
        const foldered = `${folder}/${publicId}`;
        attempts.push(foldered);
      }

      if (folder && publicId.startsWith(`${folder}/`)) {
        const unfoldered = publicId.slice(folder.length + 1);
        attempts.push(unfoldered);
      }

      for (const candidate of attempts) {
        console.log('[API] cloudinary-delete retry candidate', { candidate });
        const attemptResult = await cloudinary.uploader.destroy(candidate, { invalidate: true });
        if (attemptResult.result !== 'not found') {
          return res.status(200).json({ fallback: true, attempted: candidate, result: attemptResult });
        }
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] cloudinary-delete failed', error);
    return res.status(500).json({ error: 'cloudinary_delete_failed', message: error.message });
  }
}
