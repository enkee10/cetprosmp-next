import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'tmp/competencia-unidades-report-20261005.json'), 'utf8'));
const { data: before } = JSON.parse(fs.readFileSync(path.join(root, 'tmp/competencia-unidades-backup-20261005.json'), 'utf8'));
if (!report.applied || !report.verifiedAt) throw new Error('La migracion debe estar verificada.');
const lines = [
  '# Reporte de Reorganizacion Academica', '',
  `Verificacion de datos: ${new Date(report.verifiedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })} (America/Lima).`, '',
  '## Estructura', '',
  'Modulo -> Competencia -> Unidad didactica -> Capacidad terminal -> Indicador.', '',
  'Se migraron 160 relaciones conservando su ID, unidad, modulo y orden. Las unidades compartidas mantienen el mismo ID en todos los modulos. No se crearon planes ni modulos.', '',
  'Programa de estudio: con mas de 400 horas del modulo, las dos ultimas unidades son para empleabilidad; con 400 horas o menos, solo la ultima. Opcion ocupacional: todas las unidades son tecnicas.', '',
  'Se conservaron las 49 competencias originales y se agregaron 10 definiciones necesarias de empleabilidad, tomadas del Excel. Ningun texto de competencia original fue reemplazado.', '',
  '## Datos Conservados', '',
  '| Entidad | Registros |', '| --- | ---: |',
  ...Object.entries(report.preservedCounts).map(([name, count]) => `| ${name} | ${count} |`), '',
  'La comparacion verifica los campos academicos y los promedios, no solo los conteos.', '',
  '## Modulos', '',
  '| ID | Modulo | Horas del modulo | Unidades tecnicas | Unidades de empleabilidad |',
  '| ---: | --- | ---: | ---: | --- |',
  ...report.modules.slice().sort((a,b)=>a.id-b.id).map(m => `| ${m.id} | ${m.titulo} | ${m.horas ?? ''} | ${m.assignments.filter(a=>a.tipo==='TECNICA').length} | ${m.assignments.filter(a=>a.tipo==='EMPLEABILIDAD').map(a=>a.unidad).join('; ') || (m.assignments.length ? 'No corresponde' : 'Sin unidades previas')} |`), '',
  '## Pendientes Preexistentes', '',
  ...report.modules.filter(m=>!m.assignments.length).map(m=>`- Modulo ${m.id}: ${m.titulo}. No tenia unidades; no se invento contenido.`),
  ...report.modules.flatMap(m=>m.assignments.filter(a=>!a.competencia.nombre.trim()).map(a=>`- Modulo ${m.id}: ${m.titulo}, competencia ${a.competencia.id} sin nombre. Se conservo el contenido vacio original.`)).filter((line,index,all)=>all.indexOf(line)===index),
  ...before.capacidadesTerminales.filter(c=>!before.unidadDidacticaModulos.some(r=>r.unidadDidacticaId===c.unidadDidacticaId)).map(c=>`- Capacidad ${c.id}, unidad ${c.unidadDidacticaId}, sin modulo asociado desde antes de esta migracion. Se conservo.`),
  ...report.competenciasSinUnidades.map(c=>`- Competencia ${c.id}, modulo ${c.moduloId}, sin unidades tras la nueva clasificacion. Se conservo sin eliminarla: ${c.nombre}`), '',
  '## Verificacion', '',
  '- Compilacion TypeScript y produccion Next.js completadas.',
  '- Pruebas de horas 399, 400 y 401; opcion ocupacional y unidades compartidas.',
  '- Trece consultas verificadas de estructura, unidades, capacidades, grupos, paquetes, matricula, registro auxiliar y reportes.',
  '- Certificado Excel verificado: agrupacion por competencia, capacidades y nota.',
  '- Registro auxiliar verificado para los cinco modulos solicitados: Monitoreo y Acciones (5 unidades), Diseno y Corte de Articulos (5), Aparado/Armado/Acabado de Calzado (5), Decoracion y Presentacion (7), Tecnicas Basicas de Elaboraciones Culinarias (6). Se conservaron sus capacidades e indicadores.',
  '- Guardado sin cambios de competencia, capacidad y unidad compartida conserva datos y relaciones.',
  '- Respaldos: tmp/competencia-unidades-backup-20261005.json y tmp/competencia-unidades-report-20261005.json.', '',
  '## Despliegue Remoto', '',
  '- Data Connect: esquema definitivo publicado y tablas de relaciones antiguas retiradas, sin CASCADE y con comprobacion transaccional de equivalencia.',
  '- Firebase Functions: 52 funciones actualizadas correctamente.',
  '- Firebase Hosting: servidor Next.js actualizado y version publicada.',
  '- URL: https://cetprosmp-2026.web.app', '',
];
const output = path.join(root, 'docs/codex/reportes/reporte-competencia-unidades-20261005.md');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join('\n'), 'utf8');
console.log(output);
