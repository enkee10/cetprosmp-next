import { ListRolesData, GetRoleByIdData, GetRoleByIdVariables, ListUsersData, GetUserByDocumentIdData, GetUserByDocumentIdVariables, ListActEconomicasData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListRoles(options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;
export function useListRoles(dc: DataConnect, options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;

export function useGetRoleById(vars: GetRoleByIdVariables, options?: useDataConnectQueryOptions<GetRoleByIdData>): UseDataConnectQueryResult<GetRoleByIdData, GetRoleByIdVariables>;
export function useGetRoleById(dc: DataConnect, vars: GetRoleByIdVariables, options?: useDataConnectQueryOptions<GetRoleByIdData>): UseDataConnectQueryResult<GetRoleByIdData, GetRoleByIdVariables>;

export function useListUsers(options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;
export function useListUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;

export function useGetUserByDocumentId(vars: GetUserByDocumentIdVariables, options?: useDataConnectQueryOptions<GetUserByDocumentIdData>): UseDataConnectQueryResult<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
export function useGetUserByDocumentId(dc: DataConnect, vars: GetUserByDocumentIdVariables, options?: useDataConnectQueryOptions<GetUserByDocumentIdData>): UseDataConnectQueryResult<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;

export function useListActEconomicas(options?: useDataConnectQueryOptions<ListActEconomicasData>): UseDataConnectQueryResult<ListActEconomicasData, undefined>;
export function useListActEconomicas(dc: DataConnect, options?: useDataConnectQueryOptions<ListActEconomicasData>): UseDataConnectQueryResult<ListActEconomicasData, undefined>;
