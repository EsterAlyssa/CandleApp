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

    if (!publicId) {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] cloudinary-delete failed', error);
    return res.status(500).json({ error: 'cloudinary_delete_failed', message: error.message });
  }
}
