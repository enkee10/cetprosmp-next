const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual handler declarations with in-memory SQL, Firestore and image
// services. No credentials, real documents or AI requests are used.
const source = fs.readFileSync('functions/src/modules/matriculas/handlers.ts', 'utf8');
const ast = ts.createSourceFile('handlers.ts', source, ts.ScriptTarget.Latest, true);
const names = new Set([
  'enqueueMatriculaAvatarExtractionJob', 'processMatriculaAvatarExtractionJob',
  'getLatestUserAvatarThumbnails', 'hydrateMatriculaListAvatarTiny', 'timestampToMillis',
  'chunkArray', 'getEditorAvatarStoragePaths', 'regenerateEditorDocumentoAvatar', 'deleteEditorDocumentoAvatar',
]);
const declarations = ast.statements.filter(node =>
  (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) ||
  (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(ast)))),
).map(node => node.getText(ast)).join('\n');
assert.equal(ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).length, 7);

const user = { id: 17, dni: '12345678', tipoDocumento: 'DNI', fechaNacimiento: '2000-01-01',
  avatar: 'https://test/avatar-old.jpg', recorteFotografia: 'https://test/photo-old.jpg',
  dniImagenFrenteProcesadaUrl: 'https://test/dni-current.jpg' };
const jobs = new Map();
const deleted = [];
const sqlUpdates = [];
const downloads = [];
const permissions = [];
let sequence = 0;
let cancelled = false;
const doc = id => ({
  id, ref: { id }, data: () => jobs.get(id),
  update: async update => Object.assign(jobs.get(id), update),
  get: async () => ({ data: () => ({ ...jobs.get(id), ...(cancelled ? { avatarDeletedAt: 'now' } : {}) }) }),
});
const firestore = {
  collection: () => ({
    add: async data => { const id = `job-${++sequence}`; jobs.set(id, data); return { id }; },
    doc,
    where: (field, operator, value) => ({ get: async () => ({
      docs: [...jobs.keys()].filter(id => operator === 'in' ? value.includes(jobs.get(id)[field]) : jobs.get(id)[field] === value).map(doc),
    }) }),
  }),
  batch: () => {
    const operations = [];
    return { update: (ref, update) => operations.push([ref.id, update]),
      commit: async () => operations.forEach(([id, update]) => Object.assign(jobs.get(id), update)) };
  },
};
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const moduleObject = { exports: {} };
const context = {
  module: moduleObject, exports: moduleObject.exports, console: { info() {}, warn: console.warn, error: console.error },
  https: { HttpsError }, runWith: () => ({ https: { onCall: callback => callback } }),
  requirePermission: async (_context, entity, action) => permissions.push([entity, action]),
  getEditorDocumentoTargetFromInput: async () => ({ user, userId: user.id }),
  getFirestore: () => firestore,
  getStorage: () => ({ bucket: () => ({ file: path => ({ delete: async () => deleted.push(path) }) }) }),
  dataConnect: { executeGraphql: async (_query, { variables }) => { sqlUpdates.push(variables); Object.assign(user, variables.data); return {}; } },
  UPDATE_USER_MUTATION: 'update-user', MATRICULA_AVATAR_EXTRACTION_COLLECTION: 'jobs',
  avatarThumbnailCache: new Map(), AVATAR_THUMBNAIL_CACHE_TTL_MS: 300000,
  asCleanString: value => typeof value === 'string' && value.trim() ? value.trim() : null,
  normalizeDocumentNumber: value => String(value ?? '').replace(/[^A-Z0-9]/g, ''),
  normalizeDocumentType: value => value,
  documentFilePrefix: value => value === 'CE' ? 'ce' : 'dni',
  toNumberOrNull: value => Number(value) || null, toNumber: (value, fallback) => Number(value) || fallback,
  normalizeDate: value => value,
  parseStoragePathFromUrl: value => value === user.dniImagenFrenteProcesadaUrl ? 'matriculas/documentos-procesados/current.jpg' : null,
  detectDocumentContentType: () => 'image/jpeg', toJsonValue: value => value,
  downloadProcessedImage: async value => { downloads.push(value); return { buffer: 'current-dni', bucketName: 'test-bucket' }; },
  detectAvatarCropBox: async () => ({ x: 10, y: 20, width: 50, height: 80 }),
  getAvatarGenerationSettings: async () => ({ enabled: true, model: 'test' }),
  calculateCurrentAge: () => 26, buildAvatarReferenceImage: async () => 'reference',
  buildOriginalPhotoCropImage: async () => 'new-photo', generateCarnetAvatarImage: async () => ({ buffer: 'new-avatar' }),
  buildDirectCropAvatarImage: async () => 'direct-avatar',
  uploadAvatarImages: async () => Object.fromEntries(['grande', 'mediano', 'pequeno', 'tiny'].map(size => [size,
    { url: `https://test/new-${size}.jpg`, path: `usuarios/avatars/12345678/avatar-generado-dni-12345678-${size}.jpg`, bucket: 'test-bucket' }])),
  uploadRecorteFotografiaImage: async () => ({ url: 'https://test/new-photo.jpg', path: 'usuarios/avatars/12345678/fotorecortada-dni-12345678.jpg' }),
};
const executable = ts.transpileModule(declarations + '\nmodule.exports.test = { processMatriculaAvatarExtractionJob, hydrateMatriculaListAvatarTiny, getEditorAvatarStoragePaths };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(executable, context);
const handlers = moduleObject.exports;

(async () => {
  const skipped = await handlers.regenerateEditorDocumentoAvatar({ matriculaId: 1 }, {});
  assert.equal(skipped.skipped, true, 'Other screens keep their existing-avatar behavior');
  assert.equal(jobs.size, 0);
  const queued = await handlers.regenerateEditorDocumentoAvatar({ matriculaId: 1, forceRegenerate: true }, {});
  assert.ok(queued.jobId);
  assert.equal(jobs.get(queued.jobId).forceRegenerate, true);
  assert.equal(jobs.get(queued.jobId).frenteProcesado.url, 'https://test/dni-current.jpg');
  assert.equal(jobs.get(queued.jobId).existingRecorteFotografiaUrl, 'https://test/photo-old.jpg');
  await handlers.test.processMatriculaAvatarExtractionJob(queued.jobId, jobs.get(queued.jobId));
  assert.equal(downloads[0].url, 'https://test/dni-current.jpg');
  assert.equal(user.avatar, 'https://test/new-grande.jpg');
  assert.equal(user.recorteFotografia, 'https://test/new-photo.jpg');
  const rows = await handlers.test.hydrateMatriculaListAvatarTiny([{ id: 1, user: { ...user } }], true);
  assert.equal(rows[0].user.avatarPequeno, 'https://test/new-pequeno.jpg');
  const cachedRows = await handlers.test.hydrateMatriculaListAvatarTiny([{ id: 1, user: { ...user } }]);
  assert.equal(cachedRows[0].user.avatarPequeno, undefined, 'Other lists keep their existing thumbnail contract');

  // A stale completed job and cache must not override the current avatar.
  jobs.set('obsolete', { userId: 17, status: 'completed', updatedAt: '2099-01-01', avatar: { url: 'https://test/obsolete.jpg' },
    avatarTamanos: { pequeno: { url: 'https://test/obsolete-small.jpg' } } });
  const freshRows = await handlers.test.hydrateMatriculaListAvatarTiny([{ id: 1, user: { ...user } }], true);
  assert.equal(freshRows[0].user.avatarPequeno, 'https://test/new-pequeno.jpg');
  jobs.set('another-user', { userId: 99, status: 'completed', avatar: { url: 'https://test/another.jpg', path: 'usuarios/avatars/99999999/avatar-generado-dni-99999999.jpg' } });
  const deletedResult = await handlers.deleteEditorDocumentoAvatar({ matriculaId: 1 }, {});
  assert.equal(deletedResult.ok, true);
  assert.equal(user.avatar, null);
  assert.equal(user.recorteFotografia, 'https://test/new-photo.jpg');
  assert.deepEqual(Object.keys(sqlUpdates.at(-1).data), ['avatar']);
  assert.ok(deleted.length >= 16);
  assert.ok(deleted.every(path => path.includes('/avatar-') && !path.includes('fotorecortada') && !path.includes('documentos')));
  assert.ok([...jobs.values()].filter(job => job.userId === 17).every(job => job.avatar === null && job.avatarTamanos === null));
  assert.equal(jobs.get('another-user').avatar.url, 'https://test/another.jpg');
  assert.ok(deleted.every(path => !path.includes('99999999')));
  const emptyRows = await handlers.test.hydrateMatriculaListAvatarTiny([{ id: 1, user: { ...user } }], true);
  assert.equal(emptyRows[0].user.avatarPequeno, undefined);
  const unsafePaths = handlers.test.getEditorAvatarStoragePaths(user, [{ avatar: { path: 'usuarios/avatars/../avatar-wrong.jpg' },
    avatarTamanos: { crop: { path: 'usuarios/avatars/12345678/fotorecortada-dni-12345678.jpg' } } }]);
  assert.ok(!unsafePaths.some(path => path.includes('..') || path.includes('fotorecortada')));

  // Deleting while a queued generation finishes must suppress its avatar only.
  const pending = await handlers.regenerateEditorDocumentoAvatar({ matriculaId: 1, forceRegenerate: true }, {});
  cancelled = true;
  await handlers.test.processMatriculaAvatarExtractionJob(pending.jobId, jobs.get(pending.jobId));
  assert.equal(user.avatar, null);
  assert.equal(user.recorteFotografia, 'https://test/new-photo.jpg');
  assert.ok(permissions.every(([entity, action]) => entity === 'editor-documentos' && action === 'edit'));
  console.log('Editor: regeneración forzada del recorte/avatar desde el DNI actual, otras pantallas conservadas, miniaturas actuales, eliminación exclusiva del avatar y cancelación de trabajos pendientes verificadas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
