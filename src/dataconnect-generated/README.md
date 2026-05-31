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
- [**Mutations**](#mutations)

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

# Mutations

No mutations were generated for the `default` connector.

If you want to learn more about how to use mutations in Data Connect, you can follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

