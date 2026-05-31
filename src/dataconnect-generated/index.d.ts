import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

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

export interface GetRoleByIdData {
  role?: {
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Rol_Key;
}

export interface GetRoleByIdVariables {
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

export interface ListRolesData {
  roles: ({
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Rol_Key)[];
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
    rolId?: number | null;
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

export interface Rol_Key {
  id: number;
  __typename?: 'Rol_Key';
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

interface ListRolesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRolesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRolesData, undefined>;
  operationName: string;
}
export const listRolesRef: ListRolesRef;

export function listRoles(options?: ExecuteQueryOptions): QueryPromise<ListRolesData, undefined>;
export function listRoles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRolesData, undefined>;

interface GetRoleByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRoleByIdVariables): QueryRef<GetRoleByIdData, GetRoleByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetRoleByIdVariables): QueryRef<GetRoleByIdData, GetRoleByIdVariables>;
  operationName: string;
}
export const getRoleByIdRef: GetRoleByIdRef;

export function getRoleById(vars: GetRoleByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoleByIdData, GetRoleByIdVariables>;
export function getRoleById(dc: DataConnect, vars: GetRoleByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoleByIdData, GetRoleByIdVariables>;

interface ListUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
  operationName: string;
}
export const listUsersRef: ListUsersRef;

export function listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;
export function listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface GetUserByDocumentIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserByDocumentIdVariables): QueryRef<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserByDocumentIdVariables): QueryRef<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
  operationName: string;
}
export const getUserByDocumentIdRef: GetUserByDocumentIdRef;

export function getUserByDocumentId(vars: GetUserByDocumentIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
export function getUserByDocumentId(dc: DataConnect, vars: GetUserByDocumentIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;

interface ListActEconomicasRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListActEconomicasData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListActEconomicasData, undefined>;
  operationName: string;
}
export const listActEconomicasRef: ListActEconomicasRef;

export function listActEconomicas(options?: ExecuteQueryOptions): QueryPromise<ListActEconomicasData, undefined>;
export function listActEconomicas(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListActEconomicasData, undefined>;

