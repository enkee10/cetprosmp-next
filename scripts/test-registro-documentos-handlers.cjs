const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { https } = require('firebase-functions/v1');
const identity = require('../functions/lib/shared/identityDocument.js');
const dates = require('../functions/lib/shared/appDateTime.js');
const mappers = require('../functions/lib/modules/core/userMappers.js');
const file = 'functions/src/modules/registro-auxiliar/handlers.ts';
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
function callable(name, dependencies) {
  const declaration = source.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : []).find(node => node.name.getText(source) === name);
  assert.ok(declaration, name);
  const action = declaration.initializer.arguments[0].getText(source);
  const compiled = ts.transpileModule(`const action=${action};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(dependencies), compiled + '\nreturn action;')(...Object.values(dependencies));
}
const context = { auth: { uid: 'logged-in-user', token: { email: 'teacher@example.test' } } };
function creation({ existing = null, lookupError = null } = {}) {
  const state = { lookups: 0, newUsers: [], enrollments: [], modules: [], access: [], cleanup: [] };
  const dependencies = {
    ...identity, ...dates, ...mappers, https, console: { error() {} },
    ensureRegistroAuxiliarAccess: async (...args) => state.access.push(args),
    findRegistroAuxiliarUserByDni: async () => existing,
    findDataConnectUserIdByDocumentId: async uid => { assert.equal(uid, 'logged-in-user'); return 7; },
    lookupIdentityDocument: async () => { state.lookups++; if (lookupError) throw lookupError; return { nombre: 'API', apellidoPaterno: 'PRUEBA' }; },
    ensureRegistroAuxiliarStudentUser: async (dni, data) => { state.newUsers.push({ dni, data }); return 9; },
    mergeModuloEstudiantesForGrupoModulo: (_, list) => list,
    ensureNoMatriculaScheduleConflicts: async () => {},
    getNextCodigoInscripcionForCurrentYear: async () => '26001',
    deleteMatriculaTree: async id => state.cleanup.push(id),
    REGISTRO_AUXILIAR_CREATE_MATRICULA_CONTEXT_QUERY: 'context',
    FIND_MODULO_ESTUDIANTE_DUPLICATE_QUERY: 'duplicates',
    INSERT_MATRICULA_MUTATION: 'enroll', INSERT_MODULO_ESTUDIANTE_MUTATION: 'module',
    dataConnect: { executeGraphql: async (query, options) => {
      if (query === 'context') return { data: { grupoModulo: { id: 50, grupoId: 40, moduloId: 10, grupo: { id: 40, semestreId: 2 } } } };
      if (query === 'duplicates') return { data: { modulosEstudiantesByGrupoModulo: [], modulosEstudiantesLegacy: [] } };
      if (query === 'enroll') { state.enrollments.push(options.variables.data); return { data: { matricula_insert: { id: 20 } } }; }
      if (query === 'module') { state.modules.push(options.variables.data); return { data: { moduloEstudiante_insert: { id: 30 } } }; }
      if (query.includes('CreatedRegistroStudent')) return { data: { moduloEstudiante: { id: 30, matriculaId: 20 } } };
      throw new Error('Consulta inesperada');
    } },
  };
  return { state, create: callable('createRegistroAuxiliarMatricula', dependencies) };
}
(async () => {
  {
    const { create, state } = creation({ existing: { id: 9 } });
    await create({ grupoModuloId: 50, dni: '001234567', semestreId: 999, responsableUserId: 999, moduloId: 999 }, context);
    assert.equal(state.lookups, 0, 'Un usuario existente no consume APIs');
    assert.equal(state.newUsers.length, 0);
    assert.equal(state.enrollments[0].responsableUserId, 7, 'El responsable se toma de la sesión');
    assert.equal(state.enrollments[0].semestreId, 2, 'El periodo se toma del registro');
    assert.equal(state.modules[0].moduloId, 10, 'El módulo se toma del registro');
  }
  {
    const { create, state } = creation();
    await create({ grupoModuloId: 50, dni: '12345678' }, context);
    assert.deepEqual(state.newUsers[0].data, { nombre: 'API', apellidoPaterno: 'PRUEBA' }, 'No se inventan datos personales faltantes');
  }
  {
    const error = new https.HttpsError('failed-precondition', 'Manual', { manualEntryRequired: true });
    const { create, state } = creation({ lookupError: error });
    await assert.rejects(create({ grupoModuloId: 50, dni: '12345678' }, context), error);
    assert.equal(state.enrollments.length, 0);
    assert.equal(state.newUsers.length, 0);
  }
  {
    const { create, state } = creation();
    await assert.rejects(create({ grupoModuloId: 50, dni: '123456789' }, context), /comenzar con 0/);
    const manual = { nombre: 'MANUAL', apellidoPaterno: 'PRUEBA', apellidoMaterno: 'LOCAL', sexo: 'F', fechaNacimiento: '2010-01-01' };
    await assert.rejects(create({ grupoModuloId: 50, dni: '001234567' }, context), error => error.details?.manualEntryRequired === true);
    assert.equal(state.newUsers.length, 0);
    assert.equal(state.enrollments.length, 0);
    await create({ grupoModuloId: 50, dni: '001234567', manual }, context);
    assert.equal(state.newUsers[0].dni, '001234567');
    assert.equal(state.lookups, 0, 'El ingreso manual directo no llama a las APIs');
    assert.equal(state.enrollments.length, 1);
    const other = creation();
    await assert.rejects(other.create({ grupoModuloId: 50, dni: '12345678', manual: { ...manual, instruccion: 'Secundaria en curso..' } }, context), error => Boolean(error.details.fields.nombreColegio));
    assert.equal(other.state.newUsers.length, 0);
  }
  {
    let saved;
    const existing = { id: 9, dni: '12345678', tipoDocumento: 'DNI' };
    const update = callable('updateRegistroAuxiliarEstudianteDatos', {
      ...identity, ...dates, https, asCleanString: value => String(value ?? '').trim() || null,
      asNullableTimestamp: mappers.asNullableTimestamp,
      loadRegistroStudentProfile: async () => existing,
      findRegistroAuxiliarUserByDni: async () => ({ id: 22 }),
      buildStudentUsername: () => 'Estudiante', UPDATE_USER_MUTATION: 'update',
      dataConnect: { executeGraphql: async (_, options) => { saved = options.variables.data; return { data: { user_update: { id: 9 } } }; } },
      authAdmin: { updateUser: async () => { throw new Error('No debe cambiar auth sin documentId'); } },
    });
    await update({ user: {} }, context);
    assert.deepEqual(Object.keys(saved), ['fechaModificacion'], 'Editar no impone campos faltantes');
    await update({ user: { nombre: '', dni: '', fechaNacimiento: '', nombreColegio: '', sexo: '', rolId: '1' } }, context);
    assert.equal(saved.nombre, null);
    assert.equal(saved.dni, null);
    assert.equal(saved.rolId, undefined, 'El editor solo actualiza campos personales permitidos');
    await assert.rejects(update({ user: { dni: '87654321' } }, context), /otro usuario/);
  }
  console.log('Servidor: usuario existente, datos de API sin completar, fallo sin crear cuentas, matrícula manual, periodo/módulo/responsable del servidor y edición sin campos requeridos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
