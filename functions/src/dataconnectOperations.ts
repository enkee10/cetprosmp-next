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

export const INSERT_ROLE_PERMISSION_MUTATION = `
  mutation InsertRolePermission($data: RolePermission_Data! @allow(fields: "roleId entity canView canCreate canEdit canDelete")) {
    rolePermission_insert(data: $data)
  }
`;

export const DELETE_ROLE_PERMISSIONS_BY_ROLE_MUTATION = `
  mutation DeleteRolePermissionsByRole($roleId: Int!) {
    rolePermission_deleteMany(where: { roleId: { eq: $roleId } })
  }
`;

export const INSERT_APP_SETTING_MUTATION = `
  mutation InsertAppSetting($data: AppSetting_Data! @allow(fields: "settingKey section label boolValue updatedAt")) {
    appSetting_insert(data: $data)
  }
`;

export const UPDATE_APP_SETTING_MUTATION = `
  mutation UpdateAppSetting($id: Int!, $data: AppSetting_Data! @allow(fields: "section label boolValue updatedAt")) {
    appSetting_update(id: $id, data: $data)
  }
`;

export const INSERT_SECTOR_MUTATION = `
  mutation InsertSector($data: Sector_Data! @allow(fields: "titulo descripcion imagenPortadaUrl")) {
    sector_insert(data: $data)
  }
`;

export const UPDATE_SECTOR_MUTATION = `
  mutation UpdateSector($id: Int!, $data: Sector_Data! @allow(fields: "titulo descripcion imagenPortadaUrl")) {
    sector_update(id: $id, data: $data)
  }
`;

export const DELETE_SECTOR_MUTATION = `
  mutation DeleteSector($id: Int!) {
    sector_delete(id: $id)
  }
`;

export const INSERT_ACT_ECONOMICA_MUTATION = `
  mutation InsertActEconomica($data: ActEconomica_Data! @allow(fields: "titulo descripcion imagenPortadaUrl familiaId")) {
    actEconomica_insert(data: $data)
  }
`;

export const UPDATE_ACT_ECONOMICA_MUTATION = `
  mutation UpdateActEconomica($id: Int!, $data: ActEconomica_Data! @allow(fields: "titulo descripcion imagenPortadaUrl familiaId")) {
    actEconomica_update(id: $id, data: $data)
  }
`;

export const DELETE_ACT_ECONOMICA_MUTATION = `
  mutation DeleteActEconomica($id: Int!) {
    actEconomica_delete(id: $id)
  }
`;

export const INSERT_FAMILIA_MUTATION = `
  mutation InsertFamilia($data: Familia_Data! @allow(fields: "titulo descripcion imagenPortadaUrl sectorId")) {
    familia_insert(data: $data)
  }
`;

export const UPDATE_FAMILIA_MUTATION = `
  mutation UpdateFamilia($id: Int!, $data: Familia_Data! @allow(fields: "titulo descripcion imagenPortadaUrl sectorId")) {
    familia_update(id: $id, data: $data)
  }
`;

export const DELETE_FAMILIA_MUTATION = `
  mutation DeleteFamilia($id: Int!) {
    familia_delete(id: $id)
  }
`;

export const INSERT_ESPECIALIDAD_MUTATION = `
  mutation InsertEspecialidad($data: Especialidad_Data! @allow(fields: "titulo tituloComercial orden descripcion descripcion2 slug imagenPortadaUrl")) {
    especialidad_insert(data: $data)
  }
`;

export const UPDATE_ESPECIALIDAD_MUTATION = `
  mutation UpdateEspecialidad($id: Int!, $data: Especialidad_Data! @allow(fields: "titulo tituloComercial orden descripcion descripcion2 slug imagenPortadaUrl")) {
    especialidad_update(id: $id, data: $data)
  }
`;

export const DELETE_ESPECIALIDAD_MUTATION = `
  mutation DeleteEspecialidad($id: Int!) {
    especialidad_delete(id: $id)
  }
`;

export const INSERT_TIPO_CARRERA_MUTATION = `
  mutation InsertTipoCarrera($data: TipoCarrera_Data! @allow(fields: "nombre")) {
    tipoCarrera_insert(data: $data)
  }
`;

export const UPDATE_TIPO_CARRERA_MUTATION = `
  mutation UpdateTipoCarrera($id: Int!, $data: TipoCarrera_Data! @allow(fields: "nombre")) {
    tipoCarrera_update(id: $id, data: $data)
  }
`;

export const DELETE_TIPO_CARRERA_MUTATION = `
  mutation DeleteTipoCarrera($id: Int!) {
    tipoCarrera_delete(id: $id)
  }
`;

export const INSERT_CARRERA_MUTATION = `
  mutation InsertCarrera($data: Carrera_Data! @allow(fields: "nombre codigo descripcion nivel imagenPortadaUrl creadoEn actualizadoEn actEconomicaId especialidadId tipoCarreraId")) {
    carrera_insert(data: $data)
  }
`;

export const UPDATE_CARRERA_MUTATION = `
  mutation UpdateCarrera($id: Int!, $data: Carrera_Data! @allow(fields: "nombre codigo descripcion nivel imagenPortadaUrl creadoEn actualizadoEn actEconomicaId especialidadId tipoCarreraId")) {
    carrera_update(id: $id, data: $data)
  }
`;

export const DELETE_CARRERA_MUTATION = `
  mutation DeleteCarrera($id: Int!) {
    carrera_delete(id: $id)
  }
`;

export const INSERT_PLAN_MUTATION = `
  mutation InsertPlan($data: Plan_Data! @allow(fields: "duracion creditos tituloComercial slug descripcion2 imagenPortadaUrl planEstudio periodoCaducidad resolucionTipo nro anio genera carreraId periodoVigenciaId versionId")) {
    plan_insert(data: $data)
  }
`;

export const UPDATE_PLAN_MUTATION = `
  mutation UpdatePlan($id: Int!, $data: Plan_Data! @allow(fields: "duracion creditos tituloComercial slug descripcion2 imagenPortadaUrl planEstudio periodoCaducidad resolucionTipo nro anio genera carreraId periodoVigenciaId versionId")) {
    plan_update(id: $id, data: $data)
  }
`;

export const DELETE_PLAN_MUTATION = `
  mutation DeletePlan($id: Int!) {
    plan_delete(id: $id)
  }
`;

export const INSERT_ANIO_MUTATION = `
  mutation InsertAnio($data: Anio_Data! @allow(fields: "nombre titulo")) {
    anio_insert(data: $data)
  }
`;

export const UPDATE_ANIO_MUTATION = `
  mutation UpdateAnio($id: Int!, $data: Anio_Data! @allow(fields: "nombre titulo")) {
    anio_update(id: $id, data: $data)
  }
`;

export const DELETE_ANIO_MUTATION = `
  mutation DeleteAnio($id: Int!) {
    anio_delete(id: $id)
  }
`;

export const INSERT_SEMESTRE_MUTATION = `
  mutation InsertSemestre($data: Semestre_Data! @allow(fields: "titulo descripcion inicio fin archivado anioId directorId coordinador1Id coordinador2Id")) {
    semestre_insert(data: $data)
  }
`;

export const UPDATE_SEMESTRE_MUTATION = `
  mutation UpdateSemestre($id: Int!, $data: Semestre_Data! @allow(fields: "titulo descripcion inicio fin archivado anioId directorId coordinador1Id coordinador2Id")) {
    semestre_update(id: $id, data: $data)
  }
`;

export const DELETE_SEMESTRE_MUTATION = `
  mutation DeleteSemestre($id: Int!) {
    semestre_delete(id: $id)
  }
`;

export const INSERT_CALENDARIO_MUTATION = `
  mutation InsertCalendario($data: Calendario_Data! @allow(fields: "titulo descripcion inicio fin duracion color activo fechaCreacion fechaActualizacion anioId semestreId horarioId")) {
    calendario_insert(data: $data)
  }
`;

export const UPDATE_CALENDARIO_MUTATION = `
  mutation UpdateCalendario($id: Int!, $data: Calendario_Data! @allow(fields: "titulo descripcion inicio fin duracion color activo fechaCreacion fechaActualizacion anioId semestreId horarioId")) {
    calendario_update(id: $id, data: $data)
  }
`;

export const DELETE_CALENDARIO_MUTATION = `
  mutation DeleteCalendario($id: Int!) {
    calendario_delete(id: $id)
  }
`;

export const INSERT_TURNO_MUTATION = `
  mutation InsertTurno($data: Turno_Data! @allow(fields: "nombre horaInicio horaFin estado fechaCreacion fechaActualizacion")) {
    turno_insert(data: $data)
  }
`;

export const UPDATE_TURNO_MUTATION = `
  mutation UpdateTurno($id: Int!, $data: Turno_Data! @allow(fields: "nombre horaInicio horaFin estado fechaCreacion fechaActualizacion")) {
    turno_update(id: $id, data: $data)
  }
`;

export const DELETE_TURNO_MUTATION = `
  mutation DeleteTurno($id: Int!) {
    turno_delete(id: $id)
  }
`;

export const INSERT_HORARIO_MUTATION = `
  mutation InsertHorario($data: Horario_Data! @allow(fields: "nombre descripcion regla diasSemana viernesAlternoInicio activo fechaCreacion fechaActualizacion")) {
    horario_insert(data: $data)
  }
`;

export const UPDATE_HORARIO_MUTATION = `
  mutation UpdateHorario($id: Int!, $data: Horario_Data! @allow(fields: "nombre descripcion regla diasSemana viernesAlternoInicio activo fechaCreacion fechaActualizacion")) {
    horario_update(id: $id, data: $data)
  }
`;

export const DELETE_HORARIO_MUTATION = `
  mutation DeleteHorario($id: Int!) {
    horario_delete(id: $id)
  }
`;

export const INSERT_GRUPO_MUTATION = `
  mutation InsertGrupo($data: Grupo_Data! @allow(fields: "turnoNombre descripcion nombreDisplay estado archivado fechaCreacion fechaActualizacion semestreId personalId paqueteId turnoId horarioId grupoOrd workspaceName workspaceCorreo")) {
    grupo_insert(data: $data)
  }
`;

export const UPDATE_GRUPO_MUTATION = `
  mutation UpdateGrupo($id: Int!, $data: Grupo_Data! @allow(fields: "turnoNombre descripcion nombreDisplay estado archivado fechaCreacion fechaActualizacion semestreId personalId paqueteId turnoId horarioId grupoOrd workspaceName workspaceCorreo")) {
    grupo_update(id: $id, data: $data)
  }
`;

export const DELETE_GRUPO_MUTATION = `
  mutation DeleteGrupo($id: Int!) {
    grupo_delete(id: $id)
  }
`;

export const INSERT_GRUPO_MODULO_MUTATION = `
  mutation InsertGrupoModulo($data: GrupoModulo_Data! @allow(fields: "nombre grupoId moduloId orden obligatorio inicio fin calendarioId")) {
    grupoModulo_insert(data: $data)
  }
`;

export const UPDATE_GRUPO_MODULO_MUTATION = `
  mutation UpdateGrupoModulo($id: Int!, $data: GrupoModulo_Data! @allow(fields: "nombre grupoId moduloId orden obligatorio inicio fin calendarioId")) {
    grupoModulo_update(id: $id, data: $data)
  }
`;

export const DELETE_GRUPO_MODULO_MUTATION = `
  mutation DeleteGrupoModulo($id: Int!) {
    grupoModulo_delete(id: $id)
  }
`;

export const INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION = `
  mutation InsertGrupoModuloUnidadDidactica($data: GrupoModuloUnidadDidactica_Data! @allow(fields: "grupoModuloId unidadDidacticaId orden inicio fin")) {
    grupoModuloUnidadDidactica_insert(data: $data)
  }
`;

export const DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION = `
  mutation DeleteGrupoModulosByGrupo($grupoId: Int!) {
    grupoModulo_deleteMany(where: { grupoId: { eq: $grupoId } })
  }
`;

export const INSERT_DATO_GENERAL_MUTATION = `
  mutation InsertDatoGeneral($data: DatoGeneral_Data! @allow(fields: "id nombreInstitucion logoUrl codigoModular tipoGestion departamento provincia distrito dre direccion telefono1 telefono2 correo paginaWeb facebook youtube twitter instagram tiktok ruc rd")) {
    datoGeneral_insert(data: $data)
  }
`;

export const UPDATE_DATO_GENERAL_MUTATION = `
  mutation UpdateDatoGeneral($id: Int!, $data: DatoGeneral_Data! @allow(fields: "nombreInstitucion logoUrl codigoModular tipoGestion departamento provincia distrito dre direccion telefono1 telefono2 correo paginaWeb facebook youtube twitter instagram tiktok ruc rd")) {
    datoGeneral_update(id: $id, data: $data)
  }
`;

export const DELETE_DATO_GENERAL_MUTATION = `
  mutation DeleteDatoGeneral($id: Int!) {
    datoGeneral_delete(id: $id)
  }
`;

export const INSERT_PERSONAL_MUTATION = `
  mutation InsertPersonal($data: Personal_Data! @allow(fields: "displayName memo userId")) {
    personal_insert(data: $data)
  }
`;

export const UPDATE_PERSONAL_MUTATION = `
  mutation UpdatePersonal($id: Int!, $data: Personal_Data! @allow(fields: "displayName memo userId")) {
    personal_update(id: $id, data: $data)
  }
`;

export const DELETE_PERSONAL_MUTATION = `
  mutation DeletePersonal($id: Int!) {
    personal_delete(id: $id)
  }
`;

export const INSERT_PERSONAL_ESPECIALIDAD_MUTATION = `
  mutation InsertPersonalEspecialidad($data: PersonalEspecialidad_Data! @allow(fields: "personalId especialidadId orden")) {
    personalEspecialidad_insert(data: $data)
  }
`;

export const DELETE_PERSONAL_ESPECIALIDADES_BY_PERSONAL_MUTATION = `
  mutation DeletePersonalEspecialidadesByPersonal($personalId: Int!) {
    personalEspecialidad_deleteMany(where: { personalId: { eq: $personalId } })
  }
`;

export const INSERT_EVENTO_MUTATION = `
  mutation InsertEvento($data: Evento_Data! @allow(fields: "titulo descripcion tipoEvento fechaInicio fechaFin todoElDia ubicacion color estado fechaCreacion fechaActualizacion calendarioId semestreId")) {
    evento_insert(data: $data)
  }
`;

export const UPDATE_EVENTO_MUTATION = `
  mutation UpdateEvento($id: Int!, $data: Evento_Data! @allow(fields: "titulo descripcion tipoEvento fechaInicio fechaFin todoElDia ubicacion color estado fechaCreacion fechaActualizacion calendarioId semestreId")) {
    evento_update(id: $id, data: $data)
  }
`;

export const DELETE_EVENTO_MUTATION = `
  mutation DeleteEvento($id: Int!) {
    evento_delete(id: $id)
  }
`;

export const INSERT_EVENTO_RELACION_MUTATION = `
  mutation InsertEventoRelacion($data: EventoRelacion_Data! @allow(fields: "entidadTipo entidadId fechaCreacion fechaActualizacion eventoId")) {
    eventoRelacion_insert(data: $data)
  }
`;

export const DELETE_EVENTO_RELACIONES_BY_EVENTO_MUTATION = `
  mutation DeleteEventoRelacionesByEvento($eventoId: Int!) {
    eventoRelacion_deleteMany(where: { eventoId: { eq: $eventoId } })
  }
`;

export const INSERT_EVENTO_RECURRENCIA_MUTATION = `
  mutation InsertEventoRecurrencia($data: EventoRecurrencia_Data! @allow(fields: "frecuencia intervalo diasSemana diaMes semanaMes fechaInicio fechaFin cantidadOcurrencias reglaEspecial activo fechaCreacion fechaActualizacion eventoId horarioId turnoId")) {
    eventoRecurrencia_insert(data: $data)
  }
`;

export const UPDATE_EVENTO_RECURRENCIA_MUTATION = `
  mutation UpdateEventoRecurrencia($id: Int!, $data: EventoRecurrencia_Data! @allow(fields: "frecuencia intervalo diasSemana diaMes semanaMes fechaInicio fechaFin cantidadOcurrencias reglaEspecial activo fechaCreacion fechaActualizacion eventoId horarioId turnoId")) {
    eventoRecurrencia_update(id: $id, data: $data)
  }
`;

export const INSERT_EVENTO_OCURRENCIA_MUTATION = `
  mutation InsertEventoOcurrencia($data: EventoOcurrencia_Data! @allow(fields: "fechaInicio fechaFin numeroOcurrencia tipoOcurrencia estado observacion fechaCreacion fechaActualizacion eventoId recurrenciaId grupoId")) {
    eventoOcurrencia_insert(data: $data)
  }
`;

export const UPDATE_EVENTO_OCURRENCIA_MUTATION = `
  mutation UpdateEventoOcurrencia($id: Int!, $data: EventoOcurrencia_Data! @allow(fields: "fechaInicio fechaFin numeroOcurrencia tipoOcurrencia estado observacion fechaCreacion fechaActualizacion eventoId recurrenciaId grupoId")) {
    eventoOcurrencia_update(id: $id, data: $data)
  }
`;

export const INSERT_MODULO_MUTATION = `
  mutation InsertModulo($data: Modulo_Data! @allow(fields: "titulo tituloComercial orden descripcion competencia horas creditos duracionEfsrt creditosEfsrt metas activo slug comun planId")) {
    modulo_insert(data: $data)
  }
`;

export const UPDATE_MODULO_MUTATION = `
  mutation UpdateModulo($id: Int!, $data: Modulo_Data! @allow(fields: "titulo tituloComercial orden descripcion competencia horas creditos duracionEfsrt creditosEfsrt metas activo slug comun planId")) {
    modulo_update(id: $id, data: $data)
  }
`;

export const UPDATE_MODULO_ORDEN_MUTATION = `
  mutation UpdateModuloOrden($id: Int!, $data: Modulo_Data! @allow(fields: "orden")) {
    modulo_update(id: $id, data: $data)
  }
`;

export const DELETE_MODULO_MUTATION = `
  mutation DeleteModulo($id: Int!) {
    modulo_delete(id: $id)
  }
`;

export const INSERT_PLAN_MODULO_MUTATION = `
  mutation InsertPlanModulo($data: PlanModulo_Data! @allow(fields: "planId moduloId orden")) {
    planModulo_insert(data: $data)
  }
`;

export const DELETE_PLAN_MODULOS_BY_PLAN_MUTATION = `
  mutation DeletePlanModulosByPlan($planId: Int!) {
    planModulo_deleteMany(where: { planId: { eq: $planId } })
  }
`;

export const DELETE_PLAN_MODULOS_BY_MODULO_MUTATION = `
  mutation DeletePlanModulosByModulo($moduloId: Int!) {
    planModulo_deleteMany(where: { moduloId: { eq: $moduloId } })
  }
`;

export const DELETE_PLAN_MODULO_RELATION_MUTATION = `
  mutation DeletePlanModuloRelation($planId: Int!, $moduloId: Int!) {
    planModulo_deleteMany(where: { planId: { eq: $planId }, moduloId: { eq: $moduloId } })
  }
`;

export const DELETE_PLAN_MODULO_MUTATION = `
  mutation DeletePlanModulo($id: Int!) {
    planModulo_delete(id: $id)
  }
`;

export const INSERT_UNIDAD_DIDACTICA_MUTATION = `
  mutation InsertUnidadDidactica($data: UnidadDidactica_Data! @allow(fields: "nombre duracion creditos sigla comun")) {
    unidadDidactica_insert(data: $data)
  }
`;

export const UPDATE_UNIDAD_DIDACTICA_MUTATION = `
  mutation UpdateUnidadDidactica($id: Int!, $data: UnidadDidactica_Data! @allow(fields: "nombre duracion creditos sigla comun")) {
    unidadDidactica_update(id: $id, data: $data)
  }
`;

export const DELETE_UNIDAD_DIDACTICA_MUTATION = `
  mutation DeleteUnidadDidactica($id: Int!) {
    unidadDidactica_delete(id: $id)
  }
`;

export const INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION = `
  mutation InsertUnidadDidacticaModulo($data: UnidadDidacticaModulo_Data! @allow(fields: "unidadDidacticaId moduloId orden")) {
    unidadDidacticaModulo_insert(data: $data)
  }
`;

export const UPDATE_UNIDAD_DIDACTICA_MODULO_MUTATION = `
  mutation UpdateUnidadDidacticaModulo($id: Int!, $data: UnidadDidacticaModulo_Data! @allow(fields: "orden")) {
    unidadDidacticaModulo_update(id: $id, data: $data)
  }
`;

export const DELETE_UNIDAD_DIDACTICA_MODULOS_BY_UNIDAD_MUTATION = `
  mutation DeleteUnidadDidacticaModulosByUnidad($unidadDidacticaId: Int!) {
    unidadDidacticaModulo_deleteMany(where: { unidadDidacticaId: { eq: $unidadDidacticaId } })
  }
`;

export const DELETE_UNIDAD_DIDACTICA_MODULO_RELATION_MUTATION = `
  mutation DeleteUnidadDidacticaModuloRelation($id: Int!) {
    unidadDidacticaModulo_delete(id: $id)
  }
`;

export const INSERT_CAPACIDAD_TERMINAL_MUTATION = `
  mutation InsertCapacidadTerminal($data: CapacidadTerminal_Data! @allow(fields: "descripcion sigla orden unidadDidacticaId")) {
    capacidadTerminal_insert(data: $data)
  }
`;

export const UPDATE_CAPACIDAD_TERMINAL_MUTATION = `
  mutation UpdateCapacidadTerminal($id: Int!, $data: CapacidadTerminal_Data! @allow(fields: "descripcion sigla orden unidadDidacticaId")) {
    capacidadTerminal_update(id: $id, data: $data)
  }
`;

export const DELETE_CAPACIDAD_TERMINAL_MUTATION = `
  mutation DeleteCapacidadTerminal($id: Int!) {
    capacidadTerminal_delete(id: $id)
  }
`;

export const INSERT_INDICADOR_CAPACIDAD_MUTATION = `
  mutation InsertIndicadorCapacidad($data: IndicadorCapacidad_Data! @allow(fields: "descripcion sigla orden capacidadTerminalId")) {
    indicadorCapacidad_insert(data: $data)
  }
`;

export const UPDATE_INDICADOR_CAPACIDAD_MUTATION = `
  mutation UpdateIndicadorCapacidad($id: Int!, $data: IndicadorCapacidad_Data! @allow(fields: "descripcion sigla orden capacidadTerminalId")) {
    indicadorCapacidad_update(id: $id, data: $data)
  }
`;

export const DELETE_INDICADOR_CAPACIDAD_MUTATION = `
  mutation DeleteIndicadorCapacidad($id: Int!) {
    indicadorCapacidad_delete(id: $id)
  }
`;

export const DELETE_INDICADORES_CAPACIDAD_BY_CAPACIDAD_MUTATION = `
  mutation DeleteIndicadoresCapacidadByCapacidad($capacidadTerminalId: Int!) {
    indicadorCapacidad_deleteMany(where: { capacidadTerminalId: { eq: $capacidadTerminalId } })
  }
`;

export const INSERT_APRENDIZAJE_MUTATION = `
  mutation InsertAprendizaje($data: Aprendizaje_Data! @allow(fields: "descripcion sigla indicadorCapacidadId")) {
    aprendizaje_insert(data: $data)
  }
`;

export const UPDATE_APRENDIZAJE_MUTATION = `
  mutation UpdateAprendizaje($id: Int!, $data: Aprendizaje_Data! @allow(fields: "descripcion sigla indicadorCapacidadId")) {
    aprendizaje_update(id: $id, data: $data)
  }
`;

export const DELETE_APRENDIZAJE_MUTATION = `
  mutation DeleteAprendizaje($id: Int!) {
    aprendizaje_delete(id: $id)
  }
`;

export const INSERT_ACTIVIDAD_MUTATION = `
  mutation InsertActividad($data: Actividad_Data! @allow(fields: "nombre descripcion proposito ambiente duracion fecha bibliografia aprendizajeId ejeTransversalId valorInstitucionalId")) {
    actividad_insert(data: $data)
  }
`;

export const UPDATE_ACTIVIDAD_MUTATION = `
  mutation UpdateActividad($id: Int!, $data: Actividad_Data! @allow(fields: "nombre descripcion proposito ambiente duracion fecha bibliografia aprendizajeId ejeTransversalId valorInstitucionalId")) {
    actividad_update(id: $id, data: $data)
  }
`;

export const DELETE_ACTIVIDAD_MUTATION = `
  mutation DeleteActividad($id: Int!) {
    actividad_delete(id: $id)
  }
`;

export const INSERT_PAQUETE_MUTATION = `
  mutation InsertPaquete($data: Paquete_Data! @allow(fields: "titulo descripcion archivado")) {
    paquete_insert(data: $data)
  }
`;

export const UPDATE_PAQUETE_MUTATION = `
  mutation UpdatePaquete($id: Int!, $data: Paquete_Data! @allow(fields: "titulo descripcion archivado")) {
    paquete_update(id: $id, data: $data)
  }
`;

export const DELETE_PAQUETE_MUTATION = `
  mutation DeletePaquete($id: Int!) {
    paquete_delete(id: $id)
  }
`;

export const INSERT_PAQUETE_MODULO_MUTATION = `
  mutation InsertPaqueteModulo($data: PaqueteModulo_Data! @allow(fields: "paqueteId moduloId orden obligatorio")) {
    paqueteModulo_insert(data: $data)
  }
`;

export const DELETE_PAQUETE_MODULOS_BY_PAQUETE_MUTATION = `
  mutation DeletePaqueteModulosByPaquete($paqueteId: Int!) {
    paqueteModulo_deleteMany(where: { paqueteId: { eq: $paqueteId } })
  }
`;

export const INSERT_MATRICULA_MUTATION = `
  mutation InsertMatricula($data: Matricula_Data! @allow(fields: "recibo fecha codigoInscripcion archivado paqueteId semestreId userId")) {
    matricula_insert(data: $data)
  }
`;

export const UPDATE_MATRICULA_MUTATION = `
  mutation UpdateMatricula($id: Int!, $data: Matricula_Data! @allow(fields: "recibo fecha codigoInscripcion archivado paqueteId semestreId userId")) {
    matricula_update(id: $id, data: $data)
  }
`;

export const DELETE_MATRICULA_MUTATION = `
  mutation DeleteMatricula($id: Int!) {
    matricula_delete(id: $id)
  }
`;

export const LIST_MATRICULA_IDS_BY_USER_QUERY = `
  query ListMatriculaIdsByUser($userId: Int!) {
    matriculas(where: { userId: { eq: $userId } }, limit: 500) {
      id
    }
    matriculaUsers(where: { userId: { eq: $userId } }, limit: 500) {
      matriculaId
    }
  }
`;

export const LIST_EVALUACION_ESTUDIANTE_IDS_BY_MATRICULA_QUERY = `
  query ListEvaluacionEstudianteIdsByMatricula($matriculaId: Int!) {
    evaluacionesEstudiantes(where: { matriculaId: { eq: $matriculaId } }, limit: 500) {
      id
    }
  }
`;

export const INSERT_MODULO_ESTUDIANTE_MUTATION = `
  mutation InsertModuloEstudiante($data: ModuloEstudiante_Data! @allow(fields: "promedio puntaje matriculaId moduloId grupoId")) {
    moduloEstudiante_insert(data: $data)
  }
`;

export const DELETE_ASPECTOS_EVALUACION_ESTUDIANTES_BY_EVALUACION_ESTUDIANTE_MUTATION = `
  mutation DeleteAspectosEvaluacionEstudiantesByEvaluacionEstudiante($evaluacionEstudianteId: Int!) {
    aspectoEvaluacionEstudiante_deleteMany(where: { evaluacionEstudianteId: { eq: $evaluacionEstudianteId } })
  }
`;

export const DELETE_MATRICULA_DEPENDENCIES_MUTATION = `
  mutation DeleteMatriculaDependencies($matriculaId: Int!) {
    asistencia_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    evaluacionEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    indicadorCapacidadEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    capacidadTerminalEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    unidadDidacticaEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    matriculaGrupo_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    matriculaPaquete_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    matriculaUser_deleteMany(where: { matriculaId: { eq: $matriculaId } })
    moduloEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
  }
`;

export const DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION = `
  mutation DeleteModuloEstudiantesByMatricula($matriculaId: Int!) {
    moduloEstudiante_deleteMany(where: { matriculaId: { eq: $matriculaId } })
  }
`;

export const INSERT_USER_MUTATION = `
  mutation InsertUser($data: User_Data! @allow(fields: "documentId username nickName email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo nacionalidad estadoCivil instruccion fechaNacimiento fechaVencimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar recorteFotografia dniImagenFrenteUrl dniImagenReversoUrl dniImagenFrenteProcesadaUrl dniImagenReversoProcesadaUrl rolId")) {
    user_insert(data: $data)
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: Int!, $data: User_Data! @allow(fields: "documentId username nickName email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo nacionalidad estadoCivil instruccion fechaNacimiento fechaVencimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar recorteFotografia dniImagenFrenteUrl dniImagenReversoUrl dniImagenFrenteProcesadaUrl dniImagenReversoProcesadaUrl rolId")) {
    user_update(id: $id, data: $data)
  }
`;

export const DELETE_USER_BY_DOCUMENT_ID_MUTATION = `
  mutation DeleteUserByDocumentId($documentId: String!) {
    user_deleteMany(where: { documentId: { eq: $documentId } })
  }
`;
