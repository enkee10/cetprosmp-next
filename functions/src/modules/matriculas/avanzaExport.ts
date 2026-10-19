import JSZip from 'jszip';
import { getStorage } from 'firebase-admin/storage';
import { https } from 'firebase-functions/v1';
import { dataConnect } from '../core/dataConnectCore.js';
import { avanzaRegistrationRow, AvanzaStudent } from './avanzaRegistration.js';
import { fillAvanzaTemplate, inspectAvanzaTemplate } from './avanzaTemplate.js';
import { generateAvanzaPhone, needsAvanzaPhoneReplacement, reserveAvanzaPhoneNumbers } from './avanzaPhones.js';
import { buildMatriculaModuloRows } from '../core/matriculaModuloRows.js';

type Plan = { id: number; carreraId: number; planEstudio: string | null; anio: number | null; version: { titulo: string | null } | null; periodoVigencia: { titulo: string | null } | null };
type Career = { id: number; nombre: string | null };
type Group = { id: number; grupoId: number; moduloId: number; inicio: string | null; fin: string | null; grupo: { id?: number; semestreId: number; archivado: boolean | null }; modulo: { id: number; titulo: string | null; orden: number | null; planId: number | null; carreraId: number | null } };
type Enrollment = { id: number; matriculaId: number; moduloId: number; grupoId: number | null; grupoModuloId: number | null; matricula: { id: number; fecha: string | null; archivado: boolean | null; user: (AvanzaStudent & { id: number }) | null } };
export type AvanzaExportPeriod = { desde: string | null; hasta: string };
const identity = (value: string | null): string => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
const same = (a: string | null, b: string): boolean => (a || '').normalize('NFC').toLocaleUpperCase('es-PE') === b.normalize('NFC').toLocaleUpperCase('es-PE');
const fail = (message: string): never => { throw new https.HttpsError('failed-precondition', message); };
const PREFIX = 'AVANZA/AVANZA-Plantillas-Registro-2026/';

export async function getReservedAvanzaPhones(): Promise<Set<string>> {
  const reserved = new Set<string>();
  let afterId = 0;
  while (true) {
    const { data } = await dataConnect.executeGraphql<{ users: { id: number; celular: string | null; telefono: string | null }[] }, { afterId: number }>(
      'query AvanzaExistingPhones($afterId:Int!){users(where:{id:{gt:$afterId}},orderBy:{id:ASC},limit:1000){id celular telefono}}',
      { variables: { afterId } },
    );
    for (const user of data.users) {
      reserveAvanzaPhoneNumbers(reserved, user.celular);
      reserveAvanzaPhoneNumbers(reserved, user.telefono);
    }
    if (data.users.length < 1000) break;
    const nextId = data.users[data.users.length - 1].id;
    if (nextId <= afterId) throw new Error('No se pudo completar la lectura de los celulares existentes.');
    afterId = nextId;
  }
  return reserved;
}

export async function getAvanzaCurrentSemester(): Promise<{ id: number; titulo: string }> {
  const response = await dataConnect.executeGraphql<{ appSettings: { intValue: number | null; stringValue: string | null }[] }, Record<string, never>>('query AvanzaSemesterSetting {appSettings(where:{settingKey:{eq:"general.semestreActualId"}},limit:2){intValue stringValue}}');
  const id = Number(response.data.appSettings[0]?.intValue || response.data.appSettings[0]?.stringValue);
  if (!Number.isInteger(id) || id < 1) fail('Configura el semestre actual antes de descargar AVANZA.');
  const semester = (await dataConnect.executeGraphql<{ semestre: { id: number; titulo: string | null } | null }, { id: number }>('query AvanzaSemester($id:Int!){semestre(id:$id){id titulo}}', { variables: { id } })).data.semestre;
  if (!semester?.titulo) fail('El semestre actual no tiene nombre.');
  return { id, titulo: semester!.titulo! };
}

export function getAvanzaExportPeriod(desde: unknown, now = new Date()): AvanzaExportPeriod {
  const hasta = now.toISOString();
  if (desde === undefined || desde === null) return { desde: null, hasta };
  if (typeof desde !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(desde)) {
    throw new https.HttpsError('invalid-argument', 'Selecciona una fecha y hora válidas.');
  }
  const time = new Date(desde);
  if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 19) !== desde.slice(0, 19)) {
    throw new https.HttpsError('invalid-argument', 'Selecciona una fecha y hora válidas.');
  }
  if (time.getTime() > now.getTime()) throw new https.HttpsError('invalid-argument', 'La fecha y hora no pueden ser futuras.');
  return { desde: time.toISOString(), hasta };
}

export async function createAvanzaExport(semestre: { id: number; titulo: string }, allowedGroupIds: number[], period: AvanzaExportPeriod = getAvanzaExportPeriod(null)) {
  if (!allowedGroupIds.length) fail('No hay grupos-módulos para descargar con este filtro.');
  const dateDeclaration = period.desde ? ', $desde:Timestamp!, $hasta:Timestamp!' : '';
  const dateFilter = period.desde ? ', fecha:{gt:$desde,le:$hasta}' : '';
  const { data } = await dataConnect.executeGraphql<{
    datoGenerals: { codigoModular: string | null }[]; carreras: Career[]; planes: Plan[]; grupoModulos: Group[]; modulosEstudiantes: Enrollment[];
  }, { semester: number; desde?: string; hasta?: string }>(`query AvanzaExportData($semester:Int!${dateDeclaration}){
    datoGenerals(limit:2){codigoModular}
    carreras(limit:2000){id nombre}
    planes(limit:2000){id carreraId planEstudio anio version{titulo} periodoVigencia{titulo}}
    grupoModulos(where:{grupo:{semestreId:{eq:$semester}}},limit:2000){id grupoId moduloId inicio fin grupo{semestreId archivado} modulo{id titulo orden planId carreraId}}
    modulosEstudiantes(where:{matricula:{semestreId:{eq:$semester}${dateFilter}}},limit:10000,orderBy:{id:ASC}){id matriculaId moduloId grupoId grupoModuloId matricula{id fecha archivado user{id tipoDocumento dni apellidoPaterno apellidoMaterno nombre fechaNacimiento sexo correoInstitucional celular}}}
  }`, { variables: { semester: semestre.id, ...(period.desde ? { desde: period.desde, hasta: period.hasta } : {}) } });
  if (data.carreras.length === 2000 || data.planes.length === 2000 || data.grupoModulos.length === 2000 || data.modulosEstudiantes.length === 10000) fail('La lista supera el límite de exportación. Selecciona menos grupos.');
  const codigoModular = data.datoGenerals[0]?.codigoModular;
  if (!codigoModular || data.datoGenerals.length !== 1) fail('Revisa el código modular en Datos Generales.');
  const plansById = new Map(data.planes.map(p => [p.id, p]));
  const careerOf = (group: Group): number | null => plansById.get(group.modulo.planId || 0)?.carreraId ?? group.modulo.carreraId;
  const groups = data.grupoModulos.filter(g => g.grupo.archivado !== true);
  const allowed = new Set(allowedGroupIds);
  const selected = groups.filter(g => allowed.has(g.id));
  const selectedById = new Map(selected.map(g => [g.id, g]));
  const matriculasById = new Map<number, Enrollment['matricula'] & { modulosEstudiantes: Enrollment[] }>();
  for (const enrollment of data.modulosEstudiantes) {
    const matricula = matriculasById.get(enrollment.matriculaId) ?? { ...enrollment.matricula, modulosEstudiantes: [] };
    matricula.modulosEstudiantes.push(enrollment);
    matriculasById.set(enrollment.matriculaId, matricula);
  }
  const moduleRows = buildMatriculaModuloRows([...matriculasById.values()], selected, selected.map(group => String(group.id)));
  const entries: { student: AvanzaStudent & { id: number }; group: Group; careerId: number }[] = [];
  const missing: string[] = [];
  const desdeTime = period.desde === null ? null : Date.parse(period.desde);
  const hastaTime = Date.parse(period.hasta);
  for (const enrollment of moduleRows) {
    if (enrollment.archivado === true) continue;
    if (desdeTime !== null) {
      const fecha = Date.parse(enrollment.fecha || '');
      // Consecutive downloads use (desde, hasta] to avoid repeating the cutoff.
      if (!Number.isFinite(fecha) || fecha <= desdeTime || fecha > hastaTime) continue;
    }
    const group = selectedById.get(enrollment.grupoModuloId ?? 0);
    if (!group) continue;
    const student = enrollment.user;
    if (!student) fail(`La matrícula ${enrollment.id} no tiene estudiante.`);
    let mapped = group, careerId = careerOf(group);
    if (identity(group.modulo.titulo).startsWith('MANEJO DE MAQUINAS INDUSTRIALES')) {
      const career = data.carreras.find(c => identity(c.nombre) === 'COSTURA Y ACABADOS');
      if (!career) fail('No se encontró Costura y Acabados para incorporar el MFC.');
      const candidates = groups.filter(g => careerOf(g) === career!.id);
      const moduleIds = [...new Set(candidates.map(g => g.moduloId))];
      if (moduleIds.length !== 1) fail('No se puede identificar un único módulo vigente de Costura y Acabados en este semestre.');
      mapped = candidates[0]; careerId = career!.id;
    }
    if (!careerId) fail(`El módulo ${group.modulo.titulo || group.moduloId} no tiene una carrera asignada.`);
    entries.push({ student: student!, group: mapped, careerId: careerId! });
  }
  if (!entries.length) fail(period.desde ? 'No hay matrículas posteriores a esa fecha y hora para los grupos seleccionados.' : 'No hay matrículas del semestre actual para los grupos seleccionados.');
  const reservedPhones = entries.some(entry => needsAvanzaPhoneReplacement(entry.student.celular)) ? await getReservedAvanzaPhones() : new Set<string>();
  const generatedPhones: string[] = [];
  const bucket = getStorage().bucket('cetprosmp-2026.firebasestorage.app');
  const [objects] = await bucket.getFiles({ prefix: PREFIX });
  const templates = objects.filter(f => /\.xlsx$/i.test(f.name));
  const zip = new JSZip(); const files: { name: string; rows: number; career: string }[] = [];
  const pending: string[] = [];
  const aliases: Record<string, string> = { 'CORTE Y ENSABLAJE': 'CORTE Y ENSAMBLAJE', 'EQUIPOS ELECTRICOS DE CONSUMO': 'EQUIPOS ELECTRONICOS DE CONSUMO' };
  for (const careerId of [...new Set(entries.map(e => e.careerId))].sort((a, b) => a - b)) {
    const career = data.carreras.find(c => c.id === careerId);
    if (!career?.nombre) fail(`La carrera ${careerId} no tiene nombre.`);
    const matching = templates.filter(f => {
      const fileCareer = identity(f.name.slice(PREFIX.length).replace(/\.xlsx$/i, '').replace(/^PE-/i, ''));
      return (aliases[fileCareer] || fileCareer) === identity(career!.nombre);
    });
    if (matching.length !== 1) fail(`No hay una plantilla única para ${career!.nombre}.`);
    const plans = data.planes.filter(p => p.carreraId === careerId);
    const periodKey = (p: Plan): number => {
      const value = p.version?.titulo || p.periodoVigencia?.titulo || p.planEstudio || '';
      const m = /(\d{4})\s*[-/]\s*(\d+)/.exec(value);
      return m ? Number(m[1]) * 100 + Number(m[2]) : (p.anio || 0) * 100;
    };
    plans.sort((a, b) => periodKey(b) - periodKey(a));
    const plan = plans[0];
    if (!plan?.planEstudio || (plans[1] && periodKey(plan) === periodKey(plans[1]))) fail(`No hay un plan más actual inequívoco para ${career!.nombre}.`);
    const [metadata] = await matching[0].getMetadata();
    const [original] = await bucket.file(matching[0].name, { generation: metadata.generation }).download();
    const template = inspectAvanzaTemplate(original);
    if (!same(semestre.titulo, template.periodo) || !same(codigoModular, template.codigoModular) || !same(plan.planEstudio, template.plan) || !same(career!.nombre!.toLocaleUpperCase('es-PE') + ' (AUXILIAR)', template.carrera)) fail(`La plantilla de ${career!.nombre} no coincide con el período, código modular, carrera o plan del sistema.`);
    const careerEntries = entries.filter(e => e.careerId === careerId).sort((a, b) =>
      (a.group.modulo.orden || 0) - (b.group.modulo.orden || 0) || a.group.moduloId - b.group.moduloId ||
      identity(a.student.apellidoPaterno).localeCompare(identity(b.student.apellidoPaterno), 'es') || identity(a.student.apellidoMaterno).localeCompare(identity(b.student.apellidoMaterno), 'es') || identity(a.student.nombre).localeCompare(identity(b.student.nombre), 'es') || a.student.id - b.student.id);
    const compatibleEntries = careerEntries.filter(entry => {
      if (template.modulos.some(name => same(entry.group.modulo.titulo, name))) return true;
      pending.push(`${career!.nombre!.toLocaleUpperCase('es-PE')} | ${entry.group.modulo.titulo!.toLocaleUpperCase('es-PE')} | DOCUMENTO: ${entry.student.dni || 'SIN DOCUMENTO'} | ${[entry.student.apellidoPaterno, entry.student.apellidoMaterno, entry.student.nombre].filter(Boolean).join(' ').toLocaleUpperCase('es-PE')} | MÓDULO NO DISPONIBLE EN LA LISTA ORIGINAL.`);
      return false;
    });
    const rows = compatibleEntries.map((entry, i) => {
      const replacePhone = needsAvanzaPhoneReplacement(entry.student.celular);
      const phone = replacePhone ? generateAvanzaPhone(reservedPhones) : entry.student.celular;
      if (replacePhone) generatedPhones.push(`${career!.nombre}: fila ${i + 1}, CELULAR: ${phone}.`);
      const values = avanzaRegistrationRow({ ...entry.student, celular: phone }, { periodo: semestre.titulo, codigoModular: codigoModular!, carrera: career!.nombre!, plan: plan.planEstudio!, moduloOficial: entry.group.modulo.titulo! }, i + 1);
      const labels = ['N°', 'PERIODO', 'CÓDIGO MODULAR', 'TIPO DOCUMENTO', 'NÚMERO DOCUMENTO', 'APELLIDO PATERNO', 'APELLIDO MATERNO', 'NOMBRES', 'FECHA NACIMIENTO', 'SEXO', 'PERFIL', 'CORREO INSTITUCIONAL', 'CELULAR'];
      const absent = values.map((value, index) => value === '' ? labels[index] : '').filter(Boolean);
      if (absent.length) missing.push(`${career!.nombre}: fila ${i + 1}, ${absent.join(', ')}.`);
      return values;
    });
    for (let start = 0; start < rows.length; start += 300) {
      const suffix = rows.length > 300 ? `-PARTE-${start / 300 + 1}` : '';
      const name = matching[0].name.slice(PREFIX.length).replace(/\.xlsx$/i, `-${semestre.titulo}${suffix}.xlsx`);
      zip.file(name, fillAvanzaTemplate(original, rows.slice(start, start + 300)));
      files.push({ name, rows: Math.min(300, rows.length - start), career: career!.nombre! });
    }
  }
  if (missing.length) zip.file('DATOS-PENDIENTES.txt', 'Estos datos faltan en el sistema y se dejaron vacíos; no se inventaron valores.\r\n\r\n' + missing.join('\r\n'));
  if (generatedPhones.length) zip.file('CELULARES-GENERADOS.txt', 'NÚMEROS ALEATORIOS GENERADOS ÚNICAMENTE PARA ESTA EXPORTACIÓN. NO SON DATOS DE CONTACTO VERIFICADOS Y NO SE GUARDARON EN USUARIOS.\r\n\r\n' + generatedPhones.join('\r\n'));
  if (pending.length) zip.file('INSCRIPCIONES-PENDIENTES.txt', 'ESTOS REGISTROS NO SE INCLUYERON EN LOS EXCEL PARA AVANZA PORQUE SU MÓDULO NO EXISTE EN LA LISTA ORIGINAL DE LA PLANTILLA.\r\nSE NECESITA UNA PLANTILLA OFICIAL QUE LOS CONTENGA. NO SE MODIFICARON LAS LISTAS NI LOS DATOS DEL SISTEMA.\r\n\r\n' + pending.join('\r\n'));
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  if (buffer.length > 6 * 1024 * 1024) fail('La descarga supera el tamaño permitido. Selecciona menos grupos-módulos.');
  return { filename: `AVANZA-INSCRIPCIONES-${semestre.titulo}.zip`, contentBase64: buffer.toString('base64'), files, rows: files.reduce((sum, file) => sum + file.rows, 0), totalRows: entries.length, pendingRows: pending.length, missingRows: missing.length, generatedPhoneRows: generatedPhones.length, hasta: period.hasta };
}
