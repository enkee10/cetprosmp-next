import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const academic = await import('../functions/lib/modules/academico/handlers.js');
const context = { auth: { uid: 'competencias-verification', token: { level: 600, roleId: 600 } } };
let count = 0;
for (const module of ['academico', 'grupos', 'paquetes', 'matriculas', 'registro-auxiliar', 'reportes']) {
  const source = fs.readFileSync(new URL(`../functions/src/modules/${module}/handlers.ts`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/const (\w+QUERY) = `([\s\S]*?)`;/g)) {
    const [, name, template] = match;
    if (!template.includes('competenciaUnidadesDidacticas')) continue;
    const fieldsSource = source + fs.readFileSync(new URL('../functions/src/dataconnectOperations.ts', import.meta.url), 'utf8');
    const resolveFields = (text) => text.replace(/\$\{(\w+)\}/g, (_match, fieldName) => {
      const fieldMatch = fieldsSource.match(new RegExp('const ' + fieldName + ' = `([\\s\\S]*?)`;'));
      assert.ok(fieldMatch, `Falta plantilla ${fieldName}`);
      return resolveFields(fieldMatch[1]);
    });
    const query = resolveFields(template);
    if (!query.includes('competenciaUnidadesDidacticas')) continue;
    const variables = {};
    for (const [, variable, type] of query.matchAll(/\$(\w+)\s*:\s*([\[\]\w!]+)/g)) {
      variables[variable] = type.includes('[') ? [1] : type.includes('Int') ? 1 : '';
    }
    await dataConnect.executeGraphql(query, { variables });
    console.log(`Consulta verificada: ${module}/${name}`);
    count += 1;
  }
}
const before = (await dataConnect.executeGraphql(`query PreservedUnitLinks {
  competenciaUnidadesDidacticas(limit:50000) { id competenciaId unidadDidacticaId orden }
}`)).data;
const unit = (await academic.getUnidadDidactica.run({ id: 98 }, context)).unidadDidactica;
assert.ok(unit.competenciaIds.length > 1, 'Debe verificar una unidad compartida');
await academic.createOrUpdateUnidadDidactica.run(unit, context);
const after = (await dataConnect.executeGraphql(`query PreservedUnitLinks {
  competenciaUnidadesDidacticas(limit:50000) { id competenciaId unidadDidacticaId orden }
}`)).data;
assert.deepEqual(after.competenciaUnidadesDidacticas.sort((a,b)=>a.id-b.id), before.competenciaUnidadesDidacticas.sort((a,b)=>a.id-b.id));
console.log(`${count} consultas verificadas; guardado de unidad compartida conserva relaciones y orden.`);
