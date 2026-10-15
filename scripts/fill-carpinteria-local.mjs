import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
const source = JSON.parse(fs.readFileSync(path.join(root, 'docs/codex/mantenimiento-carpinteria-fuentes.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const production = process.argv.includes('--production');
const projectId = 'cetprosmp-2026';
const moduleId = 31;
if (production) {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
} else {
  process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
  process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
}
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1' }, initializeApp({ projectId }));
const graph = async (query, variables = {}) => (await dc.executeGraphql(query, { variables })).data;
const norm = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
const materialKey = norm;
const unique = items => [...new Map(items.filter(Boolean).map(item => [norm(item), item])).values()];
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/^[,;.\/]+|[,;.\/]+$/g, '').trim();
const split = value => String(value ?? '').split(/\s+\/\s+/).map(clean).filter(Boolean);
const materialItems = value => unique(split(String(value ?? '')
  .replace(/Hojas de\s*\/\s*(Información|Operación|operación)/gi, 'Hojas de $1')
  .replace(/Ficha\s*\/\s*técnica/gi, 'Ficha técnica')
  .replace(/\s+,\s*$/, '')));
const syllabusContents = value => split(value)
  .map(item => clean(item.replace(/^\d+\s*[-.]\s*/, '')))
  .filter(item => item && !/^Sesi[oó]n\s+\d+$/i.test(item))
  .map(item => `Sílabo 2026: ${item}`);
const topicMap = [
  [0, 1, 2, 2, 3, 5, 6, 7],
  [0, 1, 3, 2, 4, 5],
  [0, 1, 2, 3, 4, 5],
  [0, 1, 4, 2, 3, 5],
  [0, 1, 2, 3]
];
// Dos criterios evaluables por unidad. El indicador textual del sílabo se
// conserva como descripción de la sesión y no crea columnas nuevas de notas.
const criterionMap = [
  [0, 0, 1, 1, 0, 0, 1, 1],
  [0, 0, 0, 1, 1, 1],
  [0, 0, 0, 1, 1, 1],
  [0, 0, 1, 1, 1, 1],
  [0, 0, 1, 1],
  [0, 0, 0, 1, 1],
];
function indicatorAt(unit, index) {
  for (let i = index; i >= 0; i--) if (unit.actividadesSilabo[i]?.indicador) return clean(unit.actividadesSilabo[i].indicador);
  return clean(unit.criteriosEvaluacion.split(' / ')[0]);
}
function buildSessions() {
  const rows = [];
  for (const unit of source.unidades.slice(0, 5)) {
    const map = topicMap[unit.numero - 1];
    assert.equal(unit.actividadesProgramacion.length, map.length);
    for (let i = 0; i < map.length; i++) {
      const academic = unit.actividadesProgramacion[i];
      const syllabus = unit.actividadesSilabo[map[i]];
      const syllabusSources = unit.numero === 1 && i === 5
        ? [unit.actividadesSilabo[4], syllabus]
        : [syllabus];
      rows.push({
        unit: unit.numero,
        unitSession: i + 1,
        order: rows.length + 1,
        name: clean(academic.nombre),
        learning: clean(academic.aprendizaje),
        indicator: indicatorAt(unit, map[i]),
        contents: unique([
          ...split(academic.contenidos).map(text => `Conocimiento: ${text}`),
          ...split(academic.procedimientos).map(text => `Procedimiento: ${text}`),
          ...syllabusSources.flatMap(item => syllabusContents(item.actividadYContenidos))
        ]),
        materials: materialItems(syllabus.recursosMateriales),
        hours: academic.horas,
        key: `carpinteria:2026-2:31:u${unit.numero}:s${i + 1}`,
        references: [academic.referencia, ...syllabusSources.map(item => item.referencia)]
      });
    }
  }
  const unit = source.unidades[5];
  for (let i = 0; i < 5; i++) {
    const academic = unit.actividadesProgramacion.slice(i * 2, i * 2 + 2);
    const syllabus = unit.actividadesSilabo.slice(i * 2, i * 2 + 2);
    rows.push({
      unit: 6,
      unitSession: i + 1,
      order: rows.length + 1,
      name: academic.map(item => clean(item.nombre)).join(' / '),
      learning: academic.map(item => clean(item.aprendizaje)).join(' / '),
      indicator: indicatorAt(unit, i * 2),
      contents: unique(academic.flatMap(item => [
        ...split(item.contenidos).map(text => `Conocimiento: ${text}`),
        ...split(item.procedimientos).map(text => `Procedimiento: ${text}`)
      ]).concat(syllabus.flatMap(item => syllabusContents(item.actividadYContenidos)))),
      materials: unique(syllabus.flatMap(item => materialItems(item.recursosMateriales))),
      hours: academic.reduce((sum, item) => sum + item.horas, 0),
      key: `carpinteria:2026-2:31:u6:s${i + 1}`,
      references: [...academic.map(item => item.referencia), ...syllabus.map(item => item.referencia)]
    });
  }
  return rows;
}
const sessions = buildSessions();
assert.equal(sessions.length, 35);
assert.equal(sessions.reduce((sum, item) => sum + item.hours, 0), 210);
assert.equal(source.modulo.horasPractica, 90);
assert.equal(35 + 15, 50);
assert.ok(sessions.every(item => item.name && item.learning && item.indicator && item.contents.length && item.hours === 6));
assert.equal(new Set(sessions.map(item => item.key)).size, 35);

const snapshotQuery = `query CarpinteriaFillState {
  modulo(id:31) {id titulo horas duracionEfsrt creditos descripcion descripcion2}
  competencias(where:{moduloId:{eq:31}},limit:10) {id nombre tipo}
  competenciaUnidadesDidacticas(limit:1000) {id competenciaId unidadDidacticaId orden}
  unidadesDidacticas(limit:1000) {id nombre duracion creditos comun}
  capacidadesTerminales(limit:1000) {id descripcion unidadDidacticaId orden}
  indicadoresCapacidad(limit:1000) {id descripcion capacidadTerminalId orden}
  aprendizajes(limit:1000) {id descripcion indicadorCapacidadId}
  actividads(where:{moduloId:{eq:31}},limit:1000) {id nombre descripcion claveImportacion aprendizajeId duracion numeroSesion orden
    contenidos:actividadContenidos_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto}
    materiales:actividadMateriales_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto materialId}}
  materiales(limit:10000) {id nombre clave}
  grupoModulos(where:{moduloId:{eq:31}},limit:100) {id grupo {semestre {titulo}}}
  grupoModuloUnidadesDidacticas(limit:1000) {id grupoModuloId unidadDidacticaId orden}
  efsrtPppPracticas(limit:1000) {id grupoModuloId numero titulo descripcion fecha}
}`;
const state = await graph(snapshotQuery);
assert.equal(state.modulo?.titulo, source.modulo.nombreAcademico);
assert.equal(state.modulo.horas, 300);
assert.equal(state.modulo.duracionEfsrt, 90);
assert.equal(state.competencias.length, 1);
const competenceId = state.competencias[0].id;
let links = state.competenciaUnidadesDidacticas.filter(item => item.competenciaId === competenceId);
let units = new Map(state.unidadesDidacticas.map(item => [item.id, item]));
let capacities = state.capacidadesTerminales;
let indicators = state.indicadoresCapacidad;
let learnings = state.aprendizajes;
let activities = state.actividads;
let materials = new Map(state.materiales.map(item => [item.clave, item]));
const currentGroup = state.grupoModulos.find(item => item.grupo?.semestre?.titulo === '2026-2');
if (apply && !currentGroup) throw new Error('Falta un grupo del módulo 31 en el semestre 2026-2.');
const dedicatedUnitName = 'GESTIÓN EMPRESARIAL Y ORIENTACIÓN LABORAL';
const dedicatedCandidates = [...units.values()].filter(item => norm(item.nombre) === norm(dedicatedUnitName) && item.duracion === 30);
assert.ok(dedicatedCandidates.length <= 1, 'Hay más de una unidad complementaria propia; revisar antes de continuar.');
const existingDedicatedUnit = dedicatedCandidates[0];
const preview = {
  localOnly: !production,
  moduloId: moduleId,
  currentGroupId: currentGroup?.id ?? null,
  clases: sessions.length,
  horasClase: sessions.reduce((sum, row) => sum + row.hours, 0),
  practicas: 15,
  horasPractica: 90,
  horasTotales: 300,
  contenidos: sessions.reduce((sum, row) => sum + row.contents.length, 0),
  materialesVinculos: sessions.reduce((sum, row) => sum + row.materials.length, 0),
  materialesDistintos: new Set(sessions.flatMap(row => row.materials.map(materialKey))).size,
  actividadesExistentes: activities.length,
  crearaUnidadComplementariaPropia: !existingDedicatedUnit,
  creditosTecnicosAEliminar: links.filter(link => link.orden <= 5 && units.get(link.unidadDidacticaId)?.creditos != null).length
};
if (!apply) {
  const planPath = path.join(root, `tmp/carpinteria-fuentes/plan-${production ? 'remote' : 'local'}.json`);
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(preview, null, 2));
  process.exit(0);
}
if (production) {
  const backupPath = path.join(root, 'backups/deploy-20261014/carpinteria-before.json');
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

let unit6 = existingDedicatedUnit;
if (!unit6) {
  const created = await graph(`mutation CreateCarpinteriaBusinessUnit($name:String!) {
    unidadDidactica_insert(data:{nombre:$name,duracion:30,comun:false})
  }`, { name: dedicatedUnitName });
  unit6 = { id: created.unidadDidactica_insert.id, nombre: dedicatedUnitName, duracion: 30, creditos: null };
  units.set(unit6.id, unit6);
}
const old = links.find(link => link.orden === 6);
assert.ok(old);
if (old.unidadDidacticaId !== unit6.id) {
  await graph(`mutation LinkCarpinteriaBusinessUnit($linkId:Int!,$unitId:Int!) {
    competenciaUnidadDidactica_update(id:$linkId,data:{unidadDidacticaId:$unitId})
  }`, { linkId: old.id, unitId: unit6.id });
  old.unidadDidacticaId = unit6.id;
}
if (!capacities.some(item => item.unidadDidacticaId === unit6.id)) {
  const createdCapacity = await graph(`mutation CreateCarpinteriaBusinessCapacity($unitId:Int!,$description:String!) {
    capacidadTerminal_insert(data:{unidadDidacticaId:$unitId,descripcion:$description,orden:1})
  }`, { unitId: unit6.id, description: clean(source.unidades[5].capacidadProgramacion) });
  capacities.push({ id: createdCapacity.capacidadTerminal_insert.id, unidadDidacticaId: unit6.id,
    descripcion: clean(source.unidades[5].capacidadProgramacion), orden: 1 });
}
const currentLink = state.grupoModuloUnidadesDidacticas.find(item => item.grupoModuloId === currentGroup.id && item.orden === 6);
if (currentLink?.unidadDidacticaId !== unit6.id) {
  if (currentLink) await graph(`mutation RelinkCurrentCarpinteriaUnit($id:Int!,$unitId:Int!) {
    grupoModuloUnidadDidactica_update(id:$id,data:{unidadDidacticaId:$unitId})
  }`, { id: currentLink.id, unitId: unit6.id });
  else await graph(`mutation LinkCurrentCarpinteriaUnit($groupId:Int!,$unitId:Int!) {
    grupoModuloUnidadDidactica_insert(data:{grupoModuloId:$groupId,unidadDidacticaId:$unitId,orden:6})
  }`, { groupId: currentGroup.id, unitId: unit6.id });
}

for (const link of links.filter(item => item.orden <= 5)) {
  const unit = units.get(link.unidadDidacticaId);
  if (unit?.creditos == null) continue;
  await graph(`mutation RemoveOccupationalCredits($id:Int!) {
    unidadDidactica_update(id:$id,data:{creditos:null,creditosTeoricos:null,creditosPracticos:null,horasTeoricas:null,horasPracticas:null})
  }`, { id: unit.id });
  unit.creditos = null;
}
if (!state.modulo.descripcion || !state.modulo.descripcion2) {
  await graph(`mutation DescribeCarpinteria($id:Int!,$description:String!,$purposes:String!) {
    modulo_update(id:$id,data:{descripcion:$description,descripcion2:$purposes})
  }`, { id: moduleId, description: source.modulo.competenciaAlternativaProgramacion,
    purposes: source.modulo.propositosSilabo.join('\n') });
}

const unitIds = links.slice().sort((a, b) => a.orden - b.orden).map(item => item.unidadDidacticaId);
assert.equal(unitIds.length, 6);
const capacityIds = unitIds.map(id => {
  const row = capacities.find(item => item.unidadDidacticaId === id);
  assert.ok(row, `Falta capacidad de unidad ${id}`);
  return row.id;
});
// La programación detallada corrige los criterios de la quinta unidad que el resumen copió del gabinete de baño.
const expectedOfficeCriteria = split(source.unidades[4].criteriosEvaluacion);
const officeCriteria = indicators.filter(item => item.capacidadTerminalId === capacityIds[4]).sort((a, b) => a.id - b.id).slice(0, 2);
assert.equal(officeCriteria.length, 2);
assert.equal(expectedOfficeCriteria.length, 2);
for (let i = 0; i < 2; i++) {
  if (norm(officeCriteria[i].descripcion) === norm(expectedOfficeCriteria[i])) continue;
  await graph(`mutation FixOfficeIndicator($id:Int!,$description:String!) {
    indicadorCapacidad_update(id:$id,data:{descripcion:$description})
  }`, { id: officeCriteria[i].id, description: expectedOfficeCriteria[i] });
  officeCriteria[i].descripcion = expectedOfficeCriteria[i];
}
for (const criterion of split(source.unidades[5].criteriosEvaluacion)) {
  if (indicators.some(item => item.capacidadTerminalId === capacityIds[5] && norm(item.descripcion) === norm(criterion))) continue;
  const created = await graph(`mutation InsertBusinessCriterion($capId:Int!,$description:String!) {
    indicadorCapacidad_insert(data:{capacidadTerminalId:$capId,descripcion:$description})
  }`, { capId: capacityIds[5], description: criterion });
  indicators.push({ id: created.indicadorCapacidad_insert.id, capacidadTerminalId: capacityIds[5], descripcion: criterion });
}

for (const session of sessions) {
  const capId = capacityIds[session.unit - 1];
  const originalCriteria = indicators.filter(item => item.capacidadTerminalId === capId)
    .sort((a, b) => a.id - b.id).slice(0, 2);
  assert.equal(originalCriteria.length, 2);
  const indicator = originalCriteria[criterionMap[session.unit - 1][session.unitSession - 1]];
  assert.ok(indicator);
  const prior = activities.find(item => item.claveImportacion === session.key);
  let learning = prior ? learnings.find(item => item.id === prior.aprendizajeId) : null;
  if (learning && learning.indicadorCapacidadId !== indicator.id) {
    await graph(`mutation MoveCarpinteriaLearning($id:Int!,$indicatorId:Int!) {
      aprendizaje_update(id:$id,data:{indicadorCapacidadId:$indicatorId})
    }`, { id: learning.id, indicatorId: indicator.id });
    learning.indicadorCapacidadId = indicator.id;
  }
  learning ??= learnings.find(item => item.indicadorCapacidadId === indicator.id && norm(item.descripcion) === norm(session.learning));
  if (!learning) {
    const created = await graph(`mutation InsertCarpinteriaLearning($indicatorId:Int!,$description:String!) {
      aprendizaje_insert(data:{indicadorCapacidadId:$indicatorId,descripcion:$description})
    }`, { indicatorId: indicator.id, description: session.learning });
    learning = { id: created.aprendizaje_insert.id, indicadorCapacidadId: indicator.id, descripcion: session.learning };
    learnings.push(learning);
  }
  session.learningId = learning.id;
}

for (const material of unique(sessions.flatMap(item => item.materials))) {
  const key = materialKey(material);
  if (materials.has(key)) continue;
  const created = await graph(`mutation InsertCarpinteriaMaterial($name:String!,$key:String!) {
    material_insert(data:{nombre:$name,clave:$key})
  }`, { name: material, key });
  materials.set(key, { id: created.material_insert.id, nombre: material, clave: key });
}

for (const session of sessions) {
  const prior = activities.find(item => item.claveImportacion === session.key);
  if (prior) {
    const description = `Indicador de la sesión: ${session.indicator}`;
    if (!prior.descripcion || prior.descripcion.startsWith('tabla ')) {
      await graph(`mutation DescribeCarpinteriaActivity($id:Int!,$description:String!) {
        actividad_update(id:$id,data:{descripcion:$description})
      }`, { id: prior.id, description });
      prior.descripcion = description;
    }
    continue;
  }
  const variables = {
    name: session.name, key: session.key, order: session.order, learningId: session.learningId,
    bibliography: source.modulo.bibliografiaProgramacion.join('\n'),
    description: `Indicador de la sesión: ${session.indicator}`
  };
  const definitions = ['$name:String!', '$key:String!', '$order:Int!', '$learningId:Int!', '$bibliography:String!', '$description:String!'];
  const fields = [`saved:actividad_insert(data:{nombre:$name,descripcion:$description,moduloId:${moduleId},numeroSesion:$order,orden:$order,claveImportacion:$key,duracion:6,aprendizajeId:$learningId,bibliografia:$bibliography})`];
  session.contents.forEach((content, index) => {
    const variable = `content${index}`;
    definitions.push(`$${variable}:String!`);
    variables[variable] = content;
    fields.push(`c${index}:actividadContenido_insert(data:{actividadId_expr:"response.saved.id",orden:${index + 1},texto:$${variable}})`);
  });
  session.materials.forEach((material, index) => {
    const variable = `material${index}`;
    definitions.push(`$${variable}:String!`);
    variables[variable] = material;
    fields.push(`m${index}:actividadMaterial_insert(data:{actividadId_expr:"response.saved.id",orden:${index + 1},texto:$${variable},materialId:${materials.get(materialKey(material)).id}})`);
  });
  const result = await graph(`mutation InsertCarpinteriaSession(${definitions.join(',')}) @transaction {${fields.join('\n')}}`, variables);
  activities.push({ id: result.saved.id, claveImportacion: session.key, nombre: session.name, aprendizajeId: session.learningId,
    duracion: 6, numeroSesion: session.order, orden: session.order,
    contenidos: session.contents.map((texto, i) => ({ orden: i + 1, texto })),
    materiales: session.materials.map((texto, i) => ({ orden: i + 1, texto, materialId: materials.get(materialKey(texto)).id })) });
}

const priorPractices = state.efsrtPppPracticas.filter(item => item.grupoModuloId === currentGroup.id);
for (let n = 1; n <= 15; n++) {
  if (priorPractices.some(item => item.numero === n)) continue;
  const title = `Mantenimiento de mobiliarios del CETPRO — práctica ${String(n).padStart(2, '0')}`;
  const description = `Práctica preprofesional de 6 horas curriculares. ${source.modulo.aprendizajePracticaSilabo}. Criterios: tiempo empleado, acabado, creatividad, presentación, seguridad, puntualidad y trabajo en equipo.`;
  const created = await graph(`mutation InsertCarpinteriaPractice($groupId:Int!,$number:Int!,$title:String!,$description:String!) {
    efsrtPppPractica_insert(data:{grupoModuloId:$groupId,numero:$number,titulo:$title,descripcion:$description,activo:true})
  }`, { groupId: currentGroup.id, number: n, title, description });
  priorPractices.push({ id: created.efsrtPppPractica_insert.id, grupoModuloId: currentGroup.id, numero: n, titulo: title });
}

const after = await graph(snapshotQuery);
const savedActivities = after.actividads.filter(item => item.claveImportacion?.startsWith('carpinteria:2026-2:31:'));
assert.equal(savedActivities.length, 35);
const finalLinks = after.competenciaUnidadesDidacticas.filter(item => item.competenciaId === competenceId);
assert.equal(finalLinks.length, 6);
const finalUnitIds = new Set(finalLinks.map(item => item.unidadDidacticaId));
assert.equal([...finalUnitIds].reduce((sum, id) => sum + (after.unidadesDidacticas.find(item => item.id === id)?.duracion ?? 0), 0), 210);
assert.ok([...finalUnitIds].every(id => after.unidadesDidacticas.find(item => item.id === id)?.creditos == null));
for (const session of sessions) {
  const saved = savedActivities.find(item => item.claveImportacion === session.key);
  assert.ok(saved && saved.duracion === 6 && saved.aprendizajeId === session.learningId);
  assert.equal(saved.descripcion, `Indicador de la sesión: ${session.indicator}`);
  const learning = after.aprendizajes.find(item => item.id === saved.aprendizajeId);
  const indicator = after.indicadoresCapacidad.find(item => item.id === learning?.indicadorCapacidadId);
  const capacity = after.capacidadesTerminales.find(item => item.id === indicator?.capacidadTerminalId);
  assert.ok(capacity && finalUnitIds.has(capacity.unidadDidacticaId), `Actividad sin competencia del módulo: ${session.key}`);
  assert.deepEqual(saved.contenidos.map(item => item.texto), session.contents);
  assert.deepEqual(saved.materiales.map(item => item.texto), session.materials);
  assert.ok(saved.materiales.every(item => item.materialId));
}
assert.equal(after.efsrtPppPracticas.filter(item => item.grupoModuloId === currentGroup.id).length, 15);
assert.deepEqual(after.efsrtPppPracticas.filter(item => item.grupoModuloId === currentGroup.id).map(item => item.numero).sort((a,b) => a-b), Array.from({length:15},(_,i)=>i+1));
assert.equal(after.modulo.horas, 300);
assert.equal(after.modulo.creditos, null);
console.log(JSON.stringify({ ...preview, applied: true, unidadComplementariaId: unit6.id,
  actividades: savedActivities.length, practicas: 15 }, null, 2));
