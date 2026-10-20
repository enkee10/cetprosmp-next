const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function extract(file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  return ast.statements.filter(node => ts.isFunctionDeclaration(node) ? names.includes(node.name?.text)
    : ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(ast))))
    .map(node => node.getText(ast).replace(/^export /, '')).join('\n');
}
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }

async function testDuplicateEnrollment(workspaceExists) {
  const dni = '00123456';
  const email = `${dni}@example.test`;
  let insertedAccount = null;
  let accountPassword = workspaceExists ? 'previously-changed-password' : null;
  let enrollmentInserts = 0;
  let userUpdates = 0;
  const events = [];
  const patches = [];
  const directory = { users: {
    patch: async ({ requestBody }) => {
      events.push('workspace-patch'); patches.push(requestBody);
      if (!accountPassword) throw Object.assign(new Error('notFound'), { code: 404 });
      if (requestBody.password) accountPassword = requestBody.password;
      return { data: { id: 'workspace-user', primaryEmail: email } };
    },
    insert: async ({ requestBody }) => {
      events.push('workspace-insert'); insertedAccount = requestBody;
      accountPassword = requestBody.password;
      return { data: { id: 'workspace-user', primaryEmail: email } };
    },
  } };
  const syncStudentToWorkspace = vm.runInNewContext(compile(extract(
    'functions/src/workspace/studentWorkspaceSync.ts', ['syncStudentToWorkspace'],
  )) + '\nsyncStudentToWorkspace', {
    WORKSPACE_SYNC_ENABLED: true,
    getWorkspaceDirectoryClient: () => ({ directory }),
    resolvePersonalSchemaMapping: async () => null,
    buildWorkspacePayload: student => ({ primaryEmail: student.email, ...(student.password ? { password: student.password } : {}) }),
    generateWorkspacePassword: () => { throw new Error('A matrícula must never fall back to a random password'); },
    getWorkspaceErrorMeta: error => ({ status: error.code, reason: error.message.toLowerCase() }),
    syncWorkspaceAvatar: async () => {}, syncWorkspaceRoleGroupsInternal: async () => {},
  });
  const existing = { id: 7, documentId: 'existing-firebase-auth', correoInstitucional: email };
  const context = vm.createContext({
    console, https: { HttpsError },
    getUploadedImage: () => ({ url: null }),
    ensureStudentAuthForMatricula: async () => ({
      authUser: { uid: existing.documentId }, authPassword: null, institutionalEmail: email,
      roleId: 3, roleTitle: 'Estudiante', username: 'Estudiante de prueba', authAlreadyExisted: true,
    }),
    asCleanString: value => String(value ?? '').trim() || null,
    buildUserDataFromInput: data => ({ ...data }), buildMatriculaNickName: () => 'Prueba',
    UPDATE_USER_MUTATION: 'update-user',
    dataConnect: { executeGraphql: async () => { userUpdates += 1; return { data: { user_update: { id: 7 } } }; } },
    getIdFromKeyOutput: key => key?.id,
    upsertDataConnectUserByDocumentId: async () => { throw new Error('The existing student must be reused'); },
    shouldSyncStudentWorkspace: () => true, resolveWorkspacePrimaryEmail: () => email,
    retryTransientWorkspace: operation => operation(), syncStudentToWorkspace,
    isTransientWorkspaceError: () => false,
    getMatriculaResponsableFromContext: async () => ({ responsable: { id: 1 }, responsableUser: { id: 2 } }),
    findStudentUserByDocument: async () => existing,
    toNumber: (value, fallback) => Number(value) || fallback,
    normalizeMatriculaRecibo: value => String(value),
    ensureNoMatriculaDuplicates: async () => {
      events.push('duplicate-check');
      assert.ok(accountPassword, 'Workspace must be synchronized before rejecting the duplicate');
      throw new HttpsError('already-exists', 'El estudiante ya se matriculo en este grupo.');
    },
    getGrupoModuloMapping: async () => ({ grupoId: 10, moduloGrupos: [] }),
    createMatriculaWithModuloEstudiantes: async () => { enrollmentInserts += 1; return { id: 999 }; },
  });
  const source = extract('functions/src/modules/matriculas/handlers.ts', [
    'normalizeText', 'normalizeDocumentType', 'normalizeDocumentNumber', 'saveUserForMatricula', 'crearMatriculaFormularioData',
  ]);
  vm.runInContext(compile(source), context);
  const create = vm.runInContext('crearMatriculaFormularioData', context);
  await assert.rejects(() => create({ tipoDocumento: 'DNI', dni, semestreId: 4, grupoId: 10, recibo: '123' },
    { auth: { uid: 'staff', token: { email: 'staff@example.test' } } }), error => error.code === 'already-exists');
  assert.equal(userUpdates, 1);
  assert.equal(enrollmentInserts, 0, 'A duplicate must never insert another matrícula');
  assert.ok(patches.every(patch => !Object.hasOwn(patch, 'password')), 'Updating an existing Workspace account preserves its password');
  if (workspaceExists) {
    assert.equal(insertedAccount, null);
    assert.equal(accountPassword, 'previously-changed-password', 'Previously corrected accounts are not reset');
  } else {
    assert.equal(insertedAccount.password, dni, 'Initial Workspace password is the DNI, preserving leading zeroes');
    assert.ok(events.indexOf('workspace-insert') < events.indexOf('duplicate-check'));
  }
}

(async () => {
  await testDuplicateEnrollment(false);
  await testDuplicateEnrollment(true);
  console.log('Passed: Registro Auxiliar → duplicate form creates missing Workspace account with DNI; existing passwords and enrollment are preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
