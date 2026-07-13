import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Accion_Key {
  id: number;
  __typename?: 'Accion_Key';
}

export interface ActEconomica_Key {
  id: number;
  __typename?: 'ActEconomica_Key';
}

export interface Actividad_Key {
  id: number;
  __typename?: 'Actividad_Key';
}

export interface Anio_Key {
  id: number;
  __typename?: 'Anio_Key';
}

export interface AppSetting_Key {
  id: number;
  __typename?: 'AppSetting_Key';
}

export interface Aprendizaje_Key {
  id: number;
  __typename?: 'Aprendizaje_Key';
}

export interface Asistencia_Key {
  id: number;
  __typename?: 'Asistencia_Key';
}

export interface AspectoEvaluacionEstudiante_Key {
  id: number;
  __typename?: 'AspectoEvaluacionEstudiante_Key';
}

export interface AspectoEvaluacion_Key {
  id: number;
  __typename?: 'AspectoEvaluacion_Key';
}

export interface Calendario_Key {
  id: number;
  __typename?: 'Calendario_Key';
}

export interface CapacidadTerminalEstudiante_Key {
  id: number;
  __typename?: 'CapacidadTerminalEstudiante_Key';
}

export interface CapacidadTerminal_Key {
  id: number;
  __typename?: 'CapacidadTerminal_Key';
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

export interface EfsrtPppEstudiante_Key {
  id: number;
  __typename?: 'EfsrtPppEstudiante_Key';
}

export interface EfsrtPppNota_Key {
  id: number;
  __typename?: 'EfsrtPppNota_Key';
}

export interface EfsrtPppPractica_Key {
  id: number;
  __typename?: 'EfsrtPppPractica_Key';
}

export interface EjeTransversal_Key {
  id: number;
  __typename?: 'EjeTransversal_Key';
}

export interface Especialidad_Key {
  id: number;
  __typename?: 'Especialidad_Key';
}

export interface EvaluacionEstudiante_Key {
  id: number;
  __typename?: 'EvaluacionEstudiante_Key';
}

export interface Evaluacion_Key {
  id: number;
  __typename?: 'Evaluacion_Key';
}

export interface EventoOcurrencia_Key {
  id: number;
  __typename?: 'EventoOcurrencia_Key';
}

export interface EventoRecurrencia_Key {
  id: number;
  __typename?: 'EventoRecurrencia_Key';
}

export interface EventoRelacion_Key {
  id: number;
  __typename?: 'EventoRelacion_Key';
}

export interface Evento_Key {
  id: number;
  __typename?: 'Evento_Key';
}

export interface Familia_Key {
  id: number;
  __typename?: 'Familia_Key';
}

export interface FaseMetodo_Key {
  id: number;
  __typename?: 'FaseMetodo_Key';
}

export interface FaseRecurso_Key {
  id: number;
  __typename?: 'FaseRecurso_Key';
}

export interface FaseTecnica_Key {
  id: number;
  __typename?: 'FaseTecnica_Key';
}

export interface Fase_Key {
  id: number;
  __typename?: 'Fase_Key';
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

export interface GrupoModuloUnidadDidactica_Key {
  id: number;
  __typename?: 'GrupoModuloUnidadDidactica_Key';
}

export interface GrupoModulo_Key {
  id: number;
  __typename?: 'GrupoModulo_Key';
}

export interface Grupo_Key {
  id: number;
  __typename?: 'Grupo_Key';
}

export interface Horario_Key {
  id: number;
  __typename?: 'Horario_Key';
}

export interface IndicadorCapacidadEstudiante_Key {
  id: number;
  __typename?: 'IndicadorCapacidadEstudiante_Key';
}

export interface IndicadorCapacidad_Key {
  id: number;
  __typename?: 'IndicadorCapacidad_Key';
}

export interface ListActEconomicasData {
  actEconomicas: ({
    id: number;
    titulo?: string | null;
    descripcion?: string | null;
    familiaId?: number | null;
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
    nacionalidad?: string | null;
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

export interface Metodo_Key {
  id: number;
  __typename?: 'Metodo_Key';
}

export interface ModuloEstudiante_Key {
  id: number;
  __typename?: 'ModuloEstudiante_Key';
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

export interface PaqueteModulo_Key {
  id: number;
  __typename?: 'PaqueteModulo_Key';
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

export interface PlanModulo_Key {
  id: number;
  __typename?: 'PlanModulo_Key';
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

export interface Recordatorio_Key {
  id: number;
  __typename?: 'Recordatorio_Key';
}

export interface Recurso_Key {
  id: number;
  __typename?: 'Recurso_Key';
}

export interface RegistroAcademicoDocumento_Key {
  id: number;
  __typename?: 'RegistroAcademicoDocumento_Key';
}

export interface Rol_Key {
  id: number;
  __typename?: 'Rol_Key';
}

export interface RolePermission_Key {
  id: number;
  __typename?: 'RolePermission_Key';
}

export interface Sector_Key {
  id: number;
  __typename?: 'Sector_Key';
}

export interface Semestre_Key {
  id: number;
  __typename?: 'Semestre_Key';
}

export interface Tecnica_Key {
  id: number;
  __typename?: 'Tecnica_Key';
}

export interface TipoCarrera_Key {
  id: number;
  __typename?: 'TipoCarrera_Key';
}

export interface Turno_Key {
  id: number;
  __typename?: 'Turno_Key';
}

export interface UnidadDidacticaEstudiante_Key {
  id: number;
  __typename?: 'UnidadDidacticaEstudiante_Key';
}

export interface UnidadDidacticaModulo_Key {
  id: number;
  __typename?: 'UnidadDidacticaModulo_Key';
}

export interface UnidadDidactica_Key {
  id: number;
  __typename?: 'UnidadDidactica_Key';
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

export interface ValorInstitucional_Key {
  id: number;
  __typename?: 'ValorInstitucional_Key';
}

export interface VideoYoutube_Key {
  id: number;
  __typename?: 'VideoYoutube_Key';
}

interface CreatePostRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePostVariables): MutationRef<CreatePostData, CreatePostVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePostVariables): MutationRef<CreatePostData, CreatePostVariables>;
  operationName: string;
}
export const createPostRef: CreatePostRef;

export function createPost(vars: CreatePostVariables): MutationPromise<CreatePostData, CreatePostVariables>;
export function createPost(dc: DataConnect, vars: CreatePostVariables): MutationPromise<CreatePostData, CreatePostVariables>;

interface UpdatePostRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdatePostVariables): MutationRef<UpdatePostData, UpdatePostVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdatePostVariables): MutationRef<UpdatePostData, UpdatePostVariables>;
  operationName: string;
}
export const updatePostRef: UpdatePostRef;

export function updatePost(vars: UpdatePostVariables): MutationPromise<UpdatePostData, UpdatePostVariables>;
export function updatePost(dc: DataConnect, vars: UpdatePostVariables): MutationPromise<UpdatePostData, UpdatePostVariables>;

interface DeletePostRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePostVariables): MutationRef<DeletePostData, DeletePostVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeletePostVariables): MutationRef<DeletePostData, DeletePostVariables>;
  operationName: string;
}
export const deletePostRef: DeletePostRef;

export function deletePost(vars: DeletePostVariables): MutationPromise<DeletePostData, DeletePostVariables>;
export function deletePost(dc: DataConnect, vars: DeletePostVariables): MutationPromise<DeletePostData, DeletePostVariables>;

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

interface ListPostsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPostsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPostsData, undefined>;
  operationName: string;
}
export const listPostsRef: ListPostsRef;

export function listPosts(options?: ExecuteQueryOptions): QueryPromise<ListPostsData, undefined>;
export function listPosts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPostsData, undefined>;

interface GetPostByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPostByIdVariables): QueryRef<GetPostByIdData, GetPostByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPostByIdVariables): QueryRef<GetPostByIdData, GetPostByIdVariables>;
  operationName: string;
}
export const getPostByIdRef: GetPostByIdRef;

export function getPostById(vars: GetPostByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetPostByIdData, GetPostByIdVariables>;
export function getPostById(dc: DataConnect, vars: GetPostByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetPostByIdData, GetPostByIdVariables>;

