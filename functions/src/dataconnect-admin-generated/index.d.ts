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

export interface CreatePostData {
  post_insert: Post_Key;
}

export interface CreatePostVariables {
  titulo: string;
  slug: string;
  tipo: string;
  contenido?: string | null;
  resumen?: string | null;
  imagenPortadaUrl?: string | null;
  estado: string;
  comentariosActivos: boolean;
  entidadTipo?: string | null;
  entidadId?: string | null;
  fechaPublicacion?: TimestampString | null;
}

export interface DatoGeneral_Key {
  id: number;
  __typename?: 'DatoGeneral_Key';
}

export interface DeletePostData {
  post_delete?: Post_Key | null;
}

export interface DeletePostVariables {
  id: number;
}

export interface Especialidad_Key {
  id: number;
  __typename?: 'Especialidad_Key';
}

export interface Familia_Key {
  id: number;
  __typename?: 'Familia_Key';
}

export interface GetPostByIdData {
  post?: {
    id: number;
    titulo: string;
    slug: string;
    tipo: string;
    contenido?: string | null;
    resumen?: string | null;
    imagenPortadaUrl?: string | null;
    estado: string;
    comentariosActivos: boolean;
    entidadTipo?: string | null;
    entidadId?: string | null;
    creadoPorUid?: string | null;
    fechaCreacion?: TimestampString | null;
    fechaActualizacion?: TimestampString | null;
    fechaPublicacion?: TimestampString | null;
  } & Post_Key;
}

export interface GetPostByIdVariables {
  id: number;
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

export interface ListPostsData {
  posts: ({
    id: number;
    titulo: string;
    slug: string;
    tipo: string;
    contenido?: string | null;
    resumen?: string | null;
    imagenPortadaUrl?: string | null;
    estado: string;
    comentariosActivos: boolean;
    entidadTipo?: string | null;
    entidadId?: string | null;
    creadoPorUid?: string | null;
    fechaCreacion?: TimestampString | null;
    fechaActualizacion?: TimestampString | null;
    fechaPublicacion?: TimestampString | null;
  } & Post_Key)[];
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

export interface Plan_Key {
  id: number;
  __typename?: 'Plan_Key';
}

export interface Post_Key {
  id: number;
  __typename?: 'Post_Key';
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

export interface UpdatePostData {
  post_update?: Post_Key | null;
}

export interface UpdatePostVariables {
  id: number;
  titulo: string;
  slug: string;
  tipo: string;
  contenido?: string | null;
  resumen?: string | null;
  imagenPortadaUrl?: string | null;
  estado: string;
  comentariosActivos: boolean;
  entidadTipo?: string | null;
  entidadId?: string | null;
  fechaPublicacion?: TimestampString | null;
}

export interface User_Key {
  id: number;
  __typename?: 'User_Key';
}

export interface VideoYoutube_Key {
  id: number;
  __typename?: 'VideoYoutube_Key';
}

/** Generated Node Admin SDK operation action function for the 'ListRoles' Query. Allow users to execute without passing in DataConnect. */
export function listRoles(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListRolesData>>;
/** Generated Node Admin SDK operation action function for the 'ListRoles' Query. Allow users to pass in custom DataConnect instances. */
export function listRoles(options?: OperationOptions): Promise<ExecuteOperationResponse<ListRolesData>>;

/** Generated Node Admin SDK operation action function for the 'GetRoleById' Query. Allow users to execute without passing in DataConnect. */
export function getRoleById(dc: DataConnect, vars: GetRoleByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetRoleByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetRoleById' Query. Allow users to pass in custom DataConnect instances. */
export function getRoleById(vars: GetRoleByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetRoleByIdData>>;

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

/** Generated Node Admin SDK operation action function for the 'ListPosts' Query. Allow users to execute without passing in DataConnect. */
export function listPosts(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPostsData>>;
/** Generated Node Admin SDK operation action function for the 'ListPosts' Query. Allow users to pass in custom DataConnect instances. */
export function listPosts(options?: OperationOptions): Promise<ExecuteOperationResponse<ListPostsData>>;

/** Generated Node Admin SDK operation action function for the 'GetPostById' Query. Allow users to execute without passing in DataConnect. */
export function getPostById(dc: DataConnect, vars: GetPostByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPostByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetPostById' Query. Allow users to pass in custom DataConnect instances. */
export function getPostById(vars: GetPostByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPostByIdData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePost' Mutation. Allow users to execute without passing in DataConnect. */
export function createPost(dc: DataConnect, vars: CreatePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePostData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePost' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPost(vars: CreatePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePostData>>;

/** Generated Node Admin SDK operation action function for the 'UpdatePost' Mutation. Allow users to execute without passing in DataConnect. */
export function updatePost(dc: DataConnect, vars: UpdatePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdatePostData>>;
/** Generated Node Admin SDK operation action function for the 'UpdatePost' Mutation. Allow users to pass in custom DataConnect instances. */
export function updatePost(vars: UpdatePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdatePostData>>;

/** Generated Node Admin SDK operation action function for the 'DeletePost' Mutation. Allow users to execute without passing in DataConnect. */
export function deletePost(dc: DataConnect, vars: DeletePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePostData>>;
/** Generated Node Admin SDK operation action function for the 'DeletePost' Mutation. Allow users to pass in custom DataConnect instances. */
export function deletePost(vars: DeletePostVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePostData>>;

