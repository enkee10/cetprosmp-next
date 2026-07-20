export { assignDefaultRole, syncDataConnectUserOnAuthDelete } from "./triggers/handlers.js";
export {
  registerUser,
  resolveLoginEmail,
  getMyProfile,
  listUsers,
  createNewUser,
  updateUserProfile,
  deleteUser,
} from "./users/handlers.js";
export {
  listRoles,
  getRole,
  createOrUpdateRole,
  refreshMyClaims,
  setUserRole,
} from "./roles/handlers.js";
export {
  listPermisos,
  listMisPermisos,
  savePermisosRol,
} from "./permisos/handlers.js";
export {
  getAppSettings,
  saveAppSettings,
} from "./settings/handlers.js";
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
export {
  listAnios,
  getAnio,
  createOrUpdateAnio,
  deleteAnio,
} from "./anios/handlers.js";
export {
  listSemestres,
  getSemestre,
  createOrUpdateSemestre,
  deleteSemestre,
} from "./semestres/handlers.js";
export {
  listTurnos,
  getTurno,
  createOrUpdateTurno,
  deleteTurno,
} from "./turnos/handlers.js";
export {
  listHorarios,
  getHorario,
  createOrUpdateHorario,
  deleteHorario,
} from "./horarios/handlers.js";
export {
  listCalendarios,
  getCalendario,
  createOrUpdateCalendario,
  deleteCalendario,
  listEventos,
  getEvento,
  createOrUpdateEvento,
  deleteEvento,
} from "./calendarios/handlers.js";
export {
  listGrupos,
  getGrupo,
  createOrUpdateGrupo,
  deleteGrupo,
} from "./grupos/handlers.js";
export {
  listGrupoModulos,
  getGrupoModulo,
  listGrupoModuloOpciones,
  createOrUpdateGrupoModulo,
  deleteGrupoModulo,
} from "./grupo-modulos/handlers.js";
export {
  getDatosGeneralesGlobales,
  listDatosGenerales,
  getDatoGeneral,
  createOrUpdateDatoGeneral,
  deleteDatoGeneral,
} from "./datos-generales/handlers.js";
export {
  listPersonal,
  getPersonal,
  createOrUpdatePersonal,
  deletePersonal,
} from "./personal/handlers.js";
export {
  listModulos,
  getModulo,
  createOrUpdateModulo,
  updateModuloOrden,
  deleteModulo,
} from "./modulos/handlers.js";
export {
  listPaquetes,
  getPaquete,
  createOrUpdatePaquete,
  deletePaquete,
} from "./paquetes/handlers.js";
export {
  createMatriculaDesdePaquete,
  crearMatriculaFormulario,
  deleteMatricula,
  generarCodigosInscripcionMatriculas,
  getMatricula,
  getMatriculaDocumentoEstado,
  getMatriculaResponsableActual,
  listMatriculaDocenteGrupos,
  listMatriculas,
  listMatriculaSemestres,
  listMatriculaPaquetesBySemestre,
  onMatriculaAvatarExtractionJobCreated,
  onMatriculaDocumentoProcessingJobCreated,
  updateMatriculaFormulario,
  verificarDocumentoMatricula,
  verificarMatriculaReniec,
} from "./matriculas/handlers.js";
export {
  listEstructuraAcademica,
  listEstructuraAcademicaDocente,
  getEstructuraAcademicaDocenteMenu,
  createEstructuraAcademicaItem,
  reuseEstructuraAcademicaItem,
  detachEstructuraAcademicaItem,
  updateEstructuraAcademicaCell,
  reorderEstructuraAcademicaItems,
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
export {
  createRegistroAuxiliarMatricula,
  getRegistroAuxiliar,
  listRegistroAuxiliarOpciones,
  listRegistroAuxiliarDocenteModulos,
  retireRegistroAuxiliarMatricula,
  saveRegistroAuxiliar,
  updateRegistroAuxiliarEstudianteNombre,
  updateRegistroAuxiliarGrupoModuloFechas,
} from "./registro-auxiliar/handlers.js";
export {
  descargarCertificadosTitulosSeleccionados,
  descargarRegistrosAcademicosSeleccionados,
  generateCertificadosTitulos,
  generateReporteDocumento,
  listCertificadosTitulosOptions,
  listReporteDocumentosOptions,
} from "./reportes/handlers.js";
