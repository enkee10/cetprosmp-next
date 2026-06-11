# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreatePost, useUpdatePost, useDeletePost, useListRoles, useGetRoleById, useListUsers, useGetUserByDocumentId, useListActEconomicas, useListPosts, useGetPostById } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreatePost(createPostVars);

const { data, isPending, isSuccess, isError, error } = useUpdatePost(updatePostVars);

const { data, isPending, isSuccess, isError, error } = useDeletePost(deletePostVars);

const { data, isPending, isSuccess, isError, error } = useListRoles();

const { data, isPending, isSuccess, isError, error } = useGetRoleById(getRoleByIdVars);

const { data, isPending, isSuccess, isError, error } = useListUsers();

const { data, isPending, isSuccess, isError, error } = useGetUserByDocumentId(getUserByDocumentIdVars);

const { data, isPending, isSuccess, isError, error } = useListActEconomicas();

const { data, isPending, isSuccess, isError, error } = useListPosts();

const { data, isPending, isSuccess, isError, error } = useGetPostById(getPostByIdVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createPost, updatePost, deletePost, listRoles, getRoleById, listUsers, getUserByDocumentId, listActEconomicas, listPosts, getPostById } from '@dataconnect/generated';


// Operation CreatePost:  For variables, look at type CreatePostVars in ../index.d.ts
const { data } = await CreatePost(dataConnect, createPostVars);

// Operation UpdatePost:  For variables, look at type UpdatePostVars in ../index.d.ts
const { data } = await UpdatePost(dataConnect, updatePostVars);

// Operation DeletePost:  For variables, look at type DeletePostVars in ../index.d.ts
const { data } = await DeletePost(dataConnect, deletePostVars);

// Operation ListRoles: 
const { data } = await ListRoles(dataConnect);

// Operation GetRoleById:  For variables, look at type GetRoleByIdVars in ../index.d.ts
const { data } = await GetRoleById(dataConnect, getRoleByIdVars);

// Operation ListUsers: 
const { data } = await ListUsers(dataConnect);

// Operation GetUserByDocumentId:  For variables, look at type GetUserByDocumentIdVars in ../index.d.ts
const { data } = await GetUserByDocumentId(dataConnect, getUserByDocumentIdVars);

// Operation ListActEconomicas: 
const { data } = await ListActEconomicas(dataConnect);

// Operation ListPosts: 
const { data } = await ListPosts(dataConnect);

// Operation GetPostById:  For variables, look at type GetPostByIdVars in ../index.d.ts
const { data } = await GetPostById(dataConnect, getPostByIdVars);


```