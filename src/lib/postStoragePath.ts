type PostStorageFolderInput = {
  slug?: string | null;
};

const sanitizePathPart = (value: string, fallback: string) => {
  const safeValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return safeValue || fallback;
};

export const sanitizeStorageFileName = (fileName: string) => sanitizePathPart(fileName, 'archivo');

export const buildPostStorageFolder = ({ slug }: PostStorageFolderInput) => {
  const postSlug = sanitizePathPart(String(slug || ''), '');
  if (!postSlug) {
    throw new Error('Completa el slug antes de subir archivos.');
  }

  return `post/${postSlug}`;
};

export const buildPostStorageFilePath = (post: PostStorageFolderInput, fileName: string) => {
  const safeName = sanitizeStorageFileName(fileName);
  return `${buildPostStorageFolder(post)}/${safeName}`;
};
