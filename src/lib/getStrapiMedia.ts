const DEFAULT_IMAGE_URL = '/imagenes/comunes/img-predeterminada.avif';
const LEGACY_STRAPI_LOCAL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1):1337\/uploads\/[^"'\s)<>]+/gi;
const LEGACY_STRAPI_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const LEGACY_STRAPI_PORT = '1337';

const isLegacyStrapiLocalUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return LEGACY_STRAPI_LOCAL_HOSTS.has(parsed.hostname) && parsed.port === LEGACY_STRAPI_PORT;
  } catch {
    return false;
  }
};

/**
 * Returns a safe image URL. It replaces URLs from the old Strapi backend
 * (both absolute local development URLs and relative /uploads/ paths)
 * with a local default image. For all other URLs, it returns them as is.
 */
export function getStrapiMedia(url: string | null | undefined): string {
  // If the URL is null, undefined, or empty, return the default image.
  if (!url) {
    return DEFAULT_IMAGE_URL;
  }

  // If the URL points to the old Strapi backend (either full or relative path),
  // return the default image.
  if (isLegacyStrapiLocalUrl(url) || url.startsWith('/uploads/')) {
    return DEFAULT_IMAGE_URL;
  }

  // Otherwise, the URL is considered valid. Return it as is.
  return url;
}

export function sanitizeStrapiMediaHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  return html.replace(LEGACY_STRAPI_LOCAL_PATTERN, DEFAULT_IMAGE_URL);
}
