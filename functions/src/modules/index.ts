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
export {
  listCarreras,
  getCarrera,
  createOrUpdateCarrera,
  deleteCarrera,
} from "./carreras/handlers.js";
export {
  listTiposCarrera,
  getTipoCarrera,
  createOrUpdateTipoCarrera,
  deleteTipoCarrera,
} from "./tipos-carrera/handlers.js";
export {
  listPlanes,
  getPlan,
  createOrUpdatePlan,
  deletePlan,
} from "./planes/handlers.js";
export { listSemestres } from "./semestres/handlers.js";
export {
  listCalendarios,
  getCalendario,
  createOrUpdateCalendario,
  deleteCalendario,
  listEventos,
  getEvento,
  createOrUpdateEvento,
  deleteEvento,
  listGrupos,
} from "./calendarios/handlers.js";
export {
  listModulos,
  getModulo,
  createOrUpdateModulo,
  deleteModulo,
} from "./modulos/handlers.js";
export {
  listPaquetes,
  getPaquete,
  createOrUpdatePaquete,
  deletePaquete,
} from "./paquetes/handlers.js";
export { createMatriculaDesdePaquete } from "./matriculas/handlers.js";
export {
  listUnidadesDidacticas,
  getUnidadDidactica,
  createOrUpdateUnidadDidactica,
  deleteUnidadDidactica,
  listCapacidadesTerminales,
  getCapacidadTerminal,
  createOrUpdateCapacidadTerminal,
  deleteCapacidadTerminal,
  listIndicadoresCapacidad,
  getIndicadorCapacidad,
  createOrUpdateIndicadorCapacidad,
  deleteIndicadorCapacidad,
  listAprendizajes,
  getAprendizaje,
  createOrUpdateAprendizaje,
  deleteAprendizaje,
  listActividades,
  getActividad,
  createOrUpdateActividad,
  deleteActividad,
} from "./academico/handlers.js";
