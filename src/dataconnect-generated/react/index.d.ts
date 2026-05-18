import { ListPermisosData, GetPermisoByIdData, GetPermisoByIdVariables, ListUsersData, GetUserByDocumentIdData, GetUserByDocumentIdVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListPermisos(options?: useDataConnectQueryOptions<ListPermisosData>): UseDataConnectQueryResult<ListPermisosData, undefined>;
export function useListPermisos(dc: DataConnect, options?: useDataConnectQueryOptions<ListPermisosData>): UseDataConnectQueryResult<ListPermisosData, undefined>;

export function useGetPermisoById(vars: GetPermisoByIdVariables, options?: useDataConnectQueryOptions<GetPermisoByIdData>): UseDataConnectQueryResult<GetPermisoByIdData, GetPermisoByIdVariables>;
export function useGetPermisoById(dc: DataConnect, vars: GetPermisoByIdVariables, options?: useDataConnectQueryOptions<GetPermisoByIdData>): UseDataConnectQueryResult<GetPermisoByIdData, GetPermisoByIdVariables>;

export function useListUsers(options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;
export function useListUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;

export function useGetUserByDocumentId(vars: GetUserByDocumentIdVariables, options?: useDataConnectQueryOptions<GetUserByDocumentIdData>): UseDataConnectQueryResult<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
export function useGetUserByDocumentId(dc: DataConnect, vars: GetUserByDocumentIdVariables, options?: useDataConnectQueryOptions<GetUserByDocumentIdData>): UseDataConnectQueryResult<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
