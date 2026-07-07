import { Storage } from '@google-cloud/storage';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const [, , bucketName, exportDir] = process.argv;

if (!bucketName || !exportDir) {
  console.error('Usage: node .tmp/clone-storage-export.mjs <bucket> <exportDir>');
  process.exit(1);
}

const storage = new Storage({ projectId: 'cetprosmp-2026' });
const bucket = storage.bucket(bucketName);
const blobsDir = join(exportDir, 'blobs');
const metadataDir = join(exportDir, 'metadata');

await mkdir(blobsDir, { recursive: true });
await mkdir(metadataDir, { recursive: true });
await writeFile(
  join(exportDir, 'buckets.json'),
  JSON.stringify({ buckets: [{ id: bucketName }] }, null, 2),
);

const [files] = await bucket.getFiles({ autoPaginate: true });
let count = 0;

for (const file of files) {
  if (file.name.endsWith('/')) continue;

  const [remoteMetadata] = await file.getMetadata();
  const id = randomUUID();
  const blobPath = join(blobsDir, id);
  await new Promise((resolve, reject) => {
    file
      .createReadStream()
      .on('error', reject)
      .pipe(createWriteStream(blobPath))
      .on('error', reject)
      .on('finish', resolve);
  });

  const customMetadata = remoteMetadata.metadata || {};
  const rawTokens = customMetadata.firebaseStorageDownloadTokens || customMetadata.downloadTokens || '';
  const downloadTokens = String(rawTokens)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  const emulatorMetadata = {
    name: file.name,
    bucket: bucketName,
    metageneration: Number(remoteMetadata.metageneration || 1),
    generation: Number(remoteMetadata.generation || Date.now()),
    contentType: remoteMetadata.contentType || 'application/octet-stream',
    storageClass: remoteMetadata.storageClass || 'STANDARD',
    contentDisposition: remoteMetadata.contentDisposition || 'inline',
    downloadTokens,
    etag: remoteMetadata.etag || basename(id),
    customMetadata: Object.fromEntries(
      Object.entries(customMetadata).filter(([key]) => key !== 'firebaseStorageDownloadTokens' && key !== 'downloadTokens'),
    ),
    timeCreated: remoteMetadata.timeCreated,
    updated: remoteMetadata.updated,
    size: Number(remoteMetadata.size || 0),
    md5Hash: remoteMetadata.md5Hash,
    crc32c: remoteMetadata.crc32c,
  };

  await writeFile(join(metadataDir, `${id}.json`), JSON.stringify(emulatorMetadata, null, 2));
  count += 1;
  if (count % 25 === 0) console.log(`storage_objects=${count}`);
}

console.log(`storage_objects=${count}`);
