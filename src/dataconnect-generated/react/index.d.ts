import { CreatePostData, CreatePostVariables, UpdatePostData, UpdatePostVariables, DeletePostData, DeletePostVariables, ListRolesData, GetRoleByIdData, GetRoleByIdVariables, ListUsersData, GetUserByDocumentIdData, GetUserByDocumentIdVariables, ListActEconomicasData, ListPostsData, GetPostByIdData, GetPostByIdVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreatePost(options?: useDataConnectMutationOptions<CreatePostData, FirebaseError, CreatePostVariables>): UseDataConnectMutationResult<CreatePostData, CreatePostVariables>;
export function useCreatePost(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePostData, FirebaseError, CreatePostVariables>): UseDataConnectMutationResult<CreatePostData, CreatePostVariables>;

export function useUpdatePost(options?: useDataConnectMutationOptions<UpdatePostData, FirebaseError, UpdatePostVariables>): UseDataConnectMutationResult<UpdatePostData, UpdatePostVariables>;
export function useUpdatePost(dc: DataConnect, options?: useDataConnectMutationOptions<UpdatePostData, FirebaseError, UpdatePostVariables>): UseDataConnectMutationResult<UpdatePostData, UpdatePostVariables>;

export function useDeletePost(options?: useDataConnectMutationOptions<DeletePostData, FirebaseError, DeletePostVariables>): UseDataConnectMutationResult<DeletePostData, DeletePostVariables>;
export function useDeletePost(dc: DataConnect, options?: useDataConnectMutationOptions<DeletePostData, FirebaseError, DeletePostVariables>): UseDataConnectMutationResult<DeletePostData, DeletePostVariables>;

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

export function useListPosts(options?: useDataConnectQueryOptions<ListPostsData>): UseDataConnectQueryResult<ListPostsData, undefined>;
export function useListPosts(dc: DataConnect, options?: useDataConnectQueryOptions<ListPostsData>): UseDataConnectQueryResult<ListPostsData, undefined>;

export function useGetPostById(vars: GetPostByIdVariables, options?: useDataConnectQueryOptions<GetPostByIdData>): UseDataConnectQueryResult<GetPostByIdData, GetPostByIdVariables>;
export function useGetPostById(dc: DataConnect, vars: GetPostByIdVariables, options?: useDataConnectQueryOptions<GetPostByIdData>): UseDataConnectQueryResult<GetPostByIdData, GetPostByIdVariables>;
