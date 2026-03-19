// ===================================================
// IMAGE.JS - Image reference helpers
// ===================================================

import { getCloudinaryBaseUrl } from './env.js';

const sanitizeFileName = (value) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-\.]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export function buildImageUrl(imageRef) {
  if (!imageRef) return null;
  // If it already looks like a full URL, just return it.
  if (typeof imageRef === 'string' && /^(https?:)?\/\//.test(imageRef)) {
    return imageRef;
  }
  const base = getCloudinaryBaseUrl();
  if (!base) return null;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${imageRef}`;
}

export async function uploadImageToCloudinary(file, category, nameHint) {
  if (!file) throw new Error('Missing file to upload');

  const config = getCloudinaryUploadConfig();
  if (!config) throw new Error('Cloudinary configuration missing or invalid (check NEXT_PUBLIC_CLOUDINARY_BASE_URL).');
  if (!config.uploadPreset) throw new Error('Cloudinary unsigned upload preset is not configured (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).');

  const imageRef = buildImageRef(category, nameHint || file.name);
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', config.uploadPreset);
  if (config.folder) {
    form.append('folder', config.folder);
  }
  // Set public_id so Cloudinary saves it with predictable name (no version prefix)
  form.append('public_id', imageRef);

  const resp = await fetch(config.uploadUrl, {
    method: 'POST',
    body: form
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudinary upload failed: ${resp.status} ${resp.statusText} ${text}`);
  }
  const json = await resp.json();
  return {
    imageRef,
    secureUrl: json.secure_url || buildImageUrl(imageRef)
  };
}

export function buildImageRef(category, originalNameOrId) {
  const cat = (category || 'item').toString().trim().toLowerCase();
  const normalizedCategory = cat.replace(/\s+/g, '_');
  let dynamicPart = '';

  if (originalNameOrId) {
    const asString = originalNameOrId.toString();
    // Try to preserve extension if present
    const dotIndex = asString.lastIndexOf('.');
    const ext = dotIndex !== -1 ? asString.slice(dotIndex) : '';
    const base = dotIndex !== -1 ? asString.slice(0, dotIndex) : asString;
    dynamicPart = sanitizeFileName(base);
    if (ext && /^\.[a-z0-9]+$/i.test(ext)) {
      dynamicPart += ext.toLowerCase();
    }
  }

  if (!dynamicPart) {
    const random = crypto && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2, 10)}`;
    dynamicPart = random;
  }

  // Ensure the ref doesn't have spaces
  const ref = `${normalizedCategory}_${dynamicPart}`;
  return ref;
}

export function getImageRefFromRecord(record) {
  if (!record) return null;
  return record.image_ref || record.imageRef || record.image_url || null;
}

export function getImageUrlFromRecord(record) {
  if (!record) return null;
  const ref = record.image_ref || record.imageRef;
  if (ref) return buildImageUrl(ref);
  // Fallback to legacy image_url if still present in the record
  if (record.image_url) return record.image_url;
  return null;
}
