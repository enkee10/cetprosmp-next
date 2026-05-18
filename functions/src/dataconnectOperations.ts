export const INSERT_PERMISO_MUTATION = `
  mutation InsertPermiso($data: Permiso_Data!) {
    permiso_insert(data: $data)
  }
`;

export const UPDATE_PERMISO_MUTATION = `
  mutation UpdatePermiso($id: Int!, $data: Permiso_Data!) {
    permiso_update(id: $id, data: $data)
  }
`;

export const INSERT_USER_MUTATION = `
  mutation InsertUser($data: User_Data!) {
    user_insert(data: $data)
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: Int!, $data: User_Data!) {
    user_update(id: $id, data: $data)
  }
`;

export const DELETE_USER_BY_DOCUMENT_ID_MUTATION = `
  mutation DeleteUserByDocumentId($documentId: String!) {
    user_deleteMany(where: { documentId: { eq: $documentId } })
  }
`;
