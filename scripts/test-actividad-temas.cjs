const assert = require('node:assert/strict');
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const { getActividad, listActividades, createOrUpdateActividad } = require('../functions/lib/modules/academico/handlers.js');
const { buildActividadDataFromInput } = require('../functions/lib/modules/core/userMappers.js');
const context = { auth: { uid: 'local-actividad-temas-test', token: { level: 600 } } };
const topics = 'Primer tema\nSegundo tema\n  Detalle del segundo tema';
assert.equal(buildActividadDataFromInput({ temas: topics }).temas, topics);
assert.equal(Object.hasOwn(buildActividadDataFromInput({ nombre: 'Otro nombre' }), 'temas'), false, 'Omitting topics must not clear imported content');
const graph = async (source, variables) => (await dataConnect.executeGraphql(source, { variables })).data;
let unitId;
(async () => {
  try {
    const fixture = await graph(`mutation ActivityTopicsFixture @transaction {
      unit:unidadDidactica_insert(data:{nombre:"__local_activity_topics_test__"})
      capacity:capacidadTerminal_insert(data:{descripcion:"__local_activity_topics_test__",unidadDidacticaId_expr:"response.unit.id"})
      indicator:indicadorCapacidad_insert(data:{descripcion:"__local_activity_topics_test__",capacidadTerminalId_expr:"response.capacity.id"})
      learning:aprendizaje_insert(data:{indicadorCapacidadId_expr:"response.indicator.id"})
    }`);
    unitId = fixture.unit.id;
    const saved = await createOrUpdateActividad.run({ nombre: '__local_activity_topics_test__', aprendizajeId: fixture.learning.id, temas: topics, materiales: [] }, context);
    assert.equal((await getActividad.run({ id: saved.id }, context)).actividad.temas, topics);
    assert.equal((await listActividades.run({}, context)).actividades.find(item => item.id === saved.id).temas, topics);
    await createOrUpdateActividad.run({ id: saved.id, nombre: '__local_activity_topics_renamed__', aprendizajeId: fixture.learning.id, materiales: [] }, context);
    assert.equal((await getActividad.run({ id: saved.id }, context)).actividad.temas, topics, 'Editing resources without topics must preserve them');
    const edited = topics + '\nTercer tema';
    await createOrUpdateActividad.run({ id: saved.id, nombre: '__local_activity_topics_renamed__', aprendizajeId: fixture.learning.id, temas: edited }, context);
    assert.equal((await getActividad.run({ id: saved.id }, context)).actividad.temas, edited);
    console.log('Correcto: Temas se crea, consulta y edita con saltos de línea; editar otros campos o recursos conserva los temas importados.');
  } finally {
    if (unitId) await graph('mutation RemoveActivityTopicsFixture($id:Int!) { unidadDidactica_delete(id:$id) }', { id: unitId });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
