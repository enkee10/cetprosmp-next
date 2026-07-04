-- Archivo SQL limpio para Firebase SQL Connect / Cloud SQL PostgreSQL
-- Origen: migracion_para_firebase.sql
-- Objetivo: conservar solo tablas de contenido del proyecto educativo y quitar tablas internas de Strapi.
-- Nota: se eliminaron tablas admin_*, strapi_*, up_*, upload_* e i18n_*.
-- Nota: en la tabla users se eliminaron password, reset_password_token y confirmation_token.

-- Archivo limpiado para importación en Google Cloud SQL / Firebase SQL Connect
-- Origen: migracion_para_firebase.sql
-- Cambios aplicados:
-- 1) Se eliminó SET transaction_timeout = 0; para compatibilidad con versiones PostgreSQL anteriores a 17.
-- 2) Se eliminaron sentencias ALTER ... OWNER TO postgres; para evitar errores de permisos/rol inexistente.
-- 3) Se conservaron tablas, secuencias, datos COPY, constraints, índices y relaciones.
-- Nota: este archivo sigue conservando tablas internas de Strapi. Úsalo como importación completa/base temporal.

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: act-economicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."act-economicas" (
    id integer NOT NULL,
    document_id character varying(255),
    titulo character varying(255),
    descripcion text,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: act-economicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."act-economicas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: act-economicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."act-economicas_id_seq" OWNED BY public."act-economicas".id;


--
-- Name: act_economicas_especialidad_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.act_economicas_especialidad_lnk (
    id integer NOT NULL,
    act_economica_id integer,
    especialidad_id integer
);



--
-- Name: act_economicas_especialidad_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.act_economicas_especialidad_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: act_economicas_especialidad_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.act_economicas_especialidad_lnk_id_seq OWNED BY public.act_economicas_especialidad_lnk.id;


--
-- Name: act_economicas_familia_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.act_economicas_familia_lnk (
    id integer NOT NULL,
    act_economica_id integer,
    familia_id integer
);



--
-- Name: act_economicas_familia_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.act_economicas_familia_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: act_economicas_familia_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.act_economicas_familia_lnk_id_seq OWNED BY public.act_economicas_familia_lnk.id;


--
-- Name: calendarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendarios (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    descripcion text,
    fecha_ini date,
    fecha_fin date,
    tipo character varying(255),
    archivado boolean
);



--
-- Name: calendarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: calendarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendarios_id_seq OWNED BY public.calendarios.id;


--
-- Name: calendarios_semestre_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendarios_semestre_lnk (
    id integer NOT NULL,
    calendario_id integer,
    semestre_id integer
);



--
-- Name: calendarios_semestre_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendarios_semestre_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: calendarios_semestre_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendarios_semestre_lnk_id_seq OWNED BY public.calendarios_semestre_lnk.id;


--
-- Name: carreras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carreras (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    codigo character varying(255),
    descripcion text,
    duracion integer,
    creditos integer,
    nivel character varying(255),
    titulo_comercial character varying(255),
    slug character varying(255),
    descripcion_2 jsonb
);



--
-- Name: carreras_act_economica_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carreras_act_economica_lnk (
    id integer NOT NULL,
    carrera_id integer,
    act_economica_id integer
);



--
-- Name: carreras_act_economica_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carreras_act_economica_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: carreras_act_economica_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carreras_act_economica_lnk_id_seq OWNED BY public.carreras_act_economica_lnk.id;


--
-- Name: carreras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carreras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: carreras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carreras_id_seq OWNED BY public.carreras.id;


--
-- Name: components_video_youtubes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.components_video_youtubes (
    id integer NOT NULL,
    url character varying(255)
);



--
-- Name: components_video_youtubes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.components_video_youtubes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: components_video_youtubes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.components_video_youtubes_id_seq OWNED BY public.components_video_youtubes.id;


--
-- Name: dato_general; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dato_general (
    id integer NOT NULL,
    document_id character varying(255),
    nombre_institucion character varying(255),
    direccion character varying(255),
    telefono_1 character varying(255),
    telefono_2 character varying(255),
    correo character varying(255),
    pagina_web character varying(255),
    facebook character varying(255),
    ruc character varying(255),
    rd character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    youtube character varying(255),
    twitter character varying(255),
    instagram character varying(255),
    tiktok character varying(255)
);



--
-- Name: dato_general_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dato_general_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: dato_general_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dato_general_id_seq OWNED BY public.dato_general.id;


--
-- Name: especialidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.especialidades (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    titulo_comercial character varying(255),
    descripcion text,
    descripcion_2 jsonb,
    slug character varying(255)
);



--
-- Name: especialidades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.especialidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: especialidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.especialidades_id_seq OWNED BY public.especialidades.id;


--
-- Name: familias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.familias (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    descripcion text
);



--
-- Name: familias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.familias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: familias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.familias_id_seq OWNED BY public.familias.id;


--
-- Name: familias_sector_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.familias_sector_lnk (
    id integer NOT NULL,
    familia_id integer,
    sector_id integer
);



--
-- Name: familias_sector_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.familias_sector_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: familias_sector_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.familias_sector_lnk_id_seq OWNED BY public.familias_sector_lnk.id;


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    turno character varying(255),
    descripcion character varying(255),
    nombre_display character varying(255),
    archivado boolean
);



--
-- Name: grupos_calendario_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_calendario_lnk (
    id integer NOT NULL,
    grupo_id integer,
    calendario_id integer
);



--
-- Name: grupos_calendario_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_calendario_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grupos_calendario_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_calendario_lnk_id_seq OWNED BY public.grupos_calendario_lnk.id;


--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: grupos_modulo_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_modulo_lnk (
    id integer NOT NULL,
    grupo_id integer,
    modulo_id integer
);



--
-- Name: grupos_modulo_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_modulo_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grupos_modulo_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_modulo_lnk_id_seq OWNED BY public.grupos_modulo_lnk.id;


--
-- Name: grupos_personal_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos_personal_lnk (
    id integer NOT NULL,
    grupo_id integer,
    personal_id integer
);



--
-- Name: grupos_personal_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_personal_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: grupos_personal_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_personal_lnk_id_seq OWNED BY public.grupos_personal_lnk.id;


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matriculas (
    id integer NOT NULL,
    document_id character varying(255),
    recibo character varying(255),
    fecha date,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    archivado boolean
);



--
-- Name: matriculas_grupo_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matriculas_grupo_lnk (
    id integer NOT NULL,
    matricula_id integer,
    grupo_id integer
);



--
-- Name: matriculas_grupo_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matriculas_grupo_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: matriculas_grupo_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matriculas_grupo_lnk_id_seq OWNED BY public.matriculas_grupo_lnk.id;


--
-- Name: matriculas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matriculas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: matriculas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matriculas_id_seq OWNED BY public.matriculas.id;


--
-- Name: matriculas_paquete_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matriculas_paquete_lnk (
    id integer NOT NULL,
    matricula_id integer,
    paquete_id integer
);



--
-- Name: matriculas_paquete_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matriculas_paquete_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: matriculas_paquete_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matriculas_paquete_lnk_id_seq OWNED BY public.matriculas_paquete_lnk.id;


--
-- Name: matriculas_users_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matriculas_users_lnk (
    id integer NOT NULL,
    matricula_id integer,
    user_id integer
);



--
-- Name: matriculas_users_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matriculas_users_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: matriculas_users_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matriculas_users_lnk_id_seq OWNED BY public.matriculas_users_lnk.id;


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modulos (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    titulo_comercial character varying(255),
    orden integer,
    descripcion text,
    horas integer,
    creditos integer,
    metas integer,
    activo boolean,
    slug character varying(255),
    descripcion_2 jsonb
);



--
-- Name: modulos_carrera_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modulos_carrera_lnk (
    id integer NOT NULL,
    modulo_id integer,
    carrera_id integer
);



--
-- Name: modulos_carrera_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modulos_carrera_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: modulos_carrera_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modulos_carrera_lnk_id_seq OWNED BY public.modulos_carrera_lnk.id;


--
-- Name: modulos_cmps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modulos_cmps (
    id integer NOT NULL,
    entity_id integer,
    cmp_id integer,
    component_type character varying(255),
    field character varying(255),
    "order" double precision
);



--
-- Name: modulos_cmps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modulos_cmps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: modulos_cmps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modulos_cmps_id_seq OWNED BY public.modulos_cmps.id;


--
-- Name: modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modulos_id_seq OWNED BY public.modulos.id;


--
-- Name: paquetes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paquetes (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    descripcion text,
    archivado boolean
);



--
-- Name: paquetes_grupos_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paquetes_grupos_lnk (
    id integer NOT NULL,
    paquete_id integer,
    grupo_id integer,
    grupo_ord double precision
);



--
-- Name: paquetes_grupos_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paquetes_grupos_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: paquetes_grupos_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paquetes_grupos_lnk_id_seq OWNED BY public.paquetes_grupos_lnk.id;


--
-- Name: paquetes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paquetes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: paquetes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paquetes_id_seq OWNED BY public.paquetes.id;


--
-- Name: personales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personales (
    id integer NOT NULL,
    document_id character varying(255),
    memo text,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    display_name character varying(255)
);



--
-- Name: personales_especialidad_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personales_especialidad_lnk (
    id integer NOT NULL,
    personal_id integer,
    especialidad_id integer,
    especialidad_ord double precision
);



--
-- Name: personales_especialidad_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personales_especialidad_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: personales_especialidad_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personales_especialidad_lnk_id_seq OWNED BY public.personales_especialidad_lnk.id;


--
-- Name: personales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: personales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personales_id_seq OWNED BY public.personales.id;


--
-- Name: personales_user_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personales_user_lnk (
    id integer NOT NULL,
    personal_id integer,
    user_id integer
);



--
-- Name: personales_user_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personales_user_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: personales_user_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personales_user_lnk_id_seq OWNED BY public.personales_user_lnk.id;


--
-- Name: publicaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publicaciones (
    id integer NOT NULL,
    document_id character varying(255),
    titulo character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    slug character varying(255),
    tipo character varying(255),
    descripcion_corta text,
    fecha_publicacion date,
    fecha_evento_inicio timestamp(6) without time zone,
    fecha_evento_fin timestamp(6) without time zone,
    ubicacion character varying(255),
    destacado boolean,
    contenido_2 text,
    contenido_1 jsonb
);



--
-- Name: publicaciones_cmps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publicaciones_cmps (
    id integer NOT NULL,
    entity_id integer,
    cmp_id integer,
    component_type character varying(255),
    field character varying(255),
    "order" double precision
);



--
-- Name: publicaciones_cmps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publicaciones_cmps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: publicaciones_cmps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publicaciones_cmps_id_seq OWNED BY public.publicaciones_cmps.id;


--
-- Name: publicaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publicaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: publicaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publicaciones_id_seq OWNED BY public.publicaciones.id;


--
-- Name: sectores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sectores (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    descripcion text
);



--
-- Name: sectores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sectores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: sectores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sectores_id_seq OWNED BY public.sectores.id;


--
-- Name: semestres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semestres (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    titulo character varying(255),
    descripcion text,
    archivado boolean
);



--
-- Name: semestres_coordinador_1_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semestres_coordinador_1_lnk (
    id integer NOT NULL,
    semestre_id integer,
    personal_id integer
);



--
-- Name: semestres_coordinador_1_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semestres_coordinador_1_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: semestres_coordinador_1_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semestres_coordinador_1_lnk_id_seq OWNED BY public.semestres_coordinador_1_lnk.id;


--
-- Name: semestres_coordinador_2_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semestres_coordinador_2_lnk (
    id integer NOT NULL,
    semestre_id integer,
    personal_id integer
);



--
-- Name: semestres_coordinador_2_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semestres_coordinador_2_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: semestres_coordinador_2_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semestres_coordinador_2_lnk_id_seq OWNED BY public.semestres_coordinador_2_lnk.id;


--
-- Name: semestres_director_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semestres_director_lnk (
    id integer NOT NULL,
    semestre_id integer,
    personal_id integer
);



--
-- Name: semestres_director_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semestres_director_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: semestres_director_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semestres_director_lnk_id_seq OWNED BY public.semestres_director_lnk.id;


--
-- Name: semestres_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semestres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: semestres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semestres_id_seq OWNED BY public.semestres.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    document_id character varying(255),
    dni character varying(255),
    telefono character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    username character varying(255),
    email character varying(255),
    provider character varying(255),
    confirmed boolean,
    blocked boolean,
    direccion text,
    fecha_nacimiento date,
    celular character varying(255),
    distrito character varying(255),
    tipo_documento character varying(255),
    sexo character varying(255),
    estado_civil character varying(255),
    instruccion character varying(255),
    apellido_materno character varying(255),
    apellido_paterno character varying(255),
    nombre character varying(255),
    apellidos character varying(255),
    avatar character varying(255)
);



--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: act-economicas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."act-economicas" ALTER COLUMN id SET DEFAULT nextval('public."act-economicas_id_seq"'::regclass);


--
-- Name: act_economicas_especialidad_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_especialidad_lnk ALTER COLUMN id SET DEFAULT nextval('public.act_economicas_especialidad_lnk_id_seq'::regclass);


--
-- Name: act_economicas_familia_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_familia_lnk ALTER COLUMN id SET DEFAULT nextval('public.act_economicas_familia_lnk_id_seq'::regclass);


--
-- Name: calendarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios ALTER COLUMN id SET DEFAULT nextval('public.calendarios_id_seq'::regclass);


--
-- Name: calendarios_semestre_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios_semestre_lnk ALTER COLUMN id SET DEFAULT nextval('public.calendarios_semestre_lnk_id_seq'::regclass);


--
-- Name: carreras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras ALTER COLUMN id SET DEFAULT nextval('public.carreras_id_seq'::regclass);


--
-- Name: carreras_act_economica_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras_act_economica_lnk ALTER COLUMN id SET DEFAULT nextval('public.carreras_act_economica_lnk_id_seq'::regclass);


--
-- Name: components_video_youtubes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.components_video_youtubes ALTER COLUMN id SET DEFAULT nextval('public.components_video_youtubes_id_seq'::regclass);


--
-- Name: dato_general id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dato_general ALTER COLUMN id SET DEFAULT nextval('public.dato_general_id_seq'::regclass);


--
-- Name: especialidades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades ALTER COLUMN id SET DEFAULT nextval('public.especialidades_id_seq'::regclass);


--
-- Name: familias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias ALTER COLUMN id SET DEFAULT nextval('public.familias_id_seq'::regclass);


--
-- Name: familias_sector_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias_sector_lnk ALTER COLUMN id SET DEFAULT nextval('public.familias_sector_lnk_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: grupos_calendario_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_calendario_lnk ALTER COLUMN id SET DEFAULT nextval('public.grupos_calendario_lnk_id_seq'::regclass);


--
-- Name: grupos_modulo_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_modulo_lnk ALTER COLUMN id SET DEFAULT nextval('public.grupos_modulo_lnk_id_seq'::regclass);


--
-- Name: grupos_personal_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_personal_lnk ALTER COLUMN id SET DEFAULT nextval('public.grupos_personal_lnk_id_seq'::regclass);


--
-- Name: matriculas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas ALTER COLUMN id SET DEFAULT nextval('public.matriculas_id_seq'::regclass);


--
-- Name: matriculas_grupo_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_grupo_lnk ALTER COLUMN id SET DEFAULT nextval('public.matriculas_grupo_lnk_id_seq'::regclass);


--
-- Name: matriculas_paquete_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_paquete_lnk ALTER COLUMN id SET DEFAULT nextval('public.matriculas_paquete_lnk_id_seq'::regclass);


--
-- Name: matriculas_users_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_users_lnk ALTER COLUMN id SET DEFAULT nextval('public.matriculas_users_lnk_id_seq'::regclass);


--
-- Name: modulos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos ALTER COLUMN id SET DEFAULT nextval('public.modulos_id_seq'::regclass);


--
-- Name: modulos_carrera_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_carrera_lnk ALTER COLUMN id SET DEFAULT nextval('public.modulos_carrera_lnk_id_seq'::regclass);


--
-- Name: modulos_cmps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_cmps ALTER COLUMN id SET DEFAULT nextval('public.modulos_cmps_id_seq'::regclass);


--
-- Name: paquetes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes ALTER COLUMN id SET DEFAULT nextval('public.paquetes_id_seq'::regclass);


--
-- Name: paquetes_grupos_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes_grupos_lnk ALTER COLUMN id SET DEFAULT nextval('public.paquetes_grupos_lnk_id_seq'::regclass);


--
-- Name: personales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales ALTER COLUMN id SET DEFAULT nextval('public.personales_id_seq'::regclass);


--
-- Name: personales_especialidad_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_especialidad_lnk ALTER COLUMN id SET DEFAULT nextval('public.personales_especialidad_lnk_id_seq'::regclass);


--
-- Name: personales_user_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_user_lnk ALTER COLUMN id SET DEFAULT nextval('public.personales_user_lnk_id_seq'::regclass);


--
-- Name: publicaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones ALTER COLUMN id SET DEFAULT nextval('public.publicaciones_id_seq'::regclass);


--
-- Name: publicaciones_cmps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones_cmps ALTER COLUMN id SET DEFAULT nextval('public.publicaciones_cmps_id_seq'::regclass);


--
-- Name: sectores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sectores ALTER COLUMN id SET DEFAULT nextval('public.sectores_id_seq'::regclass);


--
-- Name: semestres id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres ALTER COLUMN id SET DEFAULT nextval('public.semestres_id_seq'::regclass);


--
-- Name: semestres_coordinador_1_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_1_lnk ALTER COLUMN id SET DEFAULT nextval('public.semestres_coordinador_1_lnk_id_seq'::regclass);


--
-- Name: semestres_coordinador_2_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_2_lnk ALTER COLUMN id SET DEFAULT nextval('public.semestres_coordinador_2_lnk_id_seq'::regclass);


--
-- Name: semestres_director_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_director_lnk ALTER COLUMN id SET DEFAULT nextval('public.semestres_director_lnk_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: act-economicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."act-economicas_id_seq"', 9, true);


--
-- Name: act_economicas_especialidad_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.act_economicas_especialidad_lnk_id_seq', 9, true);


--
-- Name: act_economicas_familia_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.act_economicas_familia_lnk_id_seq', 9, true);


--
-- Name: calendarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendarios_id_seq', 9, true);


--
-- Name: calendarios_semestre_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendarios_semestre_lnk_id_seq', 10, true);


--
-- Name: carreras_act_economica_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carreras_act_economica_lnk_id_seq', 15, true);


--
-- Name: carreras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carreras_id_seq', 15, true);


--
-- Name: components_video_youtubes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.components_video_youtubes_id_seq', 2, true);


--
-- Name: dato_general_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dato_general_id_seq', 1, true);


--
-- Name: especialidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.especialidades_id_seq', 8, true);


--
-- Name: familias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.familias_id_seq', 7, true);


--
-- Name: familias_sector_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.familias_sector_lnk_id_seq', 7, true);


--
-- Name: grupos_calendario_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_calendario_lnk_id_seq', 33, true);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_id_seq', 22, true);


--
-- Name: grupos_modulo_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_modulo_lnk_id_seq', 38, true);


--
-- Name: grupos_personal_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_personal_lnk_id_seq', 18, true);


--
-- Name: matriculas_grupo_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matriculas_grupo_lnk_id_seq', 1, true);


--
-- Name: matriculas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matriculas_id_seq', 2, true);


--
-- Name: matriculas_paquete_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matriculas_paquete_lnk_id_seq', 1, true);


--
-- Name: matriculas_users_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matriculas_users_lnk_id_seq', 2, true);


--
-- Name: modulos_carrera_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modulos_carrera_lnk_id_seq', 34, true);


--
-- Name: modulos_cmps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modulos_cmps_id_seq', 24, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modulos_id_seq', 32, true);


--
-- Name: paquetes_grupos_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paquetes_grupos_lnk_id_seq', 54, true);


--
-- Name: paquetes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paquetes_id_seq', 14, true);


--
-- Name: personales_especialidad_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personales_especialidad_lnk_id_seq', 14, true);


--
-- Name: personales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personales_id_seq', 4, true);


--
-- Name: personales_user_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personales_user_lnk_id_seq', 11, true);


--
-- Name: publicaciones_cmps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publicaciones_cmps_id_seq', 1, false);


--
-- Name: publicaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publicaciones_id_seq', 23, true);


--
-- Name: sectores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sectores_id_seq', 4, true);


--
-- Name: semestres_coordinador_1_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semestres_coordinador_1_lnk_id_seq', 2, true);


--
-- Name: semestres_coordinador_2_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semestres_coordinador_2_lnk_id_seq', 2, true);


--
-- Name: semestres_director_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semestres_director_lnk_id_seq', 2, true);


--
-- Name: semestres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semestres_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: act-economicas act-economicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."act-economicas"
    ADD CONSTRAINT "act-economicas_pkey" PRIMARY KEY (id);


--
-- Name: act_economicas_especialidad_lnk act_economicas_especialidad_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_especialidad_lnk
    ADD CONSTRAINT act_economicas_especialidad_lnk_pkey PRIMARY KEY (id);


--
-- Name: act_economicas_especialidad_lnk act_economicas_especialidad_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_especialidad_lnk
    ADD CONSTRAINT act_economicas_especialidad_lnk_uq UNIQUE (act_economica_id, especialidad_id);


--
-- Name: act_economicas_familia_lnk act_economicas_familia_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_familia_lnk
    ADD CONSTRAINT act_economicas_familia_lnk_pkey PRIMARY KEY (id);


--
-- Name: act_economicas_familia_lnk act_economicas_familia_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_familia_lnk
    ADD CONSTRAINT act_economicas_familia_lnk_uq UNIQUE (act_economica_id, familia_id);


--
-- Name: calendarios calendarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_pkey PRIMARY KEY (id);


--
-- Name: calendarios_semestre_lnk calendarios_semestre_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios_semestre_lnk
    ADD CONSTRAINT calendarios_semestre_lnk_pkey PRIMARY KEY (id);


--
-- Name: calendarios_semestre_lnk calendarios_semestre_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios_semestre_lnk
    ADD CONSTRAINT calendarios_semestre_lnk_uq UNIQUE (calendario_id, semestre_id);


--
-- Name: carreras_act_economica_lnk carreras_act_economica_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras_act_economica_lnk
    ADD CONSTRAINT carreras_act_economica_lnk_pkey PRIMARY KEY (id);


--
-- Name: carreras_act_economica_lnk carreras_act_economica_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras_act_economica_lnk
    ADD CONSTRAINT carreras_act_economica_lnk_uq UNIQUE (carrera_id, act_economica_id);


--
-- Name: carreras carreras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_pkey PRIMARY KEY (id);


--
-- Name: components_video_youtubes components_video_youtubes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.components_video_youtubes
    ADD CONSTRAINT components_video_youtubes_pkey PRIMARY KEY (id);


--
-- Name: dato_general dato_general_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dato_general
    ADD CONSTRAINT dato_general_pkey PRIMARY KEY (id);


--
-- Name: especialidades especialidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_pkey PRIMARY KEY (id);


--
-- Name: familias familias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT familias_pkey PRIMARY KEY (id);


--
-- Name: familias_sector_lnk familias_sector_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias_sector_lnk
    ADD CONSTRAINT familias_sector_lnk_pkey PRIMARY KEY (id);


--
-- Name: familias_sector_lnk familias_sector_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias_sector_lnk
    ADD CONSTRAINT familias_sector_lnk_uq UNIQUE (familia_id, sector_id);


--
-- Name: grupos_calendario_lnk grupos_calendario_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_calendario_lnk
    ADD CONSTRAINT grupos_calendario_lnk_pkey PRIMARY KEY (id);


--
-- Name: grupos_calendario_lnk grupos_calendario_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_calendario_lnk
    ADD CONSTRAINT grupos_calendario_lnk_uq UNIQUE (grupo_id, calendario_id);


--
-- Name: grupos_modulo_lnk grupos_modulo_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_modulo_lnk
    ADD CONSTRAINT grupos_modulo_lnk_pkey PRIMARY KEY (id);


--
-- Name: grupos_modulo_lnk grupos_modulo_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_modulo_lnk
    ADD CONSTRAINT grupos_modulo_lnk_uq UNIQUE (grupo_id, modulo_id);


--
-- Name: grupos_personal_lnk grupos_personal_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_personal_lnk
    ADD CONSTRAINT grupos_personal_lnk_pkey PRIMARY KEY (id);


--
-- Name: grupos_personal_lnk grupos_personal_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_personal_lnk
    ADD CONSTRAINT grupos_personal_lnk_uq UNIQUE (grupo_id, personal_id);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: matriculas_grupo_lnk matriculas_grupo_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_grupo_lnk
    ADD CONSTRAINT matriculas_grupo_lnk_pkey PRIMARY KEY (id);


--
-- Name: matriculas_grupo_lnk matriculas_grupo_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_grupo_lnk
    ADD CONSTRAINT matriculas_grupo_lnk_uq UNIQUE (matricula_id, grupo_id);


--
-- Name: matriculas_paquete_lnk matriculas_paquete_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_paquete_lnk
    ADD CONSTRAINT matriculas_paquete_lnk_pkey PRIMARY KEY (id);


--
-- Name: matriculas_paquete_lnk matriculas_paquete_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_paquete_lnk
    ADD CONSTRAINT matriculas_paquete_lnk_uq UNIQUE (matricula_id, paquete_id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: matriculas_users_lnk matriculas_users_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_users_lnk
    ADD CONSTRAINT matriculas_users_lnk_pkey PRIMARY KEY (id);


--
-- Name: matriculas_users_lnk matriculas_users_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_users_lnk
    ADD CONSTRAINT matriculas_users_lnk_uq UNIQUE (matricula_id, user_id);


--
-- Name: modulos_carrera_lnk modulos_carrera_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_carrera_lnk
    ADD CONSTRAINT modulos_carrera_lnk_pkey PRIMARY KEY (id);


--
-- Name: modulos_carrera_lnk modulos_carrera_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_carrera_lnk
    ADD CONSTRAINT modulos_carrera_lnk_uq UNIQUE (modulo_id, carrera_id);


--
-- Name: modulos_cmps modulos_cmps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_cmps
    ADD CONSTRAINT modulos_cmps_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: modulos_cmps modulos_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_cmps
    ADD CONSTRAINT modulos_uq UNIQUE (entity_id, cmp_id, field, component_type);


--
-- Name: paquetes_grupos_lnk paquetes_grupos_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes_grupos_lnk
    ADD CONSTRAINT paquetes_grupos_lnk_pkey PRIMARY KEY (id);


--
-- Name: paquetes_grupos_lnk paquetes_grupos_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes_grupos_lnk
    ADD CONSTRAINT paquetes_grupos_lnk_uq UNIQUE (paquete_id, grupo_id);


--
-- Name: paquetes paquetes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_pkey PRIMARY KEY (id);


--
-- Name: personales_especialidad_lnk personales_especialidad_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_especialidad_lnk
    ADD CONSTRAINT personales_especialidad_lnk_pkey PRIMARY KEY (id);


--
-- Name: personales_especialidad_lnk personales_especialidad_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_especialidad_lnk
    ADD CONSTRAINT personales_especialidad_lnk_uq UNIQUE (personal_id, especialidad_id);


--
-- Name: personales personales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales
    ADD CONSTRAINT personales_pkey PRIMARY KEY (id);


--
-- Name: personales_user_lnk personales_user_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_user_lnk
    ADD CONSTRAINT personales_user_lnk_pkey PRIMARY KEY (id);


--
-- Name: personales_user_lnk personales_user_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_user_lnk
    ADD CONSTRAINT personales_user_lnk_uq UNIQUE (personal_id, user_id);


--
-- Name: publicaciones_cmps publicaciones_cmps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones_cmps
    ADD CONSTRAINT publicaciones_cmps_pkey PRIMARY KEY (id);


--
-- Name: publicaciones publicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones
    ADD CONSTRAINT publicaciones_pkey PRIMARY KEY (id);


--
-- Name: publicaciones_cmps publicaciones_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones_cmps
    ADD CONSTRAINT publicaciones_uq UNIQUE (entity_id, cmp_id, field, component_type);


--
-- Name: sectores sectores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_pkey PRIMARY KEY (id);


--
-- Name: semestres_coordinador_1_lnk semestres_coordinador_1_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_1_lnk
    ADD CONSTRAINT semestres_coordinador_1_lnk_pkey PRIMARY KEY (id);


--
-- Name: semestres_coordinador_1_lnk semestres_coordinador_1_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_1_lnk
    ADD CONSTRAINT semestres_coordinador_1_lnk_uq UNIQUE (semestre_id, personal_id);


--
-- Name: semestres_coordinador_2_lnk semestres_coordinador_2_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_2_lnk
    ADD CONSTRAINT semestres_coordinador_2_lnk_pkey PRIMARY KEY (id);


--
-- Name: semestres_coordinador_2_lnk semestres_coordinador_2_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_2_lnk
    ADD CONSTRAINT semestres_coordinador_2_lnk_uq UNIQUE (semestre_id, personal_id);


--
-- Name: semestres_director_lnk semestres_director_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_director_lnk
    ADD CONSTRAINT semestres_director_lnk_pkey PRIMARY KEY (id);


--
-- Name: semestres_director_lnk semestres_director_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_director_lnk
    ADD CONSTRAINT semestres_director_lnk_uq UNIQUE (semestre_id, personal_id);


--
-- Name: semestres semestres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: act-economicas_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "act-economicas_created_by_id_fk" ON public."act-economicas" USING btree (created_by_id);


--
-- Name: act-economicas_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "act-economicas_documents_idx" ON public."act-economicas" USING btree (document_id, locale, published_at);


--
-- Name: act-economicas_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "act-economicas_updated_by_id_fk" ON public."act-economicas" USING btree (updated_by_id);


--
-- Name: act_economicas_especialidad_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX act_economicas_especialidad_lnk_fk ON public.act_economicas_especialidad_lnk USING btree (act_economica_id);


--
-- Name: act_economicas_especialidad_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX act_economicas_especialidad_lnk_ifk ON public.act_economicas_especialidad_lnk USING btree (especialidad_id);


--
-- Name: act_economicas_familia_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX act_economicas_familia_lnk_fk ON public.act_economicas_familia_lnk USING btree (act_economica_id);


--
-- Name: act_economicas_familia_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX act_economicas_familia_lnk_ifk ON public.act_economicas_familia_lnk USING btree (familia_id);


--
-- Name: calendarios_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendarios_created_by_id_fk ON public.calendarios USING btree (created_by_id);


--
-- Name: calendarios_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendarios_documents_idx ON public.calendarios USING btree (document_id, locale, published_at);


--
-- Name: calendarios_semestre_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendarios_semestre_lnk_fk ON public.calendarios_semestre_lnk USING btree (calendario_id);


--
-- Name: calendarios_semestre_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendarios_semestre_lnk_ifk ON public.calendarios_semestre_lnk USING btree (semestre_id);


--
-- Name: calendarios_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendarios_updated_by_id_fk ON public.calendarios USING btree (updated_by_id);


--
-- Name: carreras_act_economica_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carreras_act_economica_lnk_fk ON public.carreras_act_economica_lnk USING btree (carrera_id);


--
-- Name: carreras_act_economica_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carreras_act_economica_lnk_ifk ON public.carreras_act_economica_lnk USING btree (act_economica_id);


--
-- Name: carreras_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carreras_created_by_id_fk ON public.carreras USING btree (created_by_id);


--
-- Name: carreras_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carreras_documents_idx ON public.carreras USING btree (document_id, locale, published_at);


--
-- Name: carreras_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carreras_updated_by_id_fk ON public.carreras USING btree (updated_by_id);


--
-- Name: dato_general_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dato_general_created_by_id_fk ON public.dato_general USING btree (created_by_id);


--
-- Name: dato_general_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dato_general_documents_idx ON public.dato_general USING btree (document_id, locale, published_at);


--
-- Name: dato_general_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dato_general_updated_by_id_fk ON public.dato_general USING btree (updated_by_id);


--
-- Name: especialidades_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX especialidades_created_by_id_fk ON public.especialidades USING btree (created_by_id);


--
-- Name: especialidades_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX especialidades_documents_idx ON public.especialidades USING btree (document_id, locale, published_at);


--
-- Name: especialidades_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX especialidades_updated_by_id_fk ON public.especialidades USING btree (updated_by_id);


--
-- Name: familias_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX familias_created_by_id_fk ON public.familias USING btree (created_by_id);


--
-- Name: familias_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX familias_documents_idx ON public.familias USING btree (document_id, locale, published_at);


--
-- Name: familias_sector_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX familias_sector_lnk_fk ON public.familias_sector_lnk USING btree (familia_id);


--
-- Name: familias_sector_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX familias_sector_lnk_ifk ON public.familias_sector_lnk USING btree (sector_id);


--
-- Name: familias_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX familias_updated_by_id_fk ON public.familias USING btree (updated_by_id);


--
-- Name: grupos_calendario_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_calendario_lnk_fk ON public.grupos_calendario_lnk USING btree (grupo_id);


--
-- Name: grupos_calendario_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_calendario_lnk_ifk ON public.grupos_calendario_lnk USING btree (calendario_id);


--
-- Name: grupos_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_created_by_id_fk ON public.grupos USING btree (created_by_id);


--
-- Name: grupos_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_documents_idx ON public.grupos USING btree (document_id, locale, published_at);


--
-- Name: grupos_modulo_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_modulo_lnk_fk ON public.grupos_modulo_lnk USING btree (grupo_id);


--
-- Name: grupos_modulo_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_modulo_lnk_ifk ON public.grupos_modulo_lnk USING btree (modulo_id);


--
-- Name: grupos_personal_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_personal_lnk_fk ON public.grupos_personal_lnk USING btree (grupo_id);


--
-- Name: grupos_personal_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_personal_lnk_ifk ON public.grupos_personal_lnk USING btree (personal_id);


--
-- Name: grupos_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grupos_updated_by_id_fk ON public.grupos USING btree (updated_by_id);


--
-- Name: matriculas_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_created_by_id_fk ON public.matriculas USING btree (created_by_id);


--
-- Name: matriculas_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_documents_idx ON public.matriculas USING btree (document_id, locale, published_at);


--
-- Name: matriculas_grupo_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_grupo_lnk_fk ON public.matriculas_grupo_lnk USING btree (matricula_id);


--
-- Name: matriculas_grupo_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_grupo_lnk_ifk ON public.matriculas_grupo_lnk USING btree (grupo_id);


--
-- Name: matriculas_paquete_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_paquete_lnk_fk ON public.matriculas_paquete_lnk USING btree (matricula_id);


--
-- Name: matriculas_paquete_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_paquete_lnk_ifk ON public.matriculas_paquete_lnk USING btree (paquete_id);


--
-- Name: matriculas_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_updated_by_id_fk ON public.matriculas USING btree (updated_by_id);


--
-- Name: matriculas_users_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_users_lnk_fk ON public.matriculas_users_lnk USING btree (matricula_id);


--
-- Name: matriculas_users_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX matriculas_users_lnk_ifk ON public.matriculas_users_lnk USING btree (user_id);


--
-- Name: modulos_carrera_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_carrera_lnk_fk ON public.modulos_carrera_lnk USING btree (modulo_id);


--
-- Name: modulos_carrera_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_carrera_lnk_ifk ON public.modulos_carrera_lnk USING btree (carrera_id);


--
-- Name: modulos_component_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_component_type_idx ON public.modulos_cmps USING btree (component_type);


--
-- Name: modulos_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_created_by_id_fk ON public.modulos USING btree (created_by_id);


--
-- Name: modulos_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_documents_idx ON public.modulos USING btree (document_id, locale, published_at);


--
-- Name: modulos_entity_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_entity_fk ON public.modulos_cmps USING btree (entity_id);


--
-- Name: modulos_field_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_field_idx ON public.modulos_cmps USING btree (field);


--
-- Name: modulos_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX modulos_updated_by_id_fk ON public.modulos USING btree (updated_by_id);


--
-- Name: paquetes_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_created_by_id_fk ON public.paquetes USING btree (created_by_id);


--
-- Name: paquetes_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_documents_idx ON public.paquetes USING btree (document_id, locale, published_at);


--
-- Name: paquetes_grupos_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_grupos_lnk_fk ON public.paquetes_grupos_lnk USING btree (paquete_id);


--
-- Name: paquetes_grupos_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_grupos_lnk_ifk ON public.paquetes_grupos_lnk USING btree (grupo_id);


--
-- Name: paquetes_grupos_lnk_ofk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_grupos_lnk_ofk ON public.paquetes_grupos_lnk USING btree (grupo_ord);


--
-- Name: paquetes_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paquetes_updated_by_id_fk ON public.paquetes USING btree (updated_by_id);


--
-- Name: personales_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_created_by_id_fk ON public.personales USING btree (created_by_id);


--
-- Name: personales_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_documents_idx ON public.personales USING btree (document_id, locale, published_at);


--
-- Name: personales_especialidad_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_especialidad_lnk_fk ON public.personales_especialidad_lnk USING btree (personal_id);


--
-- Name: personales_especialidad_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_especialidad_lnk_ifk ON public.personales_especialidad_lnk USING btree (especialidad_id);


--
-- Name: personales_especialidad_lnk_ofk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_especialidad_lnk_ofk ON public.personales_especialidad_lnk USING btree (especialidad_ord);


--
-- Name: personales_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_updated_by_id_fk ON public.personales USING btree (updated_by_id);


--
-- Name: personales_user_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_user_lnk_fk ON public.personales_user_lnk USING btree (personal_id);


--
-- Name: personales_user_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personales_user_lnk_ifk ON public.personales_user_lnk USING btree (user_id);


--
-- Name: publicaciones_component_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_component_type_idx ON public.publicaciones_cmps USING btree (component_type);


--
-- Name: publicaciones_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_created_by_id_fk ON public.publicaciones USING btree (created_by_id);


--
-- Name: publicaciones_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_documents_idx ON public.publicaciones USING btree (document_id, locale, published_at);


--
-- Name: publicaciones_entity_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_entity_fk ON public.publicaciones_cmps USING btree (entity_id);


--
-- Name: publicaciones_field_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_field_idx ON public.publicaciones_cmps USING btree (field);


--
-- Name: publicaciones_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX publicaciones_updated_by_id_fk ON public.publicaciones USING btree (updated_by_id);


--
-- Name: sectores_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sectores_created_by_id_fk ON public.sectores USING btree (created_by_id);


--
-- Name: sectores_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sectores_documents_idx ON public.sectores USING btree (document_id, locale, published_at);


--
-- Name: sectores_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sectores_updated_by_id_fk ON public.sectores USING btree (updated_by_id);


--
-- Name: semestres_coordinador_1_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_coordinador_1_lnk_fk ON public.semestres_coordinador_1_lnk USING btree (semestre_id);


--
-- Name: semestres_coordinador_1_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_coordinador_1_lnk_ifk ON public.semestres_coordinador_1_lnk USING btree (personal_id);


--
-- Name: semestres_coordinador_2_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_coordinador_2_lnk_fk ON public.semestres_coordinador_2_lnk USING btree (semestre_id);


--
-- Name: semestres_coordinador_2_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_coordinador_2_lnk_ifk ON public.semestres_coordinador_2_lnk USING btree (personal_id);


--
-- Name: semestres_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_created_by_id_fk ON public.semestres USING btree (created_by_id);


--
-- Name: semestres_director_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_director_lnk_fk ON public.semestres_director_lnk USING btree (semestre_id);


--
-- Name: semestres_director_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_director_lnk_ifk ON public.semestres_director_lnk USING btree (personal_id);


--
-- Name: semestres_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_documents_idx ON public.semestres USING btree (document_id, locale, published_at);


--
-- Name: semestres_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX semestres_updated_by_id_fk ON public.semestres USING btree (updated_by_id);


--
-- Name: users_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_created_by_id_fk ON public.users USING btree (created_by_id);


--
-- Name: users_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_documents_idx ON public.users USING btree (document_id, locale, published_at);


--
-- Name: users_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_updated_by_id_fk ON public.users USING btree (updated_by_id);


--
-- Name: act_economicas_especialidad_lnk act_economicas_especialidad_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_especialidad_lnk
    ADD CONSTRAINT act_economicas_especialidad_lnk_fk FOREIGN KEY (act_economica_id) REFERENCES public."act-economicas"(id) ON DELETE CASCADE;


--
-- Name: act_economicas_especialidad_lnk act_economicas_especialidad_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_especialidad_lnk
    ADD CONSTRAINT act_economicas_especialidad_lnk_ifk FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id) ON DELETE CASCADE;


--
-- Name: act_economicas_familia_lnk act_economicas_familia_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_familia_lnk
    ADD CONSTRAINT act_economicas_familia_lnk_fk FOREIGN KEY (act_economica_id) REFERENCES public."act-economicas"(id) ON DELETE CASCADE;


--
-- Name: act_economicas_familia_lnk act_economicas_familia_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.act_economicas_familia_lnk
    ADD CONSTRAINT act_economicas_familia_lnk_ifk FOREIGN KEY (familia_id) REFERENCES public.familias(id) ON DELETE CASCADE;


--
-- Name: calendarios_semestre_lnk calendarios_semestre_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios_semestre_lnk
    ADD CONSTRAINT calendarios_semestre_lnk_fk FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id) ON DELETE CASCADE;


--
-- Name: calendarios_semestre_lnk calendarios_semestre_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios_semestre_lnk
    ADD CONSTRAINT calendarios_semestre_lnk_ifk FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE CASCADE;


--
-- Name: carreras_act_economica_lnk carreras_act_economica_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras_act_economica_lnk
    ADD CONSTRAINT carreras_act_economica_lnk_fk FOREIGN KEY (carrera_id) REFERENCES public.carreras(id) ON DELETE CASCADE;


--
-- Name: carreras_act_economica_lnk carreras_act_economica_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras_act_economica_lnk
    ADD CONSTRAINT carreras_act_economica_lnk_ifk FOREIGN KEY (act_economica_id) REFERENCES public."act-economicas"(id) ON DELETE CASCADE;


--
-- Name: familias_sector_lnk familias_sector_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias_sector_lnk
    ADD CONSTRAINT familias_sector_lnk_fk FOREIGN KEY (familia_id) REFERENCES public.familias(id) ON DELETE CASCADE;


--
-- Name: familias_sector_lnk familias_sector_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias_sector_lnk
    ADD CONSTRAINT familias_sector_lnk_ifk FOREIGN KEY (sector_id) REFERENCES public.sectores(id) ON DELETE CASCADE;


--
-- Name: grupos_calendario_lnk grupos_calendario_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_calendario_lnk
    ADD CONSTRAINT grupos_calendario_lnk_fk FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: grupos_calendario_lnk grupos_calendario_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_calendario_lnk
    ADD CONSTRAINT grupos_calendario_lnk_ifk FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id) ON DELETE CASCADE;


--
-- Name: grupos_modulo_lnk grupos_modulo_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_modulo_lnk
    ADD CONSTRAINT grupos_modulo_lnk_fk FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: grupos_modulo_lnk grupos_modulo_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_modulo_lnk
    ADD CONSTRAINT grupos_modulo_lnk_ifk FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: grupos_personal_lnk grupos_personal_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_personal_lnk
    ADD CONSTRAINT grupos_personal_lnk_fk FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: grupos_personal_lnk grupos_personal_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos_personal_lnk
    ADD CONSTRAINT grupos_personal_lnk_ifk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: matriculas_grupo_lnk matriculas_grupo_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_grupo_lnk
    ADD CONSTRAINT matriculas_grupo_lnk_fk FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matriculas_grupo_lnk matriculas_grupo_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_grupo_lnk
    ADD CONSTRAINT matriculas_grupo_lnk_ifk FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: matriculas_paquete_lnk matriculas_paquete_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_paquete_lnk
    ADD CONSTRAINT matriculas_paquete_lnk_fk FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matriculas_paquete_lnk matriculas_paquete_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_paquete_lnk
    ADD CONSTRAINT matriculas_paquete_lnk_ifk FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE CASCADE;


--
-- Name: matriculas_users_lnk matriculas_users_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_users_lnk
    ADD CONSTRAINT matriculas_users_lnk_fk FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE CASCADE;


--
-- Name: matriculas_users_lnk matriculas_users_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas_users_lnk
    ADD CONSTRAINT matriculas_users_lnk_ifk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: modulos_carrera_lnk modulos_carrera_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_carrera_lnk
    ADD CONSTRAINT modulos_carrera_lnk_fk FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: modulos_carrera_lnk modulos_carrera_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_carrera_lnk
    ADD CONSTRAINT modulos_carrera_lnk_ifk FOREIGN KEY (carrera_id) REFERENCES public.carreras(id) ON DELETE CASCADE;


--
-- Name: modulos_cmps modulos_entity_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_cmps
    ADD CONSTRAINT modulos_entity_fk FOREIGN KEY (entity_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: paquetes_grupos_lnk paquetes_grupos_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes_grupos_lnk
    ADD CONSTRAINT paquetes_grupos_lnk_fk FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id) ON DELETE CASCADE;


--
-- Name: paquetes_grupos_lnk paquetes_grupos_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes_grupos_lnk
    ADD CONSTRAINT paquetes_grupos_lnk_ifk FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: personales_especialidad_lnk personales_especialidad_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_especialidad_lnk
    ADD CONSTRAINT personales_especialidad_lnk_fk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: personales_especialidad_lnk personales_especialidad_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_especialidad_lnk
    ADD CONSTRAINT personales_especialidad_lnk_ifk FOREIGN KEY (especialidad_id) REFERENCES public.especialidades(id) ON DELETE CASCADE;


--
-- Name: personales_user_lnk personales_user_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_user_lnk
    ADD CONSTRAINT personales_user_lnk_fk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: personales_user_lnk personales_user_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales_user_lnk
    ADD CONSTRAINT personales_user_lnk_ifk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: publicaciones_cmps publicaciones_entity_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones_cmps
    ADD CONSTRAINT publicaciones_entity_fk FOREIGN KEY (entity_id) REFERENCES public.publicaciones(id) ON DELETE CASCADE;


--
-- Name: semestres_coordinador_1_lnk semestres_coordinador_1_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_1_lnk
    ADD CONSTRAINT semestres_coordinador_1_lnk_fk FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE CASCADE;


--
-- Name: semestres_coordinador_1_lnk semestres_coordinador_1_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_1_lnk
    ADD CONSTRAINT semestres_coordinador_1_lnk_ifk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: semestres_coordinador_2_lnk semestres_coordinador_2_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_2_lnk
    ADD CONSTRAINT semestres_coordinador_2_lnk_fk FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE CASCADE;


--
-- Name: semestres_coordinador_2_lnk semestres_coordinador_2_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_coordinador_2_lnk
    ADD CONSTRAINT semestres_coordinador_2_lnk_ifk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


--
-- Name: semestres_director_lnk semestres_director_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_director_lnk
    ADD CONSTRAINT semestres_director_lnk_fk FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE CASCADE;


--
-- Name: semestres_director_lnk semestres_director_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres_director_lnk
    ADD CONSTRAINT semestres_director_lnk_ifk FOREIGN KEY (personal_id) REFERENCES public.personales(id) ON DELETE CASCADE;


