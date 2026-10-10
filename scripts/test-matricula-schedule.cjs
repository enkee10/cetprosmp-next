const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(path, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', code)(module, module.exports, name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return module.exports;
}
const model = loadSource('functions/src/modules/core/matriculaSchedule.ts');
const time = value => `1970-01-01T${value}:00.000Z`;
const period = { inicio: '2026-05-04', fin: '2026-06-30', titulo: '2026-1' };
function groupModule(id, days = '1,3,5', start = '08:00', end = '10:00', dates = {}) {
  return { id, grupoId: id, moduloId: id, nombre: `Modulo ${id}`, ...dates,
    grupo: { id, nombreDisplay: `Grupo ${id}`, semestre: { ...period },
      horario: { diasSemana: days }, turno: { horaInicio: time(start), horaFin: time(end) } } };
}
const schedule = value => model.buildMatriculaSchedule(value);
const overlap = (a, b) => model.findMatriculaScheduleOverlap(schedule(a), schedule(b));
const base = groupModule(1);
assert.ok(overlap(base, groupModule(2, '1', '09:59', '12:00')), 'One minute on one day blocks enrollment');
assert.ok(overlap(base, groupModule(2, '1', '08:30', '09:00')), 'Contained intervals conflict');
assert.ok(overlap(base, groupModule(2, '1', '07:00', '08:01')));
assert.equal(overlap(base, groupModule(2, '1', '10:00', '12:00')), null, 'Adjacent intervals are allowed');
assert.equal(overlap(base, groupModule(2, '1', '06:00', '08:00')), null);
assert.equal(overlap(base, groupModule(2, '2,4', '08:00', '10:00')), null, 'Different days are allowed');
const seconds = groupModule(2, '1', '09:59', '12:00');
seconds.grupo.turno.horaInicio = '1970-01-01T09:59:59.999Z';
assert.ok(overlap(base, seconds), 'No positive overlap is rounded away');
assert.equal(overlap(base, groupModule(2, '1', '08:00', '10:00', { inicio: '2026-07-01', fin: '2026-07-31' })), null);
assert.equal(overlap(groupModule(1, '1', '08:00', '10:00', { inicio: '2026-05-05', fin: '2026-05-06' }),
  groupModule(2, '1')), null, 'A common weekday must actually occur in the intersecting dates');
assert.ok(overlap(base, groupModule(2, '1', '08:00', '10:00', { inicio: '2026-05-04', fin: '2026-05-04' })), 'End dates are inclusive');
const otherSemester = groupModule(2);
otherSemester.grupo.semestre = { titulo: '2026-2', inicio: '2026-08-01', fin: '2026-12-31' };
assert.equal(overlap(base, otherSemester), null);
assert.ok(overlap(groupModule(1, '1', '23:00', '01:00'), groupModule(2, '2', '00:59', '02:00')), 'Overnight overlap across weekdays');
assert.equal(overlap(groupModule(1, '1', '23:00', '01:00'), groupModule(2, '2', '01:00', '02:00')), null);
assert.ok(overlap(groupModule(1, '0', '23:00', '01:00'), groupModule(2, '1', '00:59', '02:00')), 'Sunday-to-Monday overlap');
const fridays = [groupModule(1, '5'), groupModule(2, '5')];
fridays[0].grupo.horario = { diasSemana: '5', nombre: '@Vie', viernesAlternoInicio: 'primer' };
fridays[1].grupo.horario = { diasSemana: '5', nombre: '@Vie', viernesAlternoInicio: 'segundo' };
assert.equal(overlap(...fridays), null, 'Opposite alternating Fridays do not conflict');
assert.ok(overlap(fridays[0], groupModule(3, '5')));
fridays[1].grupo.horario.viernesAlternoInicio = 'primer';
assert.ok(overlap(...fridays));
const fridayOnly = groupModule(4, '5', '08:00', '10:00', { inicio: '2026-05-15', fin: '2026-05-15' });
assert.equal(overlap(fridays[0], fridayOnly), null, 'Alternation remains anchored when the module starts later');
assert.throws(() => schedule(groupModule(2, '', '08:00', '10:00')), /Configura/);
assert.throws(() => schedule(groupModule(2, '1', '08:00', '08:00')), /Configura/);
assert.throws(() => schedule(groupModule(2, '1', '08:00', '10:00', { inicio: '2026-02-30' })), /validas/);
assert.throws(() => schedule(groupModule(2, '1', '08:00', '10:00', { inicio: '2026-06-02', fin: '2026-06-01' })), /invertidas/);
const dateOnly = schedule(groupModule(1, '1', '08:00', '10:00', { inicio: '2026-05-04T00:00:00.000Z', fin: '2026-05-04T00:00:00.000Z' }));
assert.equal(dateOnly.startDay, Date.parse('2026-05-04T00:00:00Z') / 86400000);
const firstOverlap = overlap(base, groupModule(2, '1', '09:59', '12:00'));
assert.equal(firstOverlap.inicio, '2026-05-04T14:59:00.000Z', 'Wall-clock shift times are returned as Lima instants');

class HttpsError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}
let targets = [base];
let rows = [];
let offsets = [];
let extraCalendars = [];
const dataConnect = { executeGraphql: async (query, { variables }) => {
  if (query.includes('query MatriculaScheduleTargets')) return { data: { grupoModulos: targets, grupos: targets.map(item => item.grupo) } };
  if (query.includes('query MatriculaStudentSchedules')) {
    assert.equal(variables.userId, 7);
    offsets.push(variables.offset);
    return { data: { modulosEstudiantes: rows.slice(variables.offset, variables.offset + 1000) } };
  }
  if (query.includes('query MatriculaScheduleCalendars')) return { data: { calendarios: extraCalendars } };
  throw new Error('Unexpected query');
} };
const validator = loadSource('functions/src/modules/core/matriculaScheduleValidation.ts', {
  'firebase-functions/v1': { https: { HttpsError } },
  './dataConnectCore.js': { dataConnect }, './matriculaSchedule.js': model,
}).ensureNoMatriculaScheduleConflicts;
const row = (module, matriculaId = 20, archivado = false) => ({ id: matriculaId, moduloId: module.moduloId,
  matriculaId, matricula: { archivado }, grupoModulo: module, grupo: module.grupo });
const input = { userId: 7, selections: [{ grupoModuloId: 1, grupoId: 1, moduloId: 1 }] };
const rejectsConflict = task => assert.rejects(task, error => error.code === 'failed-precondition' && error.details?.motivo === 'cruce-horario');

function extract(path, names) {
  const source = fs.readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  return ast.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(ast))))
  ).map(node => node.getText(ast)).join('\n');
}

(async () => {
  await validator(input);
  rows = [row(groupModule(2, '1', '09:59', '12:00'))];
  await rejectsConflict(() => validator(input));
  await validator({ ...input, currentMatriculaId: 20 });
  rows[0].matricula.archivado = true;
  await validator(input);
  rows = [row(groupModule(2, '1', '10:00', '12:00'))];
  await validator(input);
  rows = Array.from({ length: 1000 }, (_, i) => row(base, i + 100, true));
  rows.push(row(groupModule(2, '1', '09:59', '12:00'), 2000));
  offsets = [];
  await rejectsConflict(() => validator(input));
  assert.deepEqual(offsets, [0, 1000], 'Checks enrollments beyond the first page');
  rows = [{ ...row(groupModule(2, '1', '09:59', '12:00')), grupoModulo: null }];
  await rejectsConflict(() => validator(input));
  rows = [];
  targets = [base, groupModule(2, '1', '09:59', '12:00')];
  await rejectsConflict(() => validator({ userId: 7, selections: targets.map(item => ({ grupoModuloId: item.id, moduloId: item.moduloId })) }));
  targets = [base];
  await validator({ userId: 7, selections: [{ grupoId: 1, moduloId: 1 }] });
  await assert.rejects(() => validator({ userId: 7, selections: [{ grupoModuloId: 999, moduloId: 1 }] }), /No se pudo verificar/);
  const calendarSource = groupModule(1);
  calendarSource.grupo.horario = null;
  calendarSource.grupo.calendarioId = 8;
  targets = [calendarSource];
  extraCalendars = [{ id: 8, ...period, horario: { diasSemana: '1' } }];
  await validator(input);

  // Execute the real entry handlers; a conflict must stop before any enrollment write.
  targets = [base];
  rows = [row(groupModule(2, '1', '09:59', '12:00'))];
  let mutations = 0;
  const mapping = { grupoId: 1, paqueteId: 1, moduloGrupos: input.selections };
  const moduleObject = { exports: {} };
  const context = {
    module: moduleObject, exports: moduleObject.exports, console,
    https: { HttpsError, onCall: fn => fn }, ensureNoMatriculaScheduleConflicts: validator,
    toNumber: (value, fallback) => Number(value) || fallback, toNumberOrNull: value => Number(value) || null,
    normalizeDocumentType: value => value, normalizeDocumentNumber: value => value, normalizeDni: value => value,
    normalizeMatriculaRecibo: value => value,
    requirePermission: async () => {}, requireFormularioMatriculaAccess: async () => {}, requireFormularioMatriculaOpen: async () => {},
    ensureRegistroAuxiliarAccess: async () => {},
    getMatriculaResponsableFromContext: async () => ({ responsable: null, responsableUser: { id: 100 } }),
    findStudentUserByDocument: async () => ({ id: 7 }), findRegistroAuxiliarUserByDni: async () => ({ id: 7 }),
    saveUserForMatricula: async () => ({ userId: 7 }), ensureNoMatriculaDuplicates: async () => {},
    getGrupoModuloMapping: async () => mapping,
    getMatriculaById: async () => ({ id: 50, user: { id: 7 }, modulosEstudiantes: [] }),
    resolveWorkspaceEmailForMatriculaUser: () => null, getMatriculaWorkspaceGroups: async () => [], isStudentMatriculaUser: () => true,
    hasGrupoModuloSelectionChanged: () => true,
    REGISTRO_AUXILIAR_CREATE_MATRICULA_CONTEXT_QUERY: 'registry-context', FIND_MODULO_ESTUDIANTE_DUPLICATE_QUERY: 'registry-duplicates',
    mergeModuloEstudiantesForGrupoModulo: () => [],
    dataConnect: { executeGraphql: async query => {
      if (query === 'registry-context') return { data: { grupoModulo: { id: 1, grupoId: 1, moduloId: 1, grupo: { id: 1, paqueteId: 1, semestreId: 1 } } } };
      if (query === 'registry-duplicates') return { data: { modulosEstudiantesByGrupoModulo: [], modulosEstudiantesLegacy: [] } };
      mutations += 1;
      throw new Error('Enrollment write reached despite a conflict');
    } },
  };
  const functions = extract('functions/src/modules/matriculas/handlers.ts', [
    'createMatriculaWithModuloEstudiantes', 'crearMatriculaFormularioData', 'crearMatriculaFormulario',
    'crearMatriculaFormularioSuelto', 'updateMatriculaFormulario', 'createMatriculaDesdePaquete',
  ]) + '\n' + extract('functions/src/modules/registro-auxiliar/handlers.ts', ['createRegistroAuxiliarMatricula']);
  vm.runInNewContext(ts.transpileModule(functions, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  const data = { id: 50, grupoModuloId: 1, userId: 7, tipoDocumento: 'DNI', dni: '12345678',
    semestreId: 1, paqueteId: 1, grupoId: 1, recibo: '123', moduloGrupos: input.selections };
  for (const name of ['crearMatriculaFormulario', 'crearMatriculaFormularioSuelto', 'updateMatriculaFormulario',
    'createRegistroAuxiliarMatricula', 'createMatriculaDesdePaquete']) {
    await rejectsConflict(() => moduleObject.exports[name](data, {}));
  }
  assert.equal(mutations, 0, 'All enrollment entry points reject before inserting/updating enrollment');

  let duplicateMatriculas = [{ id: 20 }];
  let receiptMatriculas = [{ id: 20, recibo: '123' }];
  const duplicateModule = { exports: {} };
  const duplicateContext = {
    module: duplicateModule, exports: duplicateModule.exports, https: { HttpsError },
    CHECK_DUPLICATE_MATRICULA_QUERY: 'duplicate', LIST_RECIBOS_MATRICULA_QUERY: 'numeric-receipts', CHECK_RECIBO_MATRICULA_QUERY: 'receipts',
    getMatriculaReciboNumericKey: value => /^\d+$/.test(String(value)) ? String(Number(value)) : null,
    isRepeatableMatriculaRecibo: value => value === 'BECADO',
    dataConnect: { executeGraphql: async (query, { variables }) => {
      if (query === 'duplicate') {
        assert.deepEqual(Object.keys(variables).sort(), ['paqueteId', 'semestreId', 'userId'], 'The second rule keeps its existing criteria');
        return { data: { matriculas: duplicateMatriculas } };
      }
      return { data: { matriculas: receiptMatriculas } };
    } },
  };
  vm.runInNewContext(ts.transpileModule(extract('functions/src/modules/matriculas/handlers.ts', ['ensureNoMatriculaDuplicates'])
    + '\nmodule.exports = ensureNoMatriculaDuplicates;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, duplicateContext);
  const duplicateGuard = duplicateModule.exports;
  await assert.rejects(() => duplicateGuard(7, 1, 1, '123'), /El estudiante ya se matriculo en este grupo/,
    'Student duplicate takes priority when both checks fail');
  duplicateMatriculas = [];
  await assert.rejects(() => duplicateGuard(7, 1, 1, '123'), /El recibo ya fue registrado en otra matricula/);
  receiptMatriculas = [];
  await duplicateGuard(7, 1, 1, '123');
  duplicateMatriculas = [{ id: 20 }];
  receiptMatriculas = [{ id: 20, recibo: '123' }];
  await duplicateGuard(7, 1, 1, '123', 20);
  await assert.rejects(() => duplicateGuard(7, 1, 1, 'BECADO'), /El estudiante ya se matriculo en este grupo/);
  console.log('Matriculas: cruces minimos, fechas, turnos nocturnos, viernes alternos, edicion, cinco endpoints y prioridad de matricula duplicada sobre recibo verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
