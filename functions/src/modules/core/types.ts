export interface DataConnectRole {
  id: number;
  titulo?: string | null;
  scala?: number | null;
}

export interface DataConnectUserInput {
  documentId?: string | null;
  username?: string | null;
  email?: string | null;
  provider?: string | null;
  confirmed?: boolean;
  blocked?: boolean;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  celular?: string | null;
  correoInstitucional?: string | null;
  fechaCreacion?: string | null;
  fechaModificacion?: string | null;
  emailCreador?: string | null;
  avatar?: string | null;
  rolId?: number | null;
}

export interface DataConnectPersonal {
  id: number;
  displayName?: string | null;
  memo?: string | null;
  userId?: number | null;
  user?: {
    id?: number | null;
    documentId?: string | null;
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    email?: string | null;
    avatar?: string | null;
    rolId?: number | null;
    rol?: {
      id?: number | null;
      titulo?: string | null;
      scala?: number | null;
    } | null;
  } | null;
  userUsername?: string | null;
  avatar?: string | null;
  cargo?: string | null;
  especialidadIds?: number[];
  especialidadesTitulo?: string | null;
  personalEspecialidads_on_personal?: Array<{
    id?: number | null;
    personalId?: number | null;
    especialidadId?: number | null;
    orden?: number | null;
    especialidad?: {
      id?: number | null;
      titulo?: string | null;
      tituloComercial?: string | null;
    } | null;
  }> | null;
}

export interface DataConnectPersonalInput {
  displayName?: string | null;
  memo?: string | null;
  userId?: number | null;
}

export interface DataConnectRoleInput {
  titulo?: string | null;
  scala?: number | null;
}

export interface DataConnectSector {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
}

export interface DataConnectSectorInput {
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
}

export interface DataConnectActEconomica {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
  familiaId?: number | null;
  especialidadId?: number | null;
}

export interface DataConnectActEconomicaInput {
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
  familiaId?: number | null;
  especialidadId?: number | null;
}

export interface DataConnectFamilia {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
  sectorId?: number | null;
}

export interface DataConnectFamiliaInput {
  titulo?: string | null;
  descripcion?: string | null;
  imagenPortadaUrl?: string | null;
  sectorId?: number | null;
}

export interface DataConnectEspecialidad {
  id: number;
  titulo?: string | null;
  tituloComercial?: string | null;
  descripcion?: string | null;
  descripcion2?: string | null;
  slug?: string | null;
  imagenPortadaUrl?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectEspecialidadInput {
  titulo?: string | null;
  tituloComercial?: string | null;
  descripcion?: string | null;
  descripcion2?: string | null;
  slug?: string | null;
  imagenPortadaUrl?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectTipoCarrera {
  id: number;
  nombre?: string | null;
}

export interface DataConnectTipoCarreraInput {
  nombre?: string | null;
}

export interface DataConnectCarrera {
  id: number;
  nombre?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  nivel?: string | null;
  imagenPortadaUrl?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  actEconomicaId?: number | null;
  tipoCarreraId?: number | null;
}

export interface DataConnectCarreraInput {
  nombre?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  nivel?: string | null;
  imagenPortadaUrl?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  actEconomicaId?: number | null;
  tipoCarreraId?: number | null;
}

export interface DataConnectPlan {
  id: number;
  duracion?: string | null;
  creditos?: number | null;
  tituloComercial?: string | null;
  slug?: string | null;
  descripcion2?: string | null;
  imagenPortadaUrl?: string | null;
  planEstudio?: string | null;
  periodoCaducidad?: string | null;
  resolucionTipo?: string | null;
  nro?: string | null;
  anio?: number | null;
  genera?: string | null;
  carreraId?: number | null;
  periodoVigenciaId?: number | null;
}

export interface DataConnectPlanInput {
  duracion?: string | null;
  creditos?: number | null;
  tituloComercial?: string | null;
  slug?: string | null;
  descripcion2?: string | null;
  imagenPortadaUrl?: string | null;
  planEstudio?: string | null;
  periodoCaducidad?: string | null;
  resolucionTipo?: string | null;
  nro?: string | null;
  anio?: number | null;
  genera?: string | null;
  carreraId?: number | null;
  periodoVigenciaId?: number | null;
}

export interface DataConnectSemestre {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  inicio?: string | null;
  fin?: string | null;
  archivado?: boolean | null;
  anioId?: number | null;
  directorId?: number | null;
  coordinador1Id?: number | null;
  coordinador2Id?: number | null;
  anio?: { titulo?: string | null; nombre?: string | null } | null;
  anioTitulo?: string | null;
}

export interface DataConnectSemestreInput {
  titulo?: string | null;
  descripcion?: string | null;
  inicio?: string | null;
  fin?: string | null;
  archivado?: boolean | null;
  anioId?: number | null;
  directorId?: number | null;
  coordinador1Id?: number | null;
  coordinador2Id?: number | null;
}

export interface DataConnectAnio {
  id: number;
  nombre?: string | null;
  titulo?: string | null;
}

export interface DataConnectAnioInput {
  nombre?: string | null;
  titulo?: string | null;
}

export interface DataConnectCalendario {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  inicio?: string | null;
  fin?: string | null;
  duracion?: number | null;
  color?: string | null;
  activo?: boolean | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  anioId?: number | null;
  semestreId?: number | null;
  horarioId?: number | null;
  semestre?: { titulo?: string | null; fin?: string | null } | null;
  horario?: { nombre?: string | null } | null;
}

export interface DataConnectCalendarioInput {
  titulo?: string | null;
  descripcion?: string | null;
  inicio?: string | null;
  fin?: string | null;
  duracion?: number | null;
  color?: string | null;
  activo?: boolean;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  anioId?: number | null;
  semestreId?: number | null;
  horarioId?: number | null;
}

export interface DataConnectTurno {
  id: number;
  nombre?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  estado?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface DataConnectTurnoInput {
  nombre?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  estado?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface DataConnectHorario {
  id: number;
  nombre?: string | null;
  descripcion?: string | null;
  regla?: string | null;
  diasSemana?: string | null;
  viernesAlternoInicio?: string | null;
  activo?: boolean | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface DataConnectHorarioInput {
  nombre?: string | null;
  descripcion?: string | null;
  regla?: string | null;
  diasSemana?: string | null;
  viernesAlternoInicio?: string | null;
  activo?: boolean;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface DataConnectGrupo {
  id: number;
  turnoNombre?: string | null;
  descripcion?: string | null;
  nombreDisplay?: string | null;
  estado?: string | null;
  archivado?: boolean | null;
  semestreId?: number | null;
  personalId?: number | null;
  paqueteId?: number | null;
  turnoId?: number | null;
  horarioId?: number | null;
  grupoOrd?: number | null;
  semestre?: { titulo?: string | null } | null;
  personal?: DataConnectPersonal | null;
  paquete?: { titulo?: string | null } | null;
  turno?: DataConnectTurno | null;
  horario?: DataConnectHorario | null;
  grupoModulos?: DataConnectGrupoModulo[];
}

export interface DataConnectGrupoInput {
  turnoNombre?: string | null;
  descripcion?: string | null;
  nombreDisplay?: string | null;
  estado?: string | null;
  archivado?: boolean;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  semestreId?: number | null;
  personalId?: number | null;
  paqueteId?: number | null;
  turnoId?: number | null;
  horarioId?: number | null;
  grupoOrd?: number | null;
}

export interface DataConnectGrupoModulo {
  id: number;
  orden?: number | null;
  obligatorio?: boolean | null;
  grupoId: number;
  moduloId: number;
  calendarioId?: number | null;
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
  calendario?: DataConnectCalendario | null;
}

export interface DataConnectGrupoModuloInput {
  orden?: number | null;
  obligatorio?: boolean;
  grupoId: number;
  moduloId: number;
  calendarioId?: number | null;
}

export interface DataConnectEvento {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  tipoEvento?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  todoElDia?: boolean | null;
  ubicacion?: string | null;
  color?: string | null;
  estado?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  calendarioId: number;
  semestreId?: number | null;
  relaciones?: DataConnectEventoRelacion[];
  recurrencias?: DataConnectEventoRecurrencia[];
  ocurrencias?: DataConnectEventoOcurrencia[];
}

export interface DataConnectEventoInput {
  titulo?: string | null;
  descripcion?: string | null;
  tipoEvento?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  todoElDia?: boolean;
  ubicacion?: string | null;
  color?: string | null;
  estado?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  calendarioId: number;
  semestreId?: number | null;
}

export interface DataConnectEventoRelacion {
  id: number;
  entidadTipo?: string | null;
  entidadId?: number | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
}

export interface DataConnectEventoRelacionInput {
  entidadTipo?: string | null;
  entidadId?: number | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
}

export interface DataConnectEventoRecurrencia {
  id: number;
  frecuencia?: string | null;
  intervalo?: number | null;
  diasSemana?: string | null;
  diaMes?: number | null;
  semanaMes?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  cantidadOcurrencias?: number | null;
  reglaEspecial?: string | null;
  activo?: boolean | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
  horarioId?: number | null;
  turnoId?: number | null;
  horario?: DataConnectHorario | null;
  turno?: DataConnectTurno | null;
}

export interface DataConnectEventoRecurrenciaInput {
  frecuencia?: string | null;
  intervalo?: number | null;
  diasSemana?: string | null;
  diaMes?: number | null;
  semanaMes?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  cantidadOcurrencias?: number | null;
  reglaEspecial?: string | null;
  activo?: boolean;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
  horarioId?: number | null;
  turnoId?: number | null;
}

export interface DataConnectEventoOcurrencia {
  id: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  numeroOcurrencia?: number | null;
  tipoOcurrencia?: string | null;
  estado?: string | null;
  observacion?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
  recurrenciaId?: number | null;
  grupoId?: number | null;
}

export interface DataConnectEventoOcurrenciaInput {
  fechaInicio?: string | null;
  fechaFin?: string | null;
  numeroOcurrencia?: number | null;
  tipoOcurrencia?: string | null;
  estado?: string | null;
  observacion?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  eventoId: number;
  recurrenciaId?: number | null;
  grupoId?: number | null;
}

export interface DataConnectModulo {
  id: number;
  titulo?: string | null;
  tituloComercial?: string | null;
  orden?: number | null;
  descripcion?: string | null;
  horas?: number | null;
  creditos?: number | null;
  metas?: number | null;
  activo?: boolean | null;
  slug?: string | null;
  plan?: { planEstudio?: string | null } | null;
  planId?: number | null;
}

export interface DataConnectModuloInput {
  titulo?: string | null;
  tituloComercial?: string | null;
  orden?: number | null;
  descripcion?: string | null;
  horas?: number | null;
  creditos?: number | null;
  metas?: number | null;
  activo?: boolean;
  slug?: string | null;
  planId?: number | null;
}

export interface DataConnectPaquete {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  archivado?: boolean | null;
}

export interface DataConnectPaqueteInput {
  titulo?: string | null;
  descripcion?: string | null;
  archivado?: boolean;
}

export interface DataConnectPaqueteModulo {
  id: number;
  orden?: number | null;
  obligatorio?: boolean | null;
  paqueteId: number;
  moduloId: number;
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
}

export interface DataConnectPaqueteModuloInput {
  orden?: number | null;
  obligatorio?: boolean;
  paqueteId: number;
  moduloId: number;
}

export interface DataConnectMatricula {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  archivado?: boolean | null;
  paqueteId?: number | null;
  userId?: number | null;
}

export interface DataConnectMatriculaInput {
  recibo?: string | null;
  fecha?: string | null;
  archivado?: boolean;
  paqueteId?: number | null;
  userId?: number | null;
}

export interface DataConnectModuloEstudianteInput {
  promedio?: number | null;
  matriculaId: number;
  moduloId: number;
  grupoId?: number | null;
}

export interface DataConnectUnidadDidactica {
  id: number;
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  sigla?: string | null;
  moduloId?: number | null;
}

export interface DataConnectUnidadDidacticaInput {
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  sigla?: string | null;
  moduloId?: number | null;
}

export interface DataConnectCapacidadTerminal {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  unidadDidacticaId?: number | null;
}

export interface DataConnectCapacidadTerminalInput {
  descripcion?: string | null;
  sigla?: string | null;
  unidadDidacticaId?: number | null;
}

export interface DataConnectIndicadorCapacidad {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  capacidadTerminalId?: number | null;
}

export interface DataConnectIndicadorCapacidadInput {
  descripcion?: string | null;
  sigla?: string | null;
  capacidadTerminalId?: number | null;
}

export interface DataConnectAprendizaje {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  indicadorCapacidadId?: number | null;
}

export interface DataConnectAprendizajeInput {
  descripcion?: string | null;
  sigla?: string | null;
  indicadorCapacidadId?: number | null;
}

export interface DataConnectActividad {
  id: number;
  nombre?: string | null;
  descripcion?: string | null;
  proposito?: string | null;
  ambiente?: string | null;
  duracion?: number | null;
  fecha?: string | null;
  bibliografia?: string | null;
  aprendizajeId?: number | null;
  ejeTransversalId?: number | null;
  valorInstitucionalId?: number | null;
}

export interface DataConnectActividadInput {
  nombre?: string | null;
  descripcion?: string | null;
  proposito?: string | null;
  ambiente?: string | null;
  duracion?: number | null;
  fecha?: string | null;
  bibliografia?: string | null;
  aprendizajeId?: number | null;
  ejeTransversalId?: number | null;
  valorInstitucionalId?: number | null;
}
