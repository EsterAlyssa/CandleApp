import { v2 as cloudinary } from 'cloudinary';

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
    const publicId = body?.public_id;

    console.log('[API] cloudinary-delete request', { publicId });

    if (!publicId) {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    console.log('[API] cloudinary-delete result', { publicId, result });

    if (result.result === 'not found' && process.env.CLOUDINARY_FOLDER) {
      const foldered = `${process.env.CLOUDINARY_FOLDER.replace(/\/+$/, '')}/${publicId}`;
      console.log('[API] cloudinary-delete fallback with folder publicId', { foldered });
      const fallbackResult = await cloudinary.uploader.destroy(foldered, { invalidate: true });
      return res.status(200).json({ fallback: true, result: fallbackResult });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] cloudinary-delete failed', error);
    return res.status(500).json({ error: 'cloudinary_delete_failed', message: error.message });
  }
}
