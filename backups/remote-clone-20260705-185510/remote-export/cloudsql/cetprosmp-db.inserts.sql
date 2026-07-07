--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acciones (
    id integer NOT NULL,
    descripcion text
);


--
-- Name: acciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.acciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: acciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.acciones_id_seq OWNED BY public.acciones.id;


--
-- Name: act_economicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.act_economicas (
    id integer NOT NULL,
    descripcion text,
    especialidad_id integer,
    familia_id integer,
    titulo text,
    imagen_portada_url text
);


--
-- Name: act_economicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.act_economicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: act_economicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.act_economicas_id_seq OWNED BY public.act_economicas.id;


--
-- Name: actividades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actividades (
    id integer NOT NULL,
    aprendizaje_id integer NOT NULL,
    eje_transversal_id integer,
    valor_institucional_id integer,
    ambiente text,
    bibliografia text,
    descripcion text,
    duracion integer,
    fecha timestamp with time zone,
    nombre text,
    proposito text
);


--
-- Name: actividades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.actividades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: actividades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.actividades_id_seq OWNED BY public.actividades.id;


--
-- Name: anios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anios (
    id integer NOT NULL,
    nombre text,
    titulo text
);


--
-- Name: anios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.anios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: anios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.anios_id_seq OWNED BY public.anios.id;


--
-- Name: aprendizajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aprendizajes (
    id integer NOT NULL,
    indicador_capacidad_id integer NOT NULL,
    descripcion text,
    sigla text
);


--
-- Name: aprendizajes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aprendizajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aprendizajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aprendizajes_id_seq OWNED BY public.aprendizajes.id;


--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    evento_ocurrencia_id integer NOT NULL,
    matricula_id integer NOT NULL,
    registrado_por_id integer,
    estado_asistencia text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    observacion text,
    registrado_at timestamp with time zone
);


--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: aspectos_evaluacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aspectos_evaluacion (
    id integer NOT NULL,
    evaluacion_id integer NOT NULL,
    descripcion text
);


--
-- Name: aspectos_evaluacion_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aspectos_evaluacion_estudiantes (
    id integer NOT NULL,
    aspecto_evaluacion_id integer NOT NULL,
    evaluacion_estudiante_id integer CONSTRAINT aspectos_evaluacion_estudiant_evaluacion_estudiante_id_not_null NOT NULL,
    puntaje double precision
);


--
-- Name: aspectos_evaluacion_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aspectos_evaluacion_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aspectos_evaluacion_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aspectos_evaluacion_estudiantes_id_seq OWNED BY public.aspectos_evaluacion_estudiantes.id;


--
-- Name: aspectos_evaluacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aspectos_evaluacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aspectos_evaluacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aspectos_evaluacion_id_seq OWNED BY public.aspectos_evaluacion.id;


--
-- Name: calendarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendarios (
    id integer NOT NULL,
    archivado boolean,
    descripcion text,
    fecha_fin timestamp with time zone,
    fecha_ini timestamp with time zone,
    semestre_id integer,
    tipo text,
    titulo text,
    anio_id integer,
    horario_id integer,
    activo boolean,
    color text,
    duracion integer,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fin timestamp with time zone,
    inicio timestamp with time zone
);


--
-- Name: calendarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendarios_id_seq OWNED BY public.calendarios.id;


--
-- Name: capacidades_terminales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacidades_terminales (
    id integer NOT NULL,
    unidad_didactica_id integer NOT NULL,
    descripcion text,
    sigla text
);


--
-- Name: capacidades_terminales_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacidades_terminales_estudiantes (
    id integer NOT NULL,
    capacidad_terminal_id integer CONSTRAINT capacidades_terminales_estudiant_capacidad_terminal_id_not_null NOT NULL,
    matricula_id integer NOT NULL,
    promedio double precision
);


--
-- Name: capacidades_terminales_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capacidades_terminales_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capacidades_terminales_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capacidades_terminales_estudiantes_id_seq OWNED BY public.capacidades_terminales_estudiantes.id;


--
-- Name: capacidades_terminales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capacidades_terminales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capacidades_terminales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capacidades_terminales_id_seq OWNED BY public.capacidades_terminales.id;


--
-- Name: carreras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carreras (
    id integer NOT NULL,
    act_economica_id integer,
    codigo text,
    creditos integer,
    descripcion text,
    descripcion_2 text,
    duracion text,
    nivel text,
    slug text,
    titulo text,
    titulo_comercial text,
    tipo_carrera_id integer,
    actualizado_en timestamp with time zone,
    creado_en timestamp with time zone,
    imagen_portada_url text,
    nombre text
);


--
-- Name: carreras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carreras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carreras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carreras_id_seq OWNED BY public.carreras.id;


--
-- Name: dato_general; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dato_general (
    id integer NOT NULL,
    correo text,
    direccion text,
    facebook text,
    instagram text,
    nombre_institucion text,
    pagina_web text,
    rd text,
    ruc text,
    telefono_1 text,
    telefono_2 text,
    tiktok text,
    twitter text,
    youtube text
);


--
-- Name: dato_general_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dato_general_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dato_general_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dato_general_id_seq OWNED BY public.dato_general.id;


--
-- Name: ejes_transversales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ejes_transversales (
    id integer NOT NULL,
    descripcion text,
    nombre text
);


--
-- Name: ejes_transversales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ejes_transversales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ejes_transversales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ejes_transversales_id_seq OWNED BY public.ejes_transversales.id;


--
-- Name: especialidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.especialidades (
    id integer NOT NULL,
    act_economica_id integer,
    descripcion text,
    descripcion_2 text,
    slug text,
    titulo text,
    titulo_comercial text,
    imagen_portada_url text
);


--
-- Name: especialidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.especialidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: especialidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.especialidades_id_seq OWNED BY public.especialidades.id;


--
-- Name: evaluaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluaciones (
    id integer NOT NULL,
    actividad_id integer NOT NULL,
    indicador_capacidad_id integer NOT NULL,
    metodo_id integer,
    tecnica_id integer,
    instrumento text
);


--
-- Name: evaluaciones_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluaciones_estudiantes (
    id integer NOT NULL,
    evaluacion_id integer NOT NULL,
    matricula_id integer NOT NULL,
    nota double precision
);


--
-- Name: evaluaciones_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evaluaciones_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evaluaciones_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evaluaciones_estudiantes_id_seq OWNED BY public.evaluaciones_estudiantes.id;


--
-- Name: evaluaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evaluaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evaluaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evaluaciones_id_seq OWNED BY public.evaluaciones.id;


--
-- Name: evento_ocurrencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evento_ocurrencias (
    id integer NOT NULL,
    evento_id integer NOT NULL,
    grupo_id integer,
    recurrencia_id integer,
    estado text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fecha_fin timestamp with time zone,
    fecha_inicio timestamp with time zone,
    numero_ocurrencia integer,
    observacion text,
    tipo_ocurrencia text
);


--
-- Name: evento_ocurrencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evento_ocurrencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evento_ocurrencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evento_ocurrencias_id_seq OWNED BY public.evento_ocurrencias.id;


--
-- Name: evento_recurrencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evento_recurrencias (
    id integer NOT NULL,
    evento_id integer NOT NULL,
    horario_id integer,
    turno_id integer,
    activo boolean,
    cantidad_ocurrencias integer,
    dia_mes integer,
    dias_semana text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fecha_fin timestamp with time zone,
    fecha_inicio timestamp with time zone,
    frecuencia text,
    intervalo integer,
    regla_especial text,
    semana_mes integer
);


--
-- Name: evento_recurrencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evento_recurrencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evento_recurrencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evento_recurrencias_id_seq OWNED BY public.evento_recurrencias.id;


--
-- Name: evento_relaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evento_relaciones (
    id integer NOT NULL,
    evento_id integer NOT NULL,
    entidad_id integer,
    entidad_tipo text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone
);


--
-- Name: evento_relaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evento_relaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evento_relaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evento_relaciones_id_seq OWNED BY public.evento_relaciones.id;


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos (
    id integer NOT NULL,
    calendario_id integer NOT NULL,
    semestre_id integer,
    color text,
    descripcion text,
    estado text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fecha_fin timestamp with time zone,
    fecha_inicio timestamp with time zone,
    tipo_evento text,
    titulo text,
    todo_el_dia boolean,
    ubicacion text
);


--
-- Name: eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_id_seq OWNED BY public.eventos.id;


--
-- Name: familias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.familias (
    id integer NOT NULL,
    descripcion text,
    sector_id integer,
    titulo text,
    imagen_portada_url text
);


--
-- Name: familias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.familias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: familias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.familias_id_seq OWNED BY public.familias.id;


--
-- Name: fases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fases (
    id integer NOT NULL,
    accion_id integer,
    actividad_id integer NOT NULL,
    descripcion text,
    duracion integer,
    metodologia text,
    nombre text
);


--
-- Name: fases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fases_id_seq OWNED BY public.fases.id;


--
-- Name: fases_metodos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fases_metodos (
    id integer NOT NULL,
    fase_id integer NOT NULL,
    metodo_id integer NOT NULL
);


--
-- Name: fases_metodos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fases_metodos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fases_metodos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fases_metodos_id_seq OWNED BY public.fases_metodos.id;


--
-- Name: fases_recursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fases_recursos (
    id integer NOT NULL,
    fase_id integer NOT NULL,
    recurso_id integer NOT NULL
);


--
-- Name: fases_recursos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fases_recursos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fases_recursos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fases_recursos_id_seq OWNED BY public.fases_recursos.id;


--
-- Name: fases_tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fases_tecnicas (
    id integer NOT NULL,
    fase_id integer NOT NULL,
    tecnica_id integer NOT NULL
);


--
-- Name: fases_tecnicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fases_tecnicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fases_tecnicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fases_tecnicas_id_seq OWNED BY public.fases_tecnicas.id;


--
-- Name: grupo_modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo_modulos (
    id integer NOT NULL,
    calendario_id integer,
    grupo_id integer NOT NULL,
    modulo_id integer NOT NULL,
    obligatorio boolean,
    orden integer
);


--
-- Name: grupo_modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupo_modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupo_modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupo_modulos_id_seq OWNED BY public.grupo_modulos.id;


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos (
    id integer NOT NULL,
    archivado boolean,
    calendario_id integer,
    descripcion text,
    modulo_id integer,
    nombre_display text,
    personal_id integer,
    turno text,
    horario_id integer,
    paquete_id integer,
    semestre_id integer,
    turno_id integer,
    estado text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    grupo_ord integer
);


--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios (
    id integer NOT NULL,
    activo boolean,
    descripcion text,
    dias_semana text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    nombre text,
    regla text,
    viernes_alterno_inicio text
);


--
-- Name: horarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_id_seq OWNED BY public.horarios.id;


--
-- Name: indicadores_capacidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicadores_capacidad (
    id integer NOT NULL,
    capacidad_terminal_id integer NOT NULL,
    descripcion text,
    sigla text
);


--
-- Name: indicadores_capacidad_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicadores_capacidad_estudiantes (
    id integer NOT NULL,
    indicador_capacidad_id integer CONSTRAINT indicadores_capacidad_estudiant_indicador_capacidad_id_not_null NOT NULL,
    matricula_id integer NOT NULL,
    promedio double precision
);


--
-- Name: indicadores_capacidad_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.indicadores_capacidad_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: indicadores_capacidad_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.indicadores_capacidad_estudiantes_id_seq OWNED BY public.indicadores_capacidad_estudiantes.id;


--
-- Name: indicadores_capacidad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.indicadores_capacidad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: indicadores_capacidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.indicadores_capacidad_id_seq OWNED BY public.indicadores_capacidad.id;


--
-- Name: matricula_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula_grupos (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    matricula_id integer NOT NULL
);


--
-- Name: matricula_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matricula_grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matricula_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matricula_grupos_id_seq OWNED BY public.matricula_grupos.id;


--
-- Name: matricula_paquetes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula_paquetes (
    id integer NOT NULL,
    matricula_id integer NOT NULL,
    paquete_id integer NOT NULL
);


--
-- Name: matricula_paquetes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matricula_paquetes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matricula_paquetes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matricula_paquetes_id_seq OWNED BY public.matricula_paquetes.id;


--
-- Name: matricula_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula_users (
    id integer NOT NULL,
    matricula_id integer NOT NULL,
    user_id integer NOT NULL
);


--
-- Name: matricula_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matricula_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matricula_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matricula_users_id_seq OWNED BY public.matricula_users.id;


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriculas (
    id integer NOT NULL,
    archivado boolean,
    fecha timestamp with time zone,
    recibo text,
    paquete_id integer,
    semestre_id integer,
    user_id integer
);


--
-- Name: matriculas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matriculas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matriculas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matriculas_id_seq OWNED BY public.matriculas.id;


--
-- Name: metodos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos (
    id integer NOT NULL,
    descripcion text,
    nombre text
);


--
-- Name: metodos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metodos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_id_seq OWNED BY public.metodos.id;


--
-- Name: modulo_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulo_videos (
    id integer NOT NULL,
    field text,
    modulo_id integer,
    orden integer,
    video_id integer
);


--
-- Name: modulo_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modulo_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modulo_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modulo_videos_id_seq OWNED BY public.modulo_videos.id;


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos (
    id integer NOT NULL,
    activo boolean,
    carrera_id integer,
    creditos integer,
    descripcion text,
    descripcion_2 text,
    horas integer,
    metas integer,
    orden integer,
    slug text,
    titulo text,
    titulo_comercial text,
    plan_id integer
);


--
-- Name: modulos_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos_estudiantes (
    id integer NOT NULL,
    grupo_id integer,
    matricula_id integer NOT NULL,
    modulo_id integer NOT NULL,
    promedio double precision
);


--
-- Name: modulos_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modulos_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modulos_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modulos_estudiantes_id_seq OWNED BY public.modulos_estudiantes.id;


--
-- Name: modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modulos_id_seq OWNED BY public.modulos.id;


--
-- Name: paquete_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paquete_grupos (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    grupo_ord integer,
    paquete_id integer NOT NULL
);


--
-- Name: paquete_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paquete_grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paquete_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paquete_grupos_id_seq OWNED BY public.paquete_grupos.id;


--
-- Name: paquete_modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paquete_modulos (
    id integer NOT NULL,
    modulo_id integer NOT NULL,
    paquete_id integer NOT NULL,
    obligatorio boolean,
    orden integer
);


--
-- Name: paquete_modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paquete_modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paquete_modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paquete_modulos_id_seq OWNED BY public.paquete_modulos.id;


--
-- Name: paquetes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paquetes (
    id integer NOT NULL,
    archivado boolean,
    descripcion text,
    titulo text
);


--
-- Name: paquetes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paquetes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paquetes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paquetes_id_seq OWNED BY public.paquetes.id;


--
-- Name: personal_especialidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_especialidades (
    id integer NOT NULL,
    especialidad_id integer NOT NULL,
    orden integer,
    personal_id integer NOT NULL
);


--
-- Name: personal_especialidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_especialidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_especialidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_especialidades_id_seq OWNED BY public.personal_especialidades.id;


--
-- Name: personales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personales (
    id integer NOT NULL,
    display_name text,
    memo text,
    user_id integer
);


--
-- Name: personales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personales_id_seq OWNED BY public.personales.id;


--
-- Name: planes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes (
    id integer NOT NULL,
    carrera_id integer,
    periodo_vigencia_id integer,
    anio integer,
    creditos integer,
    descripcion_2 text,
    duracion text,
    genera text,
    imagen_portada_url text,
    nro text,
    periodo_caducidad text,
    plan_estudio text,
    resolucion_tipo text,
    slug text,
    titulo_comercial text
);


--
-- Name: planes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_id_seq OWNED BY public.planes.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    comentarios_activos boolean DEFAULT true NOT NULL,
    contenido text,
    creado_por_uid character varying(128),
    entidad_id character varying(120),
    entidad_tipo character varying(80),
    estado character varying(40) DEFAULT 'borrador'::character varying NOT NULL,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fecha_publicacion timestamp with time zone,
    imagen_portada_url text,
    resumen text,
    slug character varying(260) NOT NULL,
    tipo character varying(40) NOT NULL,
    titulo character varying(220) NOT NULL
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: publicacion_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publicacion_videos (
    id integer NOT NULL,
    field text,
    orden integer,
    publicacion_id integer,
    video_id integer
);


--
-- Name: publicacion_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publicacion_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publicacion_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publicacion_videos_id_seq OWNED BY public.publicacion_videos.id;


--
-- Name: publicaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publicaciones (
    id integer NOT NULL,
    contenido_1 text,
    contenido_2 text,
    descripcion_corta text,
    destacado boolean,
    fecha_evento_fin timestamp with time zone,
    fecha_evento_inicio timestamp with time zone,
    fecha_publicacion timestamp with time zone,
    slug text,
    tipo text,
    titulo text,
    ubicacion text
);


--
-- Name: publicaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publicaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publicaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publicaciones_id_seq OWNED BY public.publicaciones.id;


--
-- Name: recordatorios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recordatorios (
    id integer NOT NULL,
    evento_id integer,
    evento_ocurrencia_id integer,
    enviado boolean,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    fecha_envio timestamp with time zone,
    medio text,
    minutos_antes integer,
    tipo_recordatorio text
);


--
-- Name: recordatorios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recordatorios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recordatorios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recordatorios_id_seq OWNED BY public.recordatorios.id;


--
-- Name: recursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recursos (
    id integer NOT NULL,
    descripcion text,
    nombre text
);


--
-- Name: recursos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recursos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recursos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recursos_id_seq OWNED BY public.recursos.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer CONSTRAINT roles_id_not_null1 NOT NULL,
    scala integer,
    titulo text
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sectores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectores (
    id integer NOT NULL,
    descripcion text,
    titulo text,
    imagen_portada_url text
);


--
-- Name: sectores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sectores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sectores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sectores_id_seq OWNED BY public.sectores.id;


--
-- Name: semestres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semestres (
    id integer NOT NULL,
    archivado boolean,
    coordinador_1_id integer,
    coordinador_2_id integer,
    descripcion text,
    director_id integer,
    titulo text,
    anio_id integer,
    fin timestamp with time zone,
    inicio timestamp with time zone
);


--
-- Name: semestres_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semestres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: semestres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semestres_id_seq OWNED BY public.semestres.id;


--
-- Name: tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tecnicas (
    id integer NOT NULL,
    descripcion text,
    nombre text
);


--
-- Name: tecnicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tecnicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tecnicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tecnicas_id_seq OWNED BY public.tecnicas.id;


--
-- Name: tipo_carreras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_carreras (
    id integer NOT NULL,
    nombre text
);


--
-- Name: tipo_carreras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_carreras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_carreras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_carreras_id_seq OWNED BY public.tipo_carreras.id;


--
-- Name: turnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos (
    id integer NOT NULL,
    estado text,
    fecha_actualizacion timestamp with time zone,
    fecha_creacion timestamp with time zone,
    hora_fin timestamp with time zone,
    hora_inicio timestamp with time zone,
    nombre text
);


--
-- Name: turnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turnos_id_seq OWNED BY public.turnos.id;


--
-- Name: unidades_didacticas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_didacticas (
    id integer NOT NULL,
    modulo_id integer NOT NULL,
    creditos integer,
    duracion integer,
    nombre text,
    sigla text
);


--
-- Name: unidades_didacticas_estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_didacticas_estudiantes (
    id integer NOT NULL,
    matricula_id integer NOT NULL,
    unidad_didactica_id integer NOT NULL,
    promedio double precision
);


--
-- Name: unidades_didacticas_estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_didacticas_estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_didacticas_estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_didacticas_estudiantes_id_seq OWNED BY public.unidades_didacticas_estudiantes.id;


--
-- Name: unidades_didacticas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_didacticas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_didacticas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_didacticas_id_seq OWNED BY public.unidades_didacticas.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    apellido_materno text,
    apellido_paterno text,
    apellidos text,
    avatar text,
    blocked boolean,
    celular text,
    confirmed boolean,
    direccion text,
    distrito text,
    dni text,
    document_id text,
    email text,
    estado_civil text,
    fecha_nacimiento timestamp with time zone,
    instruccion text,
    nombre text,
    provider text,
    sexo text,
    telefono text,
    tipo_documento text,
    username text,
    rol_id integer,
    correo_institucional text,
    dni_imagen_frente_url text,
    dni_imagen_reverso_url text,
    email_creador text,
    fecha_creacion timestamp with time zone,
    fecha_modificacion timestamp with time zone,
    nacionalidad text DEFAULT 'PERUANA'::text,
    dni_imagen_frente_procesada_url text,
    dni_imagen_reverso_procesada_url text,
    fecha_vencimiento timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: valores_institucionales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.valores_institucionales (
    id integer NOT NULL,
    descripcion text,
    nombre text
);


--
-- Name: valores_institucionales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.valores_institucionales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: valores_institucionales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.valores_institucionales_id_seq OWNED BY public.valores_institucionales.id;


--
-- Name: videos_youtube; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos_youtube (
    id integer NOT NULL,
    url text
);


--
-- Name: videos_youtube_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.videos_youtube_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: videos_youtube_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.videos_youtube_id_seq OWNED BY public.videos_youtube.id;


--
-- Name: acciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acciones ALTER COLUMN id SET DEFAULT nextval('public.acciones_id_seq'::regclass);


--
-- Name: act_economicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.act_economicas ALTER COLUMN id SET DEFAULT nextval('public.act_economicas_id_seq'::regclass);


--
-- Name: actividades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades ALTER COLUMN id SET DEFAULT nextval('public.actividades_id_seq'::regclass);


--
-- Name: anios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anios ALTER COLUMN id SET DEFAULT nextval('public.anios_id_seq'::regclass);


--
-- Name: aprendizajes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprendizajes ALTER COLUMN id SET DEFAULT nextval('public.aprendizajes_id_seq'::regclass);


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: aspectos_evaluacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion ALTER COLUMN id SET DEFAULT nextval('public.aspectos_evaluacion_id_seq'::regclass);


--
-- Name: aspectos_evaluacion_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.aspectos_evaluacion_estudiantes_id_seq'::regclass);


--
-- Name: calendarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarios ALTER COLUMN id SET DEFAULT nextval('public.calendarios_id_seq'::regclass);


--
-- Name: capacidades_terminales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales ALTER COLUMN id SET DEFAULT nextval('public.capacidades_terminales_id_seq'::regclass);


--
-- Name: capacidades_terminales_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.capacidades_terminales_estudiantes_id_seq'::regclass);


--
-- Name: carreras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras ALTER COLUMN id SET DEFAULT nextval('public.carreras_id_seq'::regclass);


--
-- Name: dato_general id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dato_general ALTER COLUMN id SET DEFAULT nextval('public.dato_general_id_seq'::regclass);


--
-- Name: ejes_transversales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ejes_transversales ALTER COLUMN id SET DEFAULT nextval('public.ejes_transversales_id_seq'::regclass);


--
-- Name: especialidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades ALTER COLUMN id SET DEFAULT nextval('public.especialidades_id_seq'::regclass);


--
-- Name: evaluaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones ALTER COLUMN id SET DEFAULT nextval('public.evaluaciones_id_seq'::regclass);


--
-- Name: evaluaciones_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.evaluaciones_estudiantes_id_seq'::regclass);


--
-- Name: evento_ocurrencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_ocurrencias ALTER COLUMN id SET DEFAULT nextval('public.evento_ocurrencias_id_seq'::regclass);


--
-- Name: evento_recurrencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_recurrencias ALTER COLUMN id SET DEFAULT nextval('public.evento_recurrencias_id_seq'::regclass);


--
-- Name: evento_relaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_relaciones ALTER COLUMN id SET DEFAULT nextval('public.evento_relaciones_id_seq'::regclass);


--
-- Name: eventos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos ALTER COLUMN id SET DEFAULT nextval('public.eventos_id_seq'::regclass);


--
-- Name: familias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familias ALTER COLUMN id SET DEFAULT nextval('public.familias_id_seq'::regclass);


--
-- Name: fases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases ALTER COLUMN id SET DEFAULT nextval('public.fases_id_seq'::regclass);


--
-- Name: fases_metodos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_metodos ALTER COLUMN id SET DEFAULT nextval('public.fases_metodos_id_seq'::regclass);


--
-- Name: fases_recursos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_recursos ALTER COLUMN id SET DEFAULT nextval('public.fases_recursos_id_seq'::regclass);


--
-- Name: fases_tecnicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_tecnicas ALTER COLUMN id SET DEFAULT nextval('public.fases_tecnicas_id_seq'::regclass);


--
-- Name: grupo_modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_modulos ALTER COLUMN id SET DEFAULT nextval('public.grupo_modulos_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: horarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios ALTER COLUMN id SET DEFAULT nextval('public.horarios_id_seq'::regclass);


--
-- Name: indicadores_capacidad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad ALTER COLUMN id SET DEFAULT nextval('public.indicadores_capacidad_id_seq'::regclass);


--
-- Name: indicadores_capacidad_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.indicadores_capacidad_estudiantes_id_seq'::regclass);


--
-- Name: matricula_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_grupos ALTER COLUMN id SET DEFAULT nextval('public.matricula_grupos_id_seq'::regclass);


--
-- Name: matricula_paquetes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_paquetes ALTER COLUMN id SET DEFAULT nextval('public.matricula_paquetes_id_seq'::regclass);


--
-- Name: matricula_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_users ALTER COLUMN id SET DEFAULT nextval('public.matricula_users_id_seq'::regclass);


--
-- Name: matriculas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas ALTER COLUMN id SET DEFAULT nextval('public.matriculas_id_seq'::regclass);


--
-- Name: metodos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos ALTER COLUMN id SET DEFAULT nextval('public.metodos_id_seq'::regclass);


--
-- Name: modulo_videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulo_videos ALTER COLUMN id SET DEFAULT nextval('public.modulo_videos_id_seq'::regclass);


--
-- Name: modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos ALTER COLUMN id SET DEFAULT nextval('public.modulos_id_seq'::regclass);


--
-- Name: modulos_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.modulos_estudiantes_id_seq'::regclass);


--
-- Name: paquete_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_grupos ALTER COLUMN id SET DEFAULT nextval('public.paquete_grupos_id_seq'::regclass);


--
-- Name: paquete_modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_modulos ALTER COLUMN id SET DEFAULT nextval('public.paquete_modulos_id_seq'::regclass);


--
-- Name: paquetes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes ALTER COLUMN id SET DEFAULT nextval('public.paquetes_id_seq'::regclass);


--
-- Name: personal_especialidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_especialidades ALTER COLUMN id SET DEFAULT nextval('public.personal_especialidades_id_seq'::regclass);


--
-- Name: personales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personales ALTER COLUMN id SET DEFAULT nextval('public.personales_id_seq'::regclass);


--
-- Name: planes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes ALTER COLUMN id SET DEFAULT nextval('public.planes_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: publicacion_videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_videos ALTER COLUMN id SET DEFAULT nextval('public.publicacion_videos_id_seq'::regclass);


--
-- Name: publicaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicaciones ALTER COLUMN id SET DEFAULT nextval('public.publicaciones_id_seq'::regclass);


--
-- Name: recordatorios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios ALTER COLUMN id SET DEFAULT nextval('public.recordatorios_id_seq'::regclass);


--
-- Name: recursos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recursos ALTER COLUMN id SET DEFAULT nextval('public.recursos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sectores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectores ALTER COLUMN id SET DEFAULT nextval('public.sectores_id_seq'::regclass);


--
-- Name: semestres id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres ALTER COLUMN id SET DEFAULT nextval('public.semestres_id_seq'::regclass);


--
-- Name: tecnicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tecnicas ALTER COLUMN id SET DEFAULT nextval('public.tecnicas_id_seq'::regclass);


--
-- Name: tipo_carreras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_carreras ALTER COLUMN id SET DEFAULT nextval('public.tipo_carreras_id_seq'::regclass);


--
-- Name: turnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos ALTER COLUMN id SET DEFAULT nextval('public.turnos_id_seq'::regclass);


--
-- Name: unidades_didacticas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas ALTER COLUMN id SET DEFAULT nextval('public.unidades_didacticas_id_seq'::regclass);


--
-- Name: unidades_didacticas_estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas_estudiantes ALTER COLUMN id SET DEFAULT nextval('public.unidades_didacticas_estudiantes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: valores_institucionales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valores_institucionales ALTER COLUMN id SET DEFAULT nextval('public.valores_institucionales_id_seq'::regclass);


--
-- Name: videos_youtube id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos_youtube ALTER COLUMN id SET DEFAULT nextval('public.videos_youtube_id_seq'::regclass);


--
-- Data for Name: acciones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: act_economicas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.act_economicas (id, descripcion, especialidad_id, familia_id, titulo, imagen_portada_url) VALUES
('1', NULL, '1', '1', 'OTRAS ACTIVIDADES DE SERVICIOS PERSONALES  ', NULL),
('2', NULL, '2', '1', 'REPARACIÓN DE ORDENADORES Y DE EFECTOS Y ENSERES DOMÉSTICOS', NULL),
('3', NULL, '2', '2', 'SUMINISTRO DE ELECTRICIDAD, GAS, VAPOR Y AIRE ACONDICIONADO', NULL),
('4', NULL, '3', '3', 'PROGRAMACIÓN INFORMÁTICA, CONSULTORÍA DE INFORMÁTICA Y ACTIVIDADES CONEXAS', NULL),
('5', NULL, '4', '4', 'FABRICACION DE PRENDAS DE VESTIR', NULL),
('6', NULL, '5', '4', 'FABRICACION DE PRODUCTOS DE CUERO Y PRODUCTOS CONEXOS', NULL),
('7', NULL, '6', '5', 'OTRAS INDUSTRIAS MANUFACTURERA', NULL),
('8', NULL, '7', '6', 'ELABORACIÓN DE PRODUCTOS ALIMENTICIOS', NULL),
('9', NULL, '8', '7', 'PRODUCCIÓN DE MADERA Y FABRICACIÓN DE PRODUCTOS DE MADERA Y CORCHO, EXCEPTO MUEBLES, FABRICACIÓN DE ARTÍCULOS DE PAJA Y DE MATERIALES TRENSABLES', NULL);


--
-- Data for Name: actividades; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: anios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.anios (id, nombre, titulo) VALUES
('1', '2026', '“Año de la Esperanza y el Fortalecimiento de la Democracia”'),
('2', '2021', NULL),
('3', '2022', NULL),
('4', '2023', NULL),
('5', '2024', NULL),
('6', '2025', NULL);


--
-- Data for Name: aprendizajes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: aspectos_evaluacion; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: aspectos_evaluacion_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: calendarios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.calendarios (id, archivado, descripcion, fecha_fin, fecha_ini, semestre_id, tipo, titulo, anio_id, horario_id, activo, color, duracion, fecha_actualizacion, fecha_creacion, fin, inicio) VALUES
('10', NULL, 'Calendario de 528 horas de lunes a viernes del primer semestre', NULL, NULL, '3', NULL, '2026 Lun - Vie 528', '1', '5', 't', '#1976d2', '528', '2026-06-30 04:35:12.25+00', '2026-06-27 02:20:01.639+00', '2026-07-24 00:00:00+00', '2026-03-16 00:00:00+00');


--
-- Data for Name: capacidades_terminales; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: capacidades_terminales_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: carreras; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.carreras (id, act_economica_id, codigo, creditos, descripcion, descripcion_2, duracion, nivel, slug, titulo, titulo_comercial, tipo_carrera_id, actualizado_en, creado_en, imagen_portada_url, nombre) VALUES
('13', '8', 'C0610-1-001', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Panadería y Pastelería'),
('6', '5', 'CO714-1-003', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Corte y Ensamblaje'),
('7', '5', 'CO714-1-004', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Costura y Acabados'),
('4', '4', 'J2662-1-001', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Soporte Técnico y Operaciones de Centros de Computo'),
('16', '8', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', NULL, NULL, NULL, 'Servicios Básicos Gastronómicos'),
('1', '1', 'S3496-1-001', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Peluquería y Barbería'),
('17', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Hilandería'),
('18', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Equipos Electrónicos de Consumo'),
('12', '7', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Manualidades'),
('15', '9', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Mantenimiento Básico de Casas y Edificios'),
('5', '4', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Operación de Computadoras'),
('9', '5', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Confección Textil'),
('20', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Asistencia en Cocina'),
('21', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Peluquería'),
('22', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Asistencia de Pastelería y Panadería'),
('23', NULL, NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', NULL, NULL, NULL, 'Cuero y Calzado'),
('8', '5', NULL, NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '3', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Bordados Computarizados y Manuales'),
('11', '6', 'C0715-1-002', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Confección de Artículos de Cuero y Marroquinería'),
('10', '6', 'C0715-1-001', NULL, NULL, NULL, NULL, 'Auxiliar Técnico', NULL, NULL, NULL, '4', '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', NULL, 'Corte Aparado y Armado de Calzado');


--
-- Data for Name: dato_general; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dato_general (id, correo, direccion, facebook, instagram, nombre_institucion, pagina_web, rd, ruc, telefono_1, telefono_2, tiktok, twitter, youtube) VALUES
('1', 'cetprosanmartindeporres@cetprosmp.edu.pe', 'Jirón Santa Clorinda 971 Urb. Palao SMP', 'https://www.facebook.com/cetprosanmartindeporres1/', 'https://www.instagram.com/cetpro.smp/', 'CETPRO "San Martin de Porres"', 'cetprosmp.edu.pe', 'R.D. N° 1839 - 05 - DRELM', '20610635939', '5341588', '5346663', 'https://www.tiktok.com/@cetpro.sanmartindeporres', 'https://x.com/enkee032', 'https://www.youtube.com/@enriquerafaelpalominohorna3697');


--
-- Data for Name: ejes_transversales; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: especialidades; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.especialidades (id, act_economica_id, descripcion, descripcion_2, slug, titulo, titulo_comercial, imagen_portada_url) VALUES
('1', '1', NULL, '[{"type": "paragraph", "children": [{"text": "Solanum tuberosum, de nombre común patata (en la mayor parte de España, Filipinas y Guinea Ecuatorial) o papa (en Hispanoamérica y en las Islas Canarias)[1]​ [2]​", "type": "text"}]}]', 'estetica-personal', 'Estética Personal', 'Estética Personal', NULL),
('2', '2', NULL, NULL, 'electricidad-electronica', 'Electricidad y Electrónica', 'Electricidad y Electrónica', NULL),
('4', '5', NULL, NULL, 'confeccion-textil', 'Textil y Confección', 'Confección Textil', NULL),
('5', '6', NULL, NULL, 'cuero-calzado', 'Cuero y Calzado', 'Cuero y Calzado', NULL),
('6', '7', NULL, NULL, 'manualidades', 'Artesanía y Manualidades', 'Manualidades', NULL),
('7', '8', NULL, NULL, 'hosteleria-turismo', 'Hostelería y Turismo', 'Hostelería y Turismo', NULL),
('8', '9', NULL, NULL, 'carpinteria', 'Carpintería', 'Carpintería', NULL),
('3', '4', '<p data-start="273" data-end="636">La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.</p><p data-start="638" data-end="1115">A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. En el módulo de <strong data-start="757" data-end="782">Soporte Técnico de PC</strong>, aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.</p><p data-start="1117" data-end="1488">En el módulo de <strong data-start="1133" data-end="1174">Aplicativos Informáticos de Ofimática</strong>, se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.</p><p data-start="1490" data-end="1828">El módulo de <strong data-start="1503" data-end="1534">Diseño Gráfico Publicitario</strong> desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop y Corel Draw. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.</p><p data-start="1830" data-end="2157">Finalmente, el módulo de <strong data-start="1855" data-end="1884">Diseño y Programación Web</strong> introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.</p>', '[{"type": "paragraph", "children": [{"text": "La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.", "type": "text"}]}, {"type": "list", "format": "ordered", "children": [{"type": "list-item", "children": [{"text": "A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. ", "type": "text"}, {"bold": true, "text": "En el módulo de Soporte Técnico de PC", "type": "text"}, {"text": ", aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.", "type": "text"}]}]}, {"type": "list", "format": "unordered", "children": [{"type": "list-item", "children": [{"text": "En el ", "type": "text"}, {"bold": true, "text": "módulo de Aplicativos Informáticos de Ofimática", "type": "text"}, {"text": ", se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.", "type": "text"}]}]}, {"type": "paragraph", "children": [{"text": "El ", "type": "text"}, {"bold": true, "text": "módulo de Diseño Gráfico Publicitario", "type": "text"}, {"text": " desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop e Illustrator. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Finalmente, el ", "type": "text"}, {"bold": true, "text": "módulo de Diseño y Programación Web", "type": "text"}, {"text": " introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.", "type": "text"}]}]', 'computacion', 'Computación e Informática', 'Computación', NULL);


--
-- Data for Name: evaluaciones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: evaluaciones_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: evento_ocurrencias; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: evento_recurrencias; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: evento_relaciones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: eventos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.eventos (id, calendario_id, semestre_id, color, descripcion, estado, fecha_actualizacion, fecha_creacion, fecha_fin, fecha_inicio, tipo_evento, titulo, todo_el_dia, ubicacion) VALUES
('1', '10', '3', '#2e7d32', 'Desarrollo de Clases de los módulos con esa cantidad de horas.', 'confirmado', '2026-06-29 19:59:56.013+00', '2026-06-27 02:36:44.831+00', '2026-07-25 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '528 horas (S1)', 't', 'Institución'),
('34', '10', '4', '#2e7d32', NULL, 'programado', '2026-06-29 20:06:58.259+00', '2026-06-29 20:04:31.211+00', '2026-12-19 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '528 horas (S2)', 't', 'La institución'),
('35', '10', '3', '#d12323', NULL, 'programado', '2026-06-29 20:14:22.567+00', '2026-06-29 20:14:22.567+00', '2026-07-22 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '512 horas (S1)', 't', 'La institucion'),
('38', '10', '3', '#2f347f', NULL, 'programado', '2026-06-29 22:41:41.917+00', '2026-06-29 22:41:41.917+00', '2026-08-01 04:00:00+00', '2026-05-22 13:00:00+00', 'clase', '300 horas lun - vie (S1-2)', 't', 'institucion'),
('37', '10', '3', '#2f347f', NULL, 'programado', '2026-06-29 22:42:14.322+00', '2026-06-29 22:36:56.487+00', '2026-05-22 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '300 horas lun - vie (S1-1)', 't', 'la institucion'),
('36', '10', '4', '#ff0000', NULL, 'programado', '2026-06-29 22:43:24.823+00', '2026-06-29 22:24:24.448+00', '2026-12-17 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '512 horas (S2)', 't', 'la institucion'),
('39', '10', '4', '#2f347f', NULL, 'programado', '2026-06-29 22:51:52.434+00', '2026-06-29 22:51:52.434+00', '2026-10-16 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '300 horas lun - vie (S2-1)', 't', 'la institucion'),
('40', '10', '4', '#2f347f', NULL, 'programado', '2026-06-29 22:55:31.417+00', '2026-06-29 22:55:31.417+00', '2026-12-24 04:00:00+00', '2026-10-16 13:00:00+00', 'clase', '300 horas lun - vie (S2-2)', 't', 'La institucion');


--
-- Data for Name: familias; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.familias (id, descripcion, sector_id, titulo, imagen_portada_url) VALUES
('1', NULL, '1', 'SERVICIOS PERSONALES Y DE HOGARES', NULL),
('3', NULL, '3', 'TECNOLOGIAS DE LA INFORMACIÓN Y COMUNICACIONES – TIC’s', NULL),
('4', NULL, '4', 'INDUSTRIA TEXTIL, CONFECCIÓN Y DEL CUERO', NULL),
('5', NULL, '4', 'INDUSTRIA DIVERSAS', NULL),
('6', NULL, '4', 'INDUSTRIA ALIMENTARIA BEBIDA Y TABACO', NULL),
('7', NULL, '4', 'INDUSTRIA DE LA MADERA Y MUEBLES', NULL),
('2', 'Rubro técnico orientado a la formación de profesionales capaces de instalar, operar, mantener y supervisar sistemas relacionados con el suministro de energía, redes de agua potable, alcantarillado y servicios de saneamiento básico. Incluye actividades vinculadas al uso eficiente de recursos, mantenimiento de instalaciones, control de calidad y apoyo a la sostenibilidad ambiental en viviendas, empresas e instituciones.', '2', 'ENERGÍA, AGUA, Y SANEAMIENTO', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/academico%2Ffamilias%2F1782350878044_ENERGIA-AGUA-Y-SANEAMIENTO.jpg?alt=media&token=5009aa98-87bd-4e85-9515-5227359a08d4');


--
-- Data for Name: fases; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: fases_metodos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: fases_recursos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: fases_tecnicas; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: grupo_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.grupo_modulos (id, calendario_id, grupo_id, modulo_id, obligatorio, orden) VALUES
('69', '10', '89', '1', 't', '1');


--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.grupos (id, archivado, calendario_id, descripcion, modulo_id, nombre_display, personal_id, turno, horario_id, paquete_id, semestre_id, turno_id, estado, fecha_actualizacion, fecha_creacion, grupo_ord) VALUES
('89', 'f', NULL, NULL, NULL, '26-1 Corte De Cabello, Barba y Peinado [Mañana] Lun - Vie (Maribel Evans)', '5', 'Mañana', '5', '15', '3', '1', 'activo', '2026-07-01 06:44:03.094+00', '2026-06-30 05:18:16.611+00', NULL);


--
-- Data for Name: horarios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.horarios (id, activo, descripcion, dias_semana, fecha_actualizacion, fecha_creacion, nombre, regla, viernes_alterno_inicio) VALUES
('6', 't', 'Lunes y miercoles.', '1,3', '2026-06-29 05:19:04.547+00', '2026-06-29 05:19:04.547+00', 'Lun, Mie', 'LUN,MIE', NULL),
('7', 't', 'Martes y jueves.', '2,4', '2026-06-29 05:19:04.547+00', '2026-06-29 05:19:04.547+00', 'Mar, Jue', 'MAR,JUE', NULL),
('1', 't', 'Lunes, miercoles y viernes intercalado empezando por el primer viernes disponible.', '1,3,5', '2026-06-30 01:56:07.364+00', '2026-06-29 05:19:04.547+00', 'Lun, Mie, @Vie', 'LUN,MIE,VIE', NULL),
('3', 't', 'Martes, jueves y viernes intercalado empezando por el primer viernes disponible.', '2,4,5', '2026-06-30 01:56:14.694+00', '2026-06-29 05:19:04.547+00', 'Mar, Jue, @Vie', 'MAR,JUE,VIE', NULL),
('5', 't', 'De lunes a viernes.', '1,2,3,4,5', '2026-06-30 02:17:57.239+00', '2026-06-29 05:19:04.547+00', 'Lun - Vie', 'LUN,MAR,MIE,JUE,VIE', NULL);


--
-- Data for Name: indicadores_capacidad; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: indicadores_capacidad_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: matricula_grupos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: matricula_paquetes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: matricula_users; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: matriculas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.matriculas (id, archivado, fecha, recibo, paquete_id, semestre_id, user_id) VALUES
('200', 'f', '2026-07-05 07:26:28.31+00', '2124', '15', '3', '1233');


--
-- Data for Name: metodos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: modulo_videos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.modulos (id, activo, carrera_id, creditos, descripcion, descripcion_2, horas, metas, orden, slug, titulo, titulo_comercial, plan_id) VALUES
('14', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'bordado-computarizado', 'Bordados Computarizado', 'Bordados Computarizado', '8'),
('17', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'disenio-corte-articulos-cuero', 'Diseño y Corte de Articulos de Cuero', 'Patronaje y Corte de Artículos de Cuero y Marroquinería', '11'),
('18', 't', NULL, '20', NULL, NULL, '528', '15', '2', 'ensamblado-acabado-articulos-cuero', 'Ensamblado y Acabado de Artículos de Cuero', 'Ensamblado y Acabado de Artículos de Cuero', '11'),
('10', 't', NULL, '21', NULL, NULL, '560', '15', '1', 'tizado-tendido-corte', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', '6'),
('11', 't', NULL, '19', NULL, NULL, '544', '15', '2', 'confeccion-prendas-vestir', 'Técnicas de Confección de Prendas de Vestir', 'Técnicas de Confección de Prendas de Vestir', '6'),
('13', 't', NULL, '19', NULL, NULL, '528', '15', '2', 'tecnicas-acabados-prendas-vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir', '7'),
('1', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'corte-barba-peinado', 'Corte De Cabello, Barba y Peinado', 'Corte De Cabello, Barba y Peinado', '1'),
('2', 't', NULL, '20', NULL, NULL, '528', '15', '2', 'capilar-coloracion-ondulacion-laceado', 'Tratamiento Capilar, Coloración, Ondulación y Laceado', 'Tratamiento Capilar, Trituración, Ondulación, Laceado', '1'),
('15', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'tejido-maquina', 'Tejido a Maquina', 'Tejido a Maquina', '9'),
('16', 't', NULL, NULL, NULL, NULL, '300', '15', '2', 'tejido-mano', 'Tejido a Mano', 'Tejido a Mano', '9'),
('5', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'incidentes-operatividad-computo', 'Atención de Incidentes y Problemas de Operatividad en El Centro de Cómputo', 'Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo', '4'),
('6', 't', NULL, '20', NULL, NULL, '528', '15', '2', 'monitoreo-mantenimiento-computo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', '4'),
('4', 't', NULL, NULL, NULL, NULL, '300', '15', '2', 'intalaciones-electricas', 'Mantenimiento de Instalaciones Eléctricas Domiciliarias', 'Instalaciones Eléctricas', '3'),
('7', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'ofimatica', 'Ofimática', 'Ofimática', '5'),
('8', 't', NULL, NULL, NULL, NULL, '300', '15', '2', 'disenio-publicitario', 'Diseño Publicitario', 'Diseño Publicitario', '5'),
('9', 't', NULL, NULL, NULL, NULL, '300', '15', '3', 'disenio-web', 'Diseño Web', 'Diseño Web', '5'),
('3', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'reparacion-celulares', 'Mantenimiento de Teléfonos Celulares', 'Reparacion de Celulares', '2'),
('19', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'disenio-corte-calzado', 'Diseño y Corte de Calzado', 'Patronaje y Corte de Calzado', '10'),
('20', 't', NULL, '20', NULL, NULL, '528', '15', '2', 'aparado-armado-acabado-calzado', 'Aparado, Armado y Acabado de Calzado', 'Aparado, Armado y Acabado de Calzado', '10'),
('26', 't', NULL, '20', NULL, NULL, '528', '15', '2', 'decoracion-presentacion-panaderia-pasteleria', 'Decoración y Presentación de los Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 2', '13'),
('21', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'decoracion-eventos-especiales', 'Decoración de Eventos Especiales', 'Decoración de Eventos Especiales', '12'),
('22', 't', NULL, NULL, NULL, NULL, '150', '15', '2', 'bisuteria', 'Bisuterías', 'Bisutería', '12'),
('24', 't', NULL, NULL, NULL, NULL, '150', '15', '4', 'ceramica-al-frio', 'Cerámica al Frio', 'Cerámica al Frio', '12'),
('27', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'decoracion-tortas', 'Técnicas de Decoración de Tortas', 'Técnicas de Decoración de Tortas', '14'),
('28', 't', NULL, NULL, NULL, NULL, '300', '15', '2', 'buffet', 'Buffet', 'Buffet', '14'),
('29', 't', NULL, NULL, NULL, NULL, '300', '15', '3', 'cocina-nacional', 'Cocina Nacional', 'Cocina Nacional', '14'),
('30', 't', NULL, NULL, NULL, NULL, '300', '15', '4', 'tecnicas-culinarias', 'Técnicas Culinarias', 'Técnicas Culinarias', '14'),
('31', 't', NULL, NULL, NULL, NULL, '300', '15', '1', 'carpinteria-madera', 'Mantenimiento de Carpintería', 'Carpintería en Madera', '15'),
('32', 't', NULL, NULL, NULL, NULL, '300', '15', '2', 'carpinteria-melamine', 'Confección de Muebles en Melamina', 'Carpintería en Melamina', '15'),
('25', 't', NULL, '20', NULL, NULL, '528', '15', '1', 'acondicionamiento-y-elaboracion-de-productos-de-panaderia-y-pasteleria', 'Acondicionamiento y Elaboración de Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 1', '13'),
('33', 't', NULL, '14', NULL, NULL, '336', '15', NULL, 'operaciones-basicas-de-cocina-y-manejo-de-insumos', 'Operaciones Básicas de Cocina y Manejo de Insumos', NULL, '16'),
('34', 't', NULL, '20', NULL, NULL, '528', '15', NULL, 'soporte-y-mantenimiento-de-sistemas-informaticos', 'Soporte y Mantenimiento de Sistemas Informáticos', NULL, '4'),
('23', 't', NULL, NULL, NULL, NULL, '150', '15', '3', 'pintura-decorativa', 'Pintura Decorativa', 'Pintura Decorativa', '12');


--
-- Data for Name: modulos_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.modulos_estudiantes (id, grupo_id, matricula_id, modulo_id, promedio) VALUES
('198', '89', '200', '1', NULL);


--
-- Data for Name: paquete_grupos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: paquete_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.paquete_modulos (id, modulo_id, paquete_id, obligatorio, orden) VALUES
('1', '1', '15', 't', '1'),
('2', '2', '16', 't', '1'),
('3', '3', '17', 't', '1'),
('4', '4', '18', 't', '1'),
('5', '5', '19', 't', '1'),
('6', '6', '20', 't', '1'),
('7', '7', '21', 't', '1'),
('8', '8', '22', 't', '1'),
('9', '9', '23', 't', '1'),
('10', '10', '24', 't', '1'),
('11', '11', '25', 't', '1'),
('12', '13', '26', 't', '1'),
('13', '14', '27', 't', '1'),
('14', '15', '28', 't', '1'),
('15', '16', '29', 't', '1'),
('16', '17', '30', 't', '1'),
('17', '18', '31', 't', '1'),
('18', '19', '32', 't', '1'),
('19', '20', '33', 't', '1'),
('20', '21', '34', 't', '1'),
('21', '22', '35', 't', '1'),
('22', '23', '36', 't', '1'),
('23', '24', '37', 't', '1'),
('24', '25', '38', 't', '1'),
('25', '26', '39', 't', '1'),
('26', '27', '40', 't', '1'),
('27', '28', '41', 't', '1'),
('28', '29', '42', 't', '1'),
('29', '30', '43', 't', '1'),
('30', '31', '44', 't', '1'),
('31', '32', '45', 't', '1'),
('32', '33', '46', 't', '1'),
('33', '34', '47', 't', '1'),
('100', '23', '81', 't', '1'),
('101', '24', '81', 't', '2'),
('102', '22', '114', 't', '1'),
('103', '23', '114', 't', '2');


--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.paquetes (id, archivado, descripcion, titulo) VALUES
('15', 'f', 'Paquete individual generado para el modulo Corte De Cabello, Barba y Peinado', 'Corte De Cabello, Barba y Peinado'),
('16', 'f', 'Paquete individual generado para el modulo Tratamiento Capilar, Trituración, Ondulación, Laceado', 'Tratamiento Capilar, Trituración, Ondulación, Laceado'),
('17', 'f', 'Paquete individual generado para el modulo Reparacion de Celulares', 'Reparacion de Celulares'),
('18', 'f', 'Paquete individual generado para el modulo Instalaciones Eléctricas', 'Instalaciones Eléctricas'),
('19', 'f', 'Paquete individual generado para el modulo Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo', 'Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo'),
('20', 'f', 'Paquete individual generado para el modulo Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo'),
('21', 'f', 'Paquete individual generado para el modulo Ofimática', 'Ofimática'),
('22', 'f', 'Paquete individual generado para el modulo Diseño Publicitario', 'Diseño Publicitario'),
('23', 'f', 'Paquete individual generado para el modulo Diseño Web', 'Diseño Web'),
('24', 'f', 'Paquete individual generado para el modulo Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir'),
('25', 'f', 'Paquete individual generado para el modulo Técnicas de Confección de Prendas de Vestir', 'Técnicas de Confección de Prendas de Vestir'),
('26', 'f', 'Paquete individual generado para el modulo Técnicas de Procesos de Acabados en Prendas de Vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir'),
('27', 'f', 'Paquete individual generado para el modulo Bordados Computarizado', 'Bordados Computarizado'),
('28', 'f', 'Paquete individual generado para el modulo Tejido a Maquina', 'Tejido a Maquina'),
('29', 'f', 'Paquete individual generado para el modulo Tejido a Mano', 'Tejido a Mano'),
('30', 'f', 'Paquete individual generado para el modulo Patronaje y Corte de Artículos de Cuero y Marroquinería', 'Patronaje y Corte de Artículos de Cuero y Marroquinería'),
('31', 'f', 'Paquete individual generado para el modulo Ensamblado y Acabado de Artículos de Cuero', 'Ensamblado y Acabado de Artículos de Cuero'),
('32', 'f', 'Paquete individual generado para el modulo Patronaje y Corte de Calzado', 'Patronaje y Corte de Calzado'),
('33', 'f', 'Paquete individual generado para el modulo Aparado, Armado y Acabado de Calzado', 'Aparado, Armado y Acabado de Calzado'),
('34', 'f', 'Paquete individual generado para el modulo Decoración de Eventos Especiales', 'Decoración de Eventos Especiales'),
('35', 'f', 'Paquete individual generado para el modulo Bisutería', 'Bisutería'),
('37', 'f', 'Paquete individual generado para el modulo Cerámica al Frio', 'Cerámica al Frio'),
('38', 'f', 'Paquete individual generado para el modulo Productos Pastelería y Panadería 1', 'Productos Pastelería y Panadería 1'),
('39', 'f', 'Paquete individual generado para el modulo Productos Pastelería y Panadería 2', 'Productos Pastelería y Panadería 2'),
('40', 'f', 'Paquete individual generado para el modulo Técnicas de Decoración de Tortas', 'Técnicas de Decoración de Tortas'),
('41', 'f', 'Paquete individual generado para el modulo Buffet', 'Buffet'),
('42', 'f', 'Paquete individual generado para el modulo Cocina Nacional', 'Cocina Nacional'),
('43', 'f', 'Paquete individual generado para el modulo Técnicas Culinarias', 'Técnicas Culinarias'),
('44', 'f', 'Paquete individual generado para el modulo Carpintería en Madera', 'Carpintería en Madera'),
('45', 'f', 'Paquete individual generado para el modulo Carpintería en Melamina', 'Carpintería en Melamina'),
('46', 'f', 'Paquete individual generado para el modulo Operaciones Básicas de Cocina y Manejo de Insumos', 'Operaciones Básicas de Cocina y Manejo de Insumos'),
('47', 'f', 'Paquete individual generado para el modulo Soporte y Mantenimiento de Sistemas Informáticos', 'Soporte y Mantenimiento de Sistemas Informáticos'),
('36', 'f', 'Paquete individual generado para el modulo Pintura Decorativa', 'Pintura Decorativa'),
('81', 'f', NULL, 'Pintura Decorativa / Cerámica al Frio'),
('114', 'f', NULL, 'Bisutería / Pintura Decorativa');


--
-- Data for Name: personal_especialidades; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.personal_especialidades (id, especialidad_id, orden, personal_id) VALUES
('15', '3', '1', '9'),
('16', '6', '2', '9');


--
-- Data for Name: personales; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.personales (id, display_name, memo, user_id) VALUES
('5', 'Consuelo Maribel EVANS BERROCAL', NULL, '1037'),
('10', 'Celedonia Postillon Rodriguez', NULL, '1038'),
('11', 'Dora Gonzalo Bravo', NULL, '1039'),
('12', 'Doris Epifania Jimenez Palomino', NULL, '1040'),
('13', 'Enrique Palomino Horna', NULL, '970'),
('14', 'Fanny Celina Acuña Flores', NULL, '1041'),
('15', 'José María Flores Flores', NULL, '1044'),
('16', 'Lila Giovanna Jesus Limaymanta', NULL, '1045'),
('17', 'Liliana Rocio Millan Mercado', NULL, '1046'),
('18', 'María Blas Vega', NULL, '1048'),
('19', 'Milton Aguilar Lizana', NULL, '1047'),
('20', 'Miriam Salome Ferreñan Cardenas', NULL, '1049'),
('21', 'Mary Gloria Lazo Quispe', NULL, '1050'),
('22', 'Nieves Orfelinda SOLGORRE CAYTUIRO', NULL, '1053'),
('23', 'Margarita Edelmira Martinez Yanac', NULL, '1051'),
('24', 'Richard Ramos Ipanaque', NULL, '1055'),
('25', 'Marcelina Torres Gonzáles de Charca', NULL, '1052'),
('26', 'Sonia Priscila Cordero Manrique', NULL, '1056'),
('27', 'Victor Hugo Zamalloa Barrera', NULL, '1059'),
('28', 'Sara Elvira OSTOS AGUILAR', NULL, '1058'),
('29', 'Sandra Lourdes Meza Ramírez', NULL, '1057'),
('30', 'Walter Guevara Zelaya', NULL, '1060'),
('31', 'Walter Huber Miraval Olivas', NULL, '1061'),
('32', 'Rosa Isabel Moscol Flores', NULL, '1043'),
('33', 'Romelio Figueroa Ávila', NULL, '1054'),
('34', 'Isaias John Grijalba Villanueva', NULL, '1042'),
('35', 'Guissela Pilar GIRALDO MATA', NULL, '1063'),
('36', 'Guiliana MALCA CANCINO', NULL, '1064'),
('37', 'Maria Luz Saavedra Madueño', NULL, '1065'),
('38', 'Susana Llacsa Vicuña', NULL, '1066'),
('9', 'Ana María RAMIREZ DIAS', NULL, '1036');


--
-- Data for Name: planes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.planes (id, carrera_id, periodo_vigencia_id, anio, creditos, descripcion_2, duracion, genera, imagen_portada_url, nro, periodo_caducidad, plan_estudio, resolucion_tipo, slug, titulo_comercial) VALUES
('4', '4', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'soporte-computadoras', 'Soporte técnico de computadoras'),
('3', '17', '3', '2026', NULL, NULL, '1000', 'UGEL', NULL, '03602', NULL, 'Plan 2026-1', 'R.D.', 'hilanderia', 'Hilandería'),
('18', '23', '38', '2023', NULL, NULL, '1000', 'UGEL', NULL, '04504', NULL, 'Plan 2023-1', 'R.D.', 'cuero-calzado', 'Cuero y Calzado'),
('17', '20', '36', '2024', NULL, NULL, '1000', 'UGEL', NULL, '00957', NULL, 'Plan 2024-1', 'R.D.', 'asistencia-cocina', 'Asistencia en cocina'),
('5', '5', '3', '2026', NULL, NULL, '1000', 'UGEL', NULL, '03602', NULL, 'Plan 2026-1', 'R.D.', 'operaciones-computadoras', 'Operación de Computadoras'),
('19', '21', '40', '2022', NULL, NULL, '1000', 'UGEL', NULL, '02198', NULL, 'Plan 2022-1', 'R.D.', 'peluqueria', 'Peluquería'),
('2', '18', '3', '2026', NULL, NULL, '1000', 'UGEL', NULL, '03602', NULL, 'Plan 2026-1', 'R.D.', 'equipos-electronicos-de-consumo', 'Equipos Electrónicos de Consumo'),
('15', '15', '3', '2026', NULL, NULL, '1000', 'UGEL', NULL, '03602', NULL, 'Plan 2026-1', 'R.D.', 'mantenimiento-basico-de-casas-y-edificios', 'Mantenimiento Básico de Casas y Edificios'),
('8', '8', '3', '2026', '40', NULL, '1056', 'UGEL', NULL, '03601', NULL, 'Plan 2026-1', 'R.D.', 'bordados-prendas', 'Bordado en prendas de vestir'),
('11', '11', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'cuero-marroquineria', 'Artículos de Cuero y Marroquinería'),
('6', '6', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'corte-ensamblaje', 'Corte y Ensamblaje'),
('10', '10', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'confeccion-calzado', 'Confección de calzado'),
('7', '7', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'costura-acabados', 'Costura y Acabados'),
('13', '13', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'panaderia-pasteleria', 'Panadería y Pastelería'),
('1', '1', '1', '2025', '40', NULL, '1056', 'UGEL', NULL, '01643', NULL, 'Plan 2025-1', 'R.D.', 'peluqueria-barberia', 'Peluquería y Barberia'),
('16', '16', '3', '2026', '40', NULL, '1056', 'UGEL', NULL, '03601', NULL, 'Plan 2026-1', 'R.D.', NULL, NULL),
('9', '9', '38', '2023', NULL, NULL, '1000', 'UGEL', NULL, '04504', NULL, 'Plan 2023-1', 'R.D.', 'confeccion-textil', 'Confección Textil'),
('12', '12', '3', '2026', NULL, NULL, '1000', 'UGEL', NULL, '03602', NULL, 'Plan 2026-1', 'R.D.', 'manualidades', 'Manualidades'),
('14', '22', '40', '2022', NULL, NULL, '1000', 'UGEL', NULL, '02198', NULL, 'Plan 2022-1', 'R.D.', 'asistente-panaderia-pasteleria', 'Asistencia de Pastelería y Panadería');


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: publicacion_videos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: publicaciones; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.publicaciones (id, contenido_1, contenido_2, descripcion_corta, destacado, fecha_evento_fin, fecha_evento_inicio, fecha_publicacion, slug, tipo, titulo, ubicacion) VALUES
('3', NULL, NULL, NULL, 't', NULL, NULL, '2025-07-21 00:00:00+00', 'novenario-virgen-carmen-2025', 'noticia', 'Novenario a la Virgen del Carmen', NULL),
('4', NULL, NULL, NULL, 't', NULL, NULL, '2025-07-21 00:00:00+00', 'novenario-virgen-carmen-2025', 'noticia', 'Novenario a la Virgen del Carmen', NULL),
('1', NULL, NULL, 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', 't', '2025-09-10 00:00:00+00', '2025-07-21 00:00:00+00', '2025-07-21 00:00:00+00', 'matricula-2025-', 'comunicado', 'Matricula 2025-2 (Agosto - Diciembre)', 'CETPRO "SAN MARTIN DE PORRES"'),
('15', NULL, '<h1>Contenido 2</h1>', NULL, 't', NULL, NULL, '2025-08-10 00:00:00+00', 'publicacion', 'evento', 'Gran Inicio de Clasess Periodo Academico  2025-2', NULL),
('14', NULL, NULL, 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', 't', '2025-09-10 00:00:00+00', '2025-07-21 00:00:00+00', '2025-07-21 00:00:00+00', 'matricula-2025-', 'comunicado', 'Matricula 2025-2 (Agosto - Diciembre)', 'CETPRO "SAN MARTIN DE PORRES"'),
('9', NULL, NULL, NULL, 't', NULL, NULL, '2025-07-30 00:00:00+00', 'personal-servicio', 'comunicado', 'Se busca personal de servicio', NULL),
('17', NULL, NULL, NULL, 't', NULL, NULL, '2025-07-30 00:00:00+00', 'personal-servicio', 'comunicado', 'Se busca personal de servicio', NULL),
('21', '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL, NULL, 'f', NULL, NULL, '2025-08-16 00:00:00+00', 'presentacion', 'noticia', 'Bienvenidos al CETPRO "San Martin de Porres"', NULL),
('20', '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL, NULL, 'f', NULL, NULL, '2025-08-16 00:00:00+00', 'presentacion', 'noticia', 'Bienvenidos al CETPRO "San Martin de Porres"', NULL),
('7', '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', 'f', NULL, NULL, '2025-01-01 00:00:00+00', 'mision-vision', 'noticia', 'MISION / VISION', NULL),
('23', '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', 'f', NULL, NULL, '2025-01-01 00:00:00+00', 'mision-vision', 'noticia', 'MISION / VISION', NULL);


--
-- Data for Name: recordatorios; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: recursos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles (id, scala, titulo) VALUES
('1', '0', 'Visitante'),
('2', '50', 'Ex-estudiante'),
('3', '100', 'Estudiante'),
('4', '200', 'Docente'),
('5', '300', 'Administrativo'),
('6', '400', 'Coordinador'),
('7', '500', 'Director'),
('8', '600', 'Superusuario'),
('9', '150', 'Ex-docente');


--
-- Data for Name: sectores; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sectores (id, descripcion, titulo, imagen_portada_url) VALUES
('1', NULL, 'OTRAS ACTIVIDADES DE SERVICIOS', NULL),
('3', NULL, 'INFORMACIÓN Y COMUNICACIONES', NULL),
('4', NULL, 'INDUSTRIAS MANUFACTURERAS', NULL),
('2', NULL, 'ELECTRICIDAD, GAS Y AGUA', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/academico%2Fsectores%2F1782352585249_ELECTRICIDAD-GAS-Y-AGUA.jpg?alt=media&token=55d2b6c0-abee-4daa-993e-d9b38a4d1af8');


--
-- Data for Name: semestres; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.semestres (id, archivado, coordinador_1_id, coordinador_2_id, descripcion, director_id, titulo, anio_id, fin, inicio) VALUES
('2', 't', NULL, NULL, NULL, NULL, '2025-2', '6', NULL, NULL),
('40', 'f', NULL, NULL, NULL, NULL, '2022-1', '2', NULL, NULL),
('41', 'f', NULL, NULL, NULL, NULL, '2022-2', '3', NULL, NULL),
('38', 'f', NULL, NULL, NULL, NULL, '2023-1', '4', NULL, NULL),
('39', 'f', NULL, NULL, NULL, NULL, '2023-2', '4', NULL, NULL),
('36', 'f', NULL, NULL, NULL, NULL, '2024-1', '5', NULL, NULL),
('37', 'f', NULL, NULL, NULL, NULL, '2024-2', '5', NULL, NULL),
('1', 'f', NULL, NULL, NULL, NULL, '2025-1', '6', NULL, NULL),
('4', 'f', NULL, NULL, NULL, NULL, '2026-2', '1', '2026-12-23 23:00:00+00', '2026-08-10 08:00:00+00'),
('3', 'f', NULL, NULL, NULL, NULL, '2026-1', '1', '2026-07-24 23:00:00+00', '2026-03-16 08:00:00+00');


--
-- Data for Name: tecnicas; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tipo_carreras; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tipo_carreras (id, nombre) VALUES
('1', 'Especialidad (nivel técnico)'),
('2', 'Módulo ocupacional'),
('3', 'Opción ocupacional (nivel auxiliar técnico)'),
('4', 'Programa de estudio (alineado al CNOF - Auxiliar Técnico / Técnico)');


--
-- Data for Name: turnos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.turnos (id, estado, fecha_actualizacion, fecha_creacion, hora_fin, hora_inicio, nombre) VALUES
('2', 'activo', '2026-06-29 05:58:31.303+00', '2026-06-29 05:58:31.303+00', '1970-01-01 17:45:00+00', '1970-01-01 13:15:00+00', 'Tarde'),
('1', 'activo', '2026-06-29 05:59:14.175+00', '2026-06-29 05:56:05.093+00', '1970-01-01 13:00:00+00', '1970-01-01 08:30:00+00', 'Mañana'),
('3', 'activo', '2026-06-29 06:04:22.912+00', '2026-06-29 06:03:08.086+00', '1970-01-01 22:15:00+00', '1970-01-01 17:45:00+00', 'Noche');


--
-- Data for Name: unidades_didacticas; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: unidades_didacticas_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, apellido_materno, apellido_paterno, apellidos, avatar, blocked, celular, confirmed, direccion, distrito, dni, document_id, email, estado_civil, fecha_nacimiento, instruccion, nombre, provider, sexo, telefono, tipo_documento, username, rol_id, correo_institucional, dni_imagen_frente_url, dni_imagen_reverso_url, email_creador, fecha_creacion, fecha_modificacion, nacionalidad, dni_imagen_frente_procesada_url, dni_imagen_reverso_procesada_url, fecha_vencimiento) VALUES
('1037', 'BERROCAL', 'EVANS', 'EVANS BERROCAL', 'https://lh3.google.com/ao/AHP4FtmwNhlha7QkmrJLXMST8oPbrNkp5xebWxI15U6kYpzE6MzzwXmSMx1nqj7_tRP6QUYRBA=s96-c', 'f', '997651614', 't', NULL, NULL, NULL, 'y6KZOwiREW6rrJrNwd9Dq0i7dkkx', 'maribelevansberrocal@gmail.com', NULL, NULL, NULL, 'Consuelo Maribel', 'workspace-import', NULL, NULL, NULL, 'Consuelo Maribel EVANS BERROCAL', '4', 'cevansb@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2021-02-28 23:38:46+00', '2026-06-26 06:53:27.783+00', 'PERUANA', NULL, NULL, NULL),
('1036', 'DIAS', 'RAMIREZ', 'RAMIREZ DIAS', 'https://lh3.googleusercontent.com/a-/ALV-UjWrYjfk509YZI8TKhxVCqFA1C46HWN2nrDYZa4KOO9qEui5In3r=s96-c', 'f', '934565680', 't', NULL, NULL, NULL, 'hDHK5yumf0Ca0dKOWn8xrgFFpYrX', 'anamicaela000@gmail.com', NULL, NULL, NULL, 'Ana María', 'workspace-import', NULL, NULL, NULL, 'Ana María RAMIREZ DIAS', '4', 'aramirezd@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2021-02-28 23:38:46+00', '2026-06-26 06:53:27.769+00', 'PERUANA', NULL, NULL, NULL),
('1038', 'Rodriguez', 'Postillon', 'Postillon Rodriguez', 'https://lh3.google.com/ao/AHP4Ftle98Ku205B5xchAJiqDWOycM4Sjzd9fkDmyC_9AkJ9K3dPKN8TmsoT_O4ndEJRs8tg2w=s96-c', 'f', '977104852', 't', NULL, NULL, NULL, 'uDdsmOpffFwfJfWiyyyuzhpf32pw', 'celedoniapostillonrodriguez86@gmail.com', NULL, NULL, NULL, 'Celedonia', 'workspace-import', NULL, NULL, NULL, 'Celedonia Postillon Rodriguez', '4', 'cpostillonr@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-29 02:24:10+00', '2026-06-26 06:53:27.794+00', 'PERUANA', NULL, NULL, NULL),
('1039', 'Bravo', 'Gonzalo', 'Gonzalo Bravo', 'https://lh3.google.com/ao/AHP4Ftld5op1VHRDtrHFGPSlv-hMdk8SVn8UD6cS95sg9lexYoQ_nTgQE0vRj9OcvmvuoIqQ90w=s96-c', 'f', '957328449', 't', NULL, NULL, NULL, 'zc5ux0m4kH1t0wn58b4tjKWMjgLs', 'gonzalitobravo@hotmail.com', NULL, NULL, NULL, 'Dora', 'workspace-import', NULL, '957328449', NULL, 'Dora Gonzalo Bravo', '4', 'dgonzalob@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-08-01 13:29:37+00', '2026-06-26 06:53:27.804+00', 'PERUANA', NULL, NULL, NULL),
('1040', 'Palomino', 'Jimenez', 'Jimenez Palomino', 'https://lh3.googleusercontent.com/a-/ALV-UjXdg5Gr3MEwf3fQUOq2qNfGPe4Djct4HQ3lZOosbP8lU0xNZEfp=s96-c', 'f', '983058776', 't', NULL, NULL, NULL, 'C7WSXu6NTe6vKOCPaQP6NURd3Pot', 'dorisjipa24@gmail.com', NULL, NULL, NULL, 'Doris Epifania', 'workspace-import', NULL, NULL, NULL, 'Doris Epifania Jimenez Palomino', '4', 'djimenezp@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.813+00', 'PERUANA', NULL, NULL, NULL),
('1041', 'Flores', 'Acuña', 'Acuña Flores', 'https://lh3.google.com/ao/AHP4Ftmp0io1PXdBvodqelo5ecS-FbI8HikJ_wVxjtYM23Vsqpogx_IdnSYddgVEzqA6jdnNDww=s96-c', 'f', '987082603', 't', NULL, NULL, NULL, '743UqYgaivbpvX9f14AUHKHRuJLH', 'fannyflores1271@gmail.com', NULL, NULL, NULL, 'Fanny Celina', 'workspace-import', NULL, NULL, NULL, 'Fanny Celina Acuña Flores', '4', 'facunaf@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.834+00', 'PERUANA', NULL, NULL, NULL),
('1044', 'Flores', 'Flores', 'Flores Flores', 'https://lh3.google.com/ao/AHP4Ftnejsq4-7fauG3k33aRaJmwIVbR_TeicjvOLJbXYbcI1FH_9fPw9c1bA4tHI3JRmnDVxA=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'iKHHHGkG7y88o9uR1rREBkLZ4QTg', 'jfloresf@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'José María', 'workspace-import', NULL, '941689574', NULL, 'José María Flores Flores', '4', 'jfloresf@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-04-15 21:13:52+00', '2026-06-26 06:53:27.865+00', 'PERUANA', NULL, NULL, NULL),
('1045', 'Limaymanta', 'Jesus', 'Jesus Limaymanta', 'https://lh3.google.com/ao/AHP4FtlVgzt5y_9Dl5Mi5IcQ6nLkFNLf45gkAggJfroygbhLAkEou3jE9-Pk6ZJ5NA8suGdjFg=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'H8cpeZkMJWDu2Sfw21jWqknvhnnx', 'ljesusl@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Lila Giovanna', 'workspace-import', NULL, '987349478', NULL, 'Lila Giovanna Jesus Limaymanta', '4', 'ljesusl@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2026-03-12 16:40:21+00', '2026-06-26 06:53:27.874+00', 'PERUANA', NULL, NULL, NULL),
('1046', 'Mercado', 'Millan', 'Millan Mercado', 'https://lh3.google.com/ao/AHP4Ftl-4qBqOaCDgOzomV7BkcB2E4WJoRXasPY9KPANiddJhS3qfofbK8IPcJjoHvsJHEgIPg=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'jTxCmEjbpwbDL0Tmv5Il1UAYEPuL', 'lmillanm@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Liliana Rocio', 'workspace-import', NULL, '928792153', NULL, 'Liliana Rocio Millan Mercado', '4', 'lmillanm@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-03-04 14:34:30+00', '2026-06-26 06:53:27.886+00', 'PERUANA', NULL, NULL, NULL),
('1047', 'Lizana', 'Aguilar', 'Aguilar Lizana', 'https://lh3.google.com/ao/AHP4FtnoFnsFjsCmDbDGweDrb1DAqy2srjf_yMyJsFihuJtnwdcuGFjIFOEUdVOcyngnJtK3enk=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'SJ6UpoXzyHCfcbdP9L7ur0BIKyeY', 'maguilarl@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Milton', 'workspace-import', NULL, '942762536', NULL, 'Milton Aguilar Lizana', '4', 'maguilarl@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2026-03-12 16:08:57+00', '2026-06-26 06:53:27.896+00', 'PERUANA', NULL, NULL, NULL),
('1048', 'Vega', 'Blas', 'Blas Vega', 'https://lh3.googleusercontent.com/a-/ALV-UjX65aLffUszG8mSB5GEbelIasWw_BkrtCmAGg_DkSKCLjdQlSs=s96-c', 'f', NULL, 't', NULL, NULL, NULL, '5HniNwPhFShleQ1invywB72CAB4t', 'mblasv@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'María', 'workspace-import', NULL, '976813457', NULL, 'María Blas Vega', '4', 'mblasv@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-03-04 14:49:21+00', '2026-06-26 06:53:27.906+00', 'PERUANA', NULL, NULL, NULL),
('1049', 'Cardenas', 'Ferreñan', 'Ferreñan Cardenas', 'https://lh3.google.com/ao/AHP4FtnKOWSxS63cucDe9ydSWL6CX4dXmgBYzy5TUiKXwjOvd2TyiCepT-Co3Qk1WrWTts6Tjg=s96-c', 'f', '937432948', 't', NULL, NULL, NULL, 'cQamHfF7BnVVsKJQy2QklzYItzzc', 'mferrenanc@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Miriam Salome', 'workspace-import', NULL, '990402965', NULL, 'Miriam Salome Ferreñan Cardenas', '4', 'mferrenanc@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2026-03-12 18:26:14+00', '2026-06-26 06:53:27.917+00', 'PERUANA', NULL, NULL, NULL),
('1050', 'Quispe', 'Lazo', 'Lazo Quispe', 'https://lh3.google.com/ao/AHP4Ftms_XLDyvF6CpiaXkG3d3grd5h9wLr6IFlLUaGLFNxcmSO5o2adeIxZ1E9dtoOj-sMTAog=s96-c', 'f', '994803839', 't', NULL, NULL, NULL, 'wncYOZiJKf1HmoXfYYilJGrr0x0M', 'maryglorial03@gmail.com', NULL, NULL, NULL, 'Mary Gloria', 'workspace-import', NULL, NULL, NULL, 'Mary Gloria Lazo Quispe', '4', 'mlazoq@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.927+00', 'PERUANA', NULL, NULL, NULL),
('1051', 'Yanac', 'Martinez', 'Martinez Yanac', 'https://lh3.google.com/ao/AHP4Ftn4__RPAX77sfr9Sr3gRVlMzAiA3m5W1jCn1lW7BmtrnERTwUSn373THxuNpzWbS9v0SMg=s96-c', 'f', '939791691', 't', NULL, NULL, NULL, 'yH2pYEwFc9kifY22soGmQLdIOelL', 'atigram006@gmail.com', NULL, NULL, NULL, 'Margarita Edelmira', 'workspace-import', NULL, NULL, NULL, 'Margarita Edelmira Martinez Yanac', '4', 'mmartinezy@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.937+00', 'PERUANA', NULL, NULL, NULL),
('1052', 'Gonzáles de Charca', 'Torres', 'Torres Gonzáles de Charca', 'https://lh3.googleusercontent.com/a-/ALV-UjXMZjiKhjGQmoKpEay5CF4CXv8yUdaxDVN46vEx1NgnJW7JFNM=s96-c', 'f', '994080666', 't', NULL, NULL, NULL, 'z79yCTcQxRr4RForizLNfzmDudfL', 'mtg1509@gmail.com', NULL, NULL, NULL, 'Marcelina', 'workspace-import', NULL, NULL, NULL, 'Marcelina Torres Gonzáles de Charca', '4', 'mtorresg@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2021-04-20 00:19:33+00', '2026-06-26 06:53:27.946+00', 'PERUANA', NULL, NULL, NULL),
('1053', 'CAYTUIRO', 'SOLGORRE', 'SOLGORRE CAYTUIRO', 'https://lh3.google.com/ao/AHP4Ftky1rfg91DGt7g_i2wMsjWDyOnPI5rE1QCoWEBjYZ6Myp7HYWhqOH9g4oV4bNXQe8vo8F0=s96-c', 'f', '945287596', 't', 'Jr las bellotas 125', 'Los Olivos', '87236958', 'stIYrQkjRbakgegUeEXWNf0IN0g4', 'nievessolgorre@gmail.com', 'Casado(a)', '1976-08-25 00:00:00+00', 'Superior', 'Nieves Orfelinda', 'workspace-import', 'F', '7832586', 'DNI', 'Nieves Orfelinda SOLGORRE CAYTUIRO', '4', 'nsolgorrec@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2022-03-09 04:47:07+00', '2026-06-26 06:53:27.955+00', 'PERUANA', NULL, NULL, NULL),
('1055', 'Ipanaque', 'Ramos', 'Ramos Ipanaque', 'https://lh3.google.com/ao/AHP4FtmEQ_B8APkzVwiSXvu6wS6-gElJ2uBv38nA1DL8J_pT3dvWqGI1Z8cwSvD08IYel0Cniw=s96-c', 'f', '930684024', 't', NULL, NULL, NULL, '1NAoISe57EN4r48dQE2bfshW3MyH', 'rramosi@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Richard', 'workspace-import', NULL, '930684024', NULL, 'Richard Ramos Ipanaque', '4', 'rramosi@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2024-03-09 05:22:24+00', '2026-06-26 06:53:27.979+00', 'PERUANA', NULL, NULL, NULL),
('1056', 'Manrique', 'Cordero', 'Cordero Manrique', 'https://lh3.google.com/ao/AHP4FtntQZZwIT1liZ9jTQjYYICsCN1kiCCUA--k0qNedTrHmSu7-lNt_X8ajxb_xIT7JxLUdHs=s96-c', 'f', '995228570', 't', NULL, NULL, NULL, 'YSVCGzDbQtoGoAWrUAaM4Op4Horw', 'soniacordero61m@gmail.com', NULL, NULL, NULL, 'Sonia Priscila', 'workspace-import', NULL, NULL, NULL, 'Sonia Priscila Cordero Manrique', '4', 'scorderom@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.988+00', 'PERUANA', NULL, NULL, NULL),
('1057', 'Ramírez', 'Meza', 'Meza Ramírez', 'https://lh3.google.com/ao/AHP4FtlLLBi7KWsWgMLetGX7KDyNdWozwvmUARahEN2ciH2XVbxnQ41JpT6H3r1ffz54QY9cyw=s96-c', 'f', NULL, 't', NULL, NULL, NULL, '5ycI8mEdPPqV6RBySokMRhFE3axG', 'smezar@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Sandra Lourdes', 'workspace-import', NULL, '972223670', NULL, 'Sandra Lourdes Meza Ramírez', '4', 'smezar@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-03-04 14:41:39+00', '2026-06-26 06:53:27.997+00', 'PERUANA', NULL, NULL, NULL),
('1058', 'AGUILAR', 'OSTOS', 'OSTOS AGUILAR', 'https://lh3.google.com/ao/AHP4FtkdazigH9CWuU6yNTyos75B038VKuj9eDjXpQ0MwGGPG3CCWLAjbZ2BGjRJjQud7M_wIA=s96-c', 'f', '975169340', 't', NULL, NULL, NULL, 'bLScdqxphmk11P2M2kyuLaeJWNqs', 'sostosa@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Sara Elvira', 'workspace-import', NULL, '975169340', NULL, 'Sara Elvira OSTOS AGUILAR', '4', 'sostosa@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-03-21 20:39:31+00', '2026-06-26 06:53:28.006+00', 'PERUANA', NULL, NULL, NULL),
('1059', 'Barrera', 'Zamalloa', 'Zamalloa Barrera', 'https://lh3.google.com/ao/AHP4FtkmIXRcCBQ8rjm7zaA1LBeaJxR1YtTxB26c0p_9E5R6KyW1ucIkjBoYWJZfxWvkD1r5FA=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'lGZnuuIov2pwUy81Mj2Y8XkmP9st', 'vzamalloab@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Victor Hugo', 'workspace-import', NULL, '997946332', NULL, 'Victor Hugo Zamalloa Barrera', '4', 'vzamalloab@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2025-03-04 14:45:31+00', '2026-06-26 06:53:28.016+00', 'PERUANA', NULL, NULL, NULL),
('1060', 'Zelaya', 'Guevara', 'Guevara Zelaya', 'https://lh3.googleusercontent.com/a-/ALV-UjUZU6IPWxW1O6qb_G33IGeJ16FzBqsnpLJhFcja2d4ufWYpWCEe=s96-c', 'f', '955982580', 't', NULL, NULL, NULL, 'VDpk9BfzBtp2yhnddeSN1cbzZA2j', 'wguevarazelaya@gmail.com', NULL, NULL, NULL, 'Walter', 'workspace-import', NULL, NULL, NULL, 'Walter Guevara Zelaya', '4', 'wguevaraz@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.026+00', 'PERUANA', NULL, NULL, NULL),
('1061', 'Olivas', 'Miraval', 'Miraval Olivas', 'https://lh3.googleusercontent.com/a-/ALV-UjXNC9VEftoamCkWO_Tdgb1LNjFB7ARe4yIdJCduE9j9M20P_yU=s96-c', 'f', '987947446', 't', NULL, NULL, NULL, 'qbi8QK2MwZO4klTOaGtax2SN0ZmD', 'walter.miravalo@gmail.com', NULL, NULL, NULL, 'Walter Huber', 'workspace-import', NULL, NULL, NULL, 'Walter Huber Miraval Olivas', '4', 'wmiravalo@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.035+00', 'PERUANA', NULL, NULL, NULL),
('1043', 'Flores', 'Moscol', 'Moscol Flores', 'https://lh3.google.com/ao/AHP4FtmUc7Gub3D4x7WB_e94_t3XUntZzAUTbsCfNafMD8XiSdw8AGxe_z3PsQRRBiw-vteZwg=s96-c', 'f', '935256709', 't', NULL, NULL, NULL, '9tzsLL0pXvzQggJGPqznlWcqjvsr', 'rimf271966@gmail.com', NULL, NULL, NULL, 'Rosa Isabel', 'workspace-import', NULL, '935256709', NULL, 'Rosa Isabel Moscol Flores', '4', 'imoscolf@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2024-03-09 05:09:31+00', '2026-06-26 06:53:27.855+00', 'PERUANA', NULL, NULL, NULL),
('1054', 'Ávila', 'Figueroa', 'Figueroa Ávila', 'https://lh3.google.com/ao/AHP4Ftn3tfQkhJ7kWrI_TYFI1FqAbLQKnmZvQqYwCSm0AoX-sL_VE9d5A-Xv5nApqB7WjQGQTRs=s96-c', 'f', '943221605', 't', NULL, NULL, NULL, 'tExSwNMl6Muv0wEmVyHQR2FWYtaw', 'rfigueroaa@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Romelio', 'workspace-import', NULL, '943221605', NULL, 'Romelio Figueroa Ávila', '4', 'rfigueroaa@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2023-03-28 23:21:11+00', '2026-06-26 06:53:27.966+00', 'PERUANA', NULL, NULL, NULL),
('1042', 'Villanueva', 'Grijalba', 'Grijalba Villanueva', 'https://lh3.googleusercontent.com/a-/ALV-UjWhIOtLdebbiw4d-FKr0242BkygmOCS2NtTdLymuZdqDel-zmtn=s96-c', 'f', '935152912', 't', NULL, NULL, NULL, '7z0E1foyJygx1bloNnkKcwAsVzoS', 'toshitogv74@gmail.com', NULL, NULL, NULL, 'Isaias John', 'workspace-import', NULL, NULL, NULL, 'Isaias John Grijalba Villanueva', '4', 'igrijalbav@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.846+00', 'PERUANA', NULL, NULL, NULL),
('1062', 'Martin de Porres"', '"San', '"San Martin de Porres"', 'https://lh3.google.com/ao/AHP4FtkzhSsk9eIygSKtuFRxPRlabY7kPzxCr2MHNBb9TpUu0Pc970iGMpPIeq3sXA_WUnwdNA=s96-c', 'f', NULL, 't', NULL, NULL, NULL, '2MjA7p8mRl24dYerMiw4OPYrJ5tC', 'elenacordovagalindo@gmail.com', NULL, NULL, NULL, 'CETPRO', 'workspace-import', NULL, NULL, NULL, 'CETPRO "San Martin de Porres"', '5', 'cetprosanmartindeporres@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2021-08-14 03:06:41+00', '2026-06-26 06:53:28.046+00', 'PERUANA', NULL, NULL, NULL),
('1063', 'MATA', 'GIRALDO', 'GIRALDO MATA', NULL, 'f', NULL, 't', NULL, NULL, NULL, 'j5P6xFdU3T61FPaG5mEBFHHn6CTs', 'ggiraldom@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Guissela Pilar', 'workspace-import', NULL, '960347851', NULL, 'Guissela Pilar GIRALDO MATA', '5', 'ggiraldom@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2024-05-24 20:47:02+00', '2026-06-26 06:53:28.054+00', 'PERUANA', NULL, NULL, NULL),
('1064', 'CANCINO', 'MALCA', 'MALCA CANCINO', 'https://lh3.googleusercontent.com/a-/ALV-UjUcnNBYE6JNTFF_41OFRYexq1IZc-33p7ovR7PtEJ-HPMi8FDM3=s96-c', 'f', '959214849', 't', NULL, NULL, NULL, 'ygIdsy0PH7yzqUrCedibdH0hMc76', 'yuli_m2000@hotmail.com', NULL, NULL, NULL, 'Guiliana', 'workspace-import', NULL, NULL, NULL, 'Guiliana MALCA CANCINO', '5', 'gmalcac@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-31 07:26:58+00', '2026-06-26 06:53:28.065+00', 'PERUANA', NULL, NULL, NULL),
('1065', 'Madueño', 'Saavedra', 'Saavedra Madueño', 'https://lh3.googleusercontent.com/a-/ALV-UjUuaqC-8y_gb3GnlNcyHjmUNRmXGxFcQlVP74zsAq5tVeG670Se=s96-c', 'f', '929182186', 't', NULL, NULL, NULL, 'cDmwcWXgBgJoK2ZLwXLph9PBwYtA', 'marialsm64@gmail.com', NULL, NULL, NULL, 'Maria Luz', 'workspace-import', NULL, NULL, NULL, 'Maria Luz Saavedra Madueño', '5', 'msaavedram@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.075+00', 'PERUANA', NULL, NULL, NULL),
('1066', 'Vicuña', 'Llacsa', 'Llacsa Vicuña', 'https://lh3.google.com/ao/AHP4FtmS06MsCRHWcmqtkaRNtVnp2zehyuXHk5EPJZPSYeiu6XHNjJGK1EL2T2UaFwBDsn9CFw=s96-c', 'f', NULL, 't', NULL, NULL, NULL, 'kayFBC5j4sSGfaPrmNM7oCMVa1uU', 'sllacsav@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Susana', 'workspace-import', NULL, '984160033', NULL, 'Susana Llacsa Vicuña', '5', 'sllacsav@cetprosmp.edu.pe', NULL, NULL, 'workspace-import-script', '2026-01-02 16:59:30+00', '2026-06-26 06:53:28.085+00', 'PERUANA', NULL, NULL, NULL),
('872', 'Quetos', 'Moligams', 'Moligams Quetos', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780293556687_dama4.webp?alt=media&token=28450cb2-1373-4351-963c-79a4fb658d30', 'f', '985858789', 't', 'La abutardas 125', 'Santa Beatriz', '87548968', 'hhUHljNj4ALYkrA825zBtrC6xVzC', 'rociomoligams@cetprosmp.edu.pe', 'Viudo(a)', '2000-02-02 00:00:00+00', 'Secundaria', 'Rocio', NULL, 'F', '7586258', 'DNI', 'Rocio Moligams', '6', 'Chio03@cetprosmp.edu.pe', NULL, NULL, 'enkee03@cetprosmp.edu.pe', '2026-06-01 05:15:12.695+00', '2026-06-26 07:18:55.866+00', 'PERUANA', NULL, NULL, NULL),
('1003', 'Rockefeller', 'Martínez', 'Martínez Rockefeller', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780551242674_dama1.webp?alt=media&token=3b4386dd-3b57-48a4-ad2a-1c0e8674c40a', 'f', '965325897', NULL, NULL, NULL, '89325785', 'cjjSrfIcXZkifFmQkUiGmDKXnKkw', 'margarita12@cetprosmp.edu.pe', 'Soltero', NULL, 'Primaria', 'Margarita', NULL, 'M', NULL, 'DNI', 'Margarita Martínez', '4', 'margarita12@cetprosmp.edu.pe', NULL, NULL, 'margarita12@cetprosmp.edu.pe', '2026-06-04 05:33:00.741+00', '2026-06-04 06:01:40.655+00', 'PERUANA', NULL, NULL, NULL),
('13', 'Horna', 'Palomino', 'Palomino Horna', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780549698599_EPH.jpg?alt=media&token=e9bdf40a-d937-463c-be71-58bc767e3a1b', 'f', '941689574', 't', 'Jr. La Hiedra 702 Urb. Las Palmeras', 'Los Olivos', '10698579', 'HggJCjXw6eCNW8uI00uKxuZlPTQT', 'enkee03@gmail.com', 'Soltero', '1977-11-01 00:00:00+00', 'Primaria', 'Enrique Rafael', NULL, 'M', NULL, 'DNI', 'Enrique Palomino', '8', 'enkee03@cetprosmp.edu.pe', NULL, NULL, 'enkee03@cetprosmp.edu.pe', '2026-06-04 04:19:32.456+00', '2026-06-04 04:19:32.456+00', 'PERUANA', NULL, NULL, NULL),
('871', 'Moreno', 'Moligams', 'Moligams Moreno', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780293574142_dama3.webp?alt=media&token=cd28cb9f-486a-4893-894e-543a51a6e9ef', 'f', '958545895', 't', 'Las hiedras 125', 'Chorrillos', '87548968', '0tYkMkRHDlrSEgetyHhkCJ0r8vUe', 'rociomoligams@gmail.com', 'Casado(a)', '2000-02-02 00:00:00+00', 'Secundaria', 'Rocio', NULL, 'F', '7854589', 'DNI', 'Rocio Moligams', '3', '87548968@cetprosmp.edu.pe', NULL, NULL, 'enkee03@cetprosmp.edu.pe', '2026-06-01 05:10:31.548+00', '2026-06-26 07:57:27.896+00', 'PERUANA', NULL, NULL, NULL),
('1233', 'CORDOVA', 'ESQUIVEL', 'ESQUIVEL CORDOVA', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2Favatars%2F09615124%2Favatar-dni-r7sB7hl8KrmFSx9bCicy-grande.png?alt=media&token=adf98448-cd0b-4d0a-bad3-001b5610cefb', 'f', '925846873', 't', 'JR. JOSE MENDIBURO IBONET 161 CONDEVILLA', 'SAN MARTIN DE PORRES', '09615124', '2f40np8ABVffQRSX6fmxtTQ0HL83', '09615124@cetprosmp.edu.pe', 'Casado(a)', '1970-03-30 00:00:00+00', 'Secundaria', 'GLORIA INES', 'password', 'F', NULL, 'DNI', 'GLORIA INES ESQUIVEL CORDOVA', '3', '09615124@cetprosmp.edu.pe', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-09615124-frente-1783236343766-gloria1.jpeg?alt=media&token=3721f3f8-216c-4f89-95b7-65cac2dc368d', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-09615124-reverso-1783236346415-gloria2.jpeg?alt=media&token=b68f7b91-ef69-41a5-977a-af5fe55f7e94', 'enkee03@cetprosmp.edu.pe', '2026-07-05 07:26:24.399+00', '2026-07-05 07:26:24.399+00', 'PERUANA', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos-procesados%2F09615124%2Fxo6EL42E6Lqyzjk7PTXN-frente.jpg?alt=media&token=5857a1fa-9409-4535-88cd-debc40049292', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos-procesados%2F09615124%2Fxo6EL42E6Lqyzjk7PTXN-reverso.jpg?alt=media&token=6d77c190-5ea5-4625-84e5-148ff64a4bde', '2032-11-21 00:00:00+00'),
('970', 'Horna', 'Palomino', 'Palomino Horna', NULL, 'f', '941689574', 't', 'Jr. La hiedra 702', 'Los Olivos', '10698579', 'jiqXveE41LHux89eDraOFp9YCxOD', 'enkee03@gmail.com', 'Soltero', '1977-11-01 00:00:00+00', 'Secundaria', 'Enrique', 'matricula', 'M', NULL, 'DNI', 'Enrique Palomino Horna', NULL, 'epalominoh@cetprosmp.edu.pe', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-10698579-frente-1782958881141-dni2-a.jpg?alt=media&token=266498d3-ee97-49d1-9b9d-d0480915da23', 'https://firebasestorage.googleapis.com/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-10698579-reverso-1782958881220-dni2-b.jpg?alt=media&token=ba888e29-d450-46cb-8454-c573de67ebfb', 'workspace-import-script', '2020-07-08 16:30:06+00', '2026-07-02 02:27:45.773+00', 'PERUANA', NULL, NULL, NULL);


--
-- Data for Name: valores_institucionales; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: videos_youtube; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.videos_youtube (id, url) VALUES
('1', 'https://www.youtube.com/watch?v=_6oKX-ZCP_8'),
('2', 'https://www.youtube.com/watch?v=IyKoAaLrTzw');


--
-- Name: acciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.acciones_id_seq', 1, false);


--
-- Name: act_economicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.act_economicas_id_seq', 9, true);


--
-- Name: actividades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.actividades_id_seq', 1, false);


--
-- Name: anios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.anios_id_seq', 6, true);


--
-- Name: aprendizajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aprendizajes_id_seq', 1, false);


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asistencias_id_seq', 1, false);


--
-- Name: aspectos_evaluacion_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aspectos_evaluacion_estudiantes_id_seq', 1, false);


--
-- Name: aspectos_evaluacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aspectos_evaluacion_id_seq', 1, false);


--
-- Name: calendarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendarios_id_seq', 10, true);


--
-- Name: capacidades_terminales_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.capacidades_terminales_estudiantes_id_seq', 1, false);


--
-- Name: capacidades_terminales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.capacidades_terminales_id_seq', 1, false);


--
-- Name: carreras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.carreras_id_seq', 23, true);


--
-- Name: dato_general_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dato_general_id_seq', 1, true);


--
-- Name: ejes_transversales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ejes_transversales_id_seq', 1, false);


--
-- Name: especialidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.especialidades_id_seq', 8, true);


--
-- Name: evaluaciones_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evaluaciones_estudiantes_id_seq', 1, false);


--
-- Name: evaluaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evaluaciones_id_seq', 1, false);


--
-- Name: evento_ocurrencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evento_ocurrencias_id_seq', 1, false);


--
-- Name: evento_recurrencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evento_recurrencias_id_seq', 1, false);


--
-- Name: evento_relaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evento_relaciones_id_seq', 1, false);


--
-- Name: eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.eventos_id_seq', 40, true);


--
-- Name: familias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.familias_id_seq', 7, true);


--
-- Name: fases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fases_id_seq', 1, false);


--
-- Name: fases_metodos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fases_metodos_id_seq', 1, false);


--
-- Name: fases_recursos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fases_recursos_id_seq', 1, false);


--
-- Name: fases_tecnicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fases_tecnicas_id_seq', 1, false);


--
-- Name: grupo_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grupo_modulos_id_seq', 69, true);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grupos_id_seq', 89, true);


--
-- Name: horarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.horarios_id_seq', 7, true);


--
-- Name: indicadores_capacidad_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.indicadores_capacidad_estudiantes_id_seq', 1, false);


--
-- Name: indicadores_capacidad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.indicadores_capacidad_id_seq', 1, false);


--
-- Name: matricula_grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matricula_grupos_id_seq', 1, false);


--
-- Name: matricula_paquetes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matricula_paquetes_id_seq', 1, false);


--
-- Name: matricula_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matricula_users_id_seq', 1, false);


--
-- Name: matriculas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matriculas_id_seq', 200, true);


--
-- Name: metodos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.metodos_id_seq', 1, false);


--
-- Name: modulo_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modulo_videos_id_seq', 1, false);


--
-- Name: modulos_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modulos_estudiantes_id_seq', 198, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modulos_id_seq', 34, true);


--
-- Name: paquete_grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paquete_grupos_id_seq', 1, false);


--
-- Name: paquete_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paquete_modulos_id_seq', 103, true);


--
-- Name: paquetes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paquetes_id_seq', 114, true);


--
-- Name: personal_especialidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personal_especialidades_id_seq', 16, true);


--
-- Name: personales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personales_id_seq', 38, true);


--
-- Name: planes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planes_id_seq', 19, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 1, false);


--
-- Name: publicacion_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publicacion_videos_id_seq', 1, false);


--
-- Name: publicaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publicaciones_id_seq', 23, true);


--
-- Name: recordatorios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recordatorios_id_seq', 1, false);


--
-- Name: recursos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recursos_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 9, true);


--
-- Name: sectores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sectores_id_seq', 4, true);


--
-- Name: semestres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.semestres_id_seq', 41, true);


--
-- Name: tecnicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tecnicas_id_seq', 1, false);


--
-- Name: tipo_carreras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tipo_carreras_id_seq', 4, true);


--
-- Name: turnos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.turnos_id_seq', 3, true);


--
-- Name: unidades_didacticas_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unidades_didacticas_estudiantes_id_seq', 1, false);


--
-- Name: unidades_didacticas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unidades_didacticas_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1233, true);


--
-- Name: valores_institucionales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.valores_institucionales_id_seq', 1, false);


--
-- Name: videos_youtube_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.videos_youtube_id_seq', 2, true);


--
-- Name: acciones acciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acciones
    ADD CONSTRAINT acciones_pkey PRIMARY KEY (id);


--
-- Name: act_economicas act_economicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.act_economicas
    ADD CONSTRAINT act_economicas_pkey PRIMARY KEY (id);


--
-- Name: actividades actividades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_pkey PRIMARY KEY (id);


--
-- Name: anios anios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anios
    ADD CONSTRAINT anios_pkey PRIMARY KEY (id);


--
-- Name: aprendizajes aprendizajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprendizajes
    ADD CONSTRAINT aprendizajes_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: aspectos_evaluacion_estudiantes aspectos_evaluacion_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion_estudiantes
    ADD CONSTRAINT aspectos_evaluacion_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: aspectos_evaluacion aspectos_evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion
    ADD CONSTRAINT aspectos_evaluacion_pkey PRIMARY KEY (id);


--
-- Name: calendarios calendarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_pkey PRIMARY KEY (id);


--
-- Name: capacidades_terminales_estudiantes capacidades_terminales_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales_estudiantes
    ADD CONSTRAINT capacidades_terminales_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: capacidades_terminales capacidades_terminales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales
    ADD CONSTRAINT capacidades_terminales_pkey PRIMARY KEY (id);


--
-- Name: carreras carreras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_pkey PRIMARY KEY (id);


--
-- Name: dato_general dato_general_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dato_general
    ADD CONSTRAINT dato_general_pkey PRIMARY KEY (id);


--
-- Name: ejes_transversales ejes_transversales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ejes_transversales
    ADD CONSTRAINT ejes_transversales_pkey PRIMARY KEY (id);


--
-- Name: especialidades especialidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_pkey PRIMARY KEY (id);


--
-- Name: evaluaciones_estudiantes evaluaciones_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones_estudiantes
    ADD CONSTRAINT evaluaciones_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: evaluaciones evaluaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_pkey PRIMARY KEY (id);


--
-- Name: evento_ocurrencias evento_ocurrencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_ocurrencias
    ADD CONSTRAINT evento_ocurrencias_pkey PRIMARY KEY (id);


--
-- Name: evento_recurrencias evento_recurrencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_recurrencias
    ADD CONSTRAINT evento_recurrencias_pkey PRIMARY KEY (id);


--
-- Name: evento_relaciones evento_relaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_relaciones
    ADD CONSTRAINT evento_relaciones_pkey PRIMARY KEY (id);


--
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id);


--
-- Name: familias familias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT familias_pkey PRIMARY KEY (id);


--
-- Name: fases_metodos fases_metodos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_metodos
    ADD CONSTRAINT fases_metodos_pkey PRIMARY KEY (id);


--
-- Name: fases fases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases
    ADD CONSTRAINT fases_pkey PRIMARY KEY (id);


--
-- Name: fases_recursos fases_recursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_recursos
    ADD CONSTRAINT fases_recursos_pkey PRIMARY KEY (id);


--
-- Name: fases_tecnicas fases_tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_tecnicas
    ADD CONSTRAINT fases_tecnicas_pkey PRIMARY KEY (id);


--
-- Name: grupo_modulos grupo_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_modulos
    ADD CONSTRAINT grupo_modulos_pkey PRIMARY KEY (id);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- Name: indicadores_capacidad_estudiantes indicadores_capacidad_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad_estudiantes
    ADD CONSTRAINT indicadores_capacidad_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: indicadores_capacidad indicadores_capacidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad
    ADD CONSTRAINT indicadores_capacidad_pkey PRIMARY KEY (id);


--
-- Name: matricula_grupos matricula_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_grupos
    ADD CONSTRAINT matricula_grupos_pkey PRIMARY KEY (matricula_id, grupo_id);


--
-- Name: matricula_paquetes matricula_paquetes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_paquetes
    ADD CONSTRAINT matricula_paquetes_pkey PRIMARY KEY (matricula_id, paquete_id);


--
-- Name: matricula_users matricula_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_users
    ADD CONSTRAINT matricula_users_pkey PRIMARY KEY (matricula_id, user_id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: metodos metodos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos
    ADD CONSTRAINT metodos_pkey PRIMARY KEY (id);


--
-- Name: modulo_videos modulo_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulo_videos
    ADD CONSTRAINT modulo_videos_pkey PRIMARY KEY (id);


--
-- Name: modulos_estudiantes modulos_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_estudiantes
    ADD CONSTRAINT modulos_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: paquete_grupos paquete_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_grupos
    ADD CONSTRAINT paquete_grupos_pkey PRIMARY KEY (paquete_id, grupo_id);


--
-- Name: paquete_modulos paquete_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_modulos
    ADD CONSTRAINT paquete_modulos_pkey PRIMARY KEY (id);


--
-- Name: paquetes paquetes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_pkey PRIMARY KEY (id);


--
-- Name: personal_especialidades personal_especialidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_especialidades
    ADD CONSTRAINT personal_especialidades_pkey PRIMARY KEY (personal_id, especialidad_id);


--
-- Name: personales personales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personales
    ADD CONSTRAINT personales_pkey PRIMARY KEY (id);


--
-- Name: planes planes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: publicacion_videos publicacion_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_videos
    ADD CONSTRAINT publicacion_videos_pkey PRIMARY KEY (id);


--
-- Name: publicaciones publicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicaciones
    ADD CONSTRAINT publicaciones_pkey PRIMARY KEY (id);


--
-- Name: recordatorios recordatorios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios
    ADD CONSTRAINT recordatorios_pkey PRIMARY KEY (id);


--
-- Name: recursos recursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recursos
    ADD CONSTRAINT recursos_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey1 PRIMARY KEY (id);


--
-- Name: sectores sectores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_pkey PRIMARY KEY (id);


--
-- Name: semestres semestres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_pkey PRIMARY KEY (id);


--
-- Name: tecnicas tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tecnicas
    ADD CONSTRAINT tecnicas_pkey PRIMARY KEY (id);


--
-- Name: tipo_carreras tipo_carreras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_carreras
    ADD CONSTRAINT tipo_carreras_pkey PRIMARY KEY (id);


--
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- Name: unidades_didacticas_estudiantes unidades_didacticas_estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas_estudiantes
    ADD CONSTRAINT unidades_didacticas_estudiantes_pkey PRIMARY KEY (id);


--
-- Name: unidades_didacticas unidades_didacticas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas
    ADD CONSTRAINT unidades_didacticas_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: valores_institucionales valores_institucionales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valores_institucionales
    ADD CONSTRAINT valores_institucionales_pkey PRIMARY KEY (id);


--
-- Name: videos_youtube videos_youtube_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos_youtube
    ADD CONSTRAINT videos_youtube_pkey PRIMARY KEY (id);


--
-- Name: act_economicas_especialidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "act_economicas_especialidadId_idx" ON public.act_economicas USING btree (especialidad_id);


--
-- Name: act_economicas_familiaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "act_economicas_familiaId_idx" ON public.act_economicas USING btree (familia_id);


--
-- Name: actividades_aprendizajeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "actividades_aprendizajeId_idx" ON public.actividades USING btree (aprendizaje_id);


--
-- Name: actividades_ejeTransversalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "actividades_ejeTransversalId_idx" ON public.actividades USING btree (eje_transversal_id);


--
-- Name: actividades_valorInstitucionalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "actividades_valorInstitucionalId_idx" ON public.actividades USING btree (valor_institucional_id);


--
-- Name: aprendizajes_indicadorCapacidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aprendizajes_indicadorCapacidadId_idx" ON public.aprendizajes USING btree (indicador_capacidad_id);


--
-- Name: asistencias_eventoOcurrenciaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asistencias_eventoOcurrenciaId_idx" ON public.asistencias USING btree (evento_ocurrencia_id);


--
-- Name: asistencias_eventoOcurrenciaId_matriculaId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "asistencias_eventoOcurrenciaId_matriculaId_uidx" ON public.asistencias USING btree (evento_ocurrencia_id, matricula_id);


--
-- Name: asistencias_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asistencias_matriculaId_idx" ON public.asistencias USING btree (matricula_id);


--
-- Name: asistencias_registradoPorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asistencias_registradoPorId_idx" ON public.asistencias USING btree (registrado_por_id);


--
-- Name: aspectos_evaluacion_estudiantes_aspectoEvaluacionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aspectos_evaluacion_estudiantes_aspectoEvaluacionId_idx" ON public.aspectos_evaluacion_estudiantes USING btree (aspecto_evaluacion_id);


--
-- Name: aspectos_evaluacion_estudiantes_evaluacionEstudianteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aspectos_evaluacion_estudiantes_evaluacionEstudianteId_idx" ON public.aspectos_evaluacion_estudiantes USING btree (evaluacion_estudiante_id);


--
-- Name: aspectos_evaluacion_estudiantes_evaluacispectoEvaluacionId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "aspectos_evaluacion_estudiantes_evaluacispectoEvaluacionId_uidx" ON public.aspectos_evaluacion_estudiantes USING btree (evaluacion_estudiante_id, aspecto_evaluacion_id);


--
-- Name: aspectos_evaluacion_evaluacionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aspectos_evaluacion_evaluacionId_idx" ON public.aspectos_evaluacion USING btree (evaluacion_id);


--
-- Name: calendarios_anioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "calendarios_anioId_idx" ON public.calendarios USING btree (anio_id);


--
-- Name: calendarios_horarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "calendarios_horarioId_idx" ON public.calendarios USING btree (horario_id);


--
-- Name: calendarios_semestreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "calendarios_semestreId_idx" ON public.calendarios USING btree (semestre_id);


--
-- Name: capacidades_terminales_estudiantes_capacidadTerminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "capacidades_terminales_estudiantes_capacidadTerminalId_idx" ON public.capacidades_terminales_estudiantes USING btree (capacidad_terminal_id);


--
-- Name: capacidades_terminales_estudiantes_matriapacidadTerminalId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "capacidades_terminales_estudiantes_matriapacidadTerminalId_uidx" ON public.capacidades_terminales_estudiantes USING btree (matricula_id, capacidad_terminal_id);


--
-- Name: capacidades_terminales_estudiantes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "capacidades_terminales_estudiantes_matriculaId_idx" ON public.capacidades_terminales_estudiantes USING btree (matricula_id);


--
-- Name: capacidades_terminales_unidadDidacticaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "capacidades_terminales_unidadDidacticaId_idx" ON public.capacidades_terminales USING btree (unidad_didactica_id);


--
-- Name: carreras_actEconomicaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "carreras_actEconomicaId_idx" ON public.carreras USING btree (act_economica_id);


--
-- Name: carreras_tipoCarreraId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "carreras_tipoCarreraId_idx" ON public.carreras USING btree (tipo_carrera_id);


--
-- Name: especialidades_actEconomicaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "especialidades_actEconomicaId_idx" ON public.especialidades USING btree (act_economica_id);


--
-- Name: evaluaciones_actividadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_actividadId_idx" ON public.evaluaciones USING btree (actividad_id);


--
-- Name: evaluaciones_estudiantes_evaluacionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_estudiantes_evaluacionId_idx" ON public.evaluaciones_estudiantes USING btree (evaluacion_id);


--
-- Name: evaluaciones_estudiantes_matriculaId_evaluacionId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "evaluaciones_estudiantes_matriculaId_evaluacionId_uidx" ON public.evaluaciones_estudiantes USING btree (matricula_id, evaluacion_id);


--
-- Name: evaluaciones_estudiantes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_estudiantes_matriculaId_idx" ON public.evaluaciones_estudiantes USING btree (matricula_id);


--
-- Name: evaluaciones_indicadorCapacidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_indicadorCapacidadId_idx" ON public.evaluaciones USING btree (indicador_capacidad_id);


--
-- Name: evaluaciones_metodoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_metodoId_idx" ON public.evaluaciones USING btree (metodo_id);


--
-- Name: evaluaciones_tecnicaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evaluaciones_tecnicaId_idx" ON public.evaluaciones USING btree (tecnica_id);


--
-- Name: evento_ocurrencias_eventoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_ocurrencias_eventoId_idx" ON public.evento_ocurrencias USING btree (evento_id);


--
-- Name: evento_ocurrencias_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_ocurrencias_grupoId_idx" ON public.evento_ocurrencias USING btree (grupo_id);


--
-- Name: evento_ocurrencias_recurrenciaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_ocurrencias_recurrenciaId_idx" ON public.evento_ocurrencias USING btree (recurrencia_id);


--
-- Name: evento_recurrencias_eventoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_recurrencias_eventoId_idx" ON public.evento_recurrencias USING btree (evento_id);


--
-- Name: evento_recurrencias_horarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_recurrencias_horarioId_idx" ON public.evento_recurrencias USING btree (horario_id);


--
-- Name: evento_recurrencias_turnoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_recurrencias_turnoId_idx" ON public.evento_recurrencias USING btree (turno_id);


--
-- Name: evento_relaciones_eventoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "evento_relaciones_eventoId_idx" ON public.evento_relaciones USING btree (evento_id);


--
-- Name: eventos_calendarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "eventos_calendarioId_idx" ON public.eventos USING btree (calendario_id);


--
-- Name: eventos_semestreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "eventos_semestreId_idx" ON public.eventos USING btree (semestre_id);


--
-- Name: familias_sectorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "familias_sectorId_idx" ON public.familias USING btree (sector_id);


--
-- Name: fases_accionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_accionId_idx" ON public.fases USING btree (accion_id);


--
-- Name: fases_actividadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_actividadId_idx" ON public.fases USING btree (actividad_id);


--
-- Name: fases_metodos_faseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_metodos_faseId_idx" ON public.fases_metodos USING btree (fase_id);


--
-- Name: fases_metodos_faseId_metodoId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fases_metodos_faseId_metodoId_uidx" ON public.fases_metodos USING btree (fase_id, metodo_id);


--
-- Name: fases_metodos_metodoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_metodos_metodoId_idx" ON public.fases_metodos USING btree (metodo_id);


--
-- Name: fases_recursos_faseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_recursos_faseId_idx" ON public.fases_recursos USING btree (fase_id);


--
-- Name: fases_recursos_faseId_recursoId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fases_recursos_faseId_recursoId_uidx" ON public.fases_recursos USING btree (fase_id, recurso_id);


--
-- Name: fases_recursos_recursoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_recursos_recursoId_idx" ON public.fases_recursos USING btree (recurso_id);


--
-- Name: fases_tecnicas_faseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_tecnicas_faseId_idx" ON public.fases_tecnicas USING btree (fase_id);


--
-- Name: fases_tecnicas_faseId_tecnicaId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fases_tecnicas_faseId_tecnicaId_uidx" ON public.fases_tecnicas USING btree (fase_id, tecnica_id);


--
-- Name: fases_tecnicas_tecnicaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fases_tecnicas_tecnicaId_idx" ON public.fases_tecnicas USING btree (tecnica_id);


--
-- Name: grupo_modulos_calendarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupo_modulos_calendarioId_idx" ON public.grupo_modulos USING btree (calendario_id);


--
-- Name: grupo_modulos_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupo_modulos_grupoId_idx" ON public.grupo_modulos USING btree (grupo_id);


--
-- Name: grupo_modulos_grupoId_moduloId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "grupo_modulos_grupoId_moduloId_uidx" ON public.grupo_modulos USING btree (grupo_id, modulo_id);


--
-- Name: grupo_modulos_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupo_modulos_moduloId_idx" ON public.grupo_modulos USING btree (modulo_id);


--
-- Name: grupos_calendarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_calendarioId_idx" ON public.grupos USING btree (calendario_id);


--
-- Name: grupos_horarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_horarioId_idx" ON public.grupos USING btree (horario_id);


--
-- Name: grupos_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_moduloId_idx" ON public.grupos USING btree (modulo_id);


--
-- Name: grupos_paqueteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_paqueteId_idx" ON public.grupos USING btree (paquete_id);


--
-- Name: grupos_personalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_personalId_idx" ON public.grupos USING btree (personal_id);


--
-- Name: grupos_semestreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_semestreId_idx" ON public.grupos USING btree (semestre_id);


--
-- Name: grupos_turnoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grupos_turnoId_idx" ON public.grupos USING btree (turno_id);


--
-- Name: indicadores_capacidad_capacidadTerminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "indicadores_capacidad_capacidadTerminalId_idx" ON public.indicadores_capacidad USING btree (capacidad_terminal_id);


--
-- Name: indicadores_capacidad_estudiantes_indicadorCapacidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "indicadores_capacidad_estudiantes_indicadorCapacidadId_idx" ON public.indicadores_capacidad_estudiantes USING btree (indicador_capacidad_id);


--
-- Name: indicadores_capacidad_estudiantes_matricdicadorCapacidadId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "indicadores_capacidad_estudiantes_matricdicadorCapacidadId_uidx" ON public.indicadores_capacidad_estudiantes USING btree (matricula_id, indicador_capacidad_id);


--
-- Name: indicadores_capacidad_estudiantes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "indicadores_capacidad_estudiantes_matriculaId_idx" ON public.indicadores_capacidad_estudiantes USING btree (matricula_id);


--
-- Name: matricula_grupos_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_grupos_grupoId_idx" ON public.matricula_grupos USING btree (grupo_id);


--
-- Name: matricula_grupos_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_grupos_matriculaId_idx" ON public.matricula_grupos USING btree (matricula_id);


--
-- Name: matricula_paquetes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_paquetes_matriculaId_idx" ON public.matricula_paquetes USING btree (matricula_id);


--
-- Name: matricula_paquetes_paqueteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_paquetes_paqueteId_idx" ON public.matricula_paquetes USING btree (paquete_id);


--
-- Name: matricula_users_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_users_matriculaId_idx" ON public.matricula_users USING btree (matricula_id);


--
-- Name: matricula_users_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matricula_users_userId_idx" ON public.matricula_users USING btree (user_id);


--
-- Name: matriculas_paqueteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matriculas_paqueteId_idx" ON public.matriculas USING btree (paquete_id);


--
-- Name: matriculas_semestreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matriculas_semestreId_idx" ON public.matriculas USING btree (semestre_id);


--
-- Name: matriculas_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matriculas_userId_idx" ON public.matriculas USING btree (user_id);


--
-- Name: modulo_videos_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulo_videos_moduloId_idx" ON public.modulo_videos USING btree (modulo_id);


--
-- Name: modulo_videos_videoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulo_videos_videoId_idx" ON public.modulo_videos USING btree (video_id);


--
-- Name: modulos_carreraId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulos_carreraId_idx" ON public.modulos USING btree (carrera_id);


--
-- Name: modulos_estudiantes_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulos_estudiantes_grupoId_idx" ON public.modulos_estudiantes USING btree (grupo_id);


--
-- Name: modulos_estudiantes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulos_estudiantes_matriculaId_idx" ON public.modulos_estudiantes USING btree (matricula_id);


--
-- Name: modulos_estudiantes_matriculaId_moduloId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "modulos_estudiantes_matriculaId_moduloId_uidx" ON public.modulos_estudiantes USING btree (matricula_id, modulo_id);


--
-- Name: modulos_estudiantes_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulos_estudiantes_moduloId_idx" ON public.modulos_estudiantes USING btree (modulo_id);


--
-- Name: modulos_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modulos_planId_idx" ON public.modulos USING btree (plan_id);


--
-- Name: paquete_grupos_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paquete_grupos_grupoId_idx" ON public.paquete_grupos USING btree (grupo_id);


--
-- Name: paquete_grupos_paqueteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paquete_grupos_paqueteId_idx" ON public.paquete_grupos USING btree (paquete_id);


--
-- Name: paquete_modulos_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paquete_modulos_moduloId_idx" ON public.paquete_modulos USING btree (modulo_id);


--
-- Name: paquete_modulos_paqueteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paquete_modulos_paqueteId_idx" ON public.paquete_modulos USING btree (paquete_id);


--
-- Name: paquete_modulos_paqueteId_moduloId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "paquete_modulos_paqueteId_moduloId_uidx" ON public.paquete_modulos USING btree (paquete_id, modulo_id);


--
-- Name: personal_especialidades_especialidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personal_especialidades_especialidadId_idx" ON public.personal_especialidades USING btree (especialidad_id);


--
-- Name: personal_especialidades_personalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personal_especialidades_personalId_idx" ON public.personal_especialidades USING btree (personal_id);


--
-- Name: personales_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personales_userId_idx" ON public.personales USING btree (user_id);


--
-- Name: planes_carreraId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "planes_carreraId_idx" ON public.planes USING btree (carrera_id);


--
-- Name: planes_periodoVigenciaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "planes_periodoVigenciaId_idx" ON public.planes USING btree (periodo_vigencia_id);


--
-- Name: posts_slug_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX posts_slug_uidx ON public.posts USING btree (slug);


--
-- Name: posts_tipo_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_tipo_estado_idx ON public.posts USING btree (tipo, estado);


--
-- Name: publicacion_videos_publicacionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "publicacion_videos_publicacionId_idx" ON public.publicacion_videos USING btree (publicacion_id);


--
-- Name: publicacion_videos_videoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "publicacion_videos_videoId_idx" ON public.publicacion_videos USING btree (video_id);


--
-- Name: recordatorios_eventoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recordatorios_eventoId_idx" ON public.recordatorios USING btree (evento_id);


--
-- Name: recordatorios_eventoOcurrenciaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recordatorios_eventoOcurrenciaId_idx" ON public.recordatorios USING btree (evento_ocurrencia_id);


--
-- Name: semestres_anioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "semestres_anioId_idx" ON public.semestres USING btree (anio_id);


--
-- Name: semestres_coordinador1Id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "semestres_coordinador1Id_idx" ON public.semestres USING btree (coordinador_1_id);


--
-- Name: semestres_coordinador2Id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "semestres_coordinador2Id_idx" ON public.semestres USING btree (coordinador_2_id);


--
-- Name: semestres_directorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "semestres_directorId_idx" ON public.semestres USING btree (director_id);


--
-- Name: unidades_didacticas_estudiantes_matricul_unidadDidacticaId_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "unidades_didacticas_estudiantes_matricul_unidadDidacticaId_uidx" ON public.unidades_didacticas_estudiantes USING btree (matricula_id, unidad_didactica_id);


--
-- Name: unidades_didacticas_estudiantes_matriculaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "unidades_didacticas_estudiantes_matriculaId_idx" ON public.unidades_didacticas_estudiantes USING btree (matricula_id);


--
-- Name: unidades_didacticas_estudiantes_unidadDidacticaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "unidades_didacticas_estudiantes_unidadDidacticaId_idx" ON public.unidades_didacticas_estudiantes USING btree (unidad_didactica_id);


--
-- Name: unidades_didacticas_moduloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "unidades_didacticas_moduloId_idx" ON public.unidades_didacticas USING btree (modulo_id);


--
-- Name: users_rolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_rolId_idx" ON public.users USING btree (rol_id);


--
-- Name: act_economicas act_economicas_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.act_economicas
    ADD CONSTRAINT act_economicas_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id) ON DELETE SET NULL;


--
-- Name: act_economicas act_economicas_familia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.act_economicas
    ADD CONSTRAINT act_economicas_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES public.familias(id) ON DELETE SET NULL;


--
-- Name: actividades actividades_aprendizaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_aprendizaje_id_fkey FOREIGN KEY (aprendizaje_id) REFERENCES public.aprendizajes(id) ON DELETE CASCADE;


--
-- Name: actividades actividades_eje_transversal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_eje_transversal_id_fkey FOREIGN KEY (eje_transversal_id) REFERENCES public.ejes_transversales(id) ON DELETE SET NULL;


--
-- Name: actividades actividades_valor_institucional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_valor_institucional_id_fkey FOREIGN KEY (valor_institucional_id) REFERENCES public.valores_institucionales(id) ON DELETE SET NULL;


--
-- Name: aprendizajes aprendizajes_indicador_capacidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprendizajes
    ADD CONSTRAINT aprendizajes_indicador_capacidad_id_fkey FOREIGN KEY (indicador_capacidad_id) REFERENCES public.indicadores_capacidad(id) ON DELETE CASCADE;


--
-- Name: asistencias asistencias_evento_ocurrencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_evento_ocurrencia_id_fkey FOREIGN KEY (evento_ocurrencia_id) REFERENCES public.evento_ocurrencias(id) ON DELETE CASCADE;


--
-- Name: asistencias asistencias_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: asistencias asistencias_registrado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_registrado_por_id_fkey FOREIGN KEY (registrado_por_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: aspectos_evaluacion_estudiantes aspectos_evaluacion_estudiantes_aspecto_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion_estudiantes
    ADD CONSTRAINT aspectos_evaluacion_estudiantes_aspecto_evaluacion_id_fkey FOREIGN KEY (aspecto_evaluacion_id) REFERENCES public.aspectos_evaluacion(id) ON DELETE CASCADE;


--
-- Name: aspectos_evaluacion_estudiantes aspectos_evaluacion_estudiantes_evaluacion_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion_estudiantes
    ADD CONSTRAINT aspectos_evaluacion_estudiantes_evaluacion_estudiante_id_fkey FOREIGN KEY (evaluacion_estudiante_id) REFERENCES public.evaluaciones_estudiantes(id) ON DELETE CASCADE;


--
-- Name: aspectos_evaluacion aspectos_evaluacion_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspectos_evaluacion
    ADD CONSTRAINT aspectos_evaluacion_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;


--
-- Name: calendarios calendarios_anio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_anio_id_fkey FOREIGN KEY (anio_id) REFERENCES public.anios(id) ON DELETE SET NULL;


--
-- Name: calendarios calendarios_horario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_horario_id_fkey FOREIGN KEY (horario_id) REFERENCES public.horarios(id) ON DELETE SET NULL;


--
-- Name: calendarios calendarios_semestre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_semestre_id_fkey FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE SET NULL;


--
-- Name: capacidades_terminales_estudiantes capacidades_terminales_estudiantes_capacidad_terminal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales_estudiantes
    ADD CONSTRAINT capacidades_terminales_estudiantes_capacidad_terminal_id_fkey FOREIGN KEY (capacidad_terminal_id) REFERENCES public.capacidades_terminales(id) ON DELETE CASCADE;


--
-- Name: capacidades_terminales_estudiantes capacidades_terminales_estudiantes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales_estudiantes
    ADD CONSTRAINT capacidades_terminales_estudiantes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: capacidades_terminales capacidades_terminales_unidad_didactica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacidades_terminales
    ADD CONSTRAINT capacidades_terminales_unidad_didactica_id_fkey FOREIGN KEY (unidad_didactica_id) REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE;


--
-- Name: carreras carreras_act_economica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_act_economica_id_fkey FOREIGN KEY (act_economica_id) REFERENCES public.act_economicas(id) ON DELETE SET NULL;


--
-- Name: carreras carreras_tipo_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_tipo_carrera_id_fkey FOREIGN KEY (tipo_carrera_id) REFERENCES public.tipo_carreras(id) ON DELETE SET NULL;


--
-- Name: especialidades especialidades_act_economica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_act_economica_id_fkey FOREIGN KEY (act_economica_id) REFERENCES public.act_economicas(id) ON DELETE SET NULL;


--
-- Name: evaluaciones evaluaciones_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE CASCADE;


--
-- Name: evaluaciones_estudiantes evaluaciones_estudiantes_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones_estudiantes
    ADD CONSTRAINT evaluaciones_estudiantes_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;


--
-- Name: evaluaciones_estudiantes evaluaciones_estudiantes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones_estudiantes
    ADD CONSTRAINT evaluaciones_estudiantes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: evaluaciones evaluaciones_indicador_capacidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_indicador_capacidad_id_fkey FOREIGN KEY (indicador_capacidad_id) REFERENCES public.indicadores_capacidad(id) ON DELETE CASCADE;


--
-- Name: evaluaciones evaluaciones_metodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_metodo_id_fkey FOREIGN KEY (metodo_id) REFERENCES public.metodos(id) ON DELETE SET NULL;


--
-- Name: evaluaciones evaluaciones_tecnica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_tecnica_id_fkey FOREIGN KEY (tecnica_id) REFERENCES public.tecnicas(id) ON DELETE SET NULL;


--
-- Name: evento_ocurrencias evento_ocurrencias_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_ocurrencias
    ADD CONSTRAINT evento_ocurrencias_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON DELETE CASCADE;


--
-- Name: evento_ocurrencias evento_ocurrencias_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_ocurrencias
    ADD CONSTRAINT evento_ocurrencias_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;


--
-- Name: evento_ocurrencias evento_ocurrencias_recurrencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_ocurrencias
    ADD CONSTRAINT evento_ocurrencias_recurrencia_id_fkey FOREIGN KEY (recurrencia_id) REFERENCES public.evento_recurrencias(id) ON DELETE SET NULL;


--
-- Name: evento_recurrencias evento_recurrencias_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_recurrencias
    ADD CONSTRAINT evento_recurrencias_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON DELETE CASCADE;


--
-- Name: evento_recurrencias evento_recurrencias_horario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_recurrencias
    ADD CONSTRAINT evento_recurrencias_horario_id_fkey FOREIGN KEY (horario_id) REFERENCES public.horarios(id) ON DELETE SET NULL;


--
-- Name: evento_recurrencias evento_recurrencias_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_recurrencias
    ADD CONSTRAINT evento_recurrencias_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id) ON DELETE SET NULL;


--
-- Name: evento_relaciones evento_relaciones_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento_relaciones
    ADD CONSTRAINT evento_relaciones_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON DELETE CASCADE;


--
-- Name: eventos eventos_calendario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_calendario_id_fkey FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id) ON DELETE CASCADE;


--
-- Name: eventos eventos_semestre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_semestre_id_fkey FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE SET NULL;


--
-- Name: familias familias_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT familias_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectores(id) ON DELETE SET NULL;


--
-- Name: fases fases_accion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases
    ADD CONSTRAINT fases_accion_id_fkey FOREIGN KEY (accion_id) REFERENCES public.acciones(id) ON DELETE SET NULL;


--
-- Name: fases fases_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases
    ADD CONSTRAINT fases_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE CASCADE;


--
-- Name: fases_metodos fases_metodos_fase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_metodos
    ADD CONSTRAINT fases_metodos_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.fases(id) ON DELETE CASCADE;


--
-- Name: fases_metodos fases_metodos_metodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_metodos
    ADD CONSTRAINT fases_metodos_metodo_id_fkey FOREIGN KEY (metodo_id) REFERENCES public.metodos(id) ON DELETE CASCADE;


--
-- Name: fases_recursos fases_recursos_fase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_recursos
    ADD CONSTRAINT fases_recursos_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.fases(id) ON DELETE CASCADE;


--
-- Name: fases_recursos fases_recursos_recurso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_recursos
    ADD CONSTRAINT fases_recursos_recurso_id_fkey FOREIGN KEY (recurso_id) REFERENCES public.recursos(id) ON DELETE CASCADE;


--
-- Name: fases_tecnicas fases_tecnicas_fase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_tecnicas
    ADD CONSTRAINT fases_tecnicas_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.fases(id) ON DELETE CASCADE;


--
-- Name: fases_tecnicas fases_tecnicas_tecnica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_tecnicas
    ADD CONSTRAINT fases_tecnicas_tecnica_id_fkey FOREIGN KEY (tecnica_id) REFERENCES public.tecnicas(id) ON DELETE CASCADE;


--
-- Name: grupo_modulos grupo_modulos_calendario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_modulos
    ADD CONSTRAINT grupo_modulos_calendario_id_fkey FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id) ON DELETE SET NULL;


--
-- Name: grupo_modulos grupo_modulos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_modulos
    ADD CONSTRAINT grupo_modulos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: grupo_modulos grupo_modulos_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_modulos
    ADD CONSTRAINT grupo_modulos_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: grupos grupos_horario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_horario_id_fkey FOREIGN KEY (horario_id) REFERENCES public.horarios(id) ON DELETE SET NULL;


--
-- Name: grupos grupos_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE SET NULL;


--
-- Name: grupos grupos_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE SET NULL;


--
-- Name: grupos grupos_semestre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_semestre_id_fkey FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE SET NULL;


--
-- Name: grupos grupos_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id) ON DELETE SET NULL;


--
-- Name: indicadores_capacidad indicadores_capacidad_capacidad_terminal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad
    ADD CONSTRAINT indicadores_capacidad_capacidad_terminal_id_fkey FOREIGN KEY (capacidad_terminal_id) REFERENCES public.capacidades_terminales(id) ON DELETE CASCADE;


--
-- Name: indicadores_capacidad_estudiantes indicadores_capacidad_estudiantes_indicador_capacidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad_estudiantes
    ADD CONSTRAINT indicadores_capacidad_estudiantes_indicador_capacidad_id_fkey FOREIGN KEY (indicador_capacidad_id) REFERENCES public.indicadores_capacidad(id) ON DELETE CASCADE;


--
-- Name: indicadores_capacidad_estudiantes indicadores_capacidad_estudiantes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_capacidad_estudiantes
    ADD CONSTRAINT indicadores_capacidad_estudiantes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matricula_grupos matricula_grupos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_grupos
    ADD CONSTRAINT matricula_grupos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: matricula_grupos matricula_grupos_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_grupos
    ADD CONSTRAINT matricula_grupos_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matricula_paquetes matricula_paquetes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_paquetes
    ADD CONSTRAINT matricula_paquetes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matricula_paquetes matricula_paquetes_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_paquetes
    ADD CONSTRAINT matricula_paquetes_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE CASCADE;


--
-- Name: matricula_users matricula_users_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_users
    ADD CONSTRAINT matricula_users_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matricula_users matricula_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_users
    ADD CONSTRAINT matricula_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matriculas matriculas_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE SET NULL;


--
-- Name: matriculas matriculas_semestre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_semestre_id_fkey FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE SET NULL;


--
-- Name: matriculas matriculas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: modulo_videos modulo_videos_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulo_videos
    ADD CONSTRAINT modulo_videos_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE SET NULL;


--
-- Name: modulo_videos modulo_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulo_videos
    ADD CONSTRAINT modulo_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos_youtube(id) ON DELETE SET NULL;


--
-- Name: modulos_estudiantes modulos_estudiantes_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_estudiantes
    ADD CONSTRAINT modulos_estudiantes_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;


--
-- Name: modulos_estudiantes modulos_estudiantes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_estudiantes
    ADD CONSTRAINT modulos_estudiantes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: modulos_estudiantes modulos_estudiantes_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_estudiantes
    ADD CONSTRAINT modulos_estudiantes_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: modulos modulos_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.planes(id) ON DELETE SET NULL;


--
-- Name: paquete_grupos paquete_grupos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_grupos
    ADD CONSTRAINT paquete_grupos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: paquete_grupos paquete_grupos_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_grupos
    ADD CONSTRAINT paquete_grupos_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE CASCADE;


--
-- Name: paquete_modulos paquete_modulos_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_modulos
    ADD CONSTRAINT paquete_modulos_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: paquete_modulos paquete_modulos_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paquete_modulos
    ADD CONSTRAINT paquete_modulos_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE CASCADE;


--
-- Name: personal_especialidades personal_especialidades_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_especialidades
    ADD CONSTRAINT personal_especialidades_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id) ON DELETE CASCADE;


--
-- Name: personal_especialidades personal_especialidades_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_especialidades
    ADD CONSTRAINT personal_especialidades_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: personales personales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personales
    ADD CONSTRAINT personales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: planes planes_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_carrera_id_fkey FOREIGN KEY (carrera_id) REFERENCES public.carreras(id) ON DELETE SET NULL;


--
-- Name: planes planes_periodo_vigencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_periodo_vigencia_id_fkey FOREIGN KEY (periodo_vigencia_id) REFERENCES public.semestres(id) ON DELETE SET NULL;


--
-- Name: publicacion_videos publicacion_videos_publicacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_videos
    ADD CONSTRAINT publicacion_videos_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.publicaciones(id) ON DELETE SET NULL;


--
-- Name: publicacion_videos publicacion_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_videos
    ADD CONSTRAINT publicacion_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos_youtube(id) ON DELETE SET NULL;


--
-- Name: recordatorios recordatorios_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios
    ADD CONSTRAINT recordatorios_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id) ON DELETE SET NULL;


--
-- Name: recordatorios recordatorios_evento_ocurrencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordatorios
    ADD CONSTRAINT recordatorios_evento_ocurrencia_id_fkey FOREIGN KEY (evento_ocurrencia_id) REFERENCES public.evento_ocurrencias(id) ON DELETE SET NULL;


--
-- Name: semestres semestres_anio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_anio_id_fkey FOREIGN KEY (anio_id) REFERENCES public.anios(id) ON DELETE SET NULL;


--
-- Name: semestres semestres_coordinador1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_coordinador1_id_fkey FOREIGN KEY (coordinador_1_id) REFERENCES public.personales(id) ON DELETE SET NULL;


--
-- Name: semestres semestres_coordinador2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_coordinador2_id_fkey FOREIGN KEY (coordinador_2_id) REFERENCES public.personales(id) ON DELETE SET NULL;


--
-- Name: semestres semestres_director_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_director_id_fkey FOREIGN KEY (director_id) REFERENCES public.personales(id) ON DELETE SET NULL;


--
-- Name: unidades_didacticas_estudiantes unidades_didacticas_estudiantes_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas_estudiantes
    ADD CONSTRAINT unidades_didacticas_estudiantes_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: unidades_didacticas_estudiantes unidades_didacticas_estudiantes_unidad_didactica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas_estudiantes
    ADD CONSTRAINT unidades_didacticas_estudiantes_unidad_didactica_id_fkey FOREIGN KEY (unidad_didactica_id) REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE;


--
-- Name: unidades_didacticas unidades_didacticas_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_didacticas
    ADD CONSTRAINT unidades_didacticas_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: users users_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--



--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE acciones; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE acciones_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE act_economicas; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE act_economicas_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE actividades; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE actividades_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE anios; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE anios_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE aprendizajes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE aprendizajes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE asistencias; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE asistencias_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE aspectos_evaluacion; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE aspectos_evaluacion_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE aspectos_evaluacion_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE aspectos_evaluacion_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE calendarios; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE calendarios_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE capacidades_terminales; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE capacidades_terminales_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE capacidades_terminales_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE capacidades_terminales_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE carreras; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE carreras_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE dato_general; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE dato_general_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE ejes_transversales; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE ejes_transversales_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE especialidades; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE especialidades_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE evaluaciones; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE evaluaciones_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE evaluaciones_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE evaluaciones_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE evento_ocurrencias; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE evento_ocurrencias_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE evento_recurrencias; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE evento_recurrencias_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE evento_relaciones; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE evento_relaciones_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE eventos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE eventos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE familias; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE familias_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE fases; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE fases_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE fases_metodos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE fases_metodos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE fases_recursos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE fases_recursos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE fases_tecnicas; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE fases_tecnicas_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE grupo_modulos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE grupo_modulos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE grupos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE grupos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE horarios; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE horarios_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE indicadores_capacidad; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE indicadores_capacidad_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE indicadores_capacidad_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE indicadores_capacidad_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE matricula_grupos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE matricula_grupos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE matricula_paquetes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE matricula_paquetes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE matricula_users; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE matricula_users_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE matriculas; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE matriculas_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE metodos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE metodos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE modulo_videos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE modulo_videos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE modulos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE modulos_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE modulos_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE modulos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE paquete_grupos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE paquete_grupos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE paquete_modulos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE paquete_modulos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE paquetes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE paquetes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE personal_especialidades; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE personal_especialidades_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE personales; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE personales_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE planes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE planes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE posts; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE posts_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE publicacion_videos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE publicacion_videos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE publicaciones; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE publicaciones_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE recordatorios; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE recordatorios_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE recursos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE recursos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE sectores; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE sectores_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE semestres; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE semestres_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE tecnicas; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE tecnicas_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE tipo_carreras; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE tipo_carreras_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE turnos; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE turnos_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE unidades_didacticas; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE unidades_didacticas_estudiantes; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE unidades_didacticas_estudiantes_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE unidades_didacticas_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE valores_institucionales; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE valores_institucionales_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: TABLE videos_youtube; Type: ACL; Schema: public; Owner: -
--



--
-- Name: SEQUENCE videos_youtube_id_seq; Type: ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


