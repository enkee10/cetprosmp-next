import { https } from 'firebase-functions/v1';
import { dataConnect } from '../core/dataConnectCore.js';
import { projectUnidadRelations } from '../competencias/model.js';
import { buildGrupoModuloNombreRelacional, GrupoModuloNombreContext } from '../core/grupoModuloNombre.js';
import { DataConnectCompetenciaUnidadDidactica, DataConnectGrupo, DataConnectGrupoInput, DataConnectGrupoModulo, DataConnectGrupoModuloInput, DataConnectGrupoModuloUnidadDidactica, DataConnectModulo } from '../core/types.js';
import { claveInstancia, MAX_INSTANCIAS_GRUPO, validarInstancias } from './configuracion.js';
import { asignarNumerosTransitabilidad, permiteTransitabilidad, transitabilidadDocumentGuard } from '../core/transitabilidad.js';

export interface DetalleInstancia {
  moduloId: number;
  transitabilidad?: boolean;
  numeroTransitabilidad?: number | null;
  instancia: number;
  sufijo?: string | null;
  orden?: number | null;
  obligatorio?: boolean;
  inicio?: string | null;
  fin?: string | null;
  calendarioId?: number | null;
  hasInicio: boolean;
  hasFin: boolean;
  hasCalendarioId: boolean;
  hasSufijo: boolean;
  unidadDidacticas: Array<{unidadDidacticaId:number; orden?:number|null; inicio?:string|null; fin?:string|null; hasInicio:boolean; hasFin:boolean}>;
}

const protectedRelations = [
  ['modulosEstudiantes','grupoModuloId'], ['grupoModuloActividades','grupoModuloId'],
  ['grupoModuloJornadas','grupoModuloId'], ['parteDiarioRegistros','grupoModuloId'],
  ['programacionesHorarias','grupoModuloId'], ['efsrtPppPracticas','grupoModuloId'],
  ['efsrtPppEstudiantes','grupoModuloId'], ['registroAcademicoDocumentos','grupoModuloId'],
  ['certificadoTituloDocumentos','grupoModuloId'], ['certificados','grupoModuloId'],
  ['matriculaCambiosModulo','grupoModuloAnteriorId'], ['matriculaCambiosModulo','grupoModuloNuevoId'],
] as const;

export async function saveGrupoWithModulos(
  grupoId: number | null, payload: DataConnectGrupoInput, detalles: DetalleInstancia[],
) {
  const moduloIds = Array.from(new Set(detalles.map(item => item.moduloId)));
  const [catalog, existing] = await Promise.all([
    dataConnect.executeGraphql<{
      modulos: DataConnectModulo[];
      competenciaUnidadesDidacticas: DataConnectCompetenciaUnidadDidactica[];
    } & NonNullable<GrupoModuloNombreContext>, {moduloIds:number[]; personalId:number|null; turnoId:number|null; horarioId:number|null; semestreId:number|null}>(`
      query GrupoModuleCatalog($moduloIds:[Int!]!, $personalId:Int, $turnoId:Int, $horarioId:Int, $semestreId:Int) {
        modulos(where:{id:{in:$moduloIds}},limit:6){id titulo tituloComercial plan{carrera{tipoCarrera{nombre}}}}
        competenciaUnidadesDidacticas(where:{_or:[
          {competencia:{moduloId:{in:$moduloIds}},competenciaContinuacionId:{isNull:true}},
          {competenciaContinuacion:{planModulo:{moduloId:{in:$moduloIds}}}}
        ]},limit:500){id orden unidadDidacticaId competenciaId competenciaContinuacionId competencia{id nombre tipo moduloId} competenciaContinuacion{planModulo{moduloId}} unidadDidactica{id nombre duracion creditos sigla}}
        personal(id:$personalId){displayName user{username apellidoPaterno}}
        turno(id:$turnoId){nombre}
        horario(id:$horarioId){nombre}
        semestre(id:$semestreId){titulo}
      }
    `, {variables:{moduloIds,personalId:payload.personalId??0,turnoId:payload.turnoId??0,horarioId:payload.horarioId??0,semestreId:payload.semestreId??0}}),
    grupoId ? dataConnect.executeGraphql<{grupo:{id:number}|null; grupoModulos:DataConnectGrupoModulo[]; grupoModuloUnidadesDidacticas:DataConnectGrupoModuloUnidadDidactica[]}, {grupoId:number}>(`
      query PreviousGrupoConfiguration($grupoId:Int!) {
        grupo(id:$grupoId){id}
        grupoModulos(where:{grupoId:{eq:$grupoId}},limit:50){id grupoId moduloId instancia nombre sufijo transitabilidad numeroTransitabilidad orden obligatorio inicio fin calendarioId}
        grupoModuloUnidadesDidacticas(where:{grupoModulo:{grupoId:{eq:$grupoId}}},limit:500){id grupoModuloId unidadDidacticaId orden inicio fin}
      }
    `, {variables:{grupoId}}) : Promise.resolve({data:{grupo:null,grupoModulos:[],grupoModuloUnidadesDidacticas:[]}}),
  ]);
  if (grupoId && !existing.data.grupo) throw new https.HttpsError('not-found','El grupo no existe.');
  const previous = existing.data.grupoModulos;
  const byKey = new Map(previous.map(item => [claveInstancia(item.moduloId,item.instancia??1),item]));
  for (const detalle of detalles) {
    const old = byKey.get(claveInstancia(detalle.moduloId,detalle.instancia));
    if (!detalle.hasSufijo) detalle.sufijo = old?.sufijo ?? null;
    detalle.transitabilidad = detalle.transitabilidad ?? old?.transitabilidad ?? false;
  }
  detalles = asignarNumerosTransitabilidad(detalles.map(item => ({ ...item, numeroTransitabilidad: null })), previous);
  try { validarInstancias(detalles,previous); } catch (error) { throw new https.HttpsError('invalid-argument',(error as Error).message); }
  if (catalog.data.modulos.length !== moduloIds.length) throw new https.HttpsError('invalid-argument','Uno de los módulos seleccionados no existe.');
  const context = {...catalog.data,turnoNombre:payload.turnoNombre};
  const buildParentName = (items: Array<{moduloId:number; sufijo?:string|null; transitabilidad?:boolean|null; numeroTransitabilidad?:number|null}>) => {
    const titulo = items.map(item => buildGrupoModuloNombreRelacional(null, catalog.data.modulos.find(modulo => modulo.id === item.moduloId), item.sufijo, item.transitabilidad ?? false, item.numeroTransitabilidad)).join(' / ');
    return buildGrupoModuloNombreRelacional(context, {titulo});
  };
  if (previous.length && payload.nombreDisplay === buildParentName(previous)) payload = {...payload, nombreDisplay: buildParentName(detalles)};
  const selectedKeys = new Set(detalles.map(item => claveInstancia(item.moduloId,item.instancia)));
  const removed = previous.filter(item => !selectedKeys.has(claveInstancia(item.moduloId,item.instancia??1))).map(item=>item.id);
  const guards = protectedRelations.map(([table,field],index) => `guard${index}: ${table}(where:{${field}:{in:$removed}},limit:1) @check(expr:"this.size() == 0",message:"No se puede retirar una instancia que tiene matrículas, programación o registros asociados."){id}`).join('\n');
  const definitions = ['$grupoData:Grupo_Data! @allow(fields:"turnoNombre descripcion nombreDisplay estado archivado fechaCreacion fechaActualizacion semestreId personalId turnoId horarioId grupoOrd workspaceName workspaceCorreo")'];
  const variables: Record<string,unknown> = {grupoData:payload};
  const statements: string[] = [];
  const literalData = (alias: string, data: Record<string,unknown>, expressions: Record<string,string>) => {
    const fields = Object.entries(data).map(([field,value]) => {
      const key = `${alias}${field[0].toUpperCase()}${field.slice(1)}`;
      const type = ['inicio','fin'].includes(field) ? 'Timestamp' : ['nombre','sufijo'].includes(field) ? 'String' : ['obligatorio','transitabilidad'].includes(field) ? 'Boolean' : 'Int';
      const required = ['grupoId','moduloId','grupoModuloId','unidadDidacticaId'].includes(field);
      definitions.push(`$${key}:${type}${required?'!':''}`); variables[key]=value;
      return `${field}:$${key}`;
    });
    for (const [field,expression] of Object.entries(expressions)) fields.push(`${field}_expr:${JSON.stringify(expression)}`);
    return `{${fields.join(',')}}`;
  };
  if (grupoId) {
    definitions.push('$grupoId:Int!'); variables.grupoId=grupoId;
    statements.push('savedGrupo:grupo_update(id:$grupoId,data:$grupoData)');
  } else statements.push('savedGrupo:grupo_insert(data:$grupoData)');
  if (removed.length) {
    definitions.push('$removed:[Int!]!'); variables.removed=removed;
    statements.unshift(`query @redact {${guards}}`);
    statements.push('removed:grupoModulo_deleteMany(where:{id:{in:$removed}})');
  }
  const unidades = projectUnidadRelations(catalog.data.competenciaUnidadesDidacticas);
  for (const [index,detalle] of detalles.entries()) {
    const old = byKey.get(claveInstancia(detalle.moduloId,detalle.instancia));
    const modulo = catalog.data.modulos.find(item=>item.id===detalle.moduloId)!;
    const suffix = detalle.sufijo?.trim() || null;
    const transitabilidad = detalle.transitabilidad ?? old?.transitabilidad ?? false;
    if (transitabilidad && !permiteTransitabilidad(modulo.plan?.carrera?.tipoCarrera?.nombre)) {
      throw new https.HttpsError('invalid-argument', 'La transitabilidad solo está disponible para módulos de programas de estudio.');
    }
    if (old && (Boolean(old.transitabilidad) !== transitabilidad || (old.numeroTransitabilidad ?? null) !== detalle.numeroTransitabilidad)) statements.unshift(transitabilidadDocumentGuard(old.id));
    const nombreGenerado = buildGrupoModuloNombreRelacional(context,modulo,suffix,transitabilidad,detalle.numeroTransitabilidad);
    const data: Record<string,unknown> = {
      moduloId:detalle.moduloId, instancia:detalle.instancia,
      nombre:nombreGenerado,
      sufijo:suffix,
      transitabilidad,
      numeroTransitabilidad: detalle.numeroTransitabilidad,
      orden:detalle.orden??old?.orden??index+1,
      obligatorio:detalle.obligatorio??old?.obligatorio??true,
      inicio:detalle.hasInicio?detalle.inicio??null:old?.inicio??null,
      fin:detalle.hasFin?detalle.fin??null:old?.fin??null,
      calendarioId:detalle.hasCalendarioId?detalle.calendarioId??null:old?.calendarioId??null,
    };
    if (grupoId) data.grupoId=grupoId;
    const alias = `gm${index}`;
    if (old) {
      variables[alias]=data;
      definitions.push(`$${alias}:GrupoModulo_Data! @allow(fields:"grupoId moduloId instancia nombre sufijo transitabilidad numeroTransitabilidad orden obligatorio inicio fin calendarioId")`);
      statements.push(`${alias}:grupoModulo_update(id:${old.id},data:$${alias})`);
    } else statements.push(`${alias}:grupoModulo_insert(data:${literalData(alias,data,grupoId?{}:{grupoId:'response.savedGrupo.id'})})`);
    const oldUnits = existing.data.grupoModuloUnidadesDidacticas.filter(item=>item.grupoModuloId===old?.id);
    const baseUnits = unidades.filter(item=>item.moduloId===detalle.moduloId);
    const allowedUnits = new Set([...oldUnits.map(item=>item.unidadDidacticaId),...baseUnits.map(item=>item.unidadDidacticaId)]);
    if (detalle.unidadDidacticas.some(item=>!allowedUnits.has(item.unidadDidacticaId))) throw new https.HttpsError('invalid-argument','Una unidad seleccionada no corresponde al módulo.');
    const unitIds = new Set(old
      ? [...oldUnits.map(item=>item.unidadDidacticaId),...detalle.unidadDidacticas.map(item=>item.unidadDidacticaId)]
      : baseUnits.map(item=>item.unidadDidacticaId));
    // Group-specific units and dates take precedence over changes to the curriculum.
    for (const [unitIndex,unitId] of Array.from(unitIds).entries()) {
      const oldUnit = oldUnits.find(item=>item.unidadDidacticaId===unitId);
      const input = detalle.unidadDidacticas.find(item=>item.unidadDidacticaId===unitId);
      const base = unidades.find(item=>item.moduloId===detalle.moduloId&&item.unidadDidacticaId===unitId);
      const unitData: Record<string,unknown> = {unidadDidacticaId:unitId,orden:input?.orden??oldUnit?.orden??base?.orden??unitIndex+1,inicio:input?.hasInicio?input.inicio??null:oldUnit?.inicio??null,fin:input?.hasFin?input.fin??null:oldUnit?.fin??null};
      if (old) unitData.grupoModuloId=old.id;
      const ua=`u${index}x${unitIndex}`;
      if (oldUnit) {
        variables[ua]=unitData;
        definitions.push(`$${ua}:GrupoModuloUnidadDidactica_Data! @allow(fields:"grupoModuloId unidadDidacticaId orden inicio fin")`);
        statements.push(`${ua}:grupoModuloUnidadDidactica_update(id:${oldUnit.id},data:$${ua})`);
      } else statements.push(`${ua}:grupoModuloUnidadDidactica_insert(data:${literalData(ua,unitData,old?{}:{grupoModuloId:`response.${alias}.id`})})`);
    }
  }
  const result = await dataConnect.executeGraphql<{savedGrupo:{id:number}}, Record<string,unknown>>(`mutation SaveGrupoConfiguration(${definitions.join(',')}) @transaction {${statements.join('\n')}}`, {variables});
  return result.data.savedGrupo.id;
}

/** Both group editors share the same allocation and transactional document protection. */
export async function saveTransitabilidadGrupoModulo(id: number | null, payload: DataConnectGrupoModuloInput) {
  const { data } = await dataConnect.executeGraphql<{grupo: DataConnectGrupo | null; grupoModulos: DataConnectGrupoModulo[]}, {grupoId:number}>(`
    query TransitabilidadGrupoConfiguration($grupoId:Int!) {
      grupo(id:$grupoId){id nombreDisplay turnoNombre personalId semestreId turnoId horarioId}
      grupoModulos(where:{grupoId:{eq:$grupoId}},limit:50){id grupoId moduloId instancia sufijo transitabilidad numeroTransitabilidad orden obligatorio inicio fin calendarioId}
    }
  `, {variables:{grupoId:payload.grupoId}});
  if (!data.grupo) throw new https.HttpsError('not-found', 'El grupo no existe.');
  if (id && !data.grupoModulos.some(item => item.id === id)) throw new https.HttpsError('invalid-argument', 'No se puede trasladar una instancia de transitabilidad a otro grupo.');
  let instancia = payload.instancia ?? 1;
  if (!id && data.grupoModulos.some(item => item.moduloId === payload.moduloId && (item.instancia ?? 1) === instancia)) {
    const used = new Set(data.grupoModulos.filter(item => item.moduloId === payload.moduloId).map(item => item.instancia ?? 1));
    instancia = Array.from({length:MAX_INSTANCIAS_GRUPO}, (_,index) => index+1).find(value => !used.has(value)) ?? 0;
  }
  const rows = data.grupoModulos.map(item => item.id === id ? {...item, ...payload, instancia} : item);
  if (!id) rows.push({...payload, id:0, instancia});
  const detalles: DetalleInstancia[] = rows.map(item => ({
    moduloId:item.moduloId, instancia:item.instancia??1, sufijo:item.sufijo, hasSufijo:true,
    transitabilidad:item.transitabilidad??false, orden:item.orden, obligatorio:item.obligatorio??true,
    inicio:item.inicio, fin:item.fin, calendarioId:item.calendarioId,
    hasInicio:true, hasFin:true, hasCalendarioId:true, unidadDidacticas:[],
  }));
  const grupoId = data.grupo.id;
  const grupoData: DataConnectGrupoInput = {
    nombreDisplay:data.grupo.nombreDisplay, turnoNombre:data.grupo.turnoNombre,
    personalId:data.grupo.personalId, semestreId:data.grupo.semestreId,
    turnoId:data.grupo.turnoId, horarioId:data.grupo.horarioId,
  };
  await saveGrupoWithModulos(grupoId, grupoData, detalles);
  if (id) return id;
  const created = await dataConnect.executeGraphql<{grupoModulos:Array<{id:number}>}, {grupoId:number; moduloId:number; instancia:number}>(`
    query CreatedTransitabilidadModulo($grupoId:Int!, $moduloId:Int!, $instancia:Int!){
      grupoModulos(where:{grupoId:{eq:$grupoId},moduloId:{eq:$moduloId},instancia:{eq:$instancia}},limit:1){id}
    }
  `, {variables:{grupoId,moduloId:payload.moduloId,instancia}});
  return created.data.grupoModulos[0]?.id ?? null;
}
