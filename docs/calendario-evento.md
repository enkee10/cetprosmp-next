erDiagram

    PERIODOS {
        int id PK
        string codigo
        string nombre
        date fecha_inicio
        date fecha_fin
        string estado
        datetime created_at
        datetime updated_at
    }

    CALENDARIOS {
        int id PK
        int periodo_id FK
        string nombre
        string descripcion
        string tipo_calendario
        string color
        boolean activo
        datetime created_at
        datetime updated_at
    }

    EVENTOS {
        int id PK
        int calendario_id FK
        int grupo_modulo_id FK
        string titulo
        string descripcion
        string tipo_evento
        date fecha_inicio
        date fecha_fin
        time hora_inicio
        time hora_fin
        boolean todo_el_dia
        string ubicacion
        string color
        string estado
        datetime created_at
        datetime updated_at
    }

    EVENTO_RECURRENCIAS {
        int id PK
        int evento_id FK
        string frecuencia
        int intervalo
        string dias_semana
        int dia_mes
        int semana_mes
        date fecha_inicio
        date fecha_fin
        int cantidad_ocurrencias
        string regla_especial
        boolean activo
        datetime created_at
        datetime updated_at
    }

    EVENTO_OCURRENCIAS {
        int id PK
        int evento_id FK
        int recurrencia_id FK
        int grupo_modulo_id FK
        date fecha
        time hora_inicio
        time hora_fin
        int numero_ocurrencia
        string tipo_ocurrencia
        string estado
        string observacion
        datetime created_at
        datetime updated_at
    }

    EVENTO_RELACIONES {
        int id PK
        int evento_id FK
        string entidad_tipo
        int entidad_id
        datetime created_at
        datetime updated_at
    }

    RECORDATORIOS {
        int id PK
        int evento_id FK
        int evento_ocurrencia_id FK
        string tipo_recordatorio
        int minutos_antes
        string medio
        boolean enviado
        datetime fecha_envio
        datetime created_at
        datetime updated_at
    }

    GRUPO_MODULO {
        int id PK
        int periodo_id FK
        int grupo_id FK
        int modulo_id FK
        int docente_id FK
        int turno_id FK
        string estado
        datetime created_at
        datetime updated_at
    }

    GRUPOS {
        int id PK
        string nombre
        string descripcion
        string estado
        datetime created_at
        datetime updated_at
    }

    MODULOS {
        int id PK
        string codigo
        string nombre
        string descripcion
        int horas
        string estado
        datetime created_at
        datetime updated_at
    }

    DOCENTES {
        int id PK
        string tipo_documento
        string numero_documento
        string nombres
        string apellidos
        string email
        string telefono
        string estado
        datetime created_at
        datetime updated_at
    }

    TURNOS {
        int id PK
        string nombre
        time hora_inicio
        time hora_fin
        string estado
        datetime created_at
        datetime updated_at
    }

    ESTUDIANTES {
        int id PK
        string tipo_documento
        string numero_documento
        string nombres
        string apellidos
        string email
        string telefono
        string estado
        datetime created_at
        datetime updated_at
    }

    MATRICULAS {
        int id PK
        int estudiante_id FK
        int periodo_id FK
        string codigo
        date fecha_matricula
        string estado
        datetime created_at
        datetime updated_at
    }

    MATRICULA_MODULO {
        int id PK
        int matricula_id FK
        int grupo_modulo_id FK
        string estado
        datetime created_at
        datetime updated_at
    }

    ASISTENCIAS {
        int id PK
        int evento_ocurrencia_id FK
        int estudiante_id FK
        int matricula_modulo_id FK
        string estado_asistencia
        string observacion
        int registrado_por
        datetime registrado_at
        datetime created_at
        datetime updated_at
    }

    PERIODOS ||--o{ CALENDARIOS : tiene
    CALENDARIOS ||--o{ EVENTOS : contiene

    EVENTOS ||--o{ EVENTO_RECURRENCIAS : define
    EVENTOS ||--o{ EVENTO_OCURRENCIAS : genera
    EVENTO_RECURRENCIAS ||--o{ EVENTO_OCURRENCIAS : produce

    EVENTOS ||--o{ EVENTO_RELACIONES : vincula
    EVENTOS ||--o{ RECORDATORIOS : tiene
    EVENTO_OCURRENCIAS ||--o{ RECORDATORIOS : puede_tener

    PERIODOS ||--o{ GRUPO_MODULO : organiza
    GRUPOS ||--o{ GRUPO_MODULO : agrupa
    MODULOS ||--o{ GRUPO_MODULO : programa
    DOCENTES ||--o{ GRUPO_MODULO : dicta
    TURNOS ||--o{ GRUPO_MODULO : asigna

    GRUPO_MODULO ||--o{ EVENTOS : origina
    GRUPO_MODULO ||--o{ EVENTO_OCURRENCIAS : contiene

    ESTUDIANTES ||--o{ MATRICULAS : realiza
    PERIODOS ||--o{ MATRICULAS : recibe
    MATRICULAS ||--o{ MATRICULA_MODULO : incluye
    GRUPO_MODULO ||--o{ MATRICULA_MODULO : recibe

    EVENTO_OCURRENCIAS ||--o{ ASISTENCIAS : registra
    ESTUDIANTES ||--o{ ASISTENCIAS : tiene
    MATRICULA_MODULO ||--o{ ASISTENCIAS : corresponde