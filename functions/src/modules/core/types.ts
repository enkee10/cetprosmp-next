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

export interface DataConnectRoleInput {
  titulo?: string | null;
  scala?: number | null;
}

export interface DataConnectSector {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
}

export interface DataConnectSectorInput {
  titulo?: string | null;
  descripcion?: string | null;
}

export interface DataConnectActEconomica {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  familiaId?: number | null;
  especialidadId?: number | null;
}

export interface DataConnectActEconomicaInput {
  titulo?: string | null;
  descripcion?: string | null;
  familiaId?: number | null;
  especialidadId?: number | null;
}

export interface DataConnectFamilia {
  id: number;
  titulo?: string | null;
  descripcion?: string | null;
  sectorId?: number | null;
}

export interface DataConnectFamiliaInput {
  titulo?: string | null;
  descripcion?: string | null;
  sectorId?: number | null;
}

export interface DataConnectEspecialidad {
  id: number;
  titulo?: string | null;
  tituloComercial?: string | null;
  descripcion?: string | null;
  descripcion2?: string | null;
  slug?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectEspecialidadInput {
  titulo?: string | null;
  tituloComercial?: string | null;
  descripcion?: string | null;
  descripcion2?: string | null;
  slug?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectCarrera {
  id: number;
  nombre?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  tipo?: string | null;
  estado?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectCarreraInput {
  nombre?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  tipo?: string | null;
  estado?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  actEconomicaId?: number | null;
}

export interface DataConnectPlan {
  id: number;
  version?: string | null;
  duracion?: string | null;
  creditos?: number | null;
  nivel?: string | null;
  tituloComercial?: string | null;
  slug?: string | null;
  descripcion2?: string | null;
  carreraId?: number | null;
}

export interface DataConnectPlanInput {
  version?: string | null;
  duracion?: string | null;
  creditos?: number | null;
  nivel?: string | null;
  tituloComercial?: string | null;
  slug?: string | null;
  descripcion2?: string | null;
  carreraId?: number | null;
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
  descripcion2?: string | null;
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
  descripcion2?: string | null;
  planId?: number | null;
}
