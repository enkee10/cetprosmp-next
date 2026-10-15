import { getPersonalShortName } from './personalName';

export interface GrupoNombreModulo {
  moduloId: number;
  orden?: number | null;
  instancia?: number | null;
  sufijo?: string | null;
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
}

interface GrupoNombreDatos {
  nombreDisplay?: string | null;
  turnoNombre?: string | null;
  turno?: { nombre?: string | null } | null;
  horario?: { nombre?: string | null } | null;
  personal?: {
    displayName?: string | null;
    user?: { username?: string | null; apellidoPaterno?: string | null } | null;
  } | null;
  grupoModulos?: GrupoNombreModulo[];
}

export const tituloModulo = (item: GrupoNombreModulo, comercial = false) =>
  (comercial ? item.modulo?.tituloComercial || item.modulo?.titulo : item.modulo?.titulo)?.trim()
  || `Módulo ${item.moduloId}`;

export const tituloModulos = (items: GrupoNombreModulo[], comercial = false, conSufijo = true) =>
  items.slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId || (a.instancia ?? 1) - (b.instancia ?? 1))
    .map(item => [tituloModulo(item, comercial), conSufijo ? item.sufijo?.trim() : ''].filter(Boolean).join(' '))
    .join(' / ');

const tituloModulosAgrupadosAnterior = (items: GrupoNombreModulo[], comercial: boolean) => {
  const grupos = new Map<number, GrupoNombreModulo[]>();
  for (const item of items) grupos.set(item.moduloId, [...(grupos.get(item.moduloId) ?? []), item]);
  return [...grupos.values()].map(grupo => {
    const titulo = tituloModulo(grupo[0], comercial);
    return grupo.length > 1 ? `${titulo} x${grupo.length}` : titulo;
  }).join(' / ');
};

export const nombreGrupoCalculado = (
  items: GrupoNombreModulo[], turno: string | null | undefined,
  horario: string | null | undefined, docente: string | null | undefined,
  comercial = false, conSufijo = true,
) => [
  tituloModulos(items, comercial, conSufijo),
  turno ? `[${turno}]` : '',
  horario?.trim() || '',
  docente ? `(${docente})` : '',
].filter(Boolean).join(' ');

export const isNombreGrupoGenerado = (grupo: GrupoNombreDatos) => {
  const nombre = grupo.nombreDisplay?.trim();
  const items = grupo.grupoModulos ?? [];
  if (!items.length) return false;
  if (!nombre) return true;
  const docente = getPersonalShortName(
    grupo.personal?.user?.username || grupo.personal?.displayName || '',
    grupo.personal?.user?.apellidoPaterno,
  );
  for (const comercial of [false, true]) {
    const nombreAnterior = [
      tituloModulosAgrupadosAnterior(items, comercial),
      grupo.turno?.nombre || grupo.turnoNombre ? `[${grupo.turno?.nombre || grupo.turnoNombre}]` : '',
      grupo.horario?.nombre?.trim() || '',
      docente ? `(${docente})` : '',
    ].filter(Boolean).join(' ');
    if (nombre === nombreAnterior) return true;
    for (const conSufijo of [false, true]) {
      const calculado = nombreGrupoCalculado(items, grupo.turno?.nombre || grupo.turnoNombre,
        grupo.horario?.nombre, docente, comercial, conSufijo);
      if (nombre === calculado) return true;
      if (items.length === 1 && items[0].sufijo && nombre === `${calculado} ${items[0].sufijo}`) return true;
    }
  }
  return false;
};
