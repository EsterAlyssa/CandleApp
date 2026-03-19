// ===================================================
// ENV.JS - Runtime environment variables loader
// ===================================================

// This module provides a lightweight way to read a .env file at runtime (if served)
// and expose values via `getEnv()`.
//
// Usage:
//   import { getEnv } from './env.js';
//   const baseUrl = getEnv('NEXT_PUBLIC_CLOUDINARY_BASE_URL');

let _envCache = null;

function parseDotEnv(text) {
  const env = {};
  const lines = String(text).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export async function loadEnv() {
  if (_envCache) return _envCache;
  try {
    // Use a relative path so .env is fetched from the same folder as index.html.
    // This avoids issues when the app is served from a subpath (e.g. /candle_app/).
    const resp = await fetch('./.env');
    if (!resp.ok) throw new Error(`Failed to fetch .env (${resp.status} ${resp.statusText})`);
    const text = await resp.text();
    _envCache = parseDotEnv(text);
    console.debug('[ENV] Loaded .env', _envCache);
    return _envCache;
  } catch (e) {
    // Many static servers block dotfiles (like .env). Fallback to env.json if present.
    console.warn('[ENV] Unable to load .env, trying env.json', e);
  }

  try {
    const resp = await fetch('./env.json');
    if (!resp.ok) throw new Error(`Failed to fetch env.json (${resp.status} ${resp.statusText})`);
    _envCache = await resp.json();
    console.debug('[ENV] Loaded env.json', _envCache);
  } catch (e) {
    console.warn('[ENV] Unable to load env.json (fallback). Proceeding with defaults.', e);
    _envCache = {};
  }

  if (typeof window !== 'undefined') {
    window.ENV = _envCache;
  }
  return _envCache;
}

export function getEnv(key, fallback = '') {
  if (_envCache && key in _envCache) return _envCache[key];
  if (window && window.ENV && key in window.ENV) return window.ENV[key];
  return fallback;
}

export function getCloudinaryBaseUrl() {
  // Expect the URL to be provided via the .env file. This avoids hardcoding the
  // Cloudinary account URL in the codebase.
  const value = getEnv('NEXT_PUBLIC_CLOUDINARY_BASE_URL', '');
  return typeof value === 'string' ? value.trim() : '';
}

export function getCloudinaryUploadPreset() {
  // The upload preset must be configured as unsigned in the Cloudinary console.
  const value = getEnv('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET', '');
  return typeof value === 'string' ? value.trim() : '';
}

export function getCloudinaryUploadConfig() {
  const base = getCloudinaryBaseUrl();
  if (!base) return null;

  // Example base: https://res.cloudinary.com/<cloud_name>/image/upload/<folder>/
  const match = base.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.*)$/);
  if (!match) {
    console.warn('[ENV] Cloudinary base URL did not match expected pattern', { base });
    return null;
  }

  const cloudName = match[1];
  const folder = match[2].replace(/\/+$/, ''); // strip trailing slashes
  const preset = getCloudinaryUploadPreset();
  console.debug('[ENV] Cloudinary config parsed', { cloudName, folder, preset });

  return {
    cloudName,
    folder,
    uploadPreset: preset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  };
}
