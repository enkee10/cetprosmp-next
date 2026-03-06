const DEFAULT_IMAGE_URL = '/imagenes/comunes/img-predeterminada.avif';

/**
 * Returns a safe image URL. It replaces URLs from the old Strapi backend
 * (both absolute http://localhost:1337 and relative /uploads/ paths)
 * with a local default image. For all other URLs, it returns them as is.
 */
export function getStrapiMedia(url: string | null | undefined): string {
  // If the URL is null, undefined, or empty, return the default image.
  if (!url) {
    return DEFAULT_IMAGE_URL;
  }

  // If the URL points to the old Strapi backend (either full or relative path),
  // return the default image.
  if (url.includes('localhost:1337') || url.startsWith('/uploads/')) {
    return DEFAULT_IMAGE_URL;
  }

  // Otherwise, the URL is considered valid. Return it as is.
  return url;
}
