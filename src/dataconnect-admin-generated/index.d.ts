import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface ActEconomica_Key {
  id: number;
  __typename?: 'ActEconomica_Key';
}

export interface Calendario_Key {
  id: number;
  __typename?: 'Calendario_Key';
}

export interface Carrera_Key {
  id: number;
  __typename?: 'Carrera_Key';
}

export interface DatoGeneral_Key {
  id: number;
  __typename?: 'DatoGeneral_Key';
}

export interface Especialidad_Key {
  id: number;
  __typename?: 'Especialidad_Key';
}

export interface Familia_Key {
  id: number;
  __typename?: 'Familia_Key';
}

export interface GetPermisoByIdData {
  permiso?: {
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Permiso_Key;
}

export interface GetPermisoByIdVariables {
  id: number;
}

export interface GetUserByDocumentIdData {
  users: ({
    id: number;
  } & User_Key)[];
}

export interface GetUserByDocumentIdVariables {
  documentId: string;
}

export interface Grupo_Key {
  id: number;
  __typename?: 'Grupo_Key';
}

export interface ListActEconomicasData {
  actEconomicas: ({
    id: number;
    titulo?: string | null;
    descripcion?: string | null;
    familiaId?: number | null;
    especialidadId?: number | null;
  } & ActEconomica_Key)[];
}

export interface ListPermisosData {
  permisos: ({
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Permiso_Key)[];
}

export interface ListUsersData {
  users: ({
    id: number;
    documentId?: string | null;
    username?: string | null;
    email?: string | null;
    blocked?: boolean | null;
    avatar?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    celular?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    tipoDocumento?: string | null;
    dni?: string | null;
    sexo?: string | null;
    estadoCivil?: string | null;
    instruccion?: string | null;
    fechaNacimiento?: TimestampString | null;
    permisoId?: number | null;
  } & User_Key)[];
}

export interface MatriculaGrupo_Key {
  matriculaId: number;
  grupoId: number;
  __typename?: 'MatriculaGrupo_Key';
}

export interface MatriculaPaquete_Key {
  matriculaId: number;
  paqueteId: number;
  __typename?: 'MatriculaPaquete_Key';
}

export interface MatriculaUser_Key {
  matriculaId: number;
  userId: number;
  __typename?: 'MatriculaUser_Key';
}

export interface Matricula_Key {
  id: number;
  __typename?: 'Matricula_Key';
}

export interface ModuloVideo_Key {
  id: number;
  __typename?: 'ModuloVideo_Key';
}

export interface Modulo_Key {
  id: number;
  __typename?: 'Modulo_Key';
}

export interface PaqueteGrupo_Key {
  paqueteId: number;
  grupoId: number;
  __typename?: 'PaqueteGrupo_Key';
}

export interface Paquete_Key {
  id: number;
  __typename?: 'Paquete_Key';
}

export interface Permiso_Key {
  id: number;
  __typename?: 'Permiso_Key';
}

export interface PersonalEspecialidad_Key {
  personalId: number;
  especialidadId: number;
  __typename?: 'PersonalEspecialidad_Key';
}

export interface Personal_Key {
  id: number;
  __typename?: 'Personal_Key';
}

export interface PublicacionVideo_Key {
  id: number;
  __typename?: 'PublicacionVideo_Key';
}

export interface Publicacion_Key {
  id: number;
  __typename?: 'Publicacion_Key';
}

export interface Sector_Key {
  id: number;
  __typename?: 'Sector_Key';
}

export interface Semestre_Key {
  id: number;
  __typename?: 'Semestre_Key';
}

export interface User_Key {
  id: number;
  __typename?: 'User_Key';
}

export interface VideoYoutube_Key {
  id: number;
  __typename?: 'VideoYoutube_Key';
}

/** Generated Node Admin SDK operation action function for the 'ListPermisos' Query. Allow users to execute without passing in DataConnect. */
export function listPermisos(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPermisosData>>;
/** Generated Node Admin SDK operation action function for the 'ListPermisos' Query. Allow users to pass in custom DataConnect instances. */
export function listPermisos(options?: OperationOptions): Promise<ExecuteOperationResponse<ListPermisosData>>;

/** Generated Node Admin SDK operation action function for the 'GetPermisoById' Query. Allow users to execute without passing in DataConnect. */
export function getPermisoById(dc: DataConnect, vars: GetPermisoByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPermisoByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetPermisoById' Query. Allow users to pass in custom DataConnect instances. */
export function getPermisoById(vars: GetPermisoByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPermisoByIdData>>;

/** Generated Node Admin SDK operation action function for the 'ListUsers' Query. Allow users to execute without passing in DataConnect. */
export function listUsers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListUsersData>>;
/** Generated Node Admin SDK operation action function for the 'ListUsers' Query. Allow users to pass in custom DataConnect instances. */
export function listUsers(options?: OperationOptions): Promise<ExecuteOperationResponse<ListUsersData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserByDocumentId' Query. Allow users to execute without passing in DataConnect. */
export function getUserByDocumentId(dc: DataConnect, vars: GetUserByDocumentIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserByDocumentIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserByDocumentId' Query. Allow users to pass in custom DataConnect instances. */
export function getUserByDocumentId(vars: GetUserByDocumentIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserByDocumentIdData>>;

/** Generated Node Admin SDK operation action function for the 'ListActEconomicas' Query. Allow users to execute without passing in DataConnect. */
export function listActEconomicas(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListActEconomicasData>>;
/** Generated Node Admin SDK operation action function for the 'ListActEconomicas' Query. Allow users to pass in custom DataConnect instances. */
export function listActEconomicas(options?: OperationOptions): Promise<ExecuteOperationResponse<ListActEconomicasData>>;

