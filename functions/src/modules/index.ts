export { assignDefaultRole, syncDataConnectUserOnAuthDelete } from "./triggers/handlers.js";
export { registerUser, listUsers, createNewUser, updateUserProfile, deleteUser } from "./users/handlers.js";
export {
  listRoles,
  getRole,
  createOrUpdateRole,
  refreshMyClaims,
  setUserRole,
} from "./roles/handlers.js";
export {
  listSectors,
  getSector,
  createOrUpdateSector,
  deleteSector,
} from "./sectors/handlers.js";
export {
  listActEconomicas,
  getActEconomica,
  createOrUpdateActEconomica,
  deleteActEconomica,
} from "./act-economicas/handlers.js";
export {
  listFamilias,
  getFamilia,
  createOrUpdateFamilia,
  deleteFamilia,
} from "./familias/handlers.js";
export {
  listEspecialidades,
  getEspecialidad,
  createOrUpdateEspecialidad,
  deleteEspecialidad,
} from "./especialidades/handlers.js";
