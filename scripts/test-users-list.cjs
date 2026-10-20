const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', code)(module, module.exports, (name) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  return module.exports;
}
const gridFilters = load('functions/src/modules/core/matriculaListPagination.ts');
const pagination = load('functions/src/modules/core/userListPagination.ts', { './matriculaListPagination.js': gridFilters });
const users = Array.from({ length: 3251 }, (_, index) => ({
  id: 3251 - index, documentId: `user-${3251 - index}`, username: index === 3200 ? 'Ángela Ríos' : `Usuario ${index}`,
  nombre: 'Nombre', apellidoPaterno: 'Apellido', apellidoMaterno: 'Segundo',
  email: `user${index}@example.test`, nacionalidad: index === 3200 ? null : 'PERUANA',
  bloqueado: index % 2 === 0, blocked: index % 2 === 0, rolId: index % 2 === 0 ? 3 : 10,
  telefono: '1234567', tipoDocumento: 'DNI', dni: '12345678',
  avatar: `/full/${index}`, recorteFotografia: `/crop/${index}`, dniImagenFrenteUrl: `/dni/${index}`,
}));
const calls = [], firestoreIds = [], permissions = [];
let denied = false;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const handlers = load('functions/src/modules/users/handlers.ts', {
  'firebase-functions/v1': { https: { onCall: (handler) => handler, HttpsError } },
  'firebase-admin/firestore': { getFirestore: () => ({ collection: () => ({
    where: (field, operator, ids) => {
      assert.equal(field, 'userId'); assert.equal(operator, 'in'); assert.ok(ids.length <= 30);
      firestoreIds.push(...ids);
      return { select: () => ({ get: async () => ({ docs: ids.map((id) => ({ data: () => ({
        userId: id, status: 'completed', updatedAt: '2026-10-20', avatarTamanos: { tiny: { url: `/tiny/${id}` } },
      }) })) }) }) };
    },
  }) }) },
  'firebase-admin/storage': {}, '../../dataconnectOperations.js': {}, '../core/matriculaDeletion.js': {},
  '../../workspace/studentWorkspaceSync.js': {}, '../core/authCore.js': {}, '../core/types.js': {},
  '../core/userMappers.js': { toNumber: (value, fallback) => Number(value) || fallback,
    asNullableString: (value) => typeof value === 'string' && value.trim() ? value.trim() : null },
  '../core/permissions.js': { requirePermission: async (_, entity, action) => {
    permissions.push([entity, action]); if (denied) throw new HttpsError('permission-denied', 'Denied');
  } },
  '../core/userListPagination.js': pagination,
  '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async (query, { variables }) => {
    calls.push({ query, variables });
    let result;
    if (query.includes('UsersPageIndex')) {
      result = users.slice(variables.offset, variables.offset + 1000);
      if (!query.includes('username')) result = result.map(({ id }) => ({ id }));
    } else if (variables.ids) result = users.filter((row) => variables.ids.includes(row.id));
    else result = users.filter((row) => row.documentId === variables.documentId);
    return { data: { users: result } };
  } } },
});

(async () => {
  const first = await handlers.listUsersPage({ pageSize: 30 }, {});
  assert.equal(first.rows.length, 30); assert.equal(first.rowCount, 3251);
  assert.deepEqual(first.rows.map((row) => row.id), users.slice(0, 30).map((row) => row.id));
  assert.equal(firestoreIds.length, 0, 'Rows must not wait for Firestore');
  assert.equal(calls.length, 5, 'Read a small index in batches, hydrate only the page');
  assert.equal(calls.at(-1).variables.ids.length, 30);
  for (const call of calls) assert.doesNotMatch(call.query, /avatar|dniImagen|recorteFotografia/);
  const page = await handlers.listUsersPage({ page: 2, pageSize: 30 }, {});
  assert.equal(page.rows[0].id, users[60].id);
  const found = await handlers.listUsersPage({ filterModel: { quickFilterValues: ['angela', 'rios'] }, quickFilterFields: ['username'] }, {});
  assert.equal(found.rowCount, 1); assert.equal(found.rows[0].username, 'Ángela Ríos');
  assert.equal(pagination.selectUserPage(users, { filterModel: { quickFilterValues: ['angela'] }, quickFilterFields: ['email'] }).rowCount, 0);
  const roleFilter = pagination.selectUserPage(users, { filterModel: { items: [{ field: 'rolId', operator: '>=', value: 10 }] } });
  assert.equal(roleFilter.rowCount, 1625);
  const sorted = pagination.selectUserPage(users, { sortModel: [{ field: 'rolId', sort: 'asc' }], pageSize: 100 });
  assert.ok(sorted.rows.every((row) => row.rolId === 3));
  const blocked = pagination.selectUserPage(users, { filterModel: { items: [{ field: 'bloqueado', operator: 'equals', value: 'true' }] } });
  assert.equal(blocked.rowCount, 1626);
  assert.equal(pagination.selectUserPage(users, { pageSize: 10000 }).rows.length, 100);
  assert.equal(pagination.selectUserPage(users, { page: 500 }).rows.length, 0);
  const ids = first.rows.map((row) => row.id);
  const photos = await handlers.getUsersPageAvatars({ userIds: ids }, {});
  assert.deepEqual(firestoreIds, ids);
  assert.equal(photos.avatars[ids[0]].avatarTiny, `/tiny/${ids[0]}`);
  const detail = await handlers.getUserDetails({ documentId: users[0].documentId }, {});
  assert.equal(detail.user.telefono, '1234567'); assert.equal(detail.user.dniImagenFrenteUrl, '/dni/0');
  assert.match(calls.at(-1).query, /dniImagenFrenteUrl/);
  await assert.rejects(handlers.getUserDetails({ documentId: 'missing' }, {}), { code: 'not-found' });
  await assert.rejects(handlers.getUsersPageAvatars({ userIds: Array(101).fill(1) }, {}), { code: 'invalid-argument' });
  denied = true;
  for (const method of ['listUsersPage', 'getUsersPageAvatars', 'getUserDetails']) {
    await assert.rejects(handlers[method]({}, {}), { code: 'permission-denied' });
  }
  assert.ok(permissions.every(([entity, action]) => entity === 'users' && action === 'view'));
  console.log('Passed: 3251 users, page-only hydration, global filters/sorting, scoped photos, full details and permission checks.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
