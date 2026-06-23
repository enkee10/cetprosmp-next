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

export const INSERT_ACT_ECONOMICA_MUTATION = `
  mutation InsertActEconomica($data: ActEconomica_Data! @allow(fields: "titulo descripcion familiaId especialidadId")) {
    actEconomica_insert(data: $data)
  }
`;

export const UPDATE_ACT_ECONOMICA_MUTATION = `
  mutation UpdateActEconomica($id: Int!, $data: ActEconomica_Data! @allow(fields: "titulo descripcion familiaId especialidadId")) {
    actEconomica_update(id: $id, data: $data)
  }
`;

export const DELETE_ACT_ECONOMICA_MUTATION = `
  mutation DeleteActEconomica($id: Int!) {
    actEconomica_delete(id: $id)
  }
`;

export const INSERT_FAMILIA_MUTATION = `
  mutation InsertFamilia($data: Familia_Data! @allow(fields: "titulo descripcion sectorId")) {
    familia_insert(data: $data)
  }
`;

export const UPDATE_FAMILIA_MUTATION = `
  mutation UpdateFamilia($id: Int!, $data: Familia_Data! @allow(fields: "titulo descripcion sectorId")) {
    familia_update(id: $id, data: $data)
  }
`;

export const DELETE_FAMILIA_MUTATION = `
  mutation DeleteFamilia($id: Int!) {
    familia_delete(id: $id)
  }
`;

export const INSERT_ESPECIALIDAD_MUTATION = `
  mutation InsertEspecialidad($data: Especialidad_Data! @allow(fields: "titulo tituloComercial descripcion descripcion2 slug actEconomicaId")) {
    especialidad_insert(data: $data)
  }
`;

export const UPDATE_ESPECIALIDAD_MUTATION = `
  mutation UpdateEspecialidad($id: Int!, $data: Especialidad_Data! @allow(fields: "titulo tituloComercial descripcion descripcion2 slug actEconomicaId")) {
    especialidad_update(id: $id, data: $data)
  }
`;

export const DELETE_ESPECIALIDAD_MUTATION = `
  mutation DeleteEspecialidad($id: Int!) {
    especialidad_delete(id: $id)
  }
`;

export const INSERT_CARRERA_MUTATION = `
  mutation InsertCarrera($data: Carrera_Data! @allow(fields: "nombre codigo descripcion tipo estado creadoEn actualizadoEn actEconomicaId")) {
    carrera_insert(data: $data)
  }
`;

export const UPDATE_CARRERA_MUTATION = `
  mutation UpdateCarrera($id: Int!, $data: Carrera_Data! @allow(fields: "nombre codigo descripcion tipo estado creadoEn actualizadoEn actEconomicaId")) {
    carrera_update(id: $id, data: $data)
  }
`;

export const DELETE_CARRERA_MUTATION = `
  mutation DeleteCarrera($id: Int!) {
    carrera_delete(id: $id)
  }
`;

export const INSERT_PLAN_MUTATION = `
  mutation InsertPlan($data: Plan_Data! @allow(fields: "version duracion creditos nivel tituloComercial slug descripcion2 carreraId")) {
    plan_insert(data: $data)
  }
`;

export const UPDATE_PLAN_MUTATION = `
  mutation UpdatePlan($id: Int!, $data: Plan_Data! @allow(fields: "version duracion creditos nivel tituloComercial slug descripcion2 carreraId")) {
    plan_update(id: $id, data: $data)
  }
`;

export const DELETE_PLAN_MUTATION = `
  mutation DeletePlan($id: Int!) {
    plan_delete(id: $id)
  }
`;

export const INSERT_MODULO_MUTATION = `
  mutation InsertModulo($data: Modulo_Data! @allow(fields: "titulo tituloComercial orden descripcion horas creditos metas activo slug descripcion2 planId")) {
    modulo_insert(data: $data)
  }
`;

export const UPDATE_MODULO_MUTATION = `
  mutation UpdateModulo($id: Int!, $data: Modulo_Data! @allow(fields: "titulo tituloComercial orden descripcion horas creditos metas activo slug descripcion2 planId")) {
    modulo_update(id: $id, data: $data)
  }
`;

export const DELETE_MODULO_MUTATION = `
  mutation DeleteModulo($id: Int!) {
    modulo_delete(id: $id)
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
