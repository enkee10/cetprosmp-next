# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListRoles*](#listroles)
  - [*GetRoleById*](#getrolebyid)
  - [*ListUsers*](#listusers)
  - [*GetUserByDocumentId*](#getuserbydocumentid)
  - [*ListActEconomicas*](#listacteconomicas)
  - [*ListPosts*](#listposts)
  - [*GetPostById*](#getpostbyid)
- [**Mutations**](#mutations)
  - [*CreatePost*](#createpost)
  - [*UpdatePost*](#updatepost)
  - [*DeletePost*](#deletepost)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListRoles
You can execute the `ListRoles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRoles(options?: ExecuteQueryOptions): QueryPromise<ListRolesData, undefined>;

interface ListRolesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRolesData, undefined>;
}
export const listRolesRef: ListRolesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRoles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRolesData, undefined>;

interface ListRolesRef {
  ...
  (dc: DataConnect): QueryRef<ListRolesData, undefined>;
}
export const listRolesRef: ListRolesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRolesRef:
```typescript
const name = listRolesRef.operationName;
console.log(name);
```

### Variables
The `ListRoles` query has no variables.
### Return Type
Recall that executing the `ListRoles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRolesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRolesData {
  roles: ({
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Rol_Key)[];
}
```
### Using `ListRoles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRoles } from '@dataconnect/generated';


// Call the `listRoles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRoles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRoles(dataConnect);

console.log(data.roles);

// Or, you can use the `Promise` API.
listRoles().then((response) => {
  const data = response.data;
  console.log(data.roles);
});
```

### Using `ListRoles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRolesRef } from '@dataconnect/generated';


// Call the `listRolesRef()` function to get a reference to the query.
const ref = listRolesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRolesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.roles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.roles);
});
```

## GetRoleById
You can execute the `GetRoleById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getRoleById(vars: GetRoleByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoleByIdData, GetRoleByIdVariables>;

interface GetRoleByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRoleByIdVariables): QueryRef<GetRoleByIdData, GetRoleByIdVariables>;
}
export const getRoleByIdRef: GetRoleByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRoleById(dc: DataConnect, vars: GetRoleByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRoleByIdData, GetRoleByIdVariables>;

interface GetRoleByIdRef {
  ...
  (dc: DataConnect, vars: GetRoleByIdVariables): QueryRef<GetRoleByIdData, GetRoleByIdVariables>;
}
export const getRoleByIdRef: GetRoleByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRoleByIdRef:
```typescript
const name = getRoleByIdRef.operationName;
console.log(name);
```

### Variables
The `GetRoleById` query requires an argument of type `GetRoleByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRoleByIdVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetRoleById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRoleByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRoleByIdData {
  role?: {
    id: number;
    titulo?: string | null;
    scala?: number | null;
  } & Rol_Key;
}
```
### Using `GetRoleById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRoleById, GetRoleByIdVariables } from '@dataconnect/generated';

// The `GetRoleById` query requires an argument of type `GetRoleByIdVariables`:
const getRoleByIdVars: GetRoleByIdVariables = {
  id: ..., 
};

// Call the `getRoleById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRoleById(getRoleByIdVars);
// Variables can be defined inline as well.
const { data } = await getRoleById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRoleById(dataConnect, getRoleByIdVars);

console.log(data.role);

// Or, you can use the `Promise` API.
getRoleById(getRoleByIdVars).then((response) => {
  const data = response.data;
  console.log(data.role);
});
```

### Using `GetRoleById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRoleByIdRef, GetRoleByIdVariables } from '@dataconnect/generated';

// The `GetRoleById` query requires an argument of type `GetRoleByIdVariables`:
const getRoleByIdVars: GetRoleByIdVariables = {
  id: ..., 
};

// Call the `getRoleByIdRef()` function to get a reference to the query.
const ref = getRoleByIdRef(getRoleByIdVars);
// Variables can be defined inline as well.
const ref = getRoleByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRoleByIdRef(dataConnect, getRoleByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.role);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.role);
});
```

## ListUsers
You can execute the `ListUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUsersRef:
```typescript
const name = listUsersRef.operationName;
console.log(name);
```

### Variables
The `ListUsers` query has no variables.
### Return Type
Recall that executing the `ListUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUsersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUsers } from '@dataconnect/generated';


// Call the `listUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUsers(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
listUsers().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `ListUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUsersRef } from '@dataconnect/generated';


// Call the `listUsersRef()` function to get a reference to the query.
const ref = listUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetUserByDocumentId
You can execute the `GetUserByDocumentId` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserByDocumentId(vars: GetUserByDocumentIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;

interface GetUserByDocumentIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserByDocumentIdVariables): QueryRef<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
}
export const getUserByDocumentIdRef: GetUserByDocumentIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserByDocumentId(dc: DataConnect, vars: GetUserByDocumentIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;

interface GetUserByDocumentIdRef {
  ...
  (dc: DataConnect, vars: GetUserByDocumentIdVariables): QueryRef<GetUserByDocumentIdData, GetUserByDocumentIdVariables>;
}
export const getUserByDocumentIdRef: GetUserByDocumentIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserByDocumentIdRef:
```typescript
const name = getUserByDocumentIdRef.operationName;
console.log(name);
```

### Variables
The `GetUserByDocumentId` query requires an argument of type `GetUserByDocumentIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserByDocumentIdVariables {
  documentId: string;
}
```
### Return Type
Recall that executing the `GetUserByDocumentId` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserByDocumentIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserByDocumentIdData {
  users: ({
    id: number;
  } & User_Key)[];
}
```
### Using `GetUserByDocumentId`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserByDocumentId, GetUserByDocumentIdVariables } from '@dataconnect/generated';

// The `GetUserByDocumentId` query requires an argument of type `GetUserByDocumentIdVariables`:
const getUserByDocumentIdVars: GetUserByDocumentIdVariables = {
  documentId: ..., 
};

// Call the `getUserByDocumentId()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserByDocumentId(getUserByDocumentIdVars);
// Variables can be defined inline as well.
const { data } = await getUserByDocumentId({ documentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserByDocumentId(dataConnect, getUserByDocumentIdVars);

console.log(data.users);

// Or, you can use the `Promise` API.
getUserByDocumentId(getUserByDocumentIdVars).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetUserByDocumentId`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserByDocumentIdRef, GetUserByDocumentIdVariables } from '@dataconnect/generated';

// The `GetUserByDocumentId` query requires an argument of type `GetUserByDocumentIdVariables`:
const getUserByDocumentIdVars: GetUserByDocumentIdVariables = {
  documentId: ..., 
};

// Call the `getUserByDocumentIdRef()` function to get a reference to the query.
const ref = getUserByDocumentIdRef(getUserByDocumentIdVars);
// Variables can be defined inline as well.
const ref = getUserByDocumentIdRef({ documentId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserByDocumentIdRef(dataConnect, getUserByDocumentIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## ListActEconomicas
You can execute the `ListActEconomicas` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listActEconomicas(options?: ExecuteQueryOptions): QueryPromise<ListActEconomicasData, undefined>;

interface ListActEconomicasRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListActEconomicasData, undefined>;
}
export const listActEconomicasRef: ListActEconomicasRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listActEconomicas(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListActEconomicasData, undefined>;

interface ListActEconomicasRef {
  ...
  (dc: DataConnect): QueryRef<ListActEconomicasData, undefined>;
}
export const listActEconomicasRef: ListActEconomicasRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listActEconomicasRef:
```typescript
const name = listActEconomicasRef.operationName;
console.log(name);
```

### Variables
The `ListActEconomicas` query has no variables.
### Return Type
Recall that executing the `ListActEconomicas` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListActEconomicasData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListActEconomicasData {
  actEconomicas: ({
    id: number;
    titulo?: string | null;
    descripcion?: string | null;
    familiaId?: number | null;
    especialidadId?: number | null;
  } & ActEconomica_Key)[];
}
```
### Using `ListActEconomicas`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listActEconomicas } from '@dataconnect/generated';


// Call the `listActEconomicas()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listActEconomicas();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listActEconomicas(dataConnect);

console.log(data.actEconomicas);

// Or, you can use the `Promise` API.
listActEconomicas().then((response) => {
  const data = response.data;
  console.log(data.actEconomicas);
});
```

### Using `ListActEconomicas`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listActEconomicasRef } from '@dataconnect/generated';


// Call the `listActEconomicasRef()` function to get a reference to the query.
const ref = listActEconomicasRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listActEconomicasRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.actEconomicas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.actEconomicas);
});
```

## ListPosts
You can execute the `ListPosts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPosts(options?: ExecuteQueryOptions): QueryPromise<ListPostsData, undefined>;

interface ListPostsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPostsData, undefined>;
}
export const listPostsRef: ListPostsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPosts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPostsData, undefined>;

interface ListPostsRef {
  ...
  (dc: DataConnect): QueryRef<ListPostsData, undefined>;
}
export const listPostsRef: ListPostsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPostsRef:
```typescript
const name = listPostsRef.operationName;
console.log(name);
```

### Variables
The `ListPosts` query has no variables.
### Return Type
Recall that executing the `ListPosts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPostsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListPosts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPosts } from '@dataconnect/generated';


// Call the `listPosts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPosts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPosts(dataConnect);

console.log(data.posts);

// Or, you can use the `Promise` API.
listPosts().then((response) => {
  const data = response.data;
  console.log(data.posts);
});
```

### Using `ListPosts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPostsRef } from '@dataconnect/generated';


// Call the `listPostsRef()` function to get a reference to the query.
const ref = listPostsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPostsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.posts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.posts);
});
```

## GetPostById
You can execute the `GetPostById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPostById(vars: GetPostByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetPostByIdData, GetPostByIdVariables>;

interface GetPostByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPostByIdVariables): QueryRef<GetPostByIdData, GetPostByIdVariables>;
}
export const getPostByIdRef: GetPostByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPostById(dc: DataConnect, vars: GetPostByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetPostByIdData, GetPostByIdVariables>;

interface GetPostByIdRef {
  ...
  (dc: DataConnect, vars: GetPostByIdVariables): QueryRef<GetPostByIdData, GetPostByIdVariables>;
}
export const getPostByIdRef: GetPostByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPostByIdRef:
```typescript
const name = getPostByIdRef.operationName;
console.log(name);
```

### Variables
The `GetPostById` query requires an argument of type `GetPostByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPostByIdVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetPostById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPostByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetPostById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPostById, GetPostByIdVariables } from '@dataconnect/generated';

// The `GetPostById` query requires an argument of type `GetPostByIdVariables`:
const getPostByIdVars: GetPostByIdVariables = {
  id: ..., 
};

// Call the `getPostById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPostById(getPostByIdVars);
// Variables can be defined inline as well.
const { data } = await getPostById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPostById(dataConnect, getPostByIdVars);

console.log(data.post);

// Or, you can use the `Promise` API.
getPostById(getPostByIdVars).then((response) => {
  const data = response.data;
  console.log(data.post);
});
```

### Using `GetPostById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPostByIdRef, GetPostByIdVariables } from '@dataconnect/generated';

// The `GetPostById` query requires an argument of type `GetPostByIdVariables`:
const getPostByIdVars: GetPostByIdVariables = {
  id: ..., 
};

// Call the `getPostByIdRef()` function to get a reference to the query.
const ref = getPostByIdRef(getPostByIdVars);
// Variables can be defined inline as well.
const ref = getPostByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPostByIdRef(dataConnect, getPostByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.post);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.post);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreatePost
You can execute the `CreatePost` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPost(vars: CreatePostVariables): MutationPromise<CreatePostData, CreatePostVariables>;

interface CreatePostRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePostVariables): MutationRef<CreatePostData, CreatePostVariables>;
}
export const createPostRef: CreatePostRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPost(dc: DataConnect, vars: CreatePostVariables): MutationPromise<CreatePostData, CreatePostVariables>;

interface CreatePostRef {
  ...
  (dc: DataConnect, vars: CreatePostVariables): MutationRef<CreatePostData, CreatePostVariables>;
}
export const createPostRef: CreatePostRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPostRef:
```typescript
const name = createPostRef.operationName;
console.log(name);
```

### Variables
The `CreatePost` mutation requires an argument of type `CreatePostVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `CreatePost` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePostData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePostData {
  post_insert: Post_Key;
}
```
### Using `CreatePost`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPost, CreatePostVariables } from '@dataconnect/generated';

// The `CreatePost` mutation requires an argument of type `CreatePostVariables`:
const createPostVars: CreatePostVariables = {
  titulo: ..., 
  slug: ..., 
  tipo: ..., 
  contenido: ..., // optional
  resumen: ..., // optional
  imagenPortadaUrl: ..., // optional
  estado: ..., 
  comentariosActivos: ..., 
  entidadTipo: ..., // optional
  entidadId: ..., // optional
  fechaPublicacion: ..., // optional
};

// Call the `createPost()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPost(createPostVars);
// Variables can be defined inline as well.
const { data } = await createPost({ titulo: ..., slug: ..., tipo: ..., contenido: ..., resumen: ..., imagenPortadaUrl: ..., estado: ..., comentariosActivos: ..., entidadTipo: ..., entidadId: ..., fechaPublicacion: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPost(dataConnect, createPostVars);

console.log(data.post_insert);

// Or, you can use the `Promise` API.
createPost(createPostVars).then((response) => {
  const data = response.data;
  console.log(data.post_insert);
});
```

### Using `CreatePost`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPostRef, CreatePostVariables } from '@dataconnect/generated';

// The `CreatePost` mutation requires an argument of type `CreatePostVariables`:
const createPostVars: CreatePostVariables = {
  titulo: ..., 
  slug: ..., 
  tipo: ..., 
  contenido: ..., // optional
  resumen: ..., // optional
  imagenPortadaUrl: ..., // optional
  estado: ..., 
  comentariosActivos: ..., 
  entidadTipo: ..., // optional
  entidadId: ..., // optional
  fechaPublicacion: ..., // optional
};

// Call the `createPostRef()` function to get a reference to the mutation.
const ref = createPostRef(createPostVars);
// Variables can be defined inline as well.
const ref = createPostRef({ titulo: ..., slug: ..., tipo: ..., contenido: ..., resumen: ..., imagenPortadaUrl: ..., estado: ..., comentariosActivos: ..., entidadTipo: ..., entidadId: ..., fechaPublicacion: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPostRef(dataConnect, createPostVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.post_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.post_insert);
});
```

## UpdatePost
You can execute the `UpdatePost` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updatePost(vars: UpdatePostVariables): MutationPromise<UpdatePostData, UpdatePostVariables>;

interface UpdatePostRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdatePostVariables): MutationRef<UpdatePostData, UpdatePostVariables>;
}
export const updatePostRef: UpdatePostRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updatePost(dc: DataConnect, vars: UpdatePostVariables): MutationPromise<UpdatePostData, UpdatePostVariables>;

interface UpdatePostRef {
  ...
  (dc: DataConnect, vars: UpdatePostVariables): MutationRef<UpdatePostData, UpdatePostVariables>;
}
export const updatePostRef: UpdatePostRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updatePostRef:
```typescript
const name = updatePostRef.operationName;
console.log(name);
```

### Variables
The `UpdatePost` mutation requires an argument of type `UpdatePostVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpdatePost` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdatePostData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdatePostData {
  post_update?: Post_Key | null;
}
```
### Using `UpdatePost`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updatePost, UpdatePostVariables } from '@dataconnect/generated';

// The `UpdatePost` mutation requires an argument of type `UpdatePostVariables`:
const updatePostVars: UpdatePostVariables = {
  id: ..., 
  titulo: ..., 
  slug: ..., 
  tipo: ..., 
  contenido: ..., // optional
  resumen: ..., // optional
  imagenPortadaUrl: ..., // optional
  estado: ..., 
  comentariosActivos: ..., 
  entidadTipo: ..., // optional
  entidadId: ..., // optional
  fechaPublicacion: ..., // optional
};

// Call the `updatePost()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updatePost(updatePostVars);
// Variables can be defined inline as well.
const { data } = await updatePost({ id: ..., titulo: ..., slug: ..., tipo: ..., contenido: ..., resumen: ..., imagenPortadaUrl: ..., estado: ..., comentariosActivos: ..., entidadTipo: ..., entidadId: ..., fechaPublicacion: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updatePost(dataConnect, updatePostVars);

console.log(data.post_update);

// Or, you can use the `Promise` API.
updatePost(updatePostVars).then((response) => {
  const data = response.data;
  console.log(data.post_update);
});
```

### Using `UpdatePost`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updatePostRef, UpdatePostVariables } from '@dataconnect/generated';

// The `UpdatePost` mutation requires an argument of type `UpdatePostVariables`:
const updatePostVars: UpdatePostVariables = {
  id: ..., 
  titulo: ..., 
  slug: ..., 
  tipo: ..., 
  contenido: ..., // optional
  resumen: ..., // optional
  imagenPortadaUrl: ..., // optional
  estado: ..., 
  comentariosActivos: ..., 
  entidadTipo: ..., // optional
  entidadId: ..., // optional
  fechaPublicacion: ..., // optional
};

// Call the `updatePostRef()` function to get a reference to the mutation.
const ref = updatePostRef(updatePostVars);
// Variables can be defined inline as well.
const ref = updatePostRef({ id: ..., titulo: ..., slug: ..., tipo: ..., contenido: ..., resumen: ..., imagenPortadaUrl: ..., estado: ..., comentariosActivos: ..., entidadTipo: ..., entidadId: ..., fechaPublicacion: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updatePostRef(dataConnect, updatePostVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.post_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.post_update);
});
```

## DeletePost
You can execute the `DeletePost` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deletePost(vars: DeletePostVariables): MutationPromise<DeletePostData, DeletePostVariables>;

interface DeletePostRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePostVariables): MutationRef<DeletePostData, DeletePostVariables>;
}
export const deletePostRef: DeletePostRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePost(dc: DataConnect, vars: DeletePostVariables): MutationPromise<DeletePostData, DeletePostVariables>;

interface DeletePostRef {
  ...
  (dc: DataConnect, vars: DeletePostVariables): MutationRef<DeletePostData, DeletePostVariables>;
}
export const deletePostRef: DeletePostRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePostRef:
```typescript
const name = deletePostRef.operationName;
console.log(name);
```

### Variables
The `DeletePost` mutation requires an argument of type `DeletePostVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeletePostVariables {
  id: number;
}
```
### Return Type
Recall that executing the `DeletePost` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePostData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePostData {
  post_delete?: Post_Key | null;
}
```
### Using `DeletePost`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePost, DeletePostVariables } from '@dataconnect/generated';

// The `DeletePost` mutation requires an argument of type `DeletePostVariables`:
const deletePostVars: DeletePostVariables = {
  id: ..., 
};

// Call the `deletePost()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePost(deletePostVars);
// Variables can be defined inline as well.
const { data } = await deletePost({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePost(dataConnect, deletePostVars);

console.log(data.post_delete);

// Or, you can use the `Promise` API.
deletePost(deletePostVars).then((response) => {
  const data = response.data;
  console.log(data.post_delete);
});
```

### Using `DeletePost`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePostRef, DeletePostVariables } from '@dataconnect/generated';

// The `DeletePost` mutation requires an argument of type `DeletePostVariables`:
const deletePostVars: DeletePostVariables = {
  id: ..., 
};

// Call the `deletePostRef()` function to get a reference to the mutation.
const ref = deletePostRef(deletePostVars);
// Variables can be defined inline as well.
const ref = deletePostRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePostRef(dataConnect, deletePostVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.post_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.post_delete);
});
```

