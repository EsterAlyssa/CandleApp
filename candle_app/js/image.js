// ===================================================
// IMAGE.JS - Image reference helpers
// ===================================================

import { getCloudinaryBaseUrl, getCloudinaryUploadConfig } from './env.js';

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

  // Avoid doubling the Cloudinary folder when imageRef already includes it.
  const config = getCloudinaryUploadConfig();
  let resolvedRef = imageRef;
  if (config?.folder) {
    const folderPrefix = `${config.folder.replace(/\/+$/, '')}/`;
    if (resolvedRef.startsWith(folderPrefix)) {
      resolvedRef = resolvedRef.slice(folderPrefix.length);
    }
  }

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${resolvedRef}`;
}

export async function uploadImageToCloudinary(file, category, nameHint) {
  if (!file) throw new Error('Missing file to upload');

  const config = getCloudinaryUploadConfig();
  if (!config) {
    const base = getCloudinaryBaseUrl();
    console.error('[Cloudinary] invalid config. base:', base);
    throw new Error(`Cloudinary configuration missing/invalid (base="${base}"). Check NEXT_PUBLIC_CLOUDINARY_BASE_URL.`);
  }
  if (!config.uploadPreset) {
    console.error('[Cloudinary] missing unsigned preset. config:', config);
    throw new Error(`Cloudinary unsigned upload preset is not configured (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). current base="${getCloudinaryBaseUrl()}"`);
  }

  // Debug: log config values to help diagnose preset issues (no secret is logged).
  console.debug('[Cloudinary] upload config', {
    uploadUrl: config.uploadUrl,
    uploadPreset: config.uploadPreset,
    folder: config.folder
  });

  const imageRef = buildImageRef(category, nameHint || file.name);
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', config.uploadPreset);
  // Request a delete token so we can remove this image later without exposing API secrets.
  form.append('return_delete_token', 'true');
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

  // Cloudinary returns a `public_id`. When uploading with a `folder`, the
  // returned value is typically "<folder>/<public_id>". We store only the
  // part after the configured folder so that `baseUrl + imageRef` stays valid.
  let publicId = json.public_id || imageRef;
  const folderPrefix = config.folder ? `${config.folder.replace(/\/+$/, '')}/` : '';
  if (folderPrefix && publicId.startsWith(folderPrefix)) {
    publicId = publicId.slice(folderPrefix.length);
  }

  const resolvedImageRef = publicId || imageRef;
  if (resolvedImageRef !== imageRef) {
    console.warn('[Cloudinary] imageRef adjusted', { requested: imageRef, returned: publicId, stored: resolvedImageRef });
  }

  const deleteToken = json.delete_token || json.deleteToken || null;

  return {
    imageRef: resolvedImageRef,
    secureUrl: json.secure_url || buildImageUrl(resolvedImageRef),
    deleteToken
  };
}

export async function deleteImageFromCloudinary(deleteToken) {
  if (!deleteToken) {
    throw new Error('Missing Cloudinary delete token');
  }

  const config = getCloudinaryUploadConfig();
  if (!config || !config.cloudName) {
    throw new Error('Cloudinary configuration missing/invalid; unable to delete image');
  }

  const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/delete_by_token`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: deleteToken })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudinary delete failed: ${resp.status} ${resp.statusText} ${text}`);
  }

  return resp.json();
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
