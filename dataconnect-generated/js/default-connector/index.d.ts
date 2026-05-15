import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface ListModulosTitulosData {
  modulos: ({
    titulo?: string | null;
  })[];
}

export interface Modulo_Key {
  id: number;
  __typename?: 'Modulo_Key';
}

interface ListModulosTitulosRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListModulosTitulosData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListModulosTitulosData, undefined>;
  operationName: string;
}
export const listModulosTitulosRef: ListModulosTitulosRef;

export function listModulosTitulos(options?: ExecuteQueryOptions): QueryPromise<ListModulosTitulosData, undefined>;
export function listModulosTitulos(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListModulosTitulosData, undefined>;

