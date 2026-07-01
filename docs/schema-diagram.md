```mermaid
%%{
  init: {
    "theme": "base",
    "themeVariables": {
      "fontFamily": "Segoe UI Light, Calibri Light, Segoe UI, Arial, sans-serif",
      "fontSize": "10px",
      "darkMode": false,
      "background": "#ffffff",
      "mainBkg": "#ffffff",
      "secondBkg": "#ffffff",
      "tertiaryColor": "#ffffff",
      "primaryColor": "#ffffff",
      "secondaryColor": "#ffffff",
      "primaryTextColor": "#111827",
      "secondaryTextColor": "#111827",
      "tertiaryTextColor": "#111827",
      "textColor": "#111827",
      "primaryBorderColor": "#AAAAAA",
      "lineColor": "#FFFF00",
      "entityBkg": "#ffffff",
      "entityBorder": "#AAAAAA",
      "attributeBackgroundColorOdd": "#ffffff",
      "attributeBackgroundColorEven": "#ffffff",
      "relationshipLabelBackground": "#ffffff",
      "relationshipLabelColor": "#111827"
    },
    "er": {
      "layoutDirection": "LR",
      "minEntityWidth": 65,
      "minEntityHeight": 40,
      "entityPadding": 2
    },
    "themeCSS": "svg, .mermaid, .er { background: #ffffff !important; } .er.entityBox, .er.attributeBoxOdd, .er.attributeBoxEven, .er .entityBox, .er .attributeBoxOdd, .er .attributeBoxEven, .entityBox, .attributeBoxOdd, .attributeBoxEven { fill: #ffffff !important; stroke: #AAAAAA !important; stroke-width: 0.7px; } .er.entityLabel, .er.relationshipLabel, .er.attributeLabel, .er.attributeLabelOdd, .er.attributeLabelEven, .er .entityLabel, .er .relationshipLabel, .er .attributeLabel, .er .attributeLabelOdd, .er .attributeLabelEven, .entityLabel, .relationshipLabel, .attributeLabel, .attributeLabelOdd, .attributeLabelEven, text { fill: #111827 !important; color: #111827 !important; font-weight: 100 !important; } .er.relationshipLine, .er .relationshipLine, .relationshipLine { stroke: #FFFF00 !important; stroke-width: 0.7px; }"
  }
}%%

erDiagram
    direction LR

    USER {
        Int id PK
        String documentId FK
        String username
        String email
        String provider
        Boolean confirmed
        Boolean blocked
        String dni
        String tipoDocumento
        String nombre
        String apellidos
        String apellidoPaterno
        String apellidoMaterno
        String sexo
        String estadoCivil
        String instruccion
        Timestamp fechaNacimiento
        String direccion
        String distrito
        String telefono
        String celular
        String correoInstitucional
        Timestamp fechaCreacion
        Timestamp fechaModificacion
        String emailCreador
        String avatar
        Int rolId FK
    }

    ROL {
        Int id PK
        String titulo
        Int scala
    }

    SECTOR {
        Int id PK
        String titulo
        String descripcion
        String imagenPortadaUrl
    }

    FAMILIA {
        Int id PK
        String titulo
        String descripcion
        String imagenPortadaUrl
        Int sectorId FK
    }

    ESPECIALIDAD {
        Int id PK
        String titulo
        String tituloComercial
        String descripcion
        String descripcion2
        String slug
        String imagenPortadaUrl
        Int actEconomicaId FK
    }

    ACT_ECONOMICA {
        Int id PK
        String titulo
        String descripcion
        String imagenPortadaUrl
        Int familiaId FK
        Int especialidadId FK
    }

    TIPO_CARRERA {
        Int id PK
        String nombre
    }

    CARRERA {
        Int id PK
        String nombre
        String codigo
        String descripcion
        String nivel
        String imagenPortadaUrl
        Timestamp creadoEn
        Timestamp actualizadoEn
        Int actEconomicaId FK
        Int tipoCarreraId FK
    }

    PLAN {
        Int id PK
        String duracion
        Int creditos
        String tituloComercial
        String slug
        String descripcion2
        String imagenPortadaUrl
        String planEstudio
        String periodoCaducidad
        String resolucionTipo
        String nro
        Int anio
        String genera
        Int carreraId FK
        Int periodoVigenciaId FK
    }

    MODULO {
        Int id PK
        String titulo
        String tituloComercial
        Int orden
        String descripcion
        Int horas
        Int creditos
        Int metas
        Boolean activo
        String slug
        Int planId FK
    }

    UNIDAD_DIDACTICA {
        Int id PK
        String nombre
        Int duracion
        Int creditos
        String sigla
        Int moduloId FK
    }

    CAPACIDAD_TERMINAL {
        Int id PK
        String descripcion
        String sigla
        Int unidadDidacticaId FK
    }

    INDICADOR_CAPACIDAD {
        Int id PK
        String descripcion
        String sigla
        Int capacidadTerminalId FK
    }

    APRENDIZAJE {
        Int id PK
        String descripcion
        String sigla
        Int indicadorCapacidadId FK
    }

    EJE_TRANSVERSAL {
        Int id PK
        String nombre
        String descripcion
    }

    VALOR_INSTITUCIONAL {
        Int id PK
        String nombre
        String descripcion
    }

    ACTIVIDAD {
        Int id PK
        String nombre
        String descripcion
        String proposito
        String ambiente
        Int duracion
        Timestamp fecha
        String bibliografia
        Int aprendizajeId FK
        Int ejeTransversalId FK
        Int valorInstitucionalId FK
    }

    FASE {
        Int id PK
        String nombre
        String descripcion
        String metodologia
        Int duracion
        Int actividadId FK
        Int accionId FK
    }

    ACCION {
        Int id PK
        String descripcion
    }

    METODO {
        Int id PK
        String nombre
        String descripcion
    }

    TECNICA {
        Int id PK
        String nombre
        String descripcion
    }

    RECURSO {
        Int id PK
        String nombre
        String descripcion
    }

    FASE_METODO {
        Int id PK
        Int faseId FK
        Int metodoId FK
    }

    FASE_TECNICA {
        Int id PK
        Int faseId FK
        Int tecnicaId FK
    }

    FASE_RECURSO {
        Int id PK
        Int faseId FK
        Int recursoId FK
    }

    EVALUACION {
        Int id PK
        String instrumento
        Int actividadId FK
        Int indicadorCapacidadId FK
        Int metodoId FK
        Int tecnicaId FK
    }

    ASPECTO_EVALUACION {
        Int id PK
        String descripcion
        Int evaluacionId FK
    }

    MODULO_ESTUDIANTE {
        Int id PK
        Float promedio
        Int matriculaId FK
        Int moduloId FK
        Int grupoId FK
    }

    UNIDAD_DIDACTICA_ESTUDIANTE {
        Int id PK
        Float promedio
        Int matriculaId FK
        Int unidadDidacticaId FK
    }

    CAPACIDAD_TERMINAL_ESTUDIANTE {
        Int id PK
        Float promedio
        Int matriculaId FK
        Int capacidadTerminalId FK
    }

    INDICADOR_CAPACIDAD_ESTUDIANTE {
        Int id PK
        Float promedio
        Int matriculaId FK
        Int indicadorCapacidadId FK
    }

    EVALUACION_ESTUDIANTE {
        Int id PK
        Float nota
        Int matriculaId FK
        Int evaluacionId FK
    }

    ASPECTO_EVALUACION_ESTUDIANTE {
        Int id PK
        Float puntaje
        Int evaluacionEstudianteId FK
        Int aspectoEvaluacionId FK
    }

    PERSONAL {
        Int id PK
        String displayName
        String memo
        Int userId FK
    }

    PERSONAL_ESPECIALIDAD {
        Int id PK
        Int personalId FK
        Int especialidadId FK
        Int orden
    }

    ANIO {
        Int id PK
        String nombre
        String titulo
    }

    SEMESTRE {
        Int id PK
        String titulo
        String descripcion
        Timestamp inicio
        Timestamp fin
        Boolean archivado
        Int anioId FK
        Int directorId FK
        Int coordinador1Id FK
        Int coordinador2Id FK
    }

    CALENDARIO {
        Int id PK
        String titulo
        String descripcion
        Timestamp inicio
        Timestamp fin
        Int duracion
        String color
        Boolean activo
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int anioId FK
        Int semestreId FK
        Int horarioId FK
    }

    TURNO {
        Int id PK
        String nombre
        Timestamp horaInicio
        Timestamp horaFin
        String estado
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
    }

    HORARIO {
        Int id PK
        String nombre
        String descripcion
        String regla
        String diasSemana
        String viernesAlternoInicio
        Boolean activo
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
    }

    GRUPO {
        Int id PK
        String turnoNombre
        String descripcion
        String nombreDisplay
        String estado
        Boolean archivado
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int semestreId FK
        Int personalId FK
        Int paqueteId FK
        Int turnoId FK
        Int horarioId FK
        Int grupoOrd
    }

    GRUPO_MODULO {
        Int id PK
        Int orden
        Boolean obligatorio
        Int grupoId FK
        Int moduloId FK
        Int calendarioId FK
    }

    EVENTO {
        Int id PK
        String titulo
        String descripcion
        String tipoEvento
        Timestamp fechaInicio
        Timestamp fechaFin
        Boolean todoElDia
        String ubicacion
        String color
        String estado
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int calendarioId FK
        Int semestreId FK
    }

    EVENTO_RECURRENCIA {
        Int id PK
        String frecuencia
        Int intervalo
        String diasSemana
        Int diaMes
        Int semanaMes
        Timestamp fechaInicio
        Timestamp fechaFin
        Int cantidadOcurrencias
        String reglaEspecial
        Boolean activo
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int eventoId FK
        Int horarioId FK
        Int turnoId FK
    }

    EVENTO_OCURRENCIA {
        Int id PK
        Timestamp fechaInicio
        Timestamp fechaFin
        Int numeroOcurrencia
        String tipoOcurrencia
        String estado
        String observacion
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int eventoId FK
        Int recurrenciaId FK
        Int grupoId FK
    }

    EVENTO_RELACION {
        Int id PK
        String entidadTipo
        Int entidadId FK
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int eventoId FK
    }

    RECORDATORIO {
        Int id PK
        String tipoRecordatorio
        Int minutosAntes
        String medio
        Boolean enviado
        Timestamp fechaEnvio
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int eventoId FK
        Int eventoOcurrenciaId FK
    }

    PAQUETE {
        Int id PK
        String titulo
        String descripcion
        Boolean archivado
    }

    PAQUETE_MODULO {
        Int id PK
        Int orden
        Boolean obligatorio
        Int paqueteId FK
        Int moduloId FK
    }

    MATRICULA {
        Int id PK
        String recibo
        Timestamp fecha
        Boolean archivado
        Int paqueteId FK
        Int userId FK
    }

    ASISTENCIA {
        Int id PK
        String estadoAsistencia
        String observacion
        Timestamp registradoAt
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Int eventoOcurrenciaId FK
        Int matriculaId FK
        Int registradoPorId FK
    }

    PUBLICACION {
        Int id PK
        String titulo
        String slug
        String tipo
        String descripcionCorta
        Timestamp fechaPublicacion
        Timestamp fechaEventoInicio
        Timestamp fechaEventoFin
        String ubicacion
        Boolean destacado
        String contenido1
        String contenido2
    }

    POST {
        Int id PK
        String titulo
        String slug
        String tipo
        String contenido
        String resumen
        String imagenPortadaUrl
        String estado
        Boolean comentariosActivos
        String entidadTipo
        String entidadId FK
        String creadoPorUid FK
        Timestamp fechaCreacion
        Timestamp fechaActualizacion
        Timestamp fechaPublicacion
    }

    VIDEO_YOUTUBE {
        Int id PK
        String url
    }

    MODULO_VIDEO {
        Int id PK
        Int moduloId FK
        Int videoId FK
        String field
        Int orden
    }

    PUBLICACION_VIDEO {
        Int id PK
        Int publicacionId FK
        Int videoId FK
        String field
        Int orden
    }

    DATO_GENERAL {
        Int id PK
        String nombreInstitucion
        String direccion
        String telefono1
        String telefono2
        String correo
        String paginaWeb
        String facebook
        String youtube
        String twitter
        String instagram
        String tiktok
        String ruc
        String rd
    }

    ROL ||--o{ USER : rol
    SECTOR ||--o{ FAMILIA : sector
    ACT_ECONOMICA ||--o{ ESPECIALIDAD : actEconomica
    FAMILIA ||--o{ ACT_ECONOMICA : familia
    ACT_ECONOMICA ||--o{ CARRERA : actEconomica
    TIPO_CARRERA ||--o{ CARRERA : tipoCarrera
    CARRERA ||--o{ PLAN : carrera
    SEMESTRE ||--o{ PLAN : periodoVigencia
    PLAN ||--o{ MODULO : plan
    MODULO ||--o{ UNIDAD_DIDACTICA : modulo
    UNIDAD_DIDACTICA ||--o{ CAPACIDAD_TERMINAL : unidadDidactica
    CAPACIDAD_TERMINAL ||--o{ INDICADOR_CAPACIDAD : capacidadTerminal
    INDICADOR_CAPACIDAD ||--o{ APRENDIZAJE : indicadorCapacidad
    APRENDIZAJE ||--o{ ACTIVIDAD : aprendizaje
    EJE_TRANSVERSAL ||--o{ ACTIVIDAD : ejeTransversal
    VALOR_INSTITUCIONAL ||--o{ ACTIVIDAD : valorInstitucional
    ACTIVIDAD ||--o{ FASE : actividad
    ACCION ||--o{ FASE : accion
    FASE ||--o{ FASE_METODO : fase
    METODO ||--o{ FASE_METODO : metodo
    FASE ||--o{ FASE_TECNICA : fase
    TECNICA ||--o{ FASE_TECNICA : tecnica
    FASE ||--o{ FASE_RECURSO : fase
    RECURSO ||--o{ FASE_RECURSO : recurso
    ACTIVIDAD ||--o{ EVALUACION : actividad
    INDICADOR_CAPACIDAD ||--o{ EVALUACION : indicadorCapacidad
    METODO ||--o{ EVALUACION : metodo
    TECNICA ||--o{ EVALUACION : tecnica
    EVALUACION ||--o{ ASPECTO_EVALUACION : evaluacion
    MATRICULA ||--o{ MODULO_ESTUDIANTE : matricula
    MODULO ||--o{ MODULO_ESTUDIANTE : modulo
    GRUPO ||--o{ MODULO_ESTUDIANTE : grupo
    MATRICULA ||--o{ UNIDAD_DIDACTICA_ESTUDIANTE : matricula
    UNIDAD_DIDACTICA ||--o{ UNIDAD_DIDACTICA_ESTUDIANTE : unidadDidactica
    MATRICULA ||--o{ CAPACIDAD_TERMINAL_ESTUDIANTE : matricula
    CAPACIDAD_TERMINAL ||--o{ CAPACIDAD_TERMINAL_ESTUDIANTE : capacidadTerminal
    MATRICULA ||--o{ INDICADOR_CAPACIDAD_ESTUDIANTE : matricula
    INDICADOR_CAPACIDAD ||--o{ INDICADOR_CAPACIDAD_ESTUDIANTE : indicadorCapacidad
    MATRICULA ||--o{ EVALUACION_ESTUDIANTE : matricula
    EVALUACION ||--o{ EVALUACION_ESTUDIANTE : evaluacion
    EVALUACION_ESTUDIANTE ||--o{ ASPECTO_EVALUACION_ESTUDIANTE : evaluacionEstudiante
    ASPECTO_EVALUACION ||--o{ ASPECTO_EVALUACION_ESTUDIANTE : aspectoEvaluacion
    USER ||--o{ PERSONAL : user
    PERSONAL ||--o{ PERSONAL_ESPECIALIDAD : personal
    ESPECIALIDAD ||--o{ PERSONAL_ESPECIALIDAD : especialidad
    ANIO ||--o{ SEMESTRE : anio
    PERSONAL ||--o{ SEMESTRE : director
    ANIO ||--o{ CALENDARIO : anio
    SEMESTRE ||--o{ CALENDARIO : semestre
    HORARIO ||--o{ CALENDARIO : horario
    SEMESTRE ||--o{ GRUPO : semestre
    PERSONAL ||--o{ GRUPO : personal
    PAQUETE ||--o{ GRUPO : paquete
    TURNO ||--o{ GRUPO : turno
    HORARIO ||--o{ GRUPO : horario
    GRUPO ||--o{ GRUPO_MODULO : grupo
    MODULO ||--o{ GRUPO_MODULO : modulo
    CALENDARIO ||--o{ GRUPO_MODULO : calendario
    CALENDARIO ||--o{ EVENTO : calendario
    SEMESTRE ||--o{ EVENTO : semestre
    EVENTO ||--o{ EVENTO_RECURRENCIA : evento
    HORARIO ||--o{ EVENTO_RECURRENCIA : horario
    TURNO ||--o{ EVENTO_RECURRENCIA : turno
    EVENTO ||--o{ EVENTO_OCURRENCIA : evento
    EVENTO_RECURRENCIA ||--o{ EVENTO_OCURRENCIA : recurrencia
    GRUPO ||--o{ EVENTO_OCURRENCIA : grupo
    EVENTO ||--o{ EVENTO_RELACION : evento
    EVENTO ||--o{ RECORDATORIO : evento
    EVENTO_OCURRENCIA ||--o{ RECORDATORIO : eventoOcurrencia
    PAQUETE ||--o{ PAQUETE_MODULO : paquete
    MODULO ||--o{ PAQUETE_MODULO : modulo
    PAQUETE ||--o{ MATRICULA : paquete
    USER ||--o{ MATRICULA : user
    EVENTO_OCURRENCIA ||--o{ ASISTENCIA : eventoOcurrencia
    MATRICULA ||--o{ ASISTENCIA : matricula
    USER ||--o{ ASISTENCIA : registradoPor
    MODULO ||--o{ MODULO_VIDEO : modulo
    VIDEO_YOUTUBE ||--o{ MODULO_VIDEO : video
    PUBLICACION ||--o{ PUBLICACION_VIDEO : publicacion
    VIDEO_YOUTUBE ||--o{ PUBLICACION_VIDEO : video
```
