import {
  DataConnectActEconomicaInput,
  DataConnectActividadInput,
  DataConnectAprendizajeInput,
  DataConnectAnioInput,
  DataConnectCapacidadTerminalInput,
  DataConnectCarreraInput,
  DataConnectCalendarioInput,
  DataConnectEspecialidadInput,
  DataConnectEventoInput,
  DataConnectFamiliaInput,
  DataConnectGrupoModuloUnidadDidacticaInput,
  DataConnectIndicadorCapacidadInput,
  DataConnectMatriculaInput,
  DataConnectModuloInput,
  DataConnectModuloEstudianteInput,
  DataConnectPaqueteInput,
  DataConnectPaqueteModuloInput,
  DataConnectPersonalInput,
  DataConnectPlanInput,
  DataConnectRoleInput,
  DataConnectSectorInput,
  DataConnectTipoCarreraInput,
  DataConnectUnidadDidacticaInput,
  DataConnectUserInput,
} from "./types.js";

export function separarNombreCompleto(displayName: string | null) {
  const texto = (displayName || "").trim().replace(/\s+/g, " ");
  if (!texto) {
    return { nombre: "", apellido_paterno: "", apellido_materno: "" };
  }

  const partes = texto.split(" ");
  if (partes.length >= 3) {
    return {
      nombre: partes.slice(0, -2).join(" "),
      apellido_paterno: partes[partes.length - 2],
      apellido_materno: partes[partes.length - 1],
    };
  }
  if (partes.length === 2) {
    return { nombre: partes[0], apellido_paterno: partes[1], apellido_materno: "" };
  }
  return { nombre: partes[0], apellido_paterno: "", apellido_materno: "" };
}

export function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const asString = String(value).trim();
  return asString.length ? asString : null;
}

export function asNullableTimestamp(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (ymd) {
      const year = Number(ymd[1]);
      if (year < 1900 || year > 2100) return null;
      const dt = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10) === raw ? dt.toISOString() : null;
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})T/.exec(raw);
    if (iso) {
      const year = Number(iso[1]);
      if (year < 1900 || year > 2100) return null;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString();
    }
    return null;
  }
  if (typeof value === "object" && value !== null && "_seconds" in (value as Record<string, unknown>)) {
    const seconds = Number((value as { _seconds: number })._seconds);
    if (Number.isNaN(seconds)) return null;
    return new Date(seconds * 1000).toISOString();
  }
  return null;
}

export function asNullableDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return Boolean(value);
}

export function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIntegerOrNull(value: unknown): number | null | undefined {
  const parsed = toNumberOrNull(value);
  return typeof parsed === "number" ? Math.trunc(parsed) : parsed;
}

export function getIdFromKeyOutput(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    try {
      return getIdFromKeyOutput(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return toNumberOrNull((value as { id?: unknown }).id) ?? null;
  }
  return null;
}

export function compactUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as T;
}

export function buildUserDataFromInput(
  input: Record<string, unknown>,
  defaults?: {
    documentId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    photoURL?: string | null;
    provider?: string | null;
    rolId?: number | null;
  },
): DataConnectUserInput {
  const apellidoPaterno = asNullableString(input.apellido_paterno ?? input.apellidoPaterno) ?? null;
  const apellidoMaterno = asNullableString(input.apellido_materno ?? input.apellidoMaterno) ?? null;
  const dni =
    asNullableString(input.dni ?? input.numero_documento ?? input.numeroDocumento ?? input.nroDocumento) ?? null;
  const celular =
    asNullableString(input.celular ?? input.telefono_celular ?? input.telefonoCelular ?? input.movil) ?? null;
  const nombre = asNullableString(input.nombre) ?? null;
  const apellidos = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ") || null;

  const payload: DataConnectUserInput = {
    documentId: asNullableString(input.documentId) ?? asNullableString(defaults?.documentId) ?? null,
    username: asNullableString(input.username) ?? asNullableString(defaults?.username) ?? null,
    nickName: asNullableString(input.nickName ?? input.nick_name) ?? null,
    email: asNullableString(input.email) ?? asNullableString(defaults?.email) ?? null,
    provider: asNullableString(input.provider) ?? asNullableString(defaults?.provider) ?? null,
    confirmed: toBoolean(input.confirmed),
    blocked: toBoolean(input.bloqueado ?? input.blocked),
    dni,
    tipoDocumento: asNullableString(input.tipo_documento ?? input.tipoDocumento),
    nombre,
    apellidos,
    apellidoPaterno,
    apellidoMaterno,
    sexo: asNullableString(input.sexo),
    nacionalidad: asNullableString(input.nacionalidad ?? input.Nacionalidad),
    estadoCivil: asNullableString(input.estado_civil ?? input.estadoCivil),
    instruccion: asNullableString(input.instruccion),
    fechaNacimiento: asNullableTimestamp(input.fecha_nacimiento ?? input.fechaNacimiento),
    fechaVencimiento: asNullableTimestamp(input.fecha_vencimiento ?? input.fechaVencimiento),
    direccion: asNullableString(input.direccion),
    distrito: asNullableString(input.distrito),
    telefono: asNullableString(input.telefono),
    celular,
    correoInstitucional: asNullableString(input.correo_institucional ?? input.correoInstitucional),
    fechaCreacion: asNullableTimestamp(input.fecha_creacion ?? input.fechaCreacion),
    fechaModificacion: asNullableTimestamp(input.fecha_modificacion ?? input.fechaModificacion),
    emailCreador: asNullableString(input.email_creador ?? input.emailCreador),
    avatar: asNullableString(input.avatar ?? input.foto) ?? asNullableString(defaults?.photoURL) ?? null,
    recorteFotografia: asNullableString(input.recorteFotografia ?? input.recorte_fotografia),
    dniImagenFrenteUrl: asNullableString(input.dniImagenFrenteUrl ?? input.dni_imagen_frente_url),
    dniImagenReversoUrl: asNullableString(input.dniImagenReversoUrl ?? input.dni_imagen_reverso_url),
    dniImagenFrenteProcesadaUrl: asNullableString(
      input.dniImagenFrenteProcesadaUrl ?? input.dni_imagen_frente_procesada_url,
    ),
    dniImagenReversoProcesadaUrl: asNullableString(
      input.dniImagenReversoProcesadaUrl ?? input.dni_imagen_reverso_procesada_url,
    ),
    rolId: toNumberOrNull(input.rolId) ?? defaults?.rolId ?? null,
  };

  if (!payload.username) payload.username = asNullableString(defaults?.displayName) ?? null;
  return compactUndefined(payload);
}

export function buildRoleDataFromInput(input: Record<string, unknown>): DataConnectRoleInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    scala: toNumberOrNull(input.scala),
  });
}

export function buildSectorDataFromInput(input: Record<string, unknown>): DataConnectSectorInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
  });
}

export function buildActEconomicaDataFromInput(input: Record<string, unknown>): DataConnectActEconomicaInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
    familiaId: toNumberOrNull(input.familiaId),
  });
}

export function buildFamiliaDataFromInput(input: Record<string, unknown>): DataConnectFamiliaInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
    sectorId: toNumberOrNull(input.sectorId),
  });
}

export function buildEspecialidadDataFromInput(input: Record<string, unknown>): DataConnectEspecialidadInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    tituloComercial: asNullableString(input.tituloComercial),
    orden: toIntegerOrNull(input.orden),
    descripcion: asNullableString(input.descripcion),
    descripcion2: asNullableString(input.descripcion2),
    slug: asNullableString(input.slug),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
  });
}

export function buildTipoCarreraDataFromInput(input: Record<string, unknown>): DataConnectTipoCarreraInput {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
  });
}

export function buildCarreraDataFromInput(input: Record<string, unknown>): DataConnectCarreraInput {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    codigo: asNullableString(input.codigo),
    descripcion: asNullableString(input.descripcion),
    nivel: asNullableString(input.nivel),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
    creadoEn: asNullableTimestamp(input.creadoEn),
    actualizadoEn: asNullableTimestamp(input.actualizadoEn),
    actEconomicaId: toNumberOrNull(input.actEconomicaId),
    especialidadId: toNumberOrNull(input.especialidadId),
    tipoCarreraId: toNumberOrNull(input.tipoCarreraId),
  });
}

export function buildPlanDataFromInput(input: Record<string, unknown>): DataConnectPlanInput {
  return compactUndefined({
    duracion: asNullableString(input.duracion),
    creditos: toNumberOrNull(input.creditos),
    tituloComercial: asNullableString(input.tituloComercial),
    slug: asNullableString(input.slug),
    descripcion2: asNullableString(input.descripcion2),
    imagenPortadaUrl: asNullableString(input.imagenPortadaUrl),
    planEstudio: asNullableString(input.planEstudio),
    periodoCaducidad: asNullableString(input.periodoCaducidad),
    resolucionTipo: asNullableString(input.resolucionTipo),
    nro: asNullableString(input.nro),
    anio: toNumberOrNull(input.anio),
    genera: asNullableString(input.genera),
    carreraId: toNumberOrNull(input.carreraId),
    periodoVigenciaId: toNumberOrNull(input.periodoVigenciaId),
    versionId: toNumberOrNull(input.versionId),
  });
}

export function buildAnioDataFromInput(input: Record<string, unknown>): DataConnectAnioInput {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    titulo: asNullableString(input.titulo),
  });
}

export function buildSemestreDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    inicio: asNullableTimestamp(input.inicio),
    fin: asNullableTimestamp(input.fin),
    fechaActa: asNullableDate(input.fechaActa),
    fechaCertificado: asNullableDate(input.fechaCertificado),
    fechaNomina: asNullableDate(input.fechaNomina),
    archivado: toBoolean(input.archivado),
    anioId: toNumberOrNull(input.anioId),
    directorId: toNumberOrNull(input.directorId),
    coordinador1Id: toNumberOrNull(input.coordinador1Id),
    coordinador2Id: toNumberOrNull(input.coordinador2Id),
  });
}

export function buildCalendarioDataFromInput(input: Record<string, unknown>): DataConnectCalendarioInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    inicio: asNullableTimestamp(input.inicio),
    fin: asNullableTimestamp(input.fin),
    duracion: toNumberOrNull(input.duracion),
    color: asNullableString(input.color),
    activo: toBoolean(input.activo),
    fechaCreacion: asNullableTimestamp(input.fechaCreacion),
    fechaActualizacion: asNullableTimestamp(input.fechaActualizacion),
    anioId: toNumberOrNull(input.anioId),
    semestreId: toNumberOrNull(input.semestreId),
    horarioId: toNumberOrNull(input.horarioId),
  });
}

export function buildTurnoDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    horaInicio: asNullableTimestamp(input.horaInicio),
    horaFin: asNullableTimestamp(input.horaFin),
    estado: asNullableString(input.estado),
    fechaCreacion: asNullableTimestamp(input.fechaCreacion),
    fechaActualizacion: asNullableTimestamp(input.fechaActualizacion),
  });
}

export function buildHorarioDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    descripcion: asNullableString(input.descripcion),
    regla: asNullableString(input.regla),
    diasSemana: asNullableString(input.diasSemana),
    viernesAlternoInicio: asNullableString(input.viernesAlternoInicio),
    activo: toBoolean(input.activo),
    fechaCreacion: asNullableTimestamp(input.fechaCreacion),
    fechaActualizacion: asNullableTimestamp(input.fechaActualizacion),
  });
}

export function buildGrupoDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    turnoNombre: asNullableString(input.turnoNombre),
    descripcion: asNullableString(input.descripcion),
    nombreDisplay: asNullableString(input.nombreDisplay),
    estado: asNullableString(input.estado),
    archivado: toBoolean(input.archivado),
    fechaCreacion: asNullableTimestamp(input.fechaCreacion),
    fechaActualizacion: asNullableTimestamp(input.fechaActualizacion),
    semestreId: toNumberOrNull(input.semestreId),
    personalId: toNumberOrNull(input.personalId),
    paqueteId: toNumberOrNull(input.paqueteId),
    turnoId: toNumberOrNull(input.turnoId),
    horarioId: toNumberOrNull(input.horarioId),
    grupoOrd: toNumberOrNull(input.grupoOrd),
    workspaceName: asNullableString(input.workspaceName ?? input.workspace_name),
    workspaceCorreo: asNullableString(input.workspaceCorreo ?? input.workspace_correo),
  });
}

export function buildGrupoModuloDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    grupoId: toNumber(input.grupoId, 0),
    moduloId: toNumber(input.moduloId, 0),
    orden: toNumberOrNull(input.orden),
    obligatorio: toBoolean(input.obligatorio) ?? true,
    inicio: asNullableTimestamp(input.inicio),
    fin: asNullableTimestamp(input.fin),
    calendarioId: toNumberOrNull(input.calendarioId),
  });
}

export function buildGrupoModuloUnidadDidacticaDataFromInput(
  input: Record<string, unknown>,
): DataConnectGrupoModuloUnidadDidacticaInput {
  return compactUndefined({
    grupoModuloId: toNumber(input.grupoModuloId, 0),
    unidadDidacticaId: toNumber(input.unidadDidacticaId, 0),
    orden: toNumberOrNull(input.orden),
    inicio: asNullableTimestamp(input.inicio),
    fin: asNullableTimestamp(input.fin),
  }) as DataConnectGrupoModuloUnidadDidacticaInput;
}

export function buildDatoGeneralDataFromInput(input: Record<string, unknown>) {
  return compactUndefined({
    nombreInstitucion: asNullableString(input.nombreInstitucion),
    logoUrl: asNullableString(input.logoUrl ?? input.logo_url),
    codigoModular: asNullableString(input.codigoModular ?? input.codigo_modular),
    tipoGestion: asNullableString(input.tipoGestion ?? input.tipo_gestion),
    departamento: asNullableString(input.departamento),
    provincia: asNullableString(input.provincia),
    distrito: asNullableString(input.distrito),
    dre: asNullableString(input.dre ?? input.DRE),
    direccion: asNullableString(input.direccion),
    telefono1: asNullableString(input.telefono1),
    telefono2: asNullableString(input.telefono2),
    correo: asNullableString(input.correo),
    paginaWeb: asNullableString(input.paginaWeb),
    facebook: asNullableString(input.facebook),
    youtube: asNullableString(input.youtube),
    twitter: asNullableString(input.twitter),
    instagram: asNullableString(input.instagram),
    tiktok: asNullableString(input.tiktok),
    ruc: asNullableString(input.ruc),
    rd: asNullableString(input.rd),
  });
}

export function buildPersonalDataFromInput(input: Record<string, unknown>): DataConnectPersonalInput {
  return compactUndefined({
    displayName: asNullableString(input.displayName),
    memo: asNullableString(input.memo),
    userId: toNumberOrNull(input.userId),
  });
}

export function buildEventoDataFromInput(input: Record<string, unknown>): DataConnectEventoInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    tipoEvento: asNullableString(input.tipoEvento),
    fechaInicio: asNullableTimestamp(input.fechaInicio),
    fechaFin: asNullableTimestamp(input.fechaFin),
    todoElDia: toBoolean(input.todoElDia),
    ubicacion: asNullableString(input.ubicacion),
    color: asNullableString(input.color),
    estado: asNullableString(input.estado),
    fechaCreacion: asNullableTimestamp(input.fechaCreacion),
    fechaActualizacion: asNullableTimestamp(input.fechaActualizacion),
    calendarioId: toNumber(input.calendarioId, 0),
    semestreId: toNumberOrNull(input.semestreId),
  }) as DataConnectEventoInput;
}

export function buildModuloDataFromInput(input: Record<string, unknown>): DataConnectModuloInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    tituloComercial: asNullableString(input.tituloComercial),
    orden: toIntegerOrNull(input.orden),
    descripcion: asNullableString(input.descripcion),
    competencia: asNullableString(input.competencia),
    horas: toNumberOrNull(input.horas),
    creditos: toNumberOrNull(input.creditos),
    duracionEfsrt: toNumberOrNull(input.duracionEfsrt),
    creditosEfsrt: toNumberOrNull(input.creditosEfsrt),
    metas: toNumberOrNull(input.metas),
    activo: toBoolean(input.activo),
    slug: asNullableString(input.slug),
    comun: toBoolean(input.comun),
    planId: toNumberOrNull(input.planId),
  });
}

export function buildPaqueteDataFromInput(input: Record<string, unknown>): DataConnectPaqueteInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    descripcion: asNullableString(input.descripcion),
    archivado: toBoolean(input.archivado),
  });
}

export function buildPaqueteModuloDataFromInput(input: Record<string, unknown>): DataConnectPaqueteModuloInput {
  return compactUndefined({
    paqueteId: toNumber(input.paqueteId, 0),
    moduloId: toNumber(input.moduloId, 0),
    orden: toNumberOrNull(input.orden),
    obligatorio: toBoolean(input.obligatorio) ?? true,
  }) as DataConnectPaqueteModuloInput;
}

export function buildMatriculaDataFromInput(input: Record<string, unknown>): DataConnectMatriculaInput {
  return compactUndefined({
    recibo: asNullableString(input.recibo),
    fecha: asNullableTimestamp(input.fecha),
    codigoInscripcion: asNullableString(input.codigoInscripcion),
    archivado: toBoolean(input.archivado),
    paqueteId: toNumberOrNull(input.paqueteId),
    semestreId: toNumberOrNull(input.semestreId),
    userId: toNumberOrNull(input.userId),
    responsableId: toNumberOrNull(input.responsableId),
    responsableUserId: toNumberOrNull(input.responsableUserId),
  });
}

export function buildModuloEstudianteDataFromInput(input: Record<string, unknown>): DataConnectModuloEstudianteInput {
  return compactUndefined({
    promedio: toNumberOrNull(input.promedio),
    puntaje: toNumberOrNull(input.puntaje),
    matriculaId: toNumber(input.matriculaId, 0),
    moduloId: toNumber(input.moduloId, 0),
    grupoId: toNumberOrNull(input.grupoId),
  }) as DataConnectModuloEstudianteInput;
}

export function buildUnidadDidacticaDataFromInput(input: Record<string, unknown>): DataConnectUnidadDidacticaInput {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    duracion: toNumberOrNull(input.duracion),
    creditos: toNumberOrNull(input.creditos),
    sigla: asNullableString(input.sigla),
    comun: toBoolean(input.comun),
  });
}

export function buildCapacidadTerminalDataFromInput(input: Record<string, unknown>): DataConnectCapacidadTerminalInput {
  return compactUndefined({
    descripcion: asNullableString(input.descripcion),
    sigla: asNullableString(input.sigla),
    orden: toNumberOrNull(input.orden),
    unidadDidacticaId: toNumberOrNull(input.unidadDidacticaId),
  });
}

export function buildIndicadorCapacidadDataFromInput(input: Record<string, unknown>): DataConnectIndicadorCapacidadInput {
  return compactUndefined({
    descripcion: asNullableString(input.descripcion),
    sigla: asNullableString(input.sigla),
    orden: toNumberOrNull(input.orden),
    capacidadTerminalId: toNumberOrNull(input.capacidadTerminalId),
  });
}

export function buildAprendizajeDataFromInput(input: Record<string, unknown>): DataConnectAprendizajeInput {
  return compactUndefined({
    descripcion: asNullableString(input.descripcion),
    sigla: asNullableString(input.sigla),
    indicadorCapacidadId: toNumberOrNull(input.indicadorCapacidadId),
  });
}

export function buildActividadDataFromInput(input: Record<string, unknown>): DataConnectActividadInput {
  return compactUndefined({
    nombre: asNullableString(input.nombre),
    descripcion: asNullableString(input.descripcion),
    proposito: asNullableString(input.proposito),
    ambiente: asNullableString(input.ambiente),
    duracion: toNumberOrNull(input.duracion),
    fecha: asNullableTimestamp(input.fecha),
    bibliografia: asNullableString(input.bibliografia),
    aprendizajeId: toNumberOrNull(input.aprendizajeId),
    ejeTransversalId: toNumberOrNull(input.ejeTransversalId),
    valorInstitucionalId: toNumberOrNull(input.valorInstitucionalId),
  });
}
