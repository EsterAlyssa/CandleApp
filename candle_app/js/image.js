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
    throw new Error(`Cloudinary configuration missing/invalid (base="${base}"). Check NEXT_PUBLIC_CLOUDINARY_BASE_URL in .env or env.json`);
  }
  if (!config.uploadPreset) {
    console.error('[Cloudinary] missing unsigned preset. config:', config);
    throw new Error(`Cloudinary unsigned upload preset is not configured (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). Check .env or env.json file. current base="${getCloudinaryBaseUrl()}"`);
  }

  // Debug: log config values to help diagnose preset issues (no secret is logged).
  console.debug('[Cloudinary] upload config', {
    uploadUrl: config.uploadUrl,
    uploadPreset: config.uploadPreset,
    folder: config.folder,
    cloudName: config.cloudName
  });

  const baseImageRef = buildImageRef(category, nameHint || file.name);
  const uniqueImageRef = `${baseImageRef}_${Date.now()}`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', config.uploadPreset);
  if (config.folder) {
    form.append('folder', config.folder);
  }

  // NOTE: unsigned upload does not allow return_delete_token.
  // Cloudinary provides delete_token only for signed uploads; with unsigned we must rely on public_id tracking.
  // Use a stable public_id based on category and name, with timestamp suffix to avoid collisions.
  form.append('public_id', uniqueImageRef);

  console.log('[Cloudinary] Uploading...', { imageRef: uniqueImageRef, fileName: file.name, fileSize: file.size });

  try {
    const resp = await fetch(config.uploadUrl, {
      method: 'POST',
      body: form
    });
    
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[Cloudinary] Upload failed response:', { status: resp.status, statusText: resp.statusText, body: text });
      
      // Parse error for better diagnostics
      let errorMsg = `Cloudinary upload failed: ${resp.status} ${resp.statusText}`;
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.error && errorJson.error.message) {
          errorMsg += ` - ${errorJson.error.message}`;
        }
      } catch (e) {
        errorMsg += ` - ${text.slice(0, 200)}`;
      }
      
      throw new Error(errorMsg);
    }
    
    const json = await resp.json();
    console.log('[Cloudinary] Upload successful:', { public_id: json.public_id, secure_url: json.secure_url });

    // Cloudinary returns the final public_id (with folder prefix, if set).
    const returnedPublicId = json.public_id || json.publicId || uniqueImageRef;

    // For frontend URL, we keep the part after the configured folder (same behavior as before).
    let urlPublicId = returnedPublicId;
    const folderPrefix = config.folder ? `${config.folder.replace(/\/+$/, '')}/` : '';
    if (folderPrefix && urlPublicId.startsWith(folderPrefix)) {
      urlPublicId = urlPublicId.slice(folderPrefix.length);
    }

    const resolvedImageRef = urlPublicId || uniqueImageRef;

    if (resolvedImageRef !== uniqueImageRef) {
      console.warn('[Cloudinary] imageRef adjusted', { requested: uniqueImageRef, returned: returnedPublicId, stored: resolvedImageRef });
    }

    const cloudinaryPublicId = returnedPublicId;
    const deleteToken = json.delete_token || null;
    const version = json.version || null;

    return {
      imageRef: resolvedImageRef,
      secureUrl: json.secure_url || buildImageUrl(resolvedImageRef),
      cloudinaryPublicId,
      deleteToken,
      version
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    throw error;
  }
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

  return resp.json();
}

export async function deleteImageByPublicId(publicId) {
  if (!publicId) {
    throw new Error('Missing Cloudinary public_id');
  }

  // This endpoint must be implemented as a secure server-side function (Vercel, Supabase Edge, etc.)
  const resp = await fetch('/api/cloudinary-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_id: publicId })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudinary public_id delete failed: ${resp.status} ${resp.statusText} ${text}`);
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
  if (ref) {
    const url = buildImageUrl(ref);
    const version = record?.tech_data?.cloudinary_version;
    if (url && version) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${version}`;
    }
    return url;
  }
  // Fallback to legacy image_url if still present in the record
  if (record.image_url) return record.image_url;
  return null;
}
