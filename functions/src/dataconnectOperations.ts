export const INSERT_ROLE_MUTATION = `
  mutation InsertRole($data: Rol_Data! @allow(fields: "scala titulo")) {
    rol_insert(data: $data)
  }
`;

export const UPDATE_ROLE_MUTATION = `
  mutation UpdateRole($id: Int!, $data: Rol_Data! @allow(fields: "scala titulo")) {
    rol_update(id: $id, data: $data)
  }
`;

export const INSERT_SECTOR_MUTATION = `
  mutation InsertSector($data: Sector_Data! @allow(fields: "titulo descripcion")) {
    sector_insert(data: $data)
  }
`;

export const UPDATE_SECTOR_MUTATION = `
  mutation UpdateSector($id: Int!, $data: Sector_Data! @allow(fields: "titulo descripcion")) {
    sector_update(id: $id, data: $data)
  }
`;

export const DELETE_SECTOR_MUTATION = `
  mutation DeleteSector($id: Int!) {
    sector_delete(id: $id)
  }
`;

export const INSERT_USER_MUTATION = `
  mutation InsertUser($data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo estadoCivil instruccion fechaNacimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar rolId")) {
    user_insert(data: $data)
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: Int!, $data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo estadoCivil instruccion fechaNacimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar rolId")) {
    user_update(id: $id, data: $data)
  }
`;

export const DELETE_USER_BY_DOCUMENT_ID_MUTATION = `
  mutation DeleteUserByDocumentId($documentId: String!) {
    user_deleteMany(where: { documentId: { eq: $documentId } })
  }
`;
