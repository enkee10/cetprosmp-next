import { https, runWith } from 'firebase-functions/v1';
import { dataConnect } from '../core/dataConnectCore.js';
import { hasPermission, requirePermission } from '../core/permissions.js';
import { parteEditors } from './editors.js';
import { followUpCompromiso, readCompromisos } from './commitmentModel.js';

const graph = async <T>(query: string, variables: Record<string, unknown> = {}) => (await dataConnect.executeGraphql<T, Record<string, unknown>>(query, { variables })).data;
const positive = (v: unknown) => { const id = Number(v); if (!Number.isInteger(id) || id <= 0) throw new https.HttpsError('invalid-argument', 'Identificador inválido.'); return id; };
const signedWhere = 'firma:{isNull:false,ne:""}';
async function permission(context: https.CallableContext, action: 'view' | 'edit') {
  if (!await hasPermission(context, 'parte-diario', action)) await requirePermission(context, 'reportes-parte-diario', action);
}
type HistoryPart = { id: number; fecha: string; tipoUnidad: string; actividadManual: string | null; unidadDidacticaId: number | null; unidadDidactica: { nombre: string | null } | null; actividad: { nombre: string | null; numeroSesion: number | null } | null; observaciones: string[]; compromisos: unknown; fechaActualizacion: string };
export const PARTE_HISTORY_QUERY = `query ParteObservationHistory($gm:Int!,$docente:Int!,$offset:Int!){parteDiarioRegistros(where:{grupoModuloId:{eq:$gm},docenteId:{eq:$docente},${signedWhere}},limit:500,offset:$offset,orderBy:[{fecha:DESC},{id:DESC}]){id fecha tipoUnidad actividadManual unidadDidacticaId unidadDidactica{nombre} actividad{nombre numeroSesion} observaciones compromisos fechaActualizacion}}`;
export const PARTE_COMMITMENT_QUERY = `query ParteCommitmentRecord($id:Int!){parteDiarioRegistro(id:$id){id firma grupoModuloId docenteId compromisos fechaActualizacion}}`;

export const getParteObservacionesHistorial = runWith({ timeoutSeconds: 180 }).https.onCall(async (data, context) => {
  await permission(context, 'view');
  const gm = positive(data?.grupoModuloId), docente = positive(data?.docenteId), parts: HistoryPart[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = (await graph<{ parteDiarioRegistros: HistoryPart[] }>(PARTE_HISTORY_QUERY, { gm, docente, offset })).parteDiarioRegistros;
    parts.push(...page); if (page.length < 500) break;
    if (offset >= 4500) throw new https.HttpsError('resource-exhausted', 'El historial supera el límite de registros.');
  }
  const units = new Map<string, { value: string; label: string }>(), uids = new Set<string>();
  const registros = parts.flatMap(part => {
    const unit = part.tipoUnidad === 'curricular' ? part.unidadDidacticaId ? `u:${part.unidadDidacticaId}` : 'pendiente' : part.tipoUnidad;
    units.set(unit, { value: unit, label: part.tipoUnidad === 'curricular' ? part.unidadDidactica?.nombre || 'Sin unidad' : part.tipoUnidad.toUpperCase() });
    const commitments = readCompromisos(part.compromisos);
    return part.observaciones.map((observacion, index) => {
      const compromiso = commitments.find(c => c.observacionIndex === index) ?? null;
      for (const uid of [compromiso?.creadoPor, compromiso?.cumplidoPor, compromiso?.comentadoPor]) if (uid) uids.add(uid);
      return { key: `${part.id}:${index}`, recordId: part.id, fecha: part.fecha, actividad: part.tipoUnidad === 'curricular' ? part.actividad?.nombre || 'Sin actividad registrada' : part.actividadManual || part.tipoUnidad.toUpperCase(), unidadFiltro: unit, observacion, compromiso, version: part.fechaActualizacion };
    });
  });
  return { registros, unidades: [...units.values()], autores: [...(await parteEditors([...uids])).values()] };
});

export const saveParteCompromisoSeguimiento = runWith({ timeoutSeconds: 180 }).https.onCall(async (data, context) => {
  await permission(context, 'edit');
  const id = positive(data?.recordId), gm = positive(data?.grupoModuloId), docente = positive(data?.docenteId);
  type Part = { id: number; firma: string | null; grupoModuloId: number; docenteId: number; compromisos: unknown; fechaActualizacion: string };
  const part = (await graph<{ parteDiarioRegistro: Part | null }>(PARTE_COMMITMENT_QUERY, { id })).parteDiarioRegistro;
  if (!part?.firma?.trim() || part.grupoModuloId !== gm || part.docenteId !== docente) throw new https.HttpsError('failed-precondition', 'El seguimiento requiere un parte firmado del docente y grupo-módulo seleccionados.');
  const previous = readCompromisos(part.compromisos), now = new Date().toISOString();
  let compromisos;
  try { compromisos = followUpCompromiso(previous, String(data?.compromisoId || ''), String(data?.action || ''), data?.comentario, context.auth!.uid, now); }
  catch (error) { throw new https.HttpsError('failed-precondition', (error as Error).message); }
  let version=part.fechaActualizacion;
  if (compromisos !== previous) {
    if (data?.version !== part.fechaActualizacion) throw new https.HttpsError('aborted', 'El registro cambió. Actualiza el historial antes de continuar.');
    await graph(`mutation ParteCommitmentFollowUp($id:Int!,$version:Timestamp!,$value:Any!,$uid:String!,$now:Timestamp!) @transaction {parteDiarioRegistro_update(first:{where:{id:{eq:$id},fechaActualizacion:{eq:$version},${signedWhere}}},data:{compromisos:$value,actualizadoPor:$uid,fechaActualizacion:$now}) @check(expr:"this != null",message:"El registro cambió. Actualiza el historial.")}`, { id, version: part.fechaActualizacion, value: compromisos, uid: context.auth!.uid, now });
    // Return the database timestamp representation for the next optimistic update.
    const stored=(await graph<{parteDiarioRegistro:{fechaActualizacion:string;compromisos:unknown}}>('query ParteCommitmentVersion($id:Int!){parteDiarioRegistro(id:$id){fechaActualizacion compromisos}}',{id})).parteDiarioRegistro;
    version=stored.fechaActualizacion;compromisos=readCompromisos(stored.compromisos);
  }
  return { recordId: id, version, compromisos, autores: [...(await parteEditors([context.auth!.uid])).values()] };
});
