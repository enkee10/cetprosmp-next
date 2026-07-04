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
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_permissions (
    id integer NOT NULL,
    document_id character varying(255),
    action character varying(255),
    action_parameters jsonb,
    subject character varying(255),
    properties jsonb,
    conditions jsonb,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: admin_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: admin_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_permissions_id_seq OWNED BY public.admin_permissions.id;


--
-- Name: admin_permissions_role_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_permissions_role_lnk (
    id integer NOT NULL,
    permission_id integer,
    role_id integer,
    permission_ord double precision
);



--
-- Name: admin_permissions_role_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_permissions_role_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: admin_permissions_role_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_permissions_role_lnk_id_seq OWNED BY public.admin_permissions_role_lnk.id;


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_roles (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    code character varying(255),
    description character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: admin_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: admin_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_roles_id_seq OWNED BY public.admin_roles.id;


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    document_id character varying(255),
    firstname character varying(255),
    lastname character varying(255),
    username character varying(255),
    email character varying(255),
    password character varying(255),
    reset_password_token character varying(255),
    registration_token character varying(255),
    is_active boolean,
    blocked boolean,
    prefered_language character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: admin_users_roles_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users_roles_lnk (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    role_ord double precision,
    user_ord double precision
);



--
-- Name: admin_users_roles_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_roles_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: admin_users_roles_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_roles_lnk_id_seq OWNED BY public.admin_users_roles_lnk.id;


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
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    alternative_text character varying(255),
    caption character varying(255),
    width integer,
    height integer,
    formats jsonb,
    hash character varying(255),
    ext character varying(255),
    mime character varying(255),
    size numeric(10,2),
    url character varying(255),
    preview_url character varying(255),
    provider character varying(255),
    provider_metadata jsonb,
    folder_path character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: files_folder_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files_folder_lnk (
    id integer NOT NULL,
    file_id integer,
    folder_id integer,
    file_ord double precision
);



--
-- Name: files_folder_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_folder_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: files_folder_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_folder_lnk_id_seq OWNED BY public.files_folder_lnk.id;


--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: files_related_mph; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files_related_mph (
    id integer NOT NULL,
    file_id integer,
    related_id integer,
    related_type character varying(255),
    field character varying(255),
    "order" double precision
);



--
-- Name: files_related_mph_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_related_mph_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: files_related_mph_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_related_mph_id_seq OWNED BY public.files_related_mph.id;


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
-- Name: i18n_locale; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.i18n_locale (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    code character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: i18n_locale_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.i18n_locale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: i18n_locale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.i18n_locale_id_seq OWNED BY public.i18n_locale.id;


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
-- Name: pruebas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pruebas (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255),
    descripcion text,
    descripcion_2 jsonb,
    descripcion_3 text
);



--
-- Name: pruebas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pruebas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: pruebas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pruebas_id_seq OWNED BY public.pruebas.id;


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
-- Name: strapi_api_token_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_api_token_permissions (
    id integer NOT NULL,
    document_id character varying(255),
    action character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_api_token_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_api_token_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_api_token_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_api_token_permissions_id_seq OWNED BY public.strapi_api_token_permissions.id;


--
-- Name: strapi_api_token_permissions_token_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_api_token_permissions_token_lnk (
    id integer NOT NULL,
    api_token_permission_id integer,
    api_token_id integer,
    api_token_permission_ord double precision
);



--
-- Name: strapi_api_token_permissions_token_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_api_token_permissions_token_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_api_token_permissions_token_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_api_token_permissions_token_lnk_id_seq OWNED BY public.strapi_api_token_permissions_token_lnk.id;


--
-- Name: strapi_api_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_api_tokens (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    description character varying(255),
    type character varying(255),
    access_key character varying(255),
    last_used_at timestamp(6) without time zone,
    expires_at timestamp(6) without time zone,
    lifespan bigint,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_api_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_api_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_api_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_api_tokens_id_seq OWNED BY public.strapi_api_tokens.id;


--
-- Name: strapi_core_store_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_core_store_settings (
    id integer NOT NULL,
    key character varying(255),
    value text,
    type character varying(255),
    environment character varying(255),
    tag character varying(255)
);



--
-- Name: strapi_core_store_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_core_store_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_core_store_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_core_store_settings_id_seq OWNED BY public.strapi_core_store_settings.id;


--
-- Name: strapi_database_schema; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_database_schema (
    id integer NOT NULL,
    schema json,
    "time" timestamp without time zone,
    hash character varying(255)
);



--
-- Name: strapi_database_schema_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_database_schema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_database_schema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_database_schema_id_seq OWNED BY public.strapi_database_schema.id;


--
-- Name: strapi_history_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_history_versions (
    id integer NOT NULL,
    content_type character varying(255) NOT NULL,
    related_document_id character varying(255),
    locale character varying(255),
    status character varying(255),
    data jsonb,
    schema jsonb,
    created_at timestamp(6) without time zone,
    created_by_id integer
);



--
-- Name: strapi_history_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_history_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_history_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_history_versions_id_seq OWNED BY public.strapi_history_versions.id;


--
-- Name: strapi_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_migrations (
    id integer NOT NULL,
    name character varying(255),
    "time" timestamp without time zone
);



--
-- Name: strapi_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_migrations_id_seq OWNED BY public.strapi_migrations.id;


--
-- Name: strapi_migrations_internal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_migrations_internal (
    id integer NOT NULL,
    name character varying(255),
    "time" timestamp without time zone
);



--
-- Name: strapi_migrations_internal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_migrations_internal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_migrations_internal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_migrations_internal_id_seq OWNED BY public.strapi_migrations_internal.id;


--
-- Name: strapi_release_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_release_actions (
    id integer NOT NULL,
    document_id character varying(255),
    type character varying(255),
    content_type character varying(255),
    entry_document_id character varying(255),
    locale character varying(255),
    is_entry_valid boolean,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer
);



--
-- Name: strapi_release_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_release_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_release_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_release_actions_id_seq OWNED BY public.strapi_release_actions.id;


--
-- Name: strapi_release_actions_release_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_release_actions_release_lnk (
    id integer NOT NULL,
    release_action_id integer,
    release_id integer,
    release_action_ord double precision
);



--
-- Name: strapi_release_actions_release_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_release_actions_release_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_release_actions_release_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_release_actions_release_lnk_id_seq OWNED BY public.strapi_release_actions_release_lnk.id;


--
-- Name: strapi_releases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_releases (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    released_at timestamp(6) without time zone,
    scheduled_at timestamp(6) without time zone,
    timezone character varying(255),
    status character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_releases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_releases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_releases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_releases_id_seq OWNED BY public.strapi_releases.id;


--
-- Name: strapi_transfer_token_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_transfer_token_permissions (
    id integer NOT NULL,
    document_id character varying(255),
    action character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_transfer_token_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_transfer_token_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_transfer_token_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_transfer_token_permissions_id_seq OWNED BY public.strapi_transfer_token_permissions.id;


--
-- Name: strapi_transfer_token_permissions_token_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_transfer_token_permissions_token_lnk (
    id integer NOT NULL,
    transfer_token_permission_id integer,
    transfer_token_id integer,
    transfer_token_permission_ord double precision
);



--
-- Name: strapi_transfer_token_permissions_token_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_transfer_token_permissions_token_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_transfer_token_permissions_token_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_transfer_token_permissions_token_lnk_id_seq OWNED BY public.strapi_transfer_token_permissions_token_lnk.id;


--
-- Name: strapi_transfer_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_transfer_tokens (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    description character varying(255),
    access_key character varying(255),
    last_used_at timestamp(6) without time zone,
    expires_at timestamp(6) without time zone,
    lifespan bigint,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_transfer_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_transfer_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_transfer_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_transfer_tokens_id_seq OWNED BY public.strapi_transfer_tokens.id;


--
-- Name: strapi_webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_webhooks (
    id integer NOT NULL,
    name character varying(255),
    url text,
    headers jsonb,
    events jsonb,
    enabled boolean
);



--
-- Name: strapi_webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_webhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_webhooks_id_seq OWNED BY public.strapi_webhooks.id;


--
-- Name: strapi_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_workflows (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    content_types jsonb,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_workflows_id_seq OWNED BY public.strapi_workflows.id;


--
-- Name: strapi_workflows_stage_required_to_publish_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_workflows_stage_required_to_publish_lnk (
    id integer NOT NULL,
    workflow_id integer,
    workflow_stage_id integer
);



--
-- Name: strapi_workflows_stage_required_to_publish_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_workflows_stage_required_to_publish_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_workflows_stage_required_to_publish_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_workflows_stage_required_to_publish_lnk_id_seq OWNED BY public.strapi_workflows_stage_required_to_publish_lnk.id;


--
-- Name: strapi_workflows_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_workflows_stages (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    color character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: strapi_workflows_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_workflows_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_workflows_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_workflows_stages_id_seq OWNED BY public.strapi_workflows_stages.id;


--
-- Name: strapi_workflows_stages_permissions_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_workflows_stages_permissions_lnk (
    id integer NOT NULL,
    workflow_stage_id integer,
    permission_id integer,
    permission_ord double precision
);



--
-- Name: strapi_workflows_stages_permissions_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_workflows_stages_permissions_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_workflows_stages_permissions_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_workflows_stages_permissions_lnk_id_seq OWNED BY public.strapi_workflows_stages_permissions_lnk.id;


--
-- Name: strapi_workflows_stages_workflow_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strapi_workflows_stages_workflow_lnk (
    id integer NOT NULL,
    workflow_stage_id integer,
    workflow_id integer,
    workflow_stage_ord double precision
);



--
-- Name: strapi_workflows_stages_workflow_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strapi_workflows_stages_workflow_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: strapi_workflows_stages_workflow_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strapi_workflows_stages_workflow_lnk_id_seq OWNED BY public.strapi_workflows_stages_workflow_lnk.id;


--
-- Name: up_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.up_permissions (
    id integer NOT NULL,
    document_id character varying(255),
    action character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: up_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.up_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: up_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.up_permissions_id_seq OWNED BY public.up_permissions.id;


--
-- Name: up_permissions_role_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.up_permissions_role_lnk (
    id integer NOT NULL,
    permission_id integer,
    role_id integer,
    permission_ord double precision
);



--
-- Name: up_permissions_role_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.up_permissions_role_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: up_permissions_role_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.up_permissions_role_lnk_id_seq OWNED BY public.up_permissions_role_lnk.id;


--
-- Name: up_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.up_roles (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    description character varying(255),
    type character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: up_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.up_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: up_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.up_roles_id_seq OWNED BY public.up_roles.id;


--
-- Name: upload_folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.upload_folders (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    path_id integer,
    path character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);



--
-- Name: upload_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.upload_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: upload_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.upload_folders_id_seq OWNED BY public.upload_folders.id;


--
-- Name: upload_folders_parent_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.upload_folders_parent_lnk (
    id integer NOT NULL,
    folder_id integer,
    inv_folder_id integer,
    folder_ord double precision
);



--
-- Name: upload_folders_parent_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.upload_folders_parent_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: upload_folders_parent_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.upload_folders_parent_lnk_id_seq OWNED BY public.upload_folders_parent_lnk.id;


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
    password character varying(255),
    reset_password_token character varying(255),
    confirmation_token character varying(255),
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
-- Name: users_role_lnk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_role_lnk (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    user_ord double precision
);



--
-- Name: users_role_lnk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_role_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: users_role_lnk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_role_lnk_id_seq OWNED BY public.users_role_lnk.id;


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
-- Name: admin_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_id_seq'::regclass);


--
-- Name: admin_permissions_role_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions_role_lnk ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_role_lnk_id_seq'::regclass);


--
-- Name: admin_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles ALTER COLUMN id SET DEFAULT nextval('public.admin_roles_id_seq'::regclass);


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: admin_users_roles_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users_roles_lnk ALTER COLUMN id SET DEFAULT nextval('public.admin_users_roles_lnk_id_seq'::regclass);


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
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: files_folder_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_folder_lnk ALTER COLUMN id SET DEFAULT nextval('public.files_folder_lnk_id_seq'::regclass);


--
-- Name: files_related_mph id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_related_mph ALTER COLUMN id SET DEFAULT nextval('public.files_related_mph_id_seq'::regclass);


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
-- Name: i18n_locale id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_locale ALTER COLUMN id SET DEFAULT nextval('public.i18n_locale_id_seq'::regclass);


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
-- Name: pruebas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pruebas ALTER COLUMN id SET DEFAULT nextval('public.pruebas_id_seq'::regclass);


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
-- Name: strapi_api_token_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions ALTER COLUMN id SET DEFAULT nextval('public.strapi_api_token_permissions_id_seq'::regclass);


--
-- Name: strapi_api_token_permissions_token_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions_token_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_api_token_permissions_token_lnk_id_seq'::regclass);


--
-- Name: strapi_api_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_tokens ALTER COLUMN id SET DEFAULT nextval('public.strapi_api_tokens_id_seq'::regclass);


--
-- Name: strapi_core_store_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_core_store_settings ALTER COLUMN id SET DEFAULT nextval('public.strapi_core_store_settings_id_seq'::regclass);


--
-- Name: strapi_database_schema id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_database_schema ALTER COLUMN id SET DEFAULT nextval('public.strapi_database_schema_id_seq'::regclass);


--
-- Name: strapi_history_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_history_versions ALTER COLUMN id SET DEFAULT nextval('public.strapi_history_versions_id_seq'::regclass);


--
-- Name: strapi_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_migrations ALTER COLUMN id SET DEFAULT nextval('public.strapi_migrations_id_seq'::regclass);


--
-- Name: strapi_migrations_internal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_migrations_internal ALTER COLUMN id SET DEFAULT nextval('public.strapi_migrations_internal_id_seq'::regclass);


--
-- Name: strapi_release_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions ALTER COLUMN id SET DEFAULT nextval('public.strapi_release_actions_id_seq'::regclass);


--
-- Name: strapi_release_actions_release_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions_release_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_release_actions_release_lnk_id_seq'::regclass);


--
-- Name: strapi_releases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_releases ALTER COLUMN id SET DEFAULT nextval('public.strapi_releases_id_seq'::regclass);


--
-- Name: strapi_transfer_token_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions ALTER COLUMN id SET DEFAULT nextval('public.strapi_transfer_token_permissions_id_seq'::regclass);


--
-- Name: strapi_transfer_token_permissions_token_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions_token_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_transfer_token_permissions_token_lnk_id_seq'::regclass);


--
-- Name: strapi_transfer_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_tokens ALTER COLUMN id SET DEFAULT nextval('public.strapi_transfer_tokens_id_seq'::regclass);


--
-- Name: strapi_webhooks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_webhooks ALTER COLUMN id SET DEFAULT nextval('public.strapi_webhooks_id_seq'::regclass);


--
-- Name: strapi_workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows ALTER COLUMN id SET DEFAULT nextval('public.strapi_workflows_id_seq'::regclass);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stage_required_to_publish_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_workflows_stage_required_to_publish_lnk_id_seq'::regclass);


--
-- Name: strapi_workflows_stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages ALTER COLUMN id SET DEFAULT nextval('public.strapi_workflows_stages_id_seq'::regclass);


--
-- Name: strapi_workflows_stages_permissions_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_permissions_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_workflows_stages_permissions_lnk_id_seq'::regclass);


--
-- Name: strapi_workflows_stages_workflow_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_workflow_lnk ALTER COLUMN id SET DEFAULT nextval('public.strapi_workflows_stages_workflow_lnk_id_seq'::regclass);


--
-- Name: up_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions ALTER COLUMN id SET DEFAULT nextval('public.up_permissions_id_seq'::regclass);


--
-- Name: up_permissions_role_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions_role_lnk ALTER COLUMN id SET DEFAULT nextval('public.up_permissions_role_lnk_id_seq'::regclass);


--
-- Name: up_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_roles ALTER COLUMN id SET DEFAULT nextval('public.up_roles_id_seq'::regclass);


--
-- Name: upload_folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders ALTER COLUMN id SET DEFAULT nextval('public.upload_folders_id_seq'::regclass);


--
-- Name: upload_folders_parent_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders_parent_lnk ALTER COLUMN id SET DEFAULT nextval('public.upload_folders_parent_lnk_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: users_role_lnk id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_role_lnk ALTER COLUMN id SET DEFAULT nextval('public.users_role_lnk_id_seq'::regclass);


--
-- Data for Name: act-economicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."act-economicas" (id, document_id, titulo, descripcion, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	x0qyr7d6n3cm62h014s8u19b	OTRAS ACTIVIDADES DE SERVICIOS PERSONALES  	\N	2025-05-28 16:05:50.274	2025-05-28 16:05:50.274	2025-05-28 16:05:50.266	1	1	\N
2	l6vhszg7zpbsg0eoug9b9apn	REPARACIÓN DE ORDENADORES Y DE EFECTOS Y ENSERES DOMÉSTICOS	\N	2025-05-28 16:06:32.557	2025-05-28 16:06:32.557	2025-05-28 16:06:32.551	1	1	\N
3	q1pfiw6s6dvh6ky7qf5d2ymd	SUMINISTRO DE ELECTRICIDAD, GAS, VAPOR Y AIRE ACONDICIONADO	\N	2025-05-28 16:07:23.984	2025-05-28 16:07:23.984	2025-05-28 16:07:23.977	1	1	\N
4	a4s8gpf1vff9atnmxgl1udt0	PROGRAMACIÓN INFORMÁTICA, CONSULTORÍA DE INFORMÁTICA Y ACTIVIDADES CONEXAS	\N	2025-05-28 16:08:33.886	2025-05-28 16:08:33.886	2025-05-28 16:08:33.879	1	1	\N
5	h314o5do3yb6h5l69vasakgj	FABRICACION DE PRENDAS DE VESTIR	\N	2025-05-28 16:10:57.938	2025-05-28 16:10:57.938	2025-05-28 16:10:57.924	1	1	\N
6	tdcikib5zy96egmou76w9oj9	FABRICACION DE PRODUCTOS DE CUERO Y PRODUCTOS CONEXOS	\N	2025-05-28 16:12:04.053	2025-05-28 16:12:04.053	2025-05-28 16:12:04.046	1	1	\N
7	fke9qiv76jnrd9hr0tgrfzg8	OTRAS INDUSTRIAS MANUFACTURERA	\N	2025-05-28 16:12:38.116	2025-05-28 16:12:38.116	2025-05-28 16:12:38.11	1	1	\N
8	lq2jsntbkrob6wdbz3mkk6ev	ELABORACIÓN DE PRODUCTOS ALIMENTICIOS	\N	2025-05-28 16:13:12.683	2025-05-28 16:13:12.683	2025-05-28 16:13:12.677	1	1	\N
9	n2g1xjkquzhn7cdixzrejyrz	PRODUCCIÓN DE MADERA Y FABRICACIÓN DE PRODUCTOS DE MADERA Y CORCHO, EXCEPTO MUEBLES, FABRICACIÓN DE ARTÍCULOS DE PAJA Y DE MATERIALES TRENSABLES	\N	2025-05-28 16:13:39.74	2025-05-28 16:13:39.74	2025-05-28 16:13:39.735	1	1	\N
\.


--
-- Data for Name: act_economicas_especialidad_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.act_economicas_especialidad_lnk (id, act_economica_id, especialidad_id) FROM stdin;
1	1	1
2	2	2
3	3	2
4	4	3
5	5	4
6	6	5
7	7	6
8	8	7
9	9	8
\.


--
-- Data for Name: act_economicas_familia_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.act_economicas_familia_lnk (id, act_economica_id, familia_id) FROM stdin;
1	1	1
2	2	1
3	3	2
4	4	3
5	5	4
6	6	4
7	7	5
8	8	6
9	9	7
\.


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_permissions (id, document_id, action, action_parameters, subject, properties, conditions, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	n1t3t5zssgxu7is3yz04qyo8	plugin::upload.read	{}	\N	{}	[]	2025-04-18 21:45:42.805	2025-04-18 21:45:42.805	2025-04-18 21:45:42.806	\N	\N	\N
2	hs8zdncpmuch1s04c8jcit3s	plugin::upload.configure-view	{}	\N	{}	[]	2025-04-18 21:45:42.816	2025-04-18 21:45:42.816	2025-04-18 21:45:42.816	\N	\N	\N
3	iz0dxk148by5wfi0sx86al1v	plugin::upload.assets.create	{}	\N	{}	[]	2025-04-18 21:45:42.82	2025-04-18 21:45:42.82	2025-04-18 21:45:42.82	\N	\N	\N
4	pqebslpkmurkwee1met86ktr	plugin::upload.assets.update	{}	\N	{}	[]	2025-04-18 21:45:42.824	2025-04-18 21:45:42.824	2025-04-18 21:45:42.824	\N	\N	\N
5	z55s6a917m1yr50to1kr9qwb	plugin::upload.assets.download	{}	\N	{}	[]	2025-04-18 21:45:42.828	2025-04-18 21:45:42.828	2025-04-18 21:45:42.828	\N	\N	\N
6	rofz5odyrpmpvl83am57x2gm	plugin::upload.assets.copy-link	{}	\N	{}	[]	2025-04-18 21:45:42.831	2025-04-18 21:45:42.831	2025-04-18 21:45:42.831	\N	\N	\N
7	hx48nsgqxocr27jsm6h8qqh1	plugin::upload.read	{}	\N	{}	["admin::is-creator"]	2025-04-18 21:45:42.835	2025-04-18 21:45:42.835	2025-04-18 21:45:42.835	\N	\N	\N
8	r1taaqi3fs0aadnc8f6nsh8x	plugin::upload.configure-view	{}	\N	{}	[]	2025-04-18 21:45:42.839	2025-04-18 21:45:42.839	2025-04-18 21:45:42.839	\N	\N	\N
9	q8atqxc85bym332ir483724r	plugin::upload.assets.create	{}	\N	{}	[]	2025-04-18 21:45:42.843	2025-04-18 21:45:42.843	2025-04-18 21:45:42.843	\N	\N	\N
10	bmdofcz69ykuz8zvtpv5bgcg	plugin::upload.assets.update	{}	\N	{}	["admin::is-creator"]	2025-04-18 21:45:42.846	2025-04-18 21:45:42.846	2025-04-18 21:45:42.846	\N	\N	\N
11	jkpn8agn1uxlqce7p0zd6q1t	plugin::upload.assets.download	{}	\N	{}	[]	2025-04-18 21:45:42.848	2025-04-18 21:45:42.848	2025-04-18 21:45:42.848	\N	\N	\N
12	egx10xog3lcvb3kmz41n6in0	plugin::upload.assets.copy-link	{}	\N	{}	[]	2025-04-18 21:45:42.85	2025-04-18 21:45:42.85	2025-04-18 21:45:42.85	\N	\N	\N
1234	b1t1tme4zt6iwz3yntzt6exz	plugin::content-manager.explorer.create	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "youtube", "twitter", "instagram", "tiktok", "ruc", "rd", "logo"]}	[]	2025-07-29 01:58:05.884	2025-07-29 01:58:05.884	2025-07-29 01:58:05.884	\N	\N	\N
16	znnvp764bpsqpjzs429h8cm9	plugin::content-manager.explorer.delete	{}	plugin::users-permissions.user	{}	[]	2025-04-18 21:45:42.879	2025-04-18 21:45:42.879	2025-04-18 21:45:42.879	\N	\N	\N
17	m4lkgv2sre2xy2c84cila18k	plugin::content-manager.explorer.publish	{}	plugin::users-permissions.user	{}	[]	2025-04-18 21:45:42.883	2025-04-18 21:45:42.883	2025-04-18 21:45:42.883	\N	\N	\N
18	cqodv09rkjpy9od8dmh8h8j0	plugin::content-manager.single-types.configure-view	{}	\N	{}	[]	2025-04-18 21:45:42.886	2025-04-18 21:45:42.886	2025-04-18 21:45:42.886	\N	\N	\N
19	yevcb38y6lfys1ct4lx3coci	plugin::content-manager.collection-types.configure-view	{}	\N	{}	[]	2025-04-18 21:45:42.891	2025-04-18 21:45:42.891	2025-04-18 21:45:42.891	\N	\N	\N
20	nuyes346o7t9xj6h6zt70s5k	plugin::content-manager.components.configure-layout	{}	\N	{}	[]	2025-04-18 21:45:42.893	2025-04-18 21:45:42.893	2025-04-18 21:45:42.893	\N	\N	\N
21	olsn7r8ot8nduk39b5vbxeep	plugin::content-type-builder.read	{}	\N	{}	[]	2025-04-18 21:45:42.895	2025-04-18 21:45:42.895	2025-04-18 21:45:42.895	\N	\N	\N
22	yjjaur9db3whdj60btk3aa8e	plugin::email.settings.read	{}	\N	{}	[]	2025-04-18 21:45:42.897	2025-04-18 21:45:42.897	2025-04-18 21:45:42.897	\N	\N	\N
23	h6hv6g556ex6h2szivlh3c2r	plugin::upload.read	{}	\N	{}	[]	2025-04-18 21:45:42.898	2025-04-18 21:45:42.898	2025-04-18 21:45:42.898	\N	\N	\N
24	ivu0d8vrnkcqpkzdx9gad1et	plugin::upload.assets.create	{}	\N	{}	[]	2025-04-18 21:45:42.901	2025-04-18 21:45:42.901	2025-04-18 21:45:42.901	\N	\N	\N
25	s8vu99jcus470q85yv3vwdw4	plugin::upload.assets.update	{}	\N	{}	[]	2025-04-18 21:45:42.903	2025-04-18 21:45:42.903	2025-04-18 21:45:42.903	\N	\N	\N
26	nfm2asjm7qyyyk7407kacx9y	plugin::upload.assets.download	{}	\N	{}	[]	2025-04-18 21:45:42.906	2025-04-18 21:45:42.906	2025-04-18 21:45:42.906	\N	\N	\N
27	tq1n7uuinb39f7crhpx0qkp9	plugin::upload.assets.copy-link	{}	\N	{}	[]	2025-04-18 21:45:42.909	2025-04-18 21:45:42.909	2025-04-18 21:45:42.909	\N	\N	\N
28	p4uzmfek6y7r596vdegb06wp	plugin::upload.configure-view	{}	\N	{}	[]	2025-04-18 21:45:42.911	2025-04-18 21:45:42.911	2025-04-18 21:45:42.911	\N	\N	\N
29	vcairvqpthidwbz85pax8r7l	plugin::upload.settings.read	{}	\N	{}	[]	2025-04-18 21:45:42.913	2025-04-18 21:45:42.913	2025-04-18 21:45:42.913	\N	\N	\N
30	ey0xmcu5jk4qjjcjqndoqcu1	plugin::i18n.locale.create	{}	\N	{}	[]	2025-04-18 21:45:42.916	2025-04-18 21:45:42.916	2025-04-18 21:45:42.916	\N	\N	\N
31	eoeovqhbeep117wziyuvrs4b	plugin::i18n.locale.read	{}	\N	{}	[]	2025-04-18 21:45:42.919	2025-04-18 21:45:42.919	2025-04-18 21:45:42.919	\N	\N	\N
32	ohstks7824a6bjivo6jsbkpr	plugin::i18n.locale.update	{}	\N	{}	[]	2025-04-18 21:45:42.923	2025-04-18 21:45:42.923	2025-04-18 21:45:42.923	\N	\N	\N
33	maulwzoaqu4djnnuhrchoulq	plugin::i18n.locale.delete	{}	\N	{}	[]	2025-04-18 21:45:42.925	2025-04-18 21:45:42.925	2025-04-18 21:45:42.925	\N	\N	\N
34	il51uu9vj5tg1w3r214hlfzc	plugin::users-permissions.roles.create	{}	\N	{}	[]	2025-04-18 21:45:42.928	2025-04-18 21:45:42.928	2025-04-18 21:45:42.928	\N	\N	\N
35	xm4o24rhluspmnpo348lmmie	plugin::users-permissions.roles.read	{}	\N	{}	[]	2025-04-18 21:45:42.929	2025-04-18 21:45:42.929	2025-04-18 21:45:42.929	\N	\N	\N
36	jhlvjh3bkgyxbm7xhyvirjvn	plugin::users-permissions.roles.update	{}	\N	{}	[]	2025-04-18 21:45:42.932	2025-04-18 21:45:42.932	2025-04-18 21:45:42.932	\N	\N	\N
37	o7ouvy5va90h9jmfhtmx01vd	plugin::users-permissions.roles.delete	{}	\N	{}	[]	2025-04-18 21:45:42.934	2025-04-18 21:45:42.934	2025-04-18 21:45:42.934	\N	\N	\N
38	nasyq6zrvystsxuna3w13n1t	plugin::users-permissions.providers.read	{}	\N	{}	[]	2025-04-18 21:45:42.936	2025-04-18 21:45:42.936	2025-04-18 21:45:42.937	\N	\N	\N
39	x3kab9c9ftr63gqat9g4ivtj	plugin::users-permissions.providers.update	{}	\N	{}	[]	2025-04-18 21:45:42.939	2025-04-18 21:45:42.939	2025-04-18 21:45:42.939	\N	\N	\N
40	fev88tzx1nc5eguyep38b3xd	plugin::users-permissions.email-templates.read	{}	\N	{}	[]	2025-04-18 21:45:42.943	2025-04-18 21:45:42.943	2025-04-18 21:45:42.943	\N	\N	\N
41	jadk8s7hy7h6ybbh7tnfy77f	plugin::users-permissions.email-templates.update	{}	\N	{}	[]	2025-04-18 21:45:42.944	2025-04-18 21:45:42.944	2025-04-18 21:45:42.945	\N	\N	\N
42	z8e9m1iw8s55j36pdc9q95st	plugin::users-permissions.advanced-settings.read	{}	\N	{}	[]	2025-04-18 21:45:42.946	2025-04-18 21:45:42.946	2025-04-18 21:45:42.946	\N	\N	\N
43	liyuk7d76evhv8m3to4jtnql	plugin::users-permissions.advanced-settings.update	{}	\N	{}	[]	2025-04-18 21:45:42.949	2025-04-18 21:45:42.949	2025-04-18 21:45:42.949	\N	\N	\N
44	moevyc3koa6syk5n7ttdjptg	admin::marketplace.read	{}	\N	{}	[]	2025-04-18 21:45:42.951	2025-04-18 21:45:42.951	2025-04-18 21:45:42.951	\N	\N	\N
45	vmd1uipoorr7ese7hc571k0u	admin::webhooks.create	{}	\N	{}	[]	2025-04-18 21:45:42.953	2025-04-18 21:45:42.953	2025-04-18 21:45:42.953	\N	\N	\N
46	ao6iipud5k9ceasm741ytw1f	admin::webhooks.read	{}	\N	{}	[]	2025-04-18 21:45:42.956	2025-04-18 21:45:42.956	2025-04-18 21:45:42.956	\N	\N	\N
47	hq8c0ag86bsge4gyy31oy8ta	admin::webhooks.update	{}	\N	{}	[]	2025-04-18 21:45:42.961	2025-04-18 21:45:42.961	2025-04-18 21:45:42.961	\N	\N	\N
48	w49f61o8t5n2i5xzx1fxlbow	admin::webhooks.delete	{}	\N	{}	[]	2025-04-18 21:45:42.963	2025-04-18 21:45:42.963	2025-04-18 21:45:42.963	\N	\N	\N
49	ajzzt6qa2i08ii5sl0wfxq2q	admin::users.create	{}	\N	{}	[]	2025-04-18 21:45:42.966	2025-04-18 21:45:42.966	2025-04-18 21:45:42.966	\N	\N	\N
50	vq55leqsoficwlc25av1o52z	admin::users.read	{}	\N	{}	[]	2025-04-18 21:45:42.968	2025-04-18 21:45:42.968	2025-04-18 21:45:42.968	\N	\N	\N
51	vgpmiwgzv32fheos4zdmgxsr	admin::users.update	{}	\N	{}	[]	2025-04-18 21:45:42.969	2025-04-18 21:45:42.969	2025-04-18 21:45:42.969	\N	\N	\N
52	g9j7u6j9xuu64nqw7wny1f9j	admin::users.delete	{}	\N	{}	[]	2025-04-18 21:45:42.972	2025-04-18 21:45:42.972	2025-04-18 21:45:42.972	\N	\N	\N
53	p50m3xqffn163ak6v0h7s41r	admin::roles.create	{}	\N	{}	[]	2025-04-18 21:45:42.974	2025-04-18 21:45:42.974	2025-04-18 21:45:42.974	\N	\N	\N
615	l9ft2e8a4xgh2cpy0nqnpjkj	plugin::content-manager.explorer.delete	{}	api::act-economica.act-economica	{}	[]	2025-05-27 23:43:23.5	2025-05-27 23:43:23.5	2025-05-27 23:43:23.5	\N	\N	\N
616	e6dijb44m6t0h5v0pt65ay5i	plugin::content-manager.explorer.publish	{}	api::act-economica.act-economica	{}	[]	2025-05-27 23:43:23.505	2025-05-27 23:43:23.505	2025-05-27 23:43:23.505	\N	\N	\N
54	zqbsqhq0pnsl93ot26bgtlhf	admin::roles.read	{}	\N	{}	[]	2025-04-18 21:45:42.976	2025-04-18 21:45:42.976	2025-04-18 21:45:42.976	\N	\N	\N
55	lfz7j3q5gsc0ypn11bm2x54f	admin::roles.update	{}	\N	{}	[]	2025-04-18 21:45:42.978	2025-04-18 21:45:42.978	2025-04-18 21:45:42.978	\N	\N	\N
56	i5sb5eayl5ltq9zwal0rxdbv	admin::roles.delete	{}	\N	{}	[]	2025-04-18 21:45:42.98	2025-04-18 21:45:42.98	2025-04-18 21:45:42.98	\N	\N	\N
57	jkwbt4dpsxgma1mz8qfvgs2a	admin::api-tokens.access	{}	\N	{}	[]	2025-04-18 21:45:42.982	2025-04-18 21:45:42.982	2025-04-18 21:45:42.982	\N	\N	\N
58	d72b4xaucew012hf6vvoa23t	admin::api-tokens.create	{}	\N	{}	[]	2025-04-18 21:45:42.984	2025-04-18 21:45:42.984	2025-04-18 21:45:42.984	\N	\N	\N
59	hq7nm1k9dnj277s30obawkg9	admin::api-tokens.read	{}	\N	{}	[]	2025-04-18 21:45:42.985	2025-04-18 21:45:42.985	2025-04-18 21:45:42.985	\N	\N	\N
60	e9s8541db5f39l5ogmh7m3e9	admin::api-tokens.update	{}	\N	{}	[]	2025-04-18 21:45:42.988	2025-04-18 21:45:42.988	2025-04-18 21:45:42.988	\N	\N	\N
61	u4tpo6wsvk7518ex1y6q7hhk	admin::api-tokens.regenerate	{}	\N	{}	[]	2025-04-18 21:45:42.99	2025-04-18 21:45:42.99	2025-04-18 21:45:42.99	\N	\N	\N
62	u096pk12l2spfto4vux8vmn8	admin::api-tokens.delete	{}	\N	{}	[]	2025-04-18 21:45:42.991	2025-04-18 21:45:42.991	2025-04-18 21:45:42.991	\N	\N	\N
63	tf54k7p1swo9cpjyfoe6cof7	admin::project-settings.update	{}	\N	{}	[]	2025-04-18 21:45:42.993	2025-04-18 21:45:42.993	2025-04-18 21:45:42.993	\N	\N	\N
64	ndhjx6sni86kkn2z7u82a10u	admin::project-settings.read	{}	\N	{}	[]	2025-04-18 21:45:42.995	2025-04-18 21:45:42.995	2025-04-18 21:45:42.995	\N	\N	\N
65	biml6nwu708cnraxskd75r74	admin::transfer.tokens.access	{}	\N	{}	[]	2025-04-18 21:45:42.997	2025-04-18 21:45:42.997	2025-04-18 21:45:42.997	\N	\N	\N
66	xy95k2y82gajbf9v2c86i0l1	admin::transfer.tokens.create	{}	\N	{}	[]	2025-04-18 21:45:42.999	2025-04-18 21:45:42.999	2025-04-18 21:45:42.999	\N	\N	\N
67	a448mtby9s67b7pv31gq4lum	admin::transfer.tokens.read	{}	\N	{}	[]	2025-04-18 21:45:43.001	2025-04-18 21:45:43.001	2025-04-18 21:45:43.001	\N	\N	\N
68	h2new6jeljdr9k1s8b7mh5jr	admin::transfer.tokens.update	{}	\N	{}	[]	2025-04-18 21:45:43.003	2025-04-18 21:45:43.003	2025-04-18 21:45:43.003	\N	\N	\N
69	phlzpg48h9nme7lova7le7e5	admin::transfer.tokens.regenerate	{}	\N	{}	[]	2025-04-18 21:45:43.005	2025-04-18 21:45:43.005	2025-04-18 21:45:43.005	\N	\N	\N
70	s3s5kdk960iefb4b5xaq3125	admin::transfer.tokens.delete	{}	\N	{}	[]	2025-04-18 21:45:43.007	2025-04-18 21:45:43.007	2025-04-18 21:45:43.007	\N	\N	\N
1235	qki9o28wip1hgombaw4sq28o	plugin::content-manager.explorer.read	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "youtube", "twitter", "instagram", "tiktok", "ruc", "rd", "logo"]}	[]	2025-07-29 01:58:05.894	2025-07-29 01:58:05.894	2025-07-29 01:58:05.894	\N	\N	\N
1236	msup7y7h4zkxc70i2wiczlps	plugin::content-manager.explorer.update	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "youtube", "twitter", "instagram", "tiktok", "ruc", "rd", "logo"]}	[]	2025-07-29 01:58:05.898	2025-07-29 01:58:05.898	2025-07-29 01:58:05.898	\N	\N	\N
1011	e14qcnbdtlxs7npx0pjuiy9c	plugin::content-manager.explorer.delete	{}	api::matricula.matricula	{}	[]	2025-06-01 23:34:27.376	2025-06-01 23:34:27.376	2025-06-01 23:34:27.376	\N	\N	\N
620	iq61tyf1gvzbmt0k1o2z4zb5	plugin::content-manager.explorer.delete	{}	api::carrera.carrera	{}	[]	2025-05-27 23:47:01.98	2025-05-27 23:47:01.98	2025-05-27 23:47:01.98	\N	\N	\N
621	mptfdso67kwbpwlrgiutasmg	plugin::content-manager.explorer.publish	{}	api::carrera.carrera	{}	[]	2025-05-27 23:47:01.984	2025-05-27 23:47:01.984	2025-05-27 23:47:01.984	\N	\N	\N
800	cahnhm5iub4n4bjia3zpmozk	plugin::content-manager.explorer.create	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-05-28 15:58:23.958	2025-05-28 15:58:23.958	2025-05-28 15:58:23.959	\N	\N	\N
801	qgj3d314zlwpagstho3uzsam	plugin::content-manager.explorer.read	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-05-28 15:58:23.968	2025-05-28 15:58:23.968	2025-05-28 15:58:23.968	\N	\N	\N
635	oyjnufdvu9227r1o984a4czu	plugin::content-manager.explorer.delete	{}	api::grupo.grupo	{}	[]	2025-05-28 00:14:27.285	2025-05-28 00:14:27.285	2025-05-28 00:14:27.285	\N	\N	\N
636	lkngchx60bbhheeqpoezk04l	plugin::content-manager.explorer.publish	{}	api::grupo.grupo	{}	[]	2025-05-28 00:14:27.289	2025-05-28 00:14:27.289	2025-05-28 00:14:27.289	\N	\N	\N
802	qb8ct7p9ic2oveqansl78ikh	plugin::content-manager.explorer.update	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-05-28 15:58:23.973	2025-05-28 15:58:23.973	2025-05-28 15:58:23.973	\N	\N	\N
1012	awtlnx7h8um8bibdtgxf5dy7	plugin::content-manager.explorer.publish	{}	api::matricula.matricula	{}	[]	2025-06-01 23:34:27.38	2025-06-01 23:34:27.38	2025-06-01 23:34:27.38	\N	\N	\N
862	k7z3blt1ezhs0eq546tnwtet	plugin::content-manager.explorer.delete	{}	api::calendario.calendario	{}	[]	2025-05-30 00:16:18.81	2025-05-30 00:16:18.81	2025-05-30 00:16:18.81	\N	\N	\N
863	pbglnjb897o3pcv68xlvz7bu	plugin::content-manager.explorer.publish	{}	api::calendario.calendario	{}	[]	2025-05-30 00:16:18.814	2025-05-30 00:16:18.814	2025-05-30 00:16:18.814	\N	\N	\N
665	wn4v958rzsnghtdlvruuxqod	plugin::content-manager.explorer.delete	{}	api::personal.personal	{}	[]	2025-05-28 00:23:28.91	2025-05-28 00:23:28.91	2025-05-28 00:23:28.91	\N	\N	\N
666	eodeybe69cub1l3on1wgj7g4	plugin::content-manager.explorer.publish	{}	api::personal.personal	{}	[]	2025-05-28 00:23:28.915	2025-05-28 00:23:28.915	2025-05-28 00:23:28.915	\N	\N	\N
680	xwlds6v6cra9dx3sht6k4ljv	plugin::content-manager.explorer.delete	{}	api::semestre.semestre	{}	[]	2025-05-28 00:26:19.688	2025-05-28 00:26:19.688	2025-05-28 00:26:19.689	\N	\N	\N
681	jgkb6r0qiqouuvqk7qoz8xw4	plugin::content-manager.explorer.publish	{}	api::semestre.semestre	{}	[]	2025-05-28 00:26:19.695	2025-05-28 00:26:19.695	2025-05-28 00:26:19.695	\N	\N	\N
705	pmua9fmdkggfsxv0w70sv4mr	plugin::content-manager.explorer.create	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-05-28 07:51:21.422	2025-05-28 07:51:21.422	2025-05-28 07:51:21.422	\N	\N	\N
625	l4zrohbuk57jgle3914b0bkm	plugin::content-manager.explorer.delete	{}	api::familia.familia	{}	[]	2025-05-28 00:11:18.334	2025-05-28 00:11:18.334	2025-05-28 00:11:18.334	\N	\N	\N
626	ri1upnusnhuwvsbeg20k9y7c	plugin::content-manager.explorer.publish	{}	api::familia.familia	{}	[]	2025-05-28 00:11:18.339	2025-05-28 00:11:18.339	2025-05-28 00:11:18.339	\N	\N	\N
1253	qt8b96xs3wnjpsh9qvgb564w	plugin::content-manager.explorer.create	{}	api::publicacion.publicacion	{"fields": ["titulo", "slug", "tipo", "descripcionCorta", "contenido1", "contenido2", "fechaPublicacion", "fechaEventoInicio", "fechaEventoFin", "ubicacion", "destacado", "imagenPrincipal", "galeria", "videosYoutube.url"]}	[]	2025-08-10 21:34:59.499	2025-08-10 21:34:59.499	2025-08-10 21:34:59.499	\N	\N	\N
1254	u7t7ir0ykweud0skamr0kmnd	plugin::content-manager.explorer.read	{}	api::publicacion.publicacion	{"fields": ["titulo", "slug", "tipo", "descripcionCorta", "contenido1", "contenido2", "fechaPublicacion", "fechaEventoInicio", "fechaEventoFin", "ubicacion", "destacado", "imagenPrincipal", "galeria", "videosYoutube.url"]}	[]	2025-08-10 21:34:59.513	2025-08-10 21:34:59.513	2025-08-10 21:34:59.513	\N	\N	\N
1255	o6ieiv9a23oat5kox6rg0vyr	plugin::content-manager.explorer.update	{}	api::publicacion.publicacion	{"fields": ["titulo", "slug", "tipo", "descripcionCorta", "contenido1", "contenido2", "fechaPublicacion", "fechaEventoInicio", "fechaEventoFin", "ubicacion", "destacado", "imagenPrincipal", "galeria", "videosYoutube.url"]}	[]	2025-08-10 21:34:59.516	2025-08-10 21:34:59.516	2025-08-10 21:34:59.516	\N	\N	\N
670	r7jcjanz1s2dw8z2u0psa52h	plugin::content-manager.explorer.delete	{}	api::prueba.prueba	{}	[]	2025-05-28 00:24:30.193	2025-05-28 00:24:30.193	2025-05-28 00:24:30.194	\N	\N	\N
671	bugnci1z4ligpytq31gb8klu	plugin::content-manager.explorer.publish	{}	api::prueba.prueba	{}	[]	2025-05-28 00:24:30.197	2025-05-28 00:24:30.197	2025-05-28 00:24:30.197	\N	\N	\N
685	yna8mnft9tud0od5ibnyva9c	plugin::content-manager.explorer.delete	{}	api::dato-general.dato-general	{}	[]	2025-05-28 00:30:27.949	2025-05-28 00:30:27.949	2025-05-28 00:30:27.95	\N	\N	\N
686	yemhwy5z7n5xa07dzk6gnbkj	plugin::content-manager.explorer.publish	{}	api::dato-general.dato-general	{}	[]	2025-05-28 00:30:27.953	2025-05-28 00:30:27.953	2025-05-28 00:30:27.953	\N	\N	\N
1052	r6xbgt1uizhevkmfau0znxmq	plugin::content-manager.explorer.create	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	[]	2025-06-08 22:14:39.782	2025-06-08 22:14:39.782	2025-06-08 22:14:39.783	\N	\N	\N
1053	d1e12t35d6jtc8fnw59ysx11	plugin::content-manager.explorer.create	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	[]	2025-06-08 22:14:39.791	2025-06-08 22:14:39.791	2025-06-08 22:14:39.791	\N	\N	\N
1054	wlorxxvvd9rgqqrri2gvc8al	plugin::content-manager.explorer.read	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	[]	2025-06-08 22:14:39.794	2025-06-08 22:14:39.794	2025-06-08 22:14:39.794	\N	\N	\N
1055	oeqske2hz8355f1256lg2trp	plugin::content-manager.explorer.read	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	[]	2025-06-08 22:14:39.798	2025-06-08 22:14:39.798	2025-06-08 22:14:39.798	\N	\N	\N
1056	hd57qrzor6w0si1nepyqe5np	plugin::content-manager.explorer.update	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	[]	2025-06-08 22:14:39.802	2025-06-08 22:14:39.802	2025-06-08 22:14:39.802	\N	\N	\N
1057	clia729tjm2x07plrrxppq70	plugin::content-manager.explorer.update	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	[]	2025-06-08 22:14:39.805	2025-06-08 22:14:39.805	2025-06-08 22:14:39.805	\N	\N	\N
1078	ewu7dyrlwrgppkuz7vka5m0f	plugin::content-manager.explorer.create	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.559	2025-06-09 15:10:09.559	2025-06-09 15:10:09.56	\N	\N	\N
721	ay292a8f8ifxq4wx4u1in9mk	plugin::content-manager.explorer.read	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-05-28 07:51:21.462	2025-05-28 07:51:21.462	2025-05-28 07:51:21.463	\N	\N	\N
1079	g7kr4k1a0ps4m0bvoje5xihc	plugin::content-manager.explorer.read	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.562	2025-06-09 15:10:09.562	2025-06-09 15:10:09.562	\N	\N	\N
1080	o25igdh9ygyzizdlwzuwcshx	plugin::content-manager.explorer.update	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.565	2025-06-09 15:10:09.565	2025-06-09 15:10:09.565	\N	\N	\N
1081	pq00rb8poqz3yufmzzyc2kdi	plugin::content-manager.explorer.delete	{}	api::especialidad.especialidad	{}	[]	2025-06-09 15:10:09.567	2025-06-09 15:10:09.567	2025-06-09 15:10:09.567	\N	\N	\N
1082	d185ywpmxmpz0djwpcqo72wt	plugin::content-manager.explorer.publish	{}	api::especialidad.especialidad	{}	[]	2025-06-09 15:10:09.569	2025-06-09 15:10:09.569	2025-06-09 15:10:09.569	\N	\N	\N
1083	drg9p4eybgi1m9g676fawpqm	plugin::content-manager.explorer.create	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-06-09 15:10:09.571	2025-06-09 15:10:09.571	2025-06-09 15:10:09.571	\N	\N	\N
1084	ld7g1simzmc70loi31pqnen3	plugin::content-manager.explorer.read	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-06-09 15:10:09.574	2025-06-09 15:10:09.574	2025-06-09 15:10:09.575	\N	\N	\N
1085	zlvq5og556q7r8zxocrpuo4k	plugin::content-manager.explorer.update	{}	api::familia.familia	{"fields": ["titulo", "descripcion", "imagen", "Sector"]}	[]	2025-06-09 15:10:09.577	2025-06-09 15:10:09.577	2025-06-09 15:10:09.577	\N	\N	\N
1086	rnreiyj0gbkut4i3l3allybl	plugin::content-manager.explorer.delete	{}	api::familia.familia	{}	[]	2025-06-09 15:10:09.579	2025-06-09 15:10:09.579	2025-06-09 15:10:09.58	\N	\N	\N
1087	cuuu1yun2zy001sjxsnzufp1	plugin::content-manager.explorer.publish	{}	api::familia.familia	{}	[]	2025-06-09 15:10:09.582	2025-06-09 15:10:09.582	2025-06-09 15:10:09.582	\N	\N	\N
1088	vvc7jtaphkpxesvhah47dl3m	plugin::content-manager.explorer.create	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	[]	2025-06-09 15:10:09.584	2025-06-09 15:10:09.584	2025-06-09 15:10:09.584	\N	\N	\N
1245	rchte09656cj4qtdkrv1dx2y	plugin::content-manager.explorer.delete	{}	api::publicacion.publicacion	{}	[]	2025-07-29 20:14:11.503	2025-07-29 20:14:11.503	2025-07-29 20:14:11.504	\N	\N	\N
1246	krkijqevlj1umypp3fwac7vn	plugin::content-manager.explorer.publish	{}	api::publicacion.publicacion	{}	[]	2025-07-29 20:14:11.507	2025-07-29 20:14:11.507	2025-07-29 20:14:11.507	\N	\N	\N
1138	su4cgj4783ugwnd3v16kpa91	plugin::content-manager.single-types.configure-view	{}	\N	{}	[]	2025-06-09 15:12:16.802	2025-06-09 15:12:16.802	2025-06-09 15:12:16.802	\N	\N	\N
1139	apv5x42th4nk34u7v5j2iba1	plugin::content-manager.collection-types.configure-view	{}	\N	{}	[]	2025-06-09 15:12:16.808	2025-06-09 15:12:16.808	2025-06-09 15:12:16.808	\N	\N	\N
1140	sgfz7ibg8ti83fdcdhj5chht	plugin::content-manager.components.configure-layout	{}	\N	{}	[]	2025-06-09 15:12:16.811	2025-06-09 15:12:16.811	2025-06-09 15:12:16.811	\N	\N	\N
1141	y4y9lfruimsg1tv73row7xpn	plugin::content-type-builder.read	{}	\N	{}	[]	2025-06-09 15:12:16.814	2025-06-09 15:12:16.814	2025-06-09 15:12:16.814	\N	\N	\N
1142	e28juskjiifyurli3y9746uc	plugin::users-permissions.roles.create	{}	\N	{}	[]	2025-06-09 15:12:16.816	2025-06-09 15:12:16.816	2025-06-09 15:12:16.816	\N	\N	\N
1143	ys9y6y9iyi7cypapw6qlyd73	plugin::users-permissions.roles.read	{}	\N	{}	[]	2025-06-09 15:12:16.818	2025-06-09 15:12:16.818	2025-06-09 15:12:16.818	\N	\N	\N
660	atel1wkdhr9fw2vcubhngnxo	plugin::content-manager.explorer.delete	{}	api::paquete.paquete	{}	[]	2025-05-28 00:19:31.713	2025-05-28 00:19:31.713	2025-05-28 00:19:31.713	\N	\N	\N
661	u6ofd0jxze389q79g9q3doio	plugin::content-manager.explorer.publish	{}	api::paquete.paquete	{}	[]	2025-05-28 00:19:31.718	2025-05-28 00:19:31.718	2025-05-28 00:19:31.718	\N	\N	\N
1144	ybxs7yz1mca78nmtyf0d6s67	plugin::users-permissions.roles.update	{}	\N	{}	[]	2025-06-09 15:12:16.82	2025-06-09 15:12:16.82	2025-06-09 15:12:16.82	\N	\N	\N
1145	o6id64uh6y5r02dis6d4spad	plugin::users-permissions.roles.delete	{}	\N	{}	[]	2025-06-09 15:12:16.822	2025-06-09 15:12:16.822	2025-06-09 15:12:16.822	\N	\N	\N
1146	mdd006dffm2wrz218t2jv95c	plugin::users-permissions.providers.read	{}	\N	{}	[]	2025-06-09 15:12:16.824	2025-06-09 15:12:16.824	2025-06-09 15:12:16.824	\N	\N	\N
675	da29o3v7kjti3sntsv35gkty	plugin::content-manager.explorer.delete	{}	api::sector.sector	{}	[]	2025-05-28 00:25:26.83	2025-05-28 00:25:26.83	2025-05-28 00:25:26.83	\N	\N	\N
676	o4g5980g7plvum1fkye0y7b7	plugin::content-manager.explorer.publish	{}	api::sector.sector	{}	[]	2025-05-28 00:25:26.835	2025-05-28 00:25:26.835	2025-05-28 00:25:26.835	\N	\N	\N
1147	ieitk48cfhbctafu0dbfaj5m	plugin::users-permissions.providers.update	{}	\N	{}	[]	2025-06-09 15:12:16.826	2025-06-09 15:12:16.826	2025-06-09 15:12:16.826	\N	\N	\N
1148	rdsi9e3vw2klj1odgqsl63r5	plugin::users-permissions.email-templates.read	{}	\N	{}	[]	2025-06-09 15:12:16.828	2025-06-09 15:12:16.828	2025-06-09 15:12:16.828	\N	\N	\N
1005	tvt7x2d02j0q4fzw0wzspy3q	plugin::content-manager.explorer.create	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-01 23:02:13.705	2025-06-01 23:02:13.705	2025-06-01 23:02:13.706	\N	\N	\N
1006	pa9jjhabsngxwt80n5tur6nw	plugin::content-manager.explorer.read	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-01 23:02:13.716	2025-06-01 23:02:13.716	2025-06-01 23:02:13.716	\N	\N	\N
1007	knmhh4f70mqsq5jmxqsgjbyb	plugin::content-manager.explorer.update	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-01 23:02:13.722	2025-06-01 23:02:13.722	2025-06-01 23:02:13.722	\N	\N	\N
1149	fi0wjd6rzvpy49xrxpp0s8m3	plugin::users-permissions.email-templates.update	{}	\N	{}	[]	2025-06-09 15:12:16.831	2025-06-09 15:12:16.831	2025-06-09 15:12:16.831	\N	\N	\N
690	ynlpksrjmh1p86qv03emakji	plugin::content-manager.explorer.delete	{}	api::especialidad.especialidad	{}	[]	2025-05-28 00:32:03.267	2025-05-28 00:32:03.267	2025-05-28 00:32:03.267	\N	\N	\N
691	c2pgp31vx2pzi3je0luynq84	plugin::content-manager.explorer.publish	{}	api::especialidad.especialidad	{}	[]	2025-05-28 00:32:03.271	2025-05-28 00:32:03.271	2025-05-28 00:32:03.271	\N	\N	\N
1150	puqaucp7d6v9qblbmi2odloo	plugin::users-permissions.advanced-settings.read	{}	\N	{}	[]	2025-06-09 15:12:16.834	2025-06-09 15:12:16.834	2025-06-09 15:12:16.834	\N	\N	\N
1151	jappj7xamcae5yv0har1a74h	plugin::users-permissions.advanced-settings.update	{}	\N	{}	[]	2025-06-09 15:12:16.837	2025-06-09 15:12:16.837	2025-06-09 15:12:16.837	\N	\N	\N
1152	n5ihvxwpj4an4y0kfy13go9t	plugin::email.settings.read	{}	\N	{}	[]	2025-06-09 15:12:55.606	2025-06-09 15:12:55.606	2025-06-09 15:12:55.606	\N	\N	\N
737	kw61exfl7dxhz3e1bqdecgmg	plugin::content-manager.explorer.update	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-05-28 07:51:21.499	2025-05-28 07:51:21.499	2025-05-28 07:51:21.5	\N	\N	\N
1153	ypujhm36dlyxo99miwbaeu9e	plugin::upload.settings.read	{}	\N	{}	[]	2025-06-09 15:12:55.611	2025-06-09 15:12:55.611	2025-06-09 15:12:55.611	\N	\N	\N
1154	ttp30i8qr8vktme5quavve1l	plugin::i18n.locale.create	{}	\N	{}	[]	2025-06-09 15:12:55.614	2025-06-09 15:12:55.614	2025-06-09 15:12:55.614	\N	\N	\N
740	zotm1ihu651qn0aczocex8n6	plugin::content-manager.explorer.create	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-05-28 07:57:44.486	2025-05-28 07:57:44.486	2025-05-28 07:57:44.487	\N	\N	\N
741	sq61hvzv56cwmv1882d37gwp	plugin::content-manager.explorer.read	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-05-28 07:57:44.495	2025-05-28 07:57:44.495	2025-05-28 07:57:44.495	\N	\N	\N
742	sxhk63vq9mrbdbpxiuopsb45	plugin::content-manager.explorer.update	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-05-28 07:57:44.499	2025-05-28 07:57:44.499	2025-05-28 07:57:44.5	\N	\N	\N
743	gqhudgs0mk5vzffy47xarxed	plugin::content-manager.explorer.create	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-05-28 08:05:47.405	2025-05-28 08:05:47.405	2025-05-28 08:05:47.406	\N	\N	\N
744	oqaanm6kwesf5bem37gu4q3k	plugin::content-manager.explorer.read	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-05-28 08:05:47.413	2025-05-28 08:05:47.413	2025-05-28 08:05:47.414	\N	\N	\N
745	zjdagby2gccar9zjagwo9ixq	plugin::content-manager.explorer.update	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-05-28 08:05:47.419	2025-05-28 08:05:47.419	2025-05-28 08:05:47.419	\N	\N	\N
1155	l9bzvnm2yq75khbd9gpq4zx2	plugin::i18n.locale.read	{}	\N	{}	[]	2025-06-09 15:12:55.617	2025-06-09 15:12:55.617	2025-06-09 15:12:55.617	\N	\N	\N
1156	awjtj9o7tx75u06mbm871g0x	plugin::i18n.locale.update	{}	\N	{}	[]	2025-06-09 15:12:55.62	2025-06-09 15:12:55.62	2025-06-09 15:12:55.62	\N	\N	\N
1037	h1eibea4yhwy4n3kstff5nw9	plugin::content-manager.explorer.create	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	[]	2025-06-02 10:06:09.588	2025-06-02 10:06:09.588	2025-06-02 10:06:09.588	\N	\N	\N
1038	cpncmzai3urwd32mf3qmwofd	plugin::content-manager.explorer.create	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	[]	2025-06-02 10:06:09.597	2025-06-02 10:06:09.597	2025-06-02 10:06:09.598	\N	\N	\N
1039	ck4jb1bq3xxmp03sfi3nhk8q	plugin::content-manager.explorer.create	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	[]	2025-06-02 10:06:09.601	2025-06-02 10:06:09.601	2025-06-02 10:06:09.601	\N	\N	\N
1040	bsa57lvji97k649utu10ra6x	plugin::content-manager.explorer.read	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	[]	2025-06-02 10:06:09.607	2025-06-02 10:06:09.607	2025-06-02 10:06:09.607	\N	\N	\N
1041	dwmulbh0x8ohrbcg54twd2v9	plugin::content-manager.explorer.read	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	[]	2025-06-02 10:06:09.612	2025-06-02 10:06:09.612	2025-06-02 10:06:09.613	\N	\N	\N
1042	noj0c8b7udwvtcjutwk0r6xa	plugin::content-manager.explorer.read	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	[]	2025-06-02 10:06:09.616	2025-06-02 10:06:09.616	2025-06-02 10:06:09.616	\N	\N	\N
1043	hkxcopyxa9o6josog7ywntdv	plugin::content-manager.explorer.update	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	[]	2025-06-02 10:06:09.621	2025-06-02 10:06:09.621	2025-06-02 10:06:09.621	\N	\N	\N
1044	bieurrktd4wgapcb0vvfhu2x	plugin::content-manager.explorer.update	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	[]	2025-06-02 10:06:09.625	2025-06-02 10:06:09.625	2025-06-02 10:06:09.626	\N	\N	\N
1045	ixgqu5xqzv16le5msivqcvxs	plugin::content-manager.explorer.update	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	[]	2025-06-02 10:06:09.629	2025-06-02 10:06:09.629	2025-06-02 10:06:09.629	\N	\N	\N
809	h5dqxovpm4m8xedqz234b2iz	plugin::content-manager.explorer.delete	{}	api::modulo.modulo	{}	[]	2025-05-29 12:53:24.253	2025-05-29 12:53:24.253	2025-05-29 12:53:24.253	\N	\N	\N
810	fhud3v6lqjva95ww3n3xr9e9	plugin::content-manager.explorer.publish	{}	api::modulo.modulo	{}	[]	2025-05-29 12:53:24.259	2025-05-29 12:53:24.259	2025-05-29 12:53:24.259	\N	\N	\N
1061	uji4hcicri3cf53r0vvr75po	plugin::content-manager.explorer.delete	{}	plugin::users-permissions.user	{}	[]	2025-06-09 15:10:09.499	2025-06-09 15:10:09.499	2025-06-09 15:10:09.5	\N	\N	\N
1062	ws56qs0opum988lidhcapb6c	plugin::content-manager.explorer.publish	{}	plugin::users-permissions.user	{}	[]	2025-06-09 15:10:09.507	2025-06-09 15:10:09.507	2025-06-09 15:10:09.507	\N	\N	\N
1063	lq0zmfzbvc84jf70xiauaerr	plugin::content-manager.explorer.create	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-06-09 15:10:09.511	2025-06-09 15:10:09.511	2025-06-09 15:10:09.511	\N	\N	\N
1064	rki3lxnc96xbjq7fo7zqi3p5	plugin::content-manager.explorer.read	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-06-09 15:10:09.515	2025-06-09 15:10:09.515	2025-06-09 15:10:09.515	\N	\N	\N
1065	kznufgan50rqgngsevwmfsas	plugin::content-manager.explorer.update	{}	api::act-economica.act-economica	{"fields": ["titulo", "descripcion", "imagen", "especialidad", "familia"]}	[]	2025-06-09 15:10:09.519	2025-06-09 15:10:09.519	2025-06-09 15:10:09.519	\N	\N	\N
1066	kol9wfrzjd6vbk33zt80c1d8	plugin::content-manager.explorer.delete	{}	api::act-economica.act-economica	{}	[]	2025-06-09 15:10:09.523	2025-06-09 15:10:09.523	2025-06-09 15:10:09.523	\N	\N	\N
1067	rj1rl8fjla23r0q6a17eimm6	plugin::content-manager.explorer.publish	{}	api::act-economica.act-economica	{}	[]	2025-06-09 15:10:09.525	2025-06-09 15:10:09.525	2025-06-09 15:10:09.525	\N	\N	\N
1068	lkmuvrzriaaevnj5zfziflfm	plugin::content-manager.explorer.create	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	[]	2025-06-09 15:10:09.528	2025-06-09 15:10:09.528	2025-06-09 15:10:09.528	\N	\N	\N
1071	wod0b1ewivmb3s8ilvjmudeo	plugin::content-manager.explorer.delete	{}	api::calendario.calendario	{}	[]	2025-06-09 15:10:09.54	2025-06-09 15:10:09.54	2025-06-09 15:10:09.54	\N	\N	\N
1072	l5rwpjgbejm11fo18hrjz9jx	plugin::content-manager.explorer.publish	{}	api::calendario.calendario	{}	[]	2025-06-09 15:10:09.543	2025-06-09 15:10:09.543	2025-06-09 15:10:09.543	\N	\N	\N
1076	xmbtn181cf0exbvjy15kjkcw	plugin::content-manager.explorer.delete	{}	api::carrera.carrera	{}	[]	2025-06-09 15:10:09.554	2025-06-09 15:10:09.554	2025-06-09 15:10:09.554	\N	\N	\N
1077	tpul8npafj72xtbb2ea33ylt	plugin::content-manager.explorer.publish	{}	api::carrera.carrera	{}	[]	2025-06-09 15:10:09.557	2025-06-09 15:10:09.557	2025-06-09 15:10:09.557	\N	\N	\N
1090	e5l9cm7tqnl4zn9ucnu3x4x6	plugin::content-manager.explorer.update	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	[]	2025-06-09 15:10:09.594	2025-06-09 15:10:09.594	2025-06-09 15:10:09.594	\N	\N	\N
1091	uit6tn7nwyxnrrg44e1hb42l	plugin::content-manager.explorer.delete	{}	api::grupo.grupo	{}	[]	2025-06-09 15:10:09.596	2025-06-09 15:10:09.596	2025-06-09 15:10:09.596	\N	\N	\N
1092	hmfm8ozbh9gtrfnlvbwtl02m	plugin::content-manager.explorer.publish	{}	api::grupo.grupo	{}	[]	2025-06-09 15:10:09.598	2025-06-09 15:10:09.598	2025-06-09 15:10:09.598	\N	\N	\N
1093	wtkyf6mmovx81hs7tly26vb2	plugin::content-manager.explorer.create	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	[]	2025-06-09 15:10:09.601	2025-06-09 15:10:09.601	2025-06-09 15:10:09.601	\N	\N	\N
1095	v6ukxeshznviqmbusuixt2ub	plugin::content-manager.explorer.update	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	[]	2025-06-09 15:10:09.607	2025-06-09 15:10:09.607	2025-06-09 15:10:09.607	\N	\N	\N
1096	u93dwuv9lo2o7g2hc82qmgq4	plugin::content-manager.explorer.delete	{}	api::matricula.matricula	{}	[]	2025-06-09 15:10:09.611	2025-06-09 15:10:09.611	2025-06-09 15:10:09.611	\N	\N	\N
1097	khfba6uk90mcgsaw3jdc9eor	plugin::content-manager.explorer.publish	{}	api::matricula.matricula	{}	[]	2025-06-09 15:10:09.613	2025-06-09 15:10:09.613	2025-06-09 15:10:09.613	\N	\N	\N
1098	p5mq4eqlig2hk9k6h9sknulw	plugin::content-manager.explorer.create	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera"]}	[]	2025-06-09 15:10:09.616	2025-06-09 15:10:09.616	2025-06-09 15:10:09.616	\N	\N	\N
1099	bozvaoi3mgrty8kly2aqqqww	plugin::content-manager.explorer.read	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera"]}	[]	2025-06-09 15:10:09.619	2025-06-09 15:10:09.619	2025-06-09 15:10:09.619	\N	\N	\N
1100	xlc8emhefuly9uo7z1kon46z	plugin::content-manager.explorer.update	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera"]}	[]	2025-06-09 15:10:09.622	2025-06-09 15:10:09.622	2025-06-09 15:10:09.622	\N	\N	\N
1101	v1nrvya7hmszekn8vcmhyp9z	plugin::content-manager.explorer.delete	{}	api::modulo.modulo	{}	[]	2025-06-09 15:10:09.625	2025-06-09 15:10:09.625	2025-06-09 15:10:09.625	\N	\N	\N
1102	fhgktq8ja5k178rrjm54wl73	plugin::content-manager.explorer.publish	{}	api::modulo.modulo	{}	[]	2025-06-09 15:10:09.627	2025-06-09 15:10:09.627	2025-06-09 15:10:09.627	\N	\N	\N
1108	gqxiin0xzryy99mconeaepz4	plugin::content-manager.explorer.create	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	[]	2025-06-09 15:10:09.642	2025-06-09 15:10:09.642	2025-06-09 15:10:09.642	\N	\N	\N
1110	cmxgc9qquyxjffje82gb28jk	plugin::content-manager.explorer.update	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	[]	2025-06-09 15:10:09.646	2025-06-09 15:10:09.646	2025-06-09 15:10:09.647	\N	\N	\N
1111	mat7oswr3go56flkdoxmq8u1	plugin::content-manager.explorer.delete	{}	api::paquete.paquete	{}	[]	2025-06-09 15:10:09.649	2025-06-09 15:10:09.649	2025-06-09 15:10:09.649	\N	\N	\N
1112	eban3vdm7unuqtqo2drwi7nx	plugin::content-manager.explorer.publish	{}	api::paquete.paquete	{}	[]	2025-06-09 15:10:09.651	2025-06-09 15:10:09.651	2025-06-09 15:10:09.651	\N	\N	\N
1113	qjtckk4yz4uap6vk9a35zuxg	plugin::content-manager.explorer.create	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-09 15:10:09.653	2025-06-09 15:10:09.653	2025-06-09 15:10:09.653	\N	\N	\N
1114	el4t7d37pr3g21zwsn9qo2xz	plugin::content-manager.explorer.read	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-09 15:10:09.655	2025-06-09 15:10:09.655	2025-06-09 15:10:09.655	\N	\N	\N
1115	z4eisn5icgxjl1of3ji492l1	plugin::content-manager.explorer.update	{}	api::personal.personal	{"fields": ["display_name", "user", "memo", "especialidad"]}	[]	2025-06-09 15:10:09.658	2025-06-09 15:10:09.658	2025-06-09 15:10:09.658	\N	\N	\N
1116	okn1mn2z2c6vf8gol24uvuw6	plugin::content-manager.explorer.delete	{}	api::personal.personal	{}	[]	2025-06-09 15:10:09.66	2025-06-09 15:10:09.66	2025-06-09 15:10:09.66	\N	\N	\N
1117	rg3qpx3b731qpz8tz7ueu5l1	plugin::content-manager.explorer.publish	{}	api::personal.personal	{}	[]	2025-06-09 15:10:09.662	2025-06-09 15:10:09.662	2025-06-09 15:10:09.662	\N	\N	\N
1118	rnlxf1j2hdv23gkb0wfjglfc	plugin::content-manager.explorer.create	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-06-09 15:10:09.665	2025-06-09 15:10:09.665	2025-06-09 15:10:09.665	\N	\N	\N
1119	bv4mu2kzov9h3zh6r8aersba	plugin::content-manager.explorer.read	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-06-09 15:10:09.668	2025-06-09 15:10:09.668	2025-06-09 15:10:09.668	\N	\N	\N
1120	vpaqzi1o6m4emz1d8xsbqdpr	plugin::content-manager.explorer.update	{}	api::prueba.prueba	{"fields": ["Descripcion", "Descripcion_2", "Descripcion_3"]}	[]	2025-06-09 15:10:09.67	2025-06-09 15:10:09.67	2025-06-09 15:10:09.67	\N	\N	\N
1121	mpalvl1yh0ljhqdpys94oiu9	plugin::content-manager.explorer.delete	{}	api::prueba.prueba	{}	[]	2025-06-09 15:10:09.674	2025-06-09 15:10:09.674	2025-06-09 15:10:09.674	\N	\N	\N
1122	a6ddfdrklx4coj64nyf3r9ur	plugin::content-manager.explorer.publish	{}	api::prueba.prueba	{}	[]	2025-06-09 15:10:09.677	2025-06-09 15:10:09.677	2025-06-09 15:10:09.677	\N	\N	\N
1123	oftgfdft2k5k16og41cyb610	plugin::content-manager.explorer.create	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.68	2025-06-09 15:10:09.68	2025-06-09 15:10:09.68	\N	\N	\N
1124	m9g68vlrym1y0dh4fgj2ft3m	plugin::content-manager.explorer.read	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.683	2025-06-09 15:10:09.683	2025-06-09 15:10:09.683	\N	\N	\N
1157	j3fv1jmtt4hp6u4h8w4h6crq	plugin::i18n.locale.delete	{}	\N	{}	[]	2025-06-09 15:12:55.623	2025-06-09 15:12:55.623	2025-06-09 15:12:55.623	\N	\N	\N
1125	wtvwymq7k44jx4gy7vucw4g6	plugin::content-manager.explorer.update	{}	api::sector.sector	{"fields": ["titulo", "descripcion", "imagen"]}	[]	2025-06-09 15:10:09.685	2025-06-09 15:10:09.685	2025-06-09 15:10:09.685	\N	\N	\N
1126	xgit42oznxhyvv24bj2kgia3	plugin::content-manager.explorer.delete	{}	api::sector.sector	{}	[]	2025-06-09 15:10:09.688	2025-06-09 15:10:09.688	2025-06-09 15:10:09.688	\N	\N	\N
1127	y3pfxbpv8syn7zwh30dx2c3a	plugin::content-manager.explorer.publish	{}	api::sector.sector	{}	[]	2025-06-09 15:10:09.691	2025-06-09 15:10:09.691	2025-06-09 15:10:09.691	\N	\N	\N
1128	vhygi26u3rmsqmctb4s603o0	plugin::content-manager.explorer.create	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	[]	2025-06-09 15:10:09.693	2025-06-09 15:10:09.693	2025-06-09 15:10:09.693	\N	\N	\N
1130	oj2htsroicz6zsq8h99pbfcm	plugin::content-manager.explorer.update	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	[]	2025-06-09 15:10:09.699	2025-06-09 15:10:09.699	2025-06-09 15:10:09.699	\N	\N	\N
1131	tr67g9rrxs495yozftwd7j2s	plugin::content-manager.explorer.delete	{}	api::semestre.semestre	{}	[]	2025-06-09 15:10:09.703	2025-06-09 15:10:09.703	2025-06-09 15:10:09.703	\N	\N	\N
1132	lb83lfabb5xnbgtypf5j1ouc	plugin::content-manager.explorer.publish	{}	api::semestre.semestre	{}	[]	2025-06-09 15:10:09.705	2025-06-09 15:10:09.705	2025-06-09 15:10:09.705	\N	\N	\N
1133	cadf0kt31ern72mjkj6qeepb	plugin::content-manager.explorer.create	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "ruc", "rd", "logo"]}	[]	2025-06-09 15:10:34.122	2025-06-09 15:10:34.122	2025-06-09 15:10:34.122	\N	\N	\N
1134	qwukwyyxwmvgubfuqinprcx2	plugin::content-manager.explorer.read	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "ruc", "rd", "logo"]}	[]	2025-06-09 15:10:34.127	2025-06-09 15:10:34.127	2025-06-09 15:10:34.128	\N	\N	\N
1135	n54mdxlyj3m65jjq0opny19w	plugin::content-manager.explorer.update	{}	api::dato-general.dato-general	{"fields": ["nombreInstitucion", "direccion", "telefono1", "telefono2", "correo", "paginaWeb", "facebook", "ruc", "rd", "logo"]}	[]	2025-06-09 15:10:34.13	2025-06-09 15:10:34.13	2025-06-09 15:10:34.13	\N	\N	\N
1136	o5mfk6m0hx09hsy2ufq7ttep	plugin::content-manager.explorer.delete	{}	api::dato-general.dato-general	{}	[]	2025-06-09 15:10:34.134	2025-06-09 15:10:34.134	2025-06-09 15:10:34.134	\N	\N	\N
1137	dsscxww04yo8xsgvrtkqqkww	plugin::content-manager.explorer.publish	{}	api::dato-general.dato-general	{}	[]	2025-06-09 15:10:34.139	2025-06-09 15:10:34.139	2025-06-09 15:10:34.139	\N	\N	\N
1158	j6fvd0xpg1j486o7mng8liq6	admin::marketplace.read	{}	\N	{}	[]	2025-06-09 15:12:55.626	2025-06-09 15:12:55.626	2025-06-09 15:12:55.626	\N	\N	\N
1159	by5os98uaw6p8b7nuqi5fw1l	admin::users.create	{}	\N	{}	[]	2025-06-09 15:12:55.629	2025-06-09 15:12:55.629	2025-06-09 15:12:55.629	\N	\N	\N
1160	esruc46r002qxhdwnkgagobq	admin::users.read	{}	\N	{}	[]	2025-06-09 15:12:55.632	2025-06-09 15:12:55.632	2025-06-09 15:12:55.632	\N	\N	\N
1161	sx93erctyln0z65qlnk9sasw	admin::users.update	{}	\N	{}	[]	2025-06-09 15:12:55.634	2025-06-09 15:12:55.634	2025-06-09 15:12:55.634	\N	\N	\N
1162	rvh9hkxufvrtfjds84jw3mut	admin::users.delete	{}	\N	{}	[]	2025-06-09 15:12:55.637	2025-06-09 15:12:55.637	2025-06-09 15:12:55.637	\N	\N	\N
1163	sthux5b9d2zr4pejct8sqjjo	admin::roles.create	{}	\N	{}	[]	2025-06-09 15:12:55.639	2025-06-09 15:12:55.639	2025-06-09 15:12:55.639	\N	\N	\N
1164	gfphjgr7rmzdpmmdcmwy0twr	admin::roles.read	{}	\N	{}	[]	2025-06-09 15:12:55.641	2025-06-09 15:12:55.641	2025-06-09 15:12:55.641	\N	\N	\N
1165	snbz5uq193ov4wzaolr8fom1	admin::roles.update	{}	\N	{}	[]	2025-06-09 15:12:55.643	2025-06-09 15:12:55.643	2025-06-09 15:12:55.643	\N	\N	\N
1166	pnuz8gftz9li9wmzmfjoi23c	admin::roles.delete	{}	\N	{}	[]	2025-06-09 15:12:55.646	2025-06-09 15:12:55.646	2025-06-09 15:12:55.646	\N	\N	\N
1167	kyd5i73ecokyxyf0xm842s2k	admin::project-settings.update	{}	\N	{}	[]	2025-06-09 15:12:55.648	2025-06-09 15:12:55.648	2025-06-09 15:12:55.648	\N	\N	\N
1168	aag6nld6p7q41h5vef8njf9u	admin::project-settings.read	{}	\N	{}	[]	2025-06-09 15:12:55.651	2025-06-09 15:12:55.651	2025-06-09 15:12:55.651	\N	\N	\N
1169	uzhpez7gh0ylw0dj4px6luyw	admin::transfer.tokens.access	{}	\N	{}	[]	2025-06-09 15:12:55.653	2025-06-09 15:12:55.653	2025-06-09 15:12:55.653	\N	\N	\N
1170	w78vgqor4wsv61nci3uoqbyx	admin::transfer.tokens.create	{}	\N	{}	[]	2025-06-09 15:12:55.655	2025-06-09 15:12:55.655	2025-06-09 15:12:55.655	\N	\N	\N
1171	ufscfqi62xepj02r1lrwul2y	admin::transfer.tokens.read	{}	\N	{}	[]	2025-06-09 15:12:55.658	2025-06-09 15:12:55.658	2025-06-09 15:12:55.658	\N	\N	\N
1172	jsvjnlhkp1rp0ss8lunk2f01	admin::transfer.tokens.update	{}	\N	{}	[]	2025-06-09 15:12:55.66	2025-06-09 15:12:55.66	2025-06-09 15:12:55.66	\N	\N	\N
1173	euuli7tqpna6w200ozloks6a	admin::transfer.tokens.regenerate	{}	\N	{}	[]	2025-06-09 15:12:55.663	2025-06-09 15:12:55.663	2025-06-09 15:12:55.663	\N	\N	\N
1174	qmoiwdb03izkq3x39vq9eovl	admin::transfer.tokens.delete	{}	\N	{}	[]	2025-06-09 15:12:55.666	2025-06-09 15:12:55.666	2025-06-09 15:12:55.666	\N	\N	\N
1177	vyqfyekcly7clgazirfp3xvr	plugin::content-manager.explorer.update	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	[]	2025-06-09 16:15:19.317	2025-06-09 16:15:19.317	2025-06-09 16:15:19.317	\N	\N	\N
1178	jq1x3pn9dsnf1bal66l9ce5x	plugin::content-manager.explorer.read	{}	api::calendario.calendario	{"fields": ["titulo", "descripcion", "fecha-ini", "fecha-fin", "tipo", "semestre", "archivado"]}	["admin::only-no-archived"]	2025-06-10 11:20:14.445	2025-06-10 11:20:14.445	2025-06-10 11:20:14.446	\N	\N	\N
1179	jrrud0bc5fyu3lm1i7c6zw42	plugin::content-manager.explorer.read	{}	api::grupo.grupo	{"fields": ["nombre_display", "turno", "calendario", "modulo", "descripcion", "personal", "archivado"]}	["admin::only-no-archived"]	2025-06-10 11:25:35.241	2025-06-10 11:25:35.241	2025-06-10 11:25:35.241	\N	\N	\N
1180	ip6tco01cjgpmywgt44g8zzf	plugin::content-manager.explorer.read	{}	api::matricula.matricula	{"fields": ["recibo", "fecha", "grupo", "paquete", "users", "archivado"]}	["admin::only-no-archived"]	2025-06-10 11:27:51.11	2025-06-10 11:27:51.11	2025-06-10 11:27:51.11	\N	\N	\N
1181	idqfftb7qf33q7nrkg0z0eb4	plugin::content-manager.explorer.read	{}	api::paquete.paquete	{"fields": ["titulo", "descripcion", "grupos", "archivado"]}	["admin::only-no-archived"]	2025-06-10 11:27:51.115	2025-06-10 11:27:51.115	2025-06-10 11:27:51.115	\N	\N	\N
1182	mhh42rfys3dg852tcktqu9x8	plugin::content-manager.explorer.read	{}	api::semestre.semestre	{"fields": ["titulo", "descripcion", "director", "coordinador_1", "coordinador_2", "archivado"]}	["admin::only-no-archived"]	2025-06-10 11:35:39.579	2025-06-10 11:35:39.579	2025-06-10 11:35:39.579	\N	\N	\N
1183	sl0mh7dvm02dgko4ii3q4717	plugin::content-manager.explorer.create	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-19 14:59:35.613	2025-06-19 14:59:35.613	2025-06-19 14:59:35.614	\N	\N	\N
1184	a2m7addjpmlo9hxgc8lzo148	plugin::content-manager.explorer.read	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-19 14:59:35.626	2025-06-19 14:59:35.626	2025-06-19 14:59:35.627	\N	\N	\N
1185	v9e0qls1asc3ggujl7yddkf1	plugin::content-manager.explorer.update	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-19 14:59:35.629	2025-06-19 14:59:35.629	2025-06-19 14:59:35.63	\N	\N	\N
1186	z1uttjd9a91ub3cnophuwrtl	plugin::content-manager.explorer.create	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-24 12:43:49.61	2025-06-24 12:43:49.61	2025-06-24 12:43:49.611	\N	\N	\N
1187	dvdu7c0847xz7wckevlquw9b	plugin::content-manager.explorer.read	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-24 12:43:49.632	2025-06-24 12:43:49.632	2025-06-24 12:43:49.632	\N	\N	\N
1188	s5j2l8p70mt8pv07ogwj0hpx	plugin::content-manager.explorer.update	{}	plugin::users-permissions.user	{"fields": ["username", "email", "provider", "password", "resetPasswordToken", "confirmationToken", "confirmed", "blocked", "role", "nombre", "apellido_materno", "apellido_paterno", "apellidos", "celular", "fecha_nacimiento", "direccion", "distrito", "avatar", "foto", "tipo_documento", "dni", "dni_frente", "dni_reverso", "sexo", "estado_civil", "telefono", "instruccion"]}	[]	2025-06-24 12:43:49.636	2025-06-24 12:43:49.636	2025-06-24 12:43:49.636	\N	\N	\N
1192	dz35pbmr83x8wxzpsa1g4n9c	plugin::content-manager.explorer.create	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "creditos", "nivel", "imagen", "act-economica"]}	[]	2025-06-27 09:39:26.136	2025-06-27 09:39:26.136	2025-06-27 09:39:26.137	\N	\N	\N
1193	bwnpeatvjhtbhxmlyw0lmd3w	plugin::content-manager.explorer.read	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "creditos", "nivel", "imagen", "act-economica"]}	[]	2025-06-27 09:39:26.143	2025-06-27 09:39:26.143	2025-06-27 09:39:26.143	\N	\N	\N
1194	ayj7z7923pt8hplgrcfogq3m	plugin::content-manager.explorer.update	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "creditos", "nivel", "imagen", "act-economica"]}	[]	2025-06-27 09:39:26.146	2025-06-27 09:39:26.146	2025-06-27 09:39:26.146	\N	\N	\N
1204	woadey3s92fo4lipunmytqru	plugin::content-manager.explorer.create	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen", "imagenes", "descripcion2", "slug"]}	[]	2025-07-13 18:36:01.077	2025-07-13 18:36:01.077	2025-07-13 18:36:01.078	\N	\N	\N
1205	ibficf9xe1iql2ek11n8f9l3	plugin::content-manager.explorer.read	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen", "imagenes", "descripcion2", "slug"]}	[]	2025-07-13 18:36:01.094	2025-07-13 18:36:01.094	2025-07-13 18:36:01.094	\N	\N	\N
1206	kxfviqujuy6yvw850oapr4bq	plugin::content-manager.explorer.update	{}	api::especialidad.especialidad	{"fields": ["titulo", "titulo-comercial", "descripcion", "imagen", "imagenes", "descripcion2", "slug"]}	[]	2025-07-13 18:36:01.1	2025-07-13 18:36:01.1	2025-07-13 18:36:01.1	\N	\N	\N
1216	h00inoybobehnepiwfetnv5i	plugin::content-manager.explorer.create	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "descripcion2", "creditos", "nivel", "imagen", "imagenes", "act-economica", "slug"]}	[]	2025-07-26 17:35:16.977	2025-07-26 17:35:16.977	2025-07-26 17:35:16.978	\N	\N	\N
1217	famfsd2cz0o6ypllsj2c7ws6	plugin::content-manager.explorer.create	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "descripcion2", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera", "slug", "videosYoutube.url"]}	[]	2025-07-26 17:35:16.985	2025-07-26 17:35:16.985	2025-07-26 17:35:16.986	\N	\N	\N
1218	w0rtonx205jz7rdju1o2efth	plugin::content-manager.explorer.read	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "descripcion2", "creditos", "nivel", "imagen", "imagenes", "act-economica", "slug"]}	[]	2025-07-26 17:35:16.991	2025-07-26 17:35:16.991	2025-07-26 17:35:16.991	\N	\N	\N
1219	twpoab5ux8l1t3tt4xmzo7ih	plugin::content-manager.explorer.read	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "descripcion2", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera", "slug", "videosYoutube.url"]}	[]	2025-07-26 17:35:16.994	2025-07-26 17:35:16.994	2025-07-26 17:35:16.994	\N	\N	\N
1220	kop86t2uzqvihl84do9oyjgw	plugin::content-manager.explorer.update	{}	api::carrera.carrera	{"fields": ["titulo", "titulo-comercial", "codigo", "descripcion", "duracion", "descripcion2", "creditos", "nivel", "imagen", "imagenes", "act-economica", "slug"]}	[]	2025-07-26 17:35:16.998	2025-07-26 17:35:16.998	2025-07-26 17:35:16.998	\N	\N	\N
1221	pvr3ulj8q0bmqekdyt2idqy5	plugin::content-manager.explorer.update	{}	api::modulo.modulo	{"fields": ["titulo", "titulo-comercial", "orden", "descripcion", "descripcion2", "horas", "creditos", "metas", "imagenes", "imagen", "activo", "carrera", "slug", "videosYoutube.url"]}	[]	2025-07-26 17:35:17.001	2025-07-26 17:35:17.001	2025-07-26 17:35:17.001	\N	\N	\N
\.


--
-- Data for Name: admin_permissions_role_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_permissions_role_lnk (id, permission_id, role_id, permission_ord) FROM stdin;
1	1	2	1
2	2	2	2
3	3	2	3
4	4	2	4
5	5	2	5
6	6	2	6
7	7	3	1
8	8	3	2
9	9	3	3
10	10	3	4
11	11	3	5
12	12	3	6
1234	1234	1	724
1235	1235	1	725
1236	1236	1	726
16	16	1	4
17	17	1	5
18	18	1	6
19	19	1	7
20	20	1	8
21	21	1	9
22	22	1	10
23	23	1	11
24	24	1	12
25	25	1	13
26	26	1	14
27	27	1	15
28	28	1	16
29	29	1	17
30	30	1	18
31	31	1	19
32	32	1	20
33	33	1	21
34	34	1	22
35	35	1	23
36	36	1	24
37	37	1	25
38	38	1	26
39	39	1	27
40	40	1	28
41	41	1	29
42	42	1	30
43	43	1	31
44	44	1	32
45	45	1	33
46	46	1	34
47	47	1	35
48	48	1	36
49	49	1	37
50	50	1	38
51	51	1	39
52	52	1	40
53	53	1	41
54	54	1	42
55	55	1	43
56	56	1	44
57	57	1	45
58	58	1	46
59	59	1	47
60	60	1	48
61	61	1	49
62	62	1	50
63	63	1	51
64	64	1	52
65	65	1	53
66	66	1	54
67	67	1	55
68	68	1	56
69	69	1	57
70	70	1	58
615	615	1	437
616	616	1	438
620	620	1	442
621	621	1	443
1011	1011	1	675
1012	1012	1	676
1245	1245	1	730
625	625	1	447
626	626	1	448
1246	1246	1	731
1253	1253	1	732
1254	1254	1	733
1255	1255	1	734
635	635	1	457
636	636	1	458
862	862	1	618
863	863	1	619
800	800	1	598
801	801	1	599
802	802	1	600
660	660	1	482
661	661	1	483
1037	1037	1	694
665	665	1	487
666	666	1	488
1038	1038	1	695
1039	1039	1	696
1040	1040	1	697
670	670	1	492
671	671	1	493
809	809	1	607
810	810	1	608
1041	1041	1	698
675	675	1	497
676	676	1	498
1042	1042	1	699
1043	1043	1	700
680	680	1	502
681	681	1	503
1044	1044	1	701
685	685	1	507
686	686	1	508
1045	1045	1	702
690	690	1	512
691	691	1	513
1052	1052	1	703
1053	1053	1	704
1054	1054	1	705
1055	1055	1	706
1056	1056	1	707
1057	1057	1	708
705	705	1	527
1061	1061	2	10
1062	1062	2	11
1063	1063	2	12
1064	1064	2	13
721	721	1	543
737	737	1	559
740	740	1	562
741	741	1	563
742	742	1	564
743	743	1	565
744	744	1	566
745	745	1	567
1005	1005	1	669
1006	1006	1	670
1007	1007	1	671
1065	1065	2	14
1066	1066	2	15
1067	1067	2	16
1068	1068	2	17
1071	1071	2	20
1072	1072	2	21
1076	1076	2	25
1077	1077	2	26
1078	1078	2	27
1079	1079	2	28
1080	1080	2	29
1081	1081	2	30
1082	1082	2	31
1083	1083	2	32
1084	1084	2	33
1085	1085	2	34
1086	1086	2	35
1087	1087	2	36
1088	1088	2	37
1090	1090	2	39
1091	1091	2	40
1092	1092	2	41
1093	1093	2	42
1095	1095	2	44
1096	1096	2	45
1097	1097	2	46
1098	1098	2	47
1099	1099	2	48
1100	1100	2	49
1101	1101	2	50
1102	1102	2	51
1108	1108	2	57
1110	1110	2	59
1111	1111	2	60
1112	1112	2	61
1113	1113	2	62
1114	1114	2	63
1115	1115	2	64
1116	1116	2	65
1117	1117	2	66
1118	1118	2	67
1119	1119	2	68
1120	1120	2	69
1121	1121	2	70
1122	1122	2	71
1123	1123	2	72
1124	1124	2	73
1125	1125	2	74
1126	1126	2	75
1127	1127	2	76
1128	1128	2	77
1130	1130	2	79
1131	1131	2	80
1132	1132	2	81
1133	1133	2	82
1134	1134	2	83
1135	1135	2	84
1136	1136	2	85
1137	1137	2	86
1138	1138	2	87
1139	1139	2	88
1140	1140	2	89
1141	1141	2	90
1142	1142	2	91
1143	1143	2	92
1144	1144	2	93
1145	1145	2	94
1146	1146	2	95
1147	1147	2	96
1148	1148	2	97
1149	1149	2	98
1150	1150	2	99
1151	1151	2	100
1152	1152	2	101
1153	1153	2	102
1154	1154	2	103
1155	1155	2	104
1156	1156	2	105
1157	1157	2	106
1158	1158	2	107
1159	1159	2	108
1160	1160	2	109
1161	1161	2	110
1162	1162	2	111
1163	1163	2	112
1164	1164	2	113
1165	1165	2	114
1166	1166	2	115
1167	1167	2	116
1168	1168	2	117
1169	1169	2	118
1170	1170	2	119
1171	1171	2	120
1172	1172	2	121
1173	1173	2	122
1174	1174	2	123
1177	1177	2	125
1178	1178	2	126
1179	1179	2	127
1180	1180	2	128
1181	1181	2	129
1182	1182	2	130
1183	1183	1	709
1184	1184	1	710
1185	1185	1	711
1186	1186	2	131
1187	1187	2	132
1188	1188	2	133
1192	1192	2	134
1193	1193	2	135
1194	1194	2	136
1204	1204	1	715
1205	1205	1	716
1206	1206	1	717
1216	1216	1	718
1217	1217	1	719
1218	1218	1	720
1219	1219	1	721
1220	1220	1	722
1221	1221	1	723
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_roles (id, document_id, name, code, description, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	qtx07o15uqpnil5xd1pma1eu	Super Admin	strapi-super-admin	Super Admins can access and manage all features and settings.	2025-04-18 21:45:42.79	2025-04-18 21:45:42.79	2025-04-18 21:45:42.79	\N	\N	\N
3	xz0inm1ejddu50gg5u9tkhvg	Author	strapi-author	Authors can manage the content they have created.	2025-04-18 21:45:42.802	2025-04-18 21:45:42.802	2025-04-18 21:45:42.802	\N	\N	\N
2	vq1039c5jq91icw9iovyjk6i	Editor	strapi-editor	Editors can manage and publish contents including those of other users.	2025-04-18 21:45:42.8	2025-06-27 09:39:25.786	2025-04-18 21:45:42.8	\N	\N	\N
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, document_id, firstname, lastname, username, email, password, reset_password_token, registration_token, is_active, blocked, prefered_language, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	sorh8pykj1a4otv07jo2fpv7	Enrique	Palomino	enkee03	enkee03@gmail.com	$2a$10$fs3Ssdw74Q.SESD3u9zdCO2SE3aH9V6d7M5PYE1He63AZ1DpvEUS.	\N	\N	t	f	es	2025-04-18 21:47:38.326	2025-05-30 11:42:08.839	2025-04-18 21:47:38.326	\N	\N	\N
2	kfcl954t91j5bbzcl8ldq8er	Rafael	Palomino Horna	Rafita	enkee03@hotmail.com	$2a$10$NoZNk3QANPtQBskRMNyZb.BOjUOkw.unGDphW6mpxvA8PqJoBM3jO	\N	33619175af267f1d157731bcf45fda280840b31b	t	f	\N	2025-06-09 15:16:56.379	2025-06-09 15:18:09.234	2025-06-09 15:16:56.379	\N	\N	\N
\.


--
-- Data for Name: admin_users_roles_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users_roles_lnk (id, user_id, role_id, role_ord, user_ord) FROM stdin;
1	1	1	1	1
3	2	2	1	1
\.


--
-- Data for Name: calendarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendarios (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, fecha_ini, fecha_fin, tipo, archivado) FROM stdin;
9	xneac7dfo9ebi8kbyutuo4qt	2025-06-10 11:52:19.17	2025-08-06 22:29:20.469	2025-08-06 22:29:20.46	2	1	\N	150 horas [lu, mi, vi@]	<h1 style="margin-left:40px;text-align:justify;">Titulo 1</h1><figure class="image image_resized image-style-align-left" style="width:29.86%;"><img src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w, http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w, http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w, http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w" sizes="100vw" width="1000"><figcaption>Family<a target="_blank" rel="noopener noreferrer" href="https://www.america.com">https://www.america.com</a></figcaption></figure><p style="margin-left:40px;text-align:justify;"><span style="font-family:Tahoma, Geneva, sans-serif;">Este es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo.</span></p><figure class="table" style="width:66.38%;"><table class="ck-table-resized"><colgroup><col style="width:10.89%;"><col style="width:48.92%;"><col style="width:18.87%;"><col style="width:21.32%;"></colgroup><tbody><tr><td><p style="text-align:center;">Hola</p></td><td><p style="text-align:center;">Nombres y Apellidos</p></td><td><p style="text-align:center;">Edad</p></td><td><p style="text-align:center;">Sexo</p></td></tr><tr><td>1</td><td>Enrique</td><td>18</td><td>M</td></tr><tr><td>2</td><td>María</td><td>16</td><td>F</td></tr></tbody></table><figcaption>Dime que no</figcaption></figure><ol><li>Lima </li><li>peru</li><li>lito</li></ol><p>Continuamos el texto</p><ul><li>Esto es o no es</li><li>Esto Tambien</li><li>Lindo que sepas</li></ul><ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Hola&nbsp;</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Moda</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Meta</span></label></li></ul><p>&nbsp;</p><p><a target="_blank" rel="noopener noreferrer" href="https://www.america.com.pe">digo no</a>₲</p><hr><div class="page-break" style="page-break-after:always;"><span style="display:none;">&nbsp;</span></div><p>&nbsp;</p>	2025-08-11	2025-12-23	Academico	t
1	e7dcdiiamthbd3zwyq7pwsul	2025-05-30 07:46:24.591	2025-06-10 13:39:47.78	2025-06-10 13:39:47.776	1	1	\N	528 horas [Lu - Vi]	\N	2025-03-17	2025-07-22	Academico	f
2	hhuqgl9ai4x6g0qzkz4bnjwr	2025-05-30 07:50:17.389	2025-06-10 13:39:47.783	2025-06-10 13:39:47.777	1	1	\N	512 horas [Lu - Vi]	\N	2025-03-17	2025-07-18	Academico	f
3	p7qvd1k5ibhmc8hylcbto9ut	2025-05-30 07:54:55.91	2025-06-10 13:39:47.792	2025-06-10 13:39:47.788	1	1	\N	150 horas [Lu, Mi, Vi@] (1)	\N	2025-03-17	2025-05-21	Academico	f
4	ljyb7eui546oj44w0rfqwgge	2025-05-30 07:57:44.587	2025-06-10 13:39:47.797	2025-06-10 13:39:47.793	1	1	\N	150 horas [Ma, Ju, Vi@] (1)	\N	2025-03-18	2025-05-22	Academico	f
5	f3rkvxe54cdx5sd1gb4z09cn	2025-05-30 08:01:42.834	2025-06-10 13:39:47.803	2025-06-10 13:39:47.8	1	1	\N	150 horas [Lu, Mi, Vi@] (2)	\N	2025-05-26	2025-07-25	Academico	f
6	w5uioz0ec7z0wze94ydt0x6q	2025-05-30 08:08:35.015	2025-06-10 13:39:47.809	2025-06-10 13:39:47.806	1	1	\N	150 horas [Ma, Ju, Vi@] (2)	\N	2025-05-23	2025-07-24	Academico	f
8	js7tzx9ii3efwpl08js8zgms	2025-05-30 08:32:04.053	2025-06-10 13:39:47.818	2025-06-10 13:39:47.816	1	1	\N	300 horas [Ma, Ju, Vi@]	\N	2025-03-18	2025-07-24	Academico	f
7	nirvsf2fbcg1rzgpmfkilu9w	2025-05-30 08:11:05.034	2025-06-10 13:39:47.813	2025-06-10 13:39:47.811	1	1	\N	300 horas [Lu, Mi, Vi@]	\N	2025-03-17	2025-07-25	Academico	f
\.


--
-- Data for Name: calendarios_semestre_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendarios_semestre_lnk (id, calendario_id, semestre_id) FROM stdin;
1	1	1
3	2	1
4	3	1
5	4	1
6	5	1
7	6	1
8	7	1
9	8	1
10	9	2
\.


--
-- Data for Name: carreras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carreras (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, codigo, descripcion, duracion, creditos, nivel, titulo_comercial, slug, descripcion_2) FROM stdin;
2	nseaz3sgsmvkokfa4thsvc1x	2025-05-28 16:18:14.393	2025-07-26 11:30:58.387	2025-07-26 11:30:58.373	1	1	\N	Electrónica	\N	\N	1000	\N	Auxiliar Técnico	Electrónica	electronica	\N
3	xoigjphgez7eujq47ezr202j	2025-05-29 10:14:05.809	2025-07-26 11:31:27.754	2025-07-26 11:31:27.74	1	1	\N	Mantenimiento Básico de Sistemas Eléctricos	\N	\N	1000	\N	Auxiliar Técnico	Mantenimiento Básico de Sistemas Eléctricos	mantenimiento-electronico	\N
4	aggyflopu32u1cd1gak5nbjp	2025-05-29 10:15:56.251	2025-07-26 11:31:48.412	2025-07-26 11:31:48.397	1	1	\N	Soporte técnico y operaciones de centros de cómputo	J2662-1-001	\N	1056	40	Auxiliar Técnico	Soporte técnico de computadoras	soporte-computadoras	\N
5	qkzo9rksbs43wmce9uxar4a6	2025-05-29 10:25:53.755	2025-07-26 11:32:17.484	2025-07-26 11:32:17.47	1	1	\N	Operación de Computadoras	\N	\N	1000	\N	Auxiliar Técnico	Operación de Computadoras	operaciones-computadoras	\N
6	h85eh2qhebq8sariyo5xjo7y	2025-05-29 10:28:30.142	2025-07-26 11:32:36.828	2025-07-26 11:32:36.817	1	1	\N	Corte y Ensamblaje	CO714-1-003	\N	1056	40	Auxiliar Técnico	Corte y Ensamblaje	corte-ensamblaje	\N
7	ch06m02qs2hxdaoso8zjp3xy	2025-05-29 10:29:27.495	2025-07-26 11:32:49.738	2025-07-26 11:32:49.727	1	1	\N	Costura y Acabados	CO714-1-004	\N	1056	40	Auxiliar Técnico	Costura y Acabados	costura-acabados	\N
8	s2r8v3xpdofz54zyz09oqugy	2025-05-29 10:33:47.103	2025-07-26 11:33:12.959	2025-07-26 11:33:12.949	1	1	\N	Bordado de prendas de vestir	C0714-1-002	\N	1056	40	Auxiliar Técnico	Bordado en prendas de vestir	bordados-prendas	\N
9	ogosh7z9j9xt6nsg26byn8et	2025-05-29 10:35:08.498	2025-07-26 11:33:34.712	2025-07-26 11:33:34.696	1	1	\N	Confección Textil	\N	\N	1000	\N	Auxiliar Técnico	Confección Textil	confeccion-textil	\N
10	qxb804jn2yz0ataef2khk1j8	2025-05-29 11:00:09.721	2025-07-26 11:33:54.795	2025-07-26 11:33:54.785	1	1	\N	Confección de calzado	C0715-1-001	\N	1056	40	Auxiliar Técnico	Confección de calzado	confeccion-calzado	\N
11	y8ivt4gjfvb61qdthpej13yb	2025-05-29 11:02:02.928	2025-07-26 11:34:46.251	2025-07-26 11:34:46.24	1	1	\N	Confección de Artículos de Cuero y Marroquinería	C0715-1-002	\N	1056	40	Auxiliar Técnico	Artículos de Cuero y Marroquinería	cuero-marroquineria	\N
12	h6teufmxnry8ogwtxfv4cxj0	2025-05-29 11:03:04.285	2025-07-26 11:35:08.945	2025-07-26 11:35:08.928	1	1	\N	Manualidades	\N	\N	1000	\N	Auxiliar Técnico	Manualidades	manualidades	\N
13	g8rin1mdfp55nt8o6yryyn7b	2025-05-29 11:04:37.496	2025-07-26 11:35:33.442	2025-07-26 11:35:33.431	1	1	\N	Panadería y Pastelería	C0610-1-001	\N	1056	40	Auxiliar Técnico	Panadería y Pastelería	panaderia-pasteleria	\N
14	itwieaftkuujghdhn9yf0do6	2025-05-29 11:05:29.76	2025-07-26 11:35:58.975	2025-07-26 11:35:58.956	1	1	\N	Asistencia en Pastelería y Panadería	\N	\N	1000	\N	Auxiliar Técnico	Asistencia en Pastelería y Panadería	asistente-panaderia-pasteleria	\N
15	yjopowuya2lxdyo4s6s2i0x2	2025-05-29 11:06:19.082	2025-07-26 11:36:19.334	2025-07-26 11:36:19.323	1	1	\N	Mantenimiento Básico de Casas y Edificios	\N	\N	1000	\N	Auxiliar Técnico	Mantenimiento Básico de Casas y Edificios	mantenimiento-casas-edificios	\N
1	j6oly9508e9w7kbv29zf3zg8	2025-05-28 16:15:13.533	2025-07-28 15:17:34.587	2025-07-28 15:17:34.574	1	1	\N	Peluquería y Barberia	S3496-1-001	\N	1056	40	Auxiliar Técnico	Peluquería y Barberia	peluqueria-barberia	\N
\.


--
-- Data for Name: carreras_act_economica_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carreras_act_economica_lnk (id, carrera_id, act_economica_id) FROM stdin;
1	1	1
2	2	2
3	3	3
4	4	4
5	5	4
6	6	5
7	7	5
8	8	5
9	9	5
10	10	6
11	11	6
12	12	7
13	13	8
14	14	8
15	15	9
\.


--
-- Data for Name: components_video_youtubes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.components_video_youtubes (id, url) FROM stdin;
1	https://www.youtube.com/watch?v=_6oKX-ZCP_8
2	https://www.youtube.com/watch?v=IyKoAaLrTzw
\.


--
-- Data for Name: dato_general; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dato_general (id, document_id, nombre_institucion, direccion, telefono_1, telefono_2, correo, pagina_web, facebook, ruc, rd, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, youtube, twitter, instagram, tiktok) FROM stdin;
1	e673vmbngdw1snggolt25hee	CETPRO "San Martin de Porres"	Jirón Santa Clorinda 971 Urb. Palao SMP	5341588	5346663	cetprosanmartindeporres@cetprosmp.edu.pe	cetprosmp.edu.pe	https://www.facebook.com/cetprosanmartindeporres1/	20610635939	R.D. N° 1839 - 05 - DRELM	2025-07-27 20:28:21.038	2025-07-28 23:54:58.767	2025-07-28 23:54:58.678	1	1	\N	https://www.youtube.com/@enriquerafaelpalominohorna3697	https://x.com/enkee032	https://www.instagram.com/cetpro.smp/	https://www.tiktok.com/@cetpro.sanmartindeporres
\.


--
-- Data for Name: especialidades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.especialidades (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, titulo_comercial, descripcion, descripcion_2, slug) FROM stdin;
1	wwfg3o6e49a2bcykm2hmglq5	2025-05-28 15:48:46.8	2025-08-09 02:29:34.393	2025-08-09 02:29:34.353	1	1	\N	Estética Personal	Estética Personal	\N	[{"type": "paragraph", "children": [{"text": "Solanum tuberosum, de nombre común patata (en la mayor parte de España, Filipinas y Guinea Ecuatorial) o papa (en Hispanoamérica y en las Islas Canarias)[1]​ [2]​", "type": "text"}]}]	estetica-personal
2	yfu8vq9ao3v9i7cqqs4m9kdq	2025-05-28 15:49:11.254	2025-07-13 18:42:46.069	2025-07-13 18:42:46.047	1	1	\N	Electricidad y Electrónica	Electricidad y Electrónica	\N	\N	electricidad-electronica
4	cavjjtdvrnl44637ryvieota	2025-05-28 15:52:56.45	2025-07-13 18:43:32.305	2025-07-13 18:43:32.297	1	1	\N	Textil y Confección	Confección Textil	\N	\N	confeccion-textil
5	n3sri0rafju1m4m47rta6gjh	2025-05-28 15:53:53.024	2025-07-13 18:43:57.387	2025-07-13 18:43:57.372	1	1	\N	Cuero y Calzado	Cuero y Calzado	\N	\N	cuero-calzado
6	wfy1goqi2y32obugd58pw7eq	2025-05-28 15:54:18.263	2025-07-13 18:44:57.666	2025-07-13 18:44:57.644	1	1	\N	Artesanía y Manualidades	Manualidades	\N	\N	manualidades
7	wvuqdosfpn00oux8ayfvg0yu	2025-05-28 15:54:42.065	2025-07-13 18:45:19.777	2025-07-13 18:45:19.768	1	1	\N	Hostelería y Turismo	Hostelería y Turismo	\N	\N	hosteleria-turismo
8	gjcdvg8du8xe0j9692n8v089	2025-05-28 15:55:10.391	2025-07-13 18:45:45.378	2025-07-13 18:45:45.363	1	1	\N	Carpintería	Carpintería	\N	\N	carpinteria
3	z9kd2xqh6nf6d43u57hg7bux	2025-05-28 15:52:19.226	2025-08-10 22:18:20.828	2025-08-10 22:18:20.791	1	1	\N	Computación e Informática	Computación	<p data-start="273" data-end="636">La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.</p><p data-start="638" data-end="1115">A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. En el módulo de <strong data-start="757" data-end="782">Soporte Técnico de PC</strong>, aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.</p><p data-start="1117" data-end="1488">En el módulo de <strong data-start="1133" data-end="1174">Aplicativos Informáticos de Ofimática</strong>, se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.</p><p data-start="1490" data-end="1828">El módulo de <strong data-start="1503" data-end="1534">Diseño Gráfico Publicitario</strong> desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop y Corel Draw. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.</p><p data-start="1830" data-end="2157">Finalmente, el módulo de <strong data-start="1855" data-end="1884">Diseño y Programación Web</strong> introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.</p>	[{"type": "paragraph", "children": [{"text": "La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.", "type": "text"}]}, {"type": "list", "format": "ordered", "children": [{"type": "list-item", "children": [{"text": "A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. ", "type": "text"}, {"bold": true, "text": "En el módulo de Soporte Técnico de PC", "type": "text"}, {"text": ", aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.", "type": "text"}]}]}, {"type": "list", "format": "unordered", "children": [{"type": "list-item", "children": [{"text": "En el ", "type": "text"}, {"bold": true, "text": "módulo de Aplicativos Informáticos de Ofimática", "type": "text"}, {"text": ", se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.", "type": "text"}]}]}, {"type": "paragraph", "children": [{"text": "El ", "type": "text"}, {"bold": true, "text": "módulo de Diseño Gráfico Publicitario", "type": "text"}, {"text": " desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop e Illustrator. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Finalmente, el ", "type": "text"}, {"bold": true, "text": "módulo de Diseño y Programación Web", "type": "text"}, {"text": " introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.", "type": "text"}]}]	computacion
\.


--
-- Data for Name: familias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.familias (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion) FROM stdin;
1	p0hwjz9vcufmj97g4ti4fzat	2025-05-28 15:44:58.322	2025-05-28 16:00:52.826	2025-05-28 16:00:52.805	1	1	\N	SERVICIOS PERSONALES Y DE HOGARES	\N
2	zeyqud9indo55ci7w5noy3tq	2025-05-28 15:45:10.666	2025-05-28 16:01:08.707	2025-05-28 16:01:08.694	1	1	\N	ENERGÍA, AGUA, Y SANEAMIENTO	\N
3	q2dpe8cwagld0q23kw2yxwj8	2025-05-28 15:46:17.085	2025-05-28 16:02:04.452	2025-05-28 16:02:04.442	1	1	\N	TECNOLOGIAS DE LA INFORMACIÓN Y COMUNICACIONES – TIC’s	\N
4	rwqkt4hsjr8vyxf97aab6lsx	2025-05-28 15:46:49.764	2025-05-28 16:02:23.619	2025-05-28 16:02:23.607	1	1	\N	INDUSTRIA TEXTIL, CONFECCIÓN Y DEL CUERO	\N
5	vl4eieswwy1ct52cy0rly7cr	2025-05-28 15:47:11.099	2025-05-28 16:02:37.237	2025-05-28 16:02:37.221	1	1	\N	INDUSTRIA DIVERSAS	\N
6	cfb8yj4bkydt3xr7zkaidvw6	2025-05-28 15:47:25.977	2025-05-28 16:02:54.855	2025-05-28 16:02:54.842	1	1	\N	INDUSTRIA ALIMENTARIA BEBIDA Y TABACO	\N
7	d9f09s606td6s7xnjtn2zr9w	2025-05-28 15:47:42.108	2025-05-28 16:03:17.734	2025-05-28 16:03:17.724	1	1	\N	INDUSTRIA DE LA MADERA Y MUEBLES	\N
\.


--
-- Data for Name: familias_sector_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.familias_sector_lnk (id, familia_id, sector_id) FROM stdin;
1	1	1
2	2	2
3	3	3
4	4	4
5	5	4
6	6	4
7	7	4
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files (id, document_id, name, alternative_text, caption, width, height, formats, hash, ext, mime, size, url, preview_url, provider, provider_metadata, folder_path, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
2	sh715c310gwpncg9c9n8qm80	daviddoe@strapi	An image uploaded to Strapi called daviddoe@strapi	daviddoe@strapi	2418	2711	{"large": {"ext": ".jpeg", "url": "/uploads/large_daviddoe_strapi_18d3415734.jpeg", "hash": "large_daviddoe_strapi_18d3415734", "mime": "image/jpeg", "name": "large_daviddoe@strapi", "path": null, "size": 74.82, "width": 892, "height": 1000, "sizeInBytes": 74823}, "small": {"ext": ".jpeg", "url": "/uploads/small_daviddoe_strapi_18d3415734.jpeg", "hash": "small_daviddoe_strapi_18d3415734", "mime": "image/jpeg", "name": "small_daviddoe@strapi", "path": null, "size": 22.43, "width": 446, "height": 500, "sizeInBytes": 22427}, "medium": {"ext": ".jpeg", "url": "/uploads/medium_daviddoe_strapi_18d3415734.jpeg", "hash": "medium_daviddoe_strapi_18d3415734", "mime": "image/jpeg", "name": "medium_daviddoe@strapi", "path": null, "size": 44.32, "width": 669, "height": 750, "sizeInBytes": 44315}, "thumbnail": {"ext": ".jpeg", "url": "/uploads/thumbnail_daviddoe_strapi_18d3415734.jpeg", "hash": "thumbnail_daviddoe_strapi_18d3415734", "mime": "image/jpeg", "name": "thumbnail_daviddoe@strapi", "path": null, "size": 4.2, "width": 139, "height": 156, "sizeInBytes": 4201}}	daviddoe_strapi_18d3415734	.jpeg	image/jpeg	587.69	/uploads/daviddoe_strapi_18d3415734.jpeg	\N	local	\N	/	2025-04-19 01:07:28.857	2025-04-19 08:54:04.913	2025-04-19 01:07:28.857	\N	1	\N
4	oh1drliogr2u00mx2dt1ljzu	CHICA1.jpg	\N	\N	564	871	{"small": {"ext": ".jpg", "url": "/uploads/small_CHICA_1_e80ae7b081.jpg", "hash": "small_CHICA_1_e80ae7b081", "mime": "image/jpeg", "name": "small_CHICA1.jpg", "path": null, "size": 30.79, "width": 324, "height": 500, "sizeInBytes": 30794}, "medium": {"ext": ".jpg", "url": "/uploads/medium_CHICA_1_e80ae7b081.jpg", "hash": "medium_CHICA_1_e80ae7b081", "mime": "image/jpeg", "name": "medium_CHICA1.jpg", "path": null, "size": 55.8, "width": 486, "height": 750, "sizeInBytes": 55797}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_CHICA_1_e80ae7b081.jpg", "hash": "thumbnail_CHICA_1_e80ae7b081", "mime": "image/jpeg", "name": "thumbnail_CHICA1.jpg", "path": null, "size": 5.14, "width": 101, "height": 156, "sizeInBytes": 5144}}	CHICA_1_e80ae7b081	.jpg	image/jpeg	69.79	/uploads/CHICA_1_e80ae7b081.jpg	\N	local	\N	/	2025-04-19 10:47:19.544	2025-04-19 10:47:19.544	2025-04-19 10:47:19.545	1	1	\N
3	tvib3xvsyyz4ykripey7citg	CHICA4.jpg	\N	\N	216	233	{"thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_CHICA_4_f0dc5ef028.jpg", "hash": "thumbnail_CHICA_4_f0dc5ef028", "mime": "image/jpeg", "name": "thumbnail_CHICA4.jpg", "path": null, "size": 4.93, "width": 145, "height": 156, "sizeInBytes": 4925}}	CHICA_4_f0dc5ef028	.jpg	image/jpeg	7.93	/uploads/CHICA_4_f0dc5ef028.jpg	\N	local	\N	/	2025-04-19 10:47:19.529	2025-04-19 11:15:17.324	2025-04-19 10:47:19.53	1	1	\N
16	pyxvg7m0oz67t8sfrayujlvj	soporte-destacada.jpg	\N	\N	640	388	{"small": {"ext": ".jpg", "url": "/uploads/small_soporte_destacada_4c4dedbcc4.jpg", "hash": "small_soporte_destacada_4c4dedbcc4", "mime": "image/jpeg", "name": "small_soporte-destacada.jpg", "path": null, "size": 30.98, "width": 500, "height": 303, "sizeInBytes": 30976}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_soporte_destacada_4c4dedbcc4.jpg", "hash": "thumbnail_soporte_destacada_4c4dedbcc4", "mime": "image/jpeg", "name": "thumbnail_soporte-destacada.jpg", "path": null, "size": 10.75, "width": 245, "height": 149, "sizeInBytes": 10754}}	soporte_destacada_4c4dedbcc4	.jpg	image/jpeg	43.45	/uploads/soporte_destacada_4c4dedbcc4.jpg	\N	local	\N	/	2025-05-01 18:43:30.331	2025-05-01 18:43:30.331	2025-05-01 18:43:30.333	1	1	\N
7	yknn97rgph3cebopkp5jnud2	CHICA3.jpg	\N	\N	736	891	{"small": {"ext": ".jpg", "url": "/uploads/small_CHICA_3_bec26a7eac.jpg", "hash": "small_CHICA_3_bec26a7eac", "mime": "image/jpeg", "name": "small_CHICA3.jpg", "path": null, "size": 61.86, "width": 413, "height": 500, "sizeInBytes": 61860}, "medium": {"ext": ".jpg", "url": "/uploads/medium_CHICA_3_bec26a7eac.jpg", "hash": "medium_CHICA_3_bec26a7eac", "mime": "image/jpeg", "name": "medium_CHICA3.jpg", "path": null, "size": 134.76, "width": 620, "height": 750, "sizeInBytes": 134763}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_CHICA_3_bec26a7eac.jpg", "hash": "thumbnail_CHICA_3_bec26a7eac", "mime": "image/jpeg", "name": "thumbnail_CHICA3.jpg", "path": null, "size": 7.28, "width": 129, "height": 156, "sizeInBytes": 7279}}	CHICA_3_bec26a7eac	.jpg	image/jpeg	190.75	/uploads/CHICA_3_bec26a7eac.jpg	\N	local	\N	/	2025-04-19 10:47:19.647	2025-04-19 10:47:19.647	2025-04-19 10:47:19.647	1	1	\N
5	fbpx8ghmct3i10744xzz6wj2	CHICA2.jpg	\N	\N	506	825	{"small": {"ext": ".jpg", "url": "/uploads/small_CHICA_2_7a056d0316.jpg", "hash": "small_CHICA_2_7a056d0316", "mime": "image/jpeg", "name": "small_CHICA2.jpg", "path": null, "size": 26.84, "width": 307, "height": 500, "sizeInBytes": 26844}, "medium": {"ext": ".jpg", "url": "/uploads/medium_CHICA_2_7a056d0316.jpg", "hash": "medium_CHICA_2_7a056d0316", "mime": "image/jpeg", "name": "medium_CHICA2.jpg", "path": null, "size": 51.94, "width": 460, "height": 750, "sizeInBytes": 51938}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_CHICA_2_7a056d0316.jpg", "hash": "thumbnail_CHICA_2_7a056d0316", "mime": "image/jpeg", "name": "thumbnail_CHICA2.jpg", "path": null, "size": 4.26, "width": 95, "height": 156, "sizeInBytes": 4261}}	CHICA_2_7a056d0316	.jpg	image/jpeg	62.27	/uploads/CHICA_2_7a056d0316.jpg	\N	local	\N	/	2025-04-19 10:47:19.567	2025-04-19 11:14:34.813	2025-04-19 10:47:19.567	1	1	\N
10	qvm7rle0z0z4c9s832p2xm3q	el agua.pdf	\N	\N	\N	\N	\N	el_agua_5b2dc42c80	.pdf	application/pdf	438.83	/uploads/el_agua_5b2dc42c80.pdf	\N	local	\N	/	2025-04-19 15:05:49.194	2025-04-19 15:05:49.194	2025-04-19 15:05:49.195	1	1	\N
11	q6cru7hxsk3dgcs8k9wxm0dz	COMUNICADO.docx	\N	\N	\N	\N	\N	COMUNICADO_7f5da7dd9a	.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	925.79	/uploads/COMUNICADO_7f5da7dd9a.docx	\N	local	\N	/	2025-04-19 15:05:49.213	2025-04-19 15:31:23.39	2025-04-19 15:05:49.214	1	1	\N
6	dj457l9z2arb2rvmepcrgkpk	CHICA5.jpg	\N	\N	735	919	{"small": {"ext": ".jpg", "url": "/uploads/small_CHICA_5_96c454afce.jpg", "hash": "small_CHICA_5_96c454afce", "mime": "image/jpeg", "name": "small_CHICA5.jpg", "path": null, "size": 31.32, "width": 400, "height": 500, "sizeInBytes": 31318}, "medium": {"ext": ".jpg", "url": "/uploads/medium_CHICA_5_96c454afce.jpg", "hash": "medium_CHICA_5_96c454afce", "mime": "image/jpeg", "name": "medium_CHICA5.jpg", "path": null, "size": 64.58, "width": 600, "height": 750, "sizeInBytes": 64583}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_CHICA_5_96c454afce.jpg", "hash": "thumbnail_CHICA_5_96c454afce", "mime": "image/jpeg", "name": "thumbnail_CHICA5.jpg", "path": null, "size": 4.58, "width": 125, "height": 156, "sizeInBytes": 4581}}	CHICA_5_96c454afce	.jpg	image/jpeg	91.03	/uploads/CHICA_5_96c454afce.jpg	\N	local	\N	/	2025-04-19 10:47:19.593	2025-04-19 21:49:26.497	2025-04-19 10:47:19.593	1	1	\N
13	h9hng7qo5gm2sjg35mrt4dm8	EnriquePalomino-Cuadrado.jpg	\N	\N	711	711	{"small": {"ext": ".jpg", "url": "/uploads/small_Enrique_Palomino_Cuadrado_d56e7ab93b.jpg", "hash": "small_Enrique_Palomino_Cuadrado_d56e7ab93b", "mime": "image/jpeg", "name": "small_EnriquePalomino-Cuadrado.jpg", "path": null, "size": 30.93, "width": 500, "height": 500, "sizeInBytes": 30929}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_Enrique_Palomino_Cuadrado_d56e7ab93b.jpg", "hash": "thumbnail_Enrique_Palomino_Cuadrado_d56e7ab93b", "mime": "image/jpeg", "name": "thumbnail_EnriquePalomino-Cuadrado.jpg", "path": null, "size": 5.21, "width": 156, "height": 156, "sizeInBytes": 5211}}	Enrique_Palomino_Cuadrado_d56e7ab93b	.jpg	image/jpeg	45.83	/uploads/Enrique_Palomino_Cuadrado_d56e7ab93b.jpg	\N	local	\N	/	2025-04-30 14:56:19.586	2025-04-30 14:56:19.586	2025-04-30 14:56:19.586	1	1	\N
14	o1261b1fgmyqpjtgaxexbvi6	computo-destacado.jpg	\N	\N	1500	986	{"large": {"ext": ".jpg", "url": "/uploads/large_computo_destacado_78340b5e72.jpg", "hash": "large_computo_destacado_78340b5e72", "mime": "image/jpeg", "name": "large_computo-destacado.jpg", "path": null, "size": 132.42, "width": 1000, "height": 657, "sizeInBytes": 132419}, "small": {"ext": ".jpg", "url": "/uploads/small_computo_destacado_78340b5e72.jpg", "hash": "small_computo_destacado_78340b5e72", "mime": "image/jpeg", "name": "small_computo-destacado.jpg", "path": null, "size": 41.04, "width": 500, "height": 329, "sizeInBytes": 41041}, "medium": {"ext": ".jpg", "url": "/uploads/medium_computo_destacado_78340b5e72.jpg", "hash": "medium_computo_destacado_78340b5e72", "mime": "image/jpeg", "name": "medium_computo-destacado.jpg", "path": null, "size": 82.11, "width": 750, "height": 493, "sizeInBytes": 82108}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_computo_destacado_78340b5e72.jpg", "hash": "thumbnail_computo_destacado_78340b5e72", "mime": "image/jpeg", "name": "thumbnail_computo-destacado.jpg", "path": null, "size": 11.73, "width": 238, "height": 156, "sizeInBytes": 11725}}	computo_destacado_78340b5e72	.jpg	image/jpeg	244.70	/uploads/computo_destacado_78340b5e72.jpg	\N	local	\N	/	2025-05-01 12:04:10.21	2025-05-01 12:04:10.21	2025-05-01 12:04:10.211	1	1	\N
12	yw328w23unejg25ikvo4chg5	Videos Para Whatsapp Chistosos Cortos   El Esqueleto Bailarin  Videos  Virales (226p_30fps_H264-96kbit_AAC).mp4	\N	\N	\N	\N	\N	Videos_Para_Whatsapp_Chistosos_Cortos_El_Esqueleto_Bailarin_Videos_Virales_226p_30fps_H264_96kbit_AAC_b10396796f	.mp4	video/mp4	1091.24	/uploads/Videos_Para_Whatsapp_Chistosos_Cortos_El_Esqueleto_Bailarin_Videos_Virales_226p_30fps_H264_96kbit_AAC_b10396796f.mp4	\N	local	\N	/	2025-04-19 15:05:49.337	2025-07-10 10:08:00.828	2025-04-19 15:05:49.338	1	1	\N
17	h5skftfyxbp63ooojcn4dkcm	carrera corte y peinado - destacado.jpg	\N	\N	2560	1440	{"large": {"ext": ".jpg", "url": "/uploads/large_carrera_corte_y_peinado_destacado_7eb271937a.jpg", "hash": "large_carrera_corte_y_peinado_destacado_7eb271937a", "mime": "image/jpeg", "name": "large_carrera corte y peinado - destacado.jpg", "path": null, "size": 61.5, "width": 1000, "height": 563, "sizeInBytes": 61504}, "small": {"ext": ".jpg", "url": "/uploads/small_carrera_corte_y_peinado_destacado_7eb271937a.jpg", "hash": "small_carrera_corte_y_peinado_destacado_7eb271937a", "mime": "image/jpeg", "name": "small_carrera corte y peinado - destacado.jpg", "path": null, "size": 21.98, "width": 500, "height": 281, "sizeInBytes": 21983}, "medium": {"ext": ".jpg", "url": "/uploads/medium_carrera_corte_y_peinado_destacado_7eb271937a.jpg", "hash": "medium_carrera_corte_y_peinado_destacado_7eb271937a", "mime": "image/jpeg", "name": "medium_carrera corte y peinado - destacado.jpg", "path": null, "size": 40.12, "width": 750, "height": 422, "sizeInBytes": 40122}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_carrera_corte_y_peinado_destacado_7eb271937a.jpg", "hash": "thumbnail_carrera_corte_y_peinado_destacado_7eb271937a", "mime": "image/jpeg", "name": "thumbnail_carrera corte y peinado - destacado.jpg", "path": null, "size": 7.94, "width": 245, "height": 138, "sizeInBytes": 7937}}	carrera_corte_y_peinado_destacado_7eb271937a	.jpg	image/jpeg	247.37	/uploads/carrera_corte_y_peinado_destacado_7eb271937a.jpg	\N	local	\N	/	2025-05-01 18:59:02.652	2025-05-01 18:59:02.652	2025-05-01 18:59:02.652	1	1	\N
18	ulvpjfu2mc4pie73rqs25p3z	computacion02-a.png	\N	\N	800	400	{"small": {"ext": ".png", "url": "/uploads/small_computacion02_a_26bae19d57.png", "hash": "small_computacion02_a_26bae19d57", "mime": "image/png", "name": "small_computacion02-a.png", "path": null, "size": 220.24, "width": 500, "height": 250, "sizeInBytes": 220244}, "medium": {"ext": ".png", "url": "/uploads/medium_computacion02_a_26bae19d57.png", "hash": "medium_computacion02_a_26bae19d57", "mime": "image/png", "name": "medium_computacion02-a.png", "path": null, "size": 471.59, "width": 750, "height": 375, "sizeInBytes": 471594}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_computacion02_a_26bae19d57.png", "hash": "thumbnail_computacion02_a_26bae19d57", "mime": "image/png", "name": "thumbnail_computacion02-a.png", "path": null, "size": 57.63, "width": 245, "height": 122, "sizeInBytes": 57630}}	computacion02_a_26bae19d57	.png	image/png	130.47	/uploads/computacion02_a_26bae19d57.png	\N	local	\N	/1	2025-07-06 16:02:29.657	2025-07-06 16:02:29.657	2025-07-06 16:02:29.658	1	1	\N
20	wjd603n19s7d9r1le23zwqby	computacion-fondo01.avif	\N	\N	\N	\N	\N	computacion_fondo01_e17724e761	.avif	image/avif	20.55	/uploads/computacion_fondo01_e17724e761.avif	\N	local	\N	/1/2	2025-07-06 16:09:47.797	2025-07-06 16:09:47.797	2025-07-06 16:09:47.798	1	1	\N
22	hvn47xbchct6chal5a3zr2h2	computacion-fondo02.jpg	\N	\N	555	260	{"small": {"ext": ".jpg", "url": "/uploads/small_computacion_fondo02_a06d845858.jpg", "hash": "small_computacion_fondo02_a06d845858", "mime": "image/jpeg", "name": "small_computacion-fondo02.jpg", "path": null, "size": 18.2, "width": 500, "height": 234, "sizeInBytes": 18202}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_computacion_fondo02_a06d845858.jpg", "hash": "thumbnail_computacion_fondo02_a06d845858", "mime": "image/jpeg", "name": "thumbnail_computacion-fondo02.jpg", "path": null, "size": 4.94, "width": 245, "height": 115, "sizeInBytes": 4937}}	computacion_fondo02_a06d845858	.jpg	image/jpeg	22.88	/uploads/computacion_fondo02_a06d845858.jpg	\N	local	\N	/1/2	2025-07-06 16:11:18.472	2025-07-06 16:11:18.472	2025-07-06 16:11:18.473	1	1	\N
19	nidvsz7crk6fekq6vtgozkpd	computacion01-a.png	\N	\N	1800	1200	{"large": {"ext": ".png", "url": "/uploads/large_computacion01_a_ee8a8aed01.png", "hash": "large_computacion01_a_ee8a8aed01", "mime": "image/png", "name": "large_computacion01-a.png", "path": null, "size": 1072.25, "width": 1000, "height": 667, "sizeInBytes": 1072252}, "small": {"ext": ".png", "url": "/uploads/small_computacion01_a_ee8a8aed01.png", "hash": "small_computacion01_a_ee8a8aed01", "mime": "image/png", "name": "small_computacion01-a.png", "path": null, "size": 301.22, "width": 500, "height": 333, "sizeInBytes": 301222}, "medium": {"ext": ".png", "url": "/uploads/medium_computacion01_a_ee8a8aed01.png", "hash": "medium_computacion01_a_ee8a8aed01", "mime": "image/png", "name": "medium_computacion01-a.png", "path": null, "size": 633.49, "width": 750, "height": 500, "sizeInBytes": 633486}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_computacion01_a_ee8a8aed01.png", "hash": "thumbnail_computacion01_a_ee8a8aed01", "mime": "image/png", "name": "thumbnail_computacion01-a.png", "path": null, "size": 75.86, "width": 234, "height": 156, "sizeInBytes": 75864}}	computacion01_a_ee8a8aed01	.png	image/png	730.61	/uploads/computacion01_a_ee8a8aed01.png	\N	local	\N	/1	2025-07-06 16:02:32.029	2025-07-06 16:14:44.436	2025-07-06 16:02:32.03	1	1	\N
15	fi9xyije8969jk09k5i2yznq	estetica-destacado.jpg	\N	\N	600	450	{"small": {"ext": ".jpg", "url": "/uploads/small_estetica_destacado_3523ab11f5.jpg", "hash": "small_estetica_destacado_3523ab11f5", "mime": "image/jpeg", "name": "small_estetica-destacado.jpg", "path": null, "size": 41.21, "width": 500, "height": 375, "sizeInBytes": 41214}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_estetica_destacado_3523ab11f5.jpg", "hash": "thumbnail_estetica_destacado_3523ab11f5", "mime": "image/jpeg", "name": "thumbnail_estetica-destacado.jpg", "path": null, "size": 10.71, "width": 208, "height": 156, "sizeInBytes": 10713}}	estetica_destacado_3523ab11f5	.jpg	image/jpeg	54.58	/uploads/estetica_destacado_3523ab11f5.jpg	\N	local	\N	/	2025-05-01 12:09:37.953	2025-07-10 10:35:47.439	2025-05-01 12:09:37.953	1	1	\N
23	jztmztrvzii8dnahx972brye	logo SMP nuevo mediano.png	\N	\N	886	886	{"small": {"ext": ".png", "url": "/uploads/small_logo_SMP_nuevo_mediano_996a11b82b.png", "hash": "small_logo_SMP_nuevo_mediano_996a11b82b", "mime": "image/png", "name": "small_logo SMP nuevo mediano.png", "path": null, "size": 233.05, "width": 500, "height": 500, "sizeInBytes": 233047}, "medium": {"ext": ".png", "url": "/uploads/medium_logo_SMP_nuevo_mediano_996a11b82b.png", "hash": "medium_logo_SMP_nuevo_mediano_996a11b82b", "mime": "image/png", "name": "medium_logo SMP nuevo mediano.png", "path": null, "size": 459.32, "width": 750, "height": 750, "sizeInBytes": 459323}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_logo_SMP_nuevo_mediano_996a11b82b.png", "hash": "thumbnail_logo_SMP_nuevo_mediano_996a11b82b", "mime": "image/png", "name": "thumbnail_logo SMP nuevo mediano.png", "path": null, "size": 38.24, "width": 156, "height": 156, "sizeInBytes": 38244}}	logo_SMP_nuevo_mediano_996a11b82b	.png	image/png	122.96	/uploads/logo_SMP_nuevo_mediano_996a11b82b.png	\N	local	\N	/3	2025-07-27 20:28:10.386	2025-07-27 20:28:10.386	2025-07-27 20:28:10.387	1	1	\N
24	kc9eur3ywm47j7fczfdz7a6j	computo_destacado_78340b5e72.jpg	\N	\N	1500	986	{"large": {"ext": ".jpg", "url": "/uploads/large_computo_destacado_78340b5e72_3f48f850aa.jpg", "hash": "large_computo_destacado_78340b5e72_3f48f850aa", "mime": "image/jpeg", "name": "large_computo_destacado_78340b5e72.jpg", "path": null, "size": 132.37, "width": 1000, "height": 657, "sizeInBytes": 132368}, "small": {"ext": ".jpg", "url": "/uploads/small_computo_destacado_78340b5e72_3f48f850aa.jpg", "hash": "small_computo_destacado_78340b5e72_3f48f850aa", "mime": "image/jpeg", "name": "small_computo_destacado_78340b5e72.jpg", "path": null, "size": 41.03, "width": 500, "height": 329, "sizeInBytes": 41026}, "medium": {"ext": ".jpg", "url": "/uploads/medium_computo_destacado_78340b5e72_3f48f850aa.jpg", "hash": "medium_computo_destacado_78340b5e72_3f48f850aa", "mime": "image/jpeg", "name": "medium_computo_destacado_78340b5e72.jpg", "path": null, "size": 82.08, "width": 750, "height": 493, "sizeInBytes": 82081}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_computo_destacado_78340b5e72_3f48f850aa.jpg", "hash": "thumbnail_computo_destacado_78340b5e72_3f48f850aa", "mime": "image/jpeg", "name": "thumbnail_computo_destacado_78340b5e72.jpg", "path": null, "size": 11.73, "width": 238, "height": 156, "sizeInBytes": 11730}}	computo_destacado_78340b5e72_3f48f850aa	.jpg	image/jpeg	244.65	/uploads/computo_destacado_78340b5e72_3f48f850aa.jpg	\N	local	\N	/	2025-08-06 18:20:12.668	2025-08-06 18:20:12.668	2025-08-06 18:20:12.669	1	1	\N
25	yxwobc7ldr5ps28ur2sc1964	computo_destacado_78340b5e72.jpg	\N	\N	1500	986	{"large": {"ext": ".jpg", "url": "/uploads/large_computo_destacado_78340b5e72_8213955245.jpg", "hash": "large_computo_destacado_78340b5e72_8213955245", "mime": "image/jpeg", "name": "large_computo_destacado_78340b5e72.jpg", "path": null, "size": 132.37, "width": 1000, "height": 657, "sizeInBytes": 132368}, "small": {"ext": ".jpg", "url": "/uploads/small_computo_destacado_78340b5e72_8213955245.jpg", "hash": "small_computo_destacado_78340b5e72_8213955245", "mime": "image/jpeg", "name": "small_computo_destacado_78340b5e72.jpg", "path": null, "size": 41.03, "width": 500, "height": 329, "sizeInBytes": 41026}, "medium": {"ext": ".jpg", "url": "/uploads/medium_computo_destacado_78340b5e72_8213955245.jpg", "hash": "medium_computo_destacado_78340b5e72_8213955245", "mime": "image/jpeg", "name": "medium_computo_destacado_78340b5e72.jpg", "path": null, "size": 82.08, "width": 750, "height": 493, "sizeInBytes": 82081}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_computo_destacado_78340b5e72_8213955245.jpg", "hash": "thumbnail_computo_destacado_78340b5e72_8213955245", "mime": "image/jpeg", "name": "thumbnail_computo_destacado_78340b5e72.jpg", "path": null, "size": 11.73, "width": 238, "height": 156, "sizeInBytes": 11730}}	computo_destacado_78340b5e72_8213955245	.jpg	image/jpeg	244.65	/uploads/computo_destacado_78340b5e72_8213955245.jpg	\N	local	\N	/	2025-08-06 18:21:10.167	2025-08-06 18:21:10.167	2025-08-06 18:21:10.168	1	1	\N
26	cap54j74j5dy3g9gsbonifaz	computo_destacado_78340b5e72.jpg	\N	\N	1500	986	{"large": {"ext": ".jpg", "url": "/uploads/large_computo_destacado_78340b5e72_57f92778e7.jpg", "hash": "large_computo_destacado_78340b5e72_57f92778e7", "mime": "image/jpeg", "name": "large_computo_destacado_78340b5e72.jpg", "path": null, "size": 132.37, "width": 1000, "height": 657, "sizeInBytes": 132368}, "small": {"ext": ".jpg", "url": "/uploads/small_computo_destacado_78340b5e72_57f92778e7.jpg", "hash": "small_computo_destacado_78340b5e72_57f92778e7", "mime": "image/jpeg", "name": "small_computo_destacado_78340b5e72.jpg", "path": null, "size": 41.03, "width": 500, "height": 329, "sizeInBytes": 41026}, "medium": {"ext": ".jpg", "url": "/uploads/medium_computo_destacado_78340b5e72_57f92778e7.jpg", "hash": "medium_computo_destacado_78340b5e72_57f92778e7", "mime": "image/jpeg", "name": "medium_computo_destacado_78340b5e72.jpg", "path": null, "size": 82.08, "width": 750, "height": 493, "sizeInBytes": 82081}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_computo_destacado_78340b5e72_57f92778e7.jpg", "hash": "thumbnail_computo_destacado_78340b5e72_57f92778e7", "mime": "image/jpeg", "name": "thumbnail_computo_destacado_78340b5e72.jpg", "path": null, "size": 11.73, "width": 238, "height": 156, "sizeInBytes": 11730}}	computo_destacado_78340b5e72_57f92778e7	.jpg	image/jpeg	244.65	/uploads/computo_destacado_78340b5e72_57f92778e7.jpg	\N	local	\N	/	2025-08-06 18:25:23.842	2025-08-06 18:25:23.842	2025-08-06 18:25:23.842	1	1	\N
27	tztpihj7zxx142xmhmupptmi	paseo-campo.png	\N	\N	1120	643	{"large": {"ext": ".png", "url": "/uploads/large_paseo_campo_d2d263546e.png", "hash": "large_paseo_campo_d2d263546e", "mime": "image/png", "name": "large_paseo-campo.png", "path": null, "size": 1588.05, "width": 1000, "height": 574, "sizeInBytes": 1588054}, "small": {"ext": ".png", "url": "/uploads/small_paseo_campo_d2d263546e.png", "hash": "small_paseo_campo_d2d263546e", "mime": "image/png", "name": "small_paseo-campo.png", "path": null, "size": 406.35, "width": 500, "height": 287, "sizeInBytes": 406349}, "medium": {"ext": ".png", "url": "/uploads/medium_paseo_campo_d2d263546e.png", "hash": "medium_paseo_campo_d2d263546e", "mime": "image/png", "name": "medium_paseo-campo.png", "path": null, "size": 905.16, "width": 750, "height": 431, "sizeInBytes": 905156}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_paseo_campo_d2d263546e.png", "hash": "thumbnail_paseo_campo_d2d263546e", "mime": "image/png", "name": "thumbnail_paseo-campo.png", "path": null, "size": 99.56, "width": 245, "height": 141, "sizeInBytes": 99556}}	paseo_campo_d2d263546e	.png	image/png	481.51	/uploads/paseo_campo_d2d263546e.png	\N	local	\N	/	2025-08-06 18:26:33.186	2025-08-06 18:26:33.186	2025-08-06 18:26:33.186	1	1	\N
29	k84ige5bqoatyhi2ca461isx	paseo-campo.png	\N	\N	1120	643	{"large": {"ext": ".png", "url": "/uploads/large_paseo_campo_ac24fc681a.png", "hash": "large_paseo_campo_ac24fc681a", "mime": "image/png", "name": "large_paseo-campo.png", "path": null, "size": 1588.05, "width": 1000, "height": 574, "sizeInBytes": 1588054}, "small": {"ext": ".png", "url": "/uploads/small_paseo_campo_ac24fc681a.png", "hash": "small_paseo_campo_ac24fc681a", "mime": "image/png", "name": "small_paseo-campo.png", "path": null, "size": 406.35, "width": 500, "height": 287, "sizeInBytes": 406349}, "medium": {"ext": ".png", "url": "/uploads/medium_paseo_campo_ac24fc681a.png", "hash": "medium_paseo_campo_ac24fc681a", "mime": "image/png", "name": "medium_paseo-campo.png", "path": null, "size": 905.16, "width": 750, "height": 431, "sizeInBytes": 905156}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_paseo_campo_ac24fc681a.png", "hash": "thumbnail_paseo_campo_ac24fc681a", "mime": "image/png", "name": "thumbnail_paseo-campo.png", "path": null, "size": 99.56, "width": 245, "height": 141, "sizeInBytes": 99556}}	paseo_campo_ac24fc681a	.png	image/png	481.51	/uploads/paseo_campo_ac24fc681a.png	\N	local	\N	/	2025-08-06 22:01:58.724	2025-08-06 22:01:58.724	2025-08-06 22:01:58.724	1	1	\N
28	pcvg3kb8r0r38gbalos93geq	paseo-campo.png	\N	\N	1120	643	{"large": {"ext": ".png", "url": "/uploads/large_paseo_campo_992a19249f.png", "hash": "large_paseo_campo_992a19249f", "mime": "image/png", "name": "large_paseo-campo.png", "path": null, "size": 1588.05, "width": 1000, "height": 574, "sizeInBytes": 1588054}, "small": {"ext": ".png", "url": "/uploads/small_paseo_campo_992a19249f.png", "hash": "small_paseo_campo_992a19249f", "mime": "image/png", "name": "small_paseo-campo.png", "path": null, "size": 406.35, "width": 500, "height": 287, "sizeInBytes": 406349}, "medium": {"ext": ".png", "url": "/uploads/medium_paseo_campo_992a19249f.png", "hash": "medium_paseo_campo_992a19249f", "mime": "image/png", "name": "medium_paseo-campo.png", "path": null, "size": 905.16, "width": 750, "height": 431, "sizeInBytes": 905156}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_paseo_campo_992a19249f.png", "hash": "thumbnail_paseo_campo_992a19249f", "mime": "image/png", "name": "thumbnail_paseo-campo.png", "path": null, "size": 99.56, "width": 245, "height": 141, "sizeInBytes": 99556}}	paseo_campo_992a19249f	.png	image/png	481.51	/uploads/paseo_campo_992a19249f.png	\N	local	\N	/	2025-08-06 18:30:42.946	2025-08-10 21:25:01.794	2025-08-06 18:30:42.947	1	1	\N
30	jncbtpgnv95es4vt2hx8ghz8	mision-vision2.jpg	\N	\N	1000	667	{"small": {"ext": ".jpg", "url": "/uploads/small_mision_vision2_a12554783e.jpg", "hash": "small_mision_vision2_a12554783e", "mime": "image/jpeg", "name": "small_mision-vision2.jpg", "path": null, "size": 33.33, "width": 500, "height": 334, "sizeInBytes": 33334}, "medium": {"ext": ".jpg", "url": "/uploads/medium_mision_vision2_a12554783e.jpg", "hash": "medium_mision_vision2_a12554783e", "mime": "image/jpeg", "name": "medium_mision-vision2.jpg", "path": null, "size": 60.57, "width": 750, "height": 500, "sizeInBytes": 60568}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_mision_vision2_a12554783e.jpg", "hash": "thumbnail_mision_vision2_a12554783e", "mime": "image/jpeg", "name": "thumbnail_mision-vision2.jpg", "path": null, "size": 10.72, "width": 234, "height": 156, "sizeInBytes": 10719}}	mision_vision2_a12554783e	.jpg	image/jpeg	74.73	/uploads/mision_vision2_a12554783e.jpg	\N	local	\N	/3	2025-08-15 21:47:30.356	2025-08-15 21:47:30.356	2025-08-15 21:47:30.356	1	1	\N
31	p6x33eh30aqavvc384yebidz	mision-vision1.jpg	\N	\N	760	428	{"small": {"ext": ".jpg", "url": "/uploads/small_mision_vision1_89258a3e1f.jpg", "hash": "small_mision_vision1_89258a3e1f", "mime": "image/jpeg", "name": "small_mision-vision1.jpg", "path": null, "size": 31.54, "width": 500, "height": 282, "sizeInBytes": 31536}, "medium": {"ext": ".jpg", "url": "/uploads/medium_mision_vision1_89258a3e1f.jpg", "hash": "medium_mision_vision1_89258a3e1f", "mime": "image/jpeg", "name": "medium_mision-vision1.jpg", "path": null, "size": 55.02, "width": 750, "height": 422, "sizeInBytes": 55016}, "thumbnail": {"ext": ".jpg", "url": "/uploads/thumbnail_mision_vision1_89258a3e1f.jpg", "hash": "thumbnail_mision_vision1_89258a3e1f", "mime": "image/jpeg", "name": "thumbnail_mision-vision1.jpg", "path": null, "size": 10.7, "width": 245, "height": 138, "sizeInBytes": 10695}}	mision_vision1_89258a3e1f	.jpg	image/jpeg	44.46	/uploads/mision_vision1_89258a3e1f.jpg	\N	local	\N	/3	2025-08-15 21:47:30.374	2025-08-15 21:47:30.374	2025-08-15 21:47:30.374	1	1	\N
32	pkdsc2yj2aruptsmxssxi7ts	presentacion2.png	\N	\N	1024	1536	{"large": {"ext": ".png", "url": "/uploads/large_presentacion2_6c3a6ae338.png", "hash": "large_presentacion2_6c3a6ae338", "mime": "image/png", "name": "large_presentacion2.png", "path": null, "size": 1094.68, "width": 667, "height": 1000, "sizeInBytes": 1094683}, "small": {"ext": ".png", "url": "/uploads/small_presentacion2_6c3a6ae338.png", "hash": "small_presentacion2_6c3a6ae338", "mime": "image/png", "name": "small_presentacion2.png", "path": null, "size": 284.89, "width": 333, "height": 500, "sizeInBytes": 284892}, "medium": {"ext": ".png", "url": "/uploads/medium_presentacion2_6c3a6ae338.png", "hash": "medium_presentacion2_6c3a6ae338", "mime": "image/png", "name": "medium_presentacion2.png", "path": null, "size": 625.02, "width": 500, "height": 750, "sizeInBytes": 625023}, "thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_presentacion2_6c3a6ae338.png", "hash": "thumbnail_presentacion2_6c3a6ae338", "mime": "image/png", "name": "thumbnail_presentacion2.png", "path": null, "size": 36.44, "width": 104, "height": 156, "sizeInBytes": 36441}}	presentacion2_6c3a6ae338	.png	image/png	557.37	/uploads/presentacion2_6c3a6ae338.png	\N	local	\N	/3	2025-08-15 22:02:04.574	2025-08-15 22:02:04.574	2025-08-15 22:02:04.574	1	1	\N
\.


--
-- Data for Name: files_folder_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files_folder_lnk (id, file_id, folder_id, file_ord) FROM stdin;
1	18	1	1
2	19	1	2
3	20	2	1
5	22	2	3
7	23	3	1
8	30	3	2
9	31	3	2
10	32	3	3
\.


--
-- Data for Name: files_related_mph; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files_related_mph (id, file_id, related_id, related_type, field, "order") FROM stdin;
183	20	3	api::especialidad.especialidad	imagen	1
184	19	3	api::especialidad.especialidad	imagenes	1
185	18	3	api::especialidad.especialidad	imagenes	2
186	28	3	api::especialidad.especialidad	imagenes	3
8	5	1	api::noticia.noticia	imagen_destacada	1
9	5	3	api::noticia.noticia	imagen_destacada	1
11	6	4	api::noticia.noticia	imagen_destacada	1
12	6	5	api::noticia.noticia	imagen_destacada	1
14	4	6	api::noticia.noticia	imagen_destacada	1
15	4	7	api::noticia.noticia	imagen_destacada	1
16	13	1	api::usuario.usuario	retrato	1
19	16	2	api::carrera.carrera	carrera_imagen	1
194	32	20	api::publicacion.publicacion	galeria	1
21	17	3	api::carrera.carrera	carrera_imagen	1
195	32	21	api::publicacion.publicacion	galeria	1
26	14	1	api::especialidad.especialidad	imagen_destacada	1
27	15	2	api::especialidad.especialidad	imagen_destacada	1
202	31	7	api::publicacion.publicacion	galeria	1
203	30	7	api::publicacion.publicacion	galeria	2
204	31	23	api::publicacion.publicacion	galeria	1
205	30	23	api::publicacion.publicacion	galeria	2
158	23	1	api::dato-general.dato-general	logo	1
\.


--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, turno, descripcion, nombre_display, archivado) FROM stdin;
21	wdpdmi4rh9bueh8hn8cqv61k	2025-06-10 11:55:04.666	2025-06-20 11:51:09.104	2025-06-20 11:51:09.102	2	2	\N	Tarde	\N	Bisutería  [Tarde]  lu, mi, vi@  (Marco Palomino)	t
22	uq7ccjfgjmersev56hfzwoqf	2025-06-10 13:31:42.137	2025-06-20 11:51:09.108	2025-06-20 11:51:09.106	2	2	\N	Tarde	\N	Cerámica al Frio  [Tarde]  lu, mi, vi@  (Manuel Quispe)	t
19	y3djw0bfonxyfupkdh1e9feu	2025-06-03 15:26:30.505	2025-06-10 13:39:47.884	2025-06-10 13:39:47.849	1	1	\N	Mañana	\N	Bisutería  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)	f
20	lbwxirr1jghfb7x11gvrxf5j	2025-06-03 15:27:30.905	2025-06-10 13:39:47.886	2025-06-10 13:39:47.853	1	1	\N	Noche	\N	Cocina Nacional  [Noche]  Ma, Ju, Vi@  (Marco Palomino)	f
\.


--
-- Data for Name: grupos_calendario_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos_calendario_lnk (id, grupo_id, calendario_id) FROM stdin;
30	19	4
31	20	8
32	21	9
33	22	9
\.


--
-- Data for Name: grupos_modulo_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos_modulo_lnk (id, grupo_id, modulo_id) FROM stdin;
35	19	22
36	20	29
37	21	22
38	22	24
\.


--
-- Data for Name: grupos_personal_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos_personal_lnk (id, grupo_id, personal_id) FROM stdin;
15	19	4
16	20	1
17	21	1
18	22	3
\.


--
-- Data for Name: i18n_locale; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.i18n_locale (id, document_id, name, code, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
2	axw7i3c8rs7fpz7v9hx5fcpm	Spanish (Peru) (es-PE)	es-PE	2025-05-18 16:57:04.087	2025-05-18 16:57:33.677	2025-05-18 16:57:04.088	1	1	\N
\.


--
-- Data for Name: matriculas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matriculas (id, document_id, recibo, fecha, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, archivado) FROM stdin;
2	d0t91euqxm180m6boctb1vl4	65453	2025-06-19	2025-06-09 07:45:11.453	2025-06-10 13:39:48.14	2025-06-10 13:39:48.131	1	1	\N	f
\.


--
-- Data for Name: matriculas_grupo_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matriculas_grupo_lnk (id, matricula_id, grupo_id) FROM stdin;
\.


--
-- Data for Name: matriculas_paquete_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matriculas_paquete_lnk (id, matricula_id, paquete_id) FROM stdin;
1	2	13
\.


--
-- Data for Name: matriculas_users_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matriculas_users_lnk (id, matricula_id, user_id) FROM stdin;
2	2	7
\.


--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modulos (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, titulo_comercial, orden, descripcion, horas, creditos, metas, activo, slug, descripcion_2) FROM stdin;
23	qfpbx2u413wu0jmgg0ykxnvx	2025-05-29 14:03:32.051	2025-07-26 14:19:32.745	2025-07-26 14:19:32.724	1	1	\N	Pintura Decorativa	Pintura Decorativa	3	\N	150	\N	15	t	pintura-decorativa	\N
24	cot01twa1gexm55nz68jk0k6	2025-05-29 14:04:14.558	2025-07-26 14:22:22.796	2025-07-26 14:22:22.768	1	1	\N	Cerámica al Frio	Cerámica al Frio	4	\N	150	\N	15	t	ceramica-al-frio	\N
25	tthxdw3fwk2ey1xfl7m8a4w1	2025-05-29 14:06:03.39	2025-07-26 14:23:42.009	2025-07-26 14:23:41.995	1	1	\N	Acondicionamiento y Elaboración de Productos de Panadería y Pastelería	Productos Pastelería y Panadería 1	1	\N	528	20	15	t	acondicionamiento-preparacion-panaderia-pasteleria	\N
26	ppp704ogk42413i1tba1llr1	2025-05-29 14:07:32.659	2025-07-26 14:24:35.471	2025-07-26 14:24:35.455	1	1	\N	Decoración y Presentación de los Productos de Panadería y Pastelería	Productos Pastelería y Panadería 2	2	\N	528	20	15	t	decoracion-presentacion-panaderia-pasteleria	\N
27	p9scy13lqhj1s1u0bbkksygs	2025-05-29 14:08:46.356	2025-07-26 14:24:57.07	2025-07-26 14:24:57.056	1	1	\N	Técnicas de Decoración de Tortas	Técnicas de Decoración de Tortas	1	\N	300	\N	15	t	decoracion-tortas	\N
28	bs38cdlymk09msbkaoh8u0sy	2025-05-29 14:09:24.42	2025-07-26 14:25:23.633	2025-07-26 14:25:23.608	1	1	\N	Buffet	Buffet	2	\N	300	\N	15	t	buffet	\N
29	v3y2tsrdr8ncv70873r6s9yn	2025-05-29 14:10:08.388	2025-07-26 14:26:13.449	2025-07-26 14:26:13.418	1	1	\N	Cocina Nacional	Cocina Nacional	3	\N	300	\N	15	t	cocina-nacional	\N
30	jv0gy7syl7rgzwgocb8dur4n	2025-05-29 14:10:50.411	2025-07-26 14:26:46.82	2025-07-26 14:26:46.794	1	1	\N	Técnicas Culinarias	Técnicas Culinarias	4	\N	300	\N	15	t	tecnicas-culinarias	\N
31	zshujc3t6imihihbk6opa2s4	2025-05-29 14:11:53.388	2025-07-26 14:27:04.349	2025-07-26 14:27:04.325	1	1	\N	Mantenimiento de Carpintería	Carpintería en Madera	1	\N	300	\N	15	t	carpinteria-madera	\N
32	kro2buach7gk419760qcb5n1	2025-05-29 14:12:46.616	2025-07-26 14:27:26.999	2025-07-26 14:27:26.985	1	1	\N	Confección de Muebles en Melamina	Carpintería en Melamina	2	\N	300	\N	15	t	carpinteria-melamine	\N
1	r8hqyher86brqohevtfp8dd7	2025-05-29 13:17:39.14	2025-07-27 01:52:35.281	2025-07-27 01:52:35.259	1	1	\N	Corte De Cabello, Barba y Peinado	Corte De Cabello, Barba y Peinado	1	\N	528	20	15	t	corte-barba-peinado	\N
11	st27dg7bacylvokowlwbsj9f	2025-05-29 13:40:52.889	2025-07-27 02:00:44.567	2025-07-27 02:00:44.541	1	1	\N	Técnicas de Confección de Prendas de Vestir	Técnicas de Confección de Prendas de Vestir	2	\N	544	19	15	t	confeccion-prendas-vestir	\N
12	tlx9yrf2v6n33mphxk1mkwrp	2025-05-29 13:43:39.8	2025-07-27 02:02:39.236	2025-07-27 02:02:39.216	1	1	\N	Técnicas de Confección de Prendas de Vestir	Oper. Maquinas, Conf. Prendas Damas, Niños, Deportivas	2	\N	544	21	15	t	operatividad-confeccion-damas-ninios-deportiva	\N
13	grt10ws5mnqu3p9489oq52fd	2025-05-29 13:45:37.219	2025-07-27 02:03:34.836	2025-07-27 02:03:34.81	1	1	\N	Técnicas de Procesos de Acabados en Prendas de Vestir	Técnicas de Procesos de Acabados en Prendas de Vestir	2	\N	528	19	15	t	tecnicas-acabados-prendas-vestir	\N
2	vssnq87ddp2rid6txqcix13w	2025-05-29 13:19:07.077	2025-07-26 14:06:11.512	2025-07-26 14:06:11.495	1	1	\N	Tratamiento Capilar, Coloración, Ondulación y Laceado 	Tratamiento Capilar, Trituración, Ondulación, Laceado	2	\N	528	20	15	t	capilar-coloracion-ondulacion-laceado	\N
3	g7pyaj1rwfpnjtdsnm3ykk1o	2025-05-29 13:21:46.575	2025-07-26 14:06:30.56	2025-07-26 14:06:30.532	1	1	\N	Mantenimiento de Teléfonos Celulares	Reparacion de Celulares	1	\N	300	\N	15	t	reparacion-celulares	\N
4	gou0662sy32plzq34mkp9l08	2025-05-29 13:26:59.667	2025-07-26 14:06:45.642	2025-07-26 14:06:45.626	1	1	\N	Mantenimiento de Instalaciones Eléctricas Domiciliarias 	Instalaciones Eléctricas	2	\N	300	\N	15	t	intalaciones-electricas	\N
5	dszp3hzqc4b9rjm3s8rtoatm	2025-05-29 13:28:29.086	2025-07-26 14:07:20.315	2025-07-26 14:07:20.3	1	1	\N	Atención de Incidentes y Problemas de Operatividad en El Centro de Cómputo	Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo	1	\N	528	20	15	t	incidentes-operatividad-computo	\N
6	os0utwhbezwv8291f2qiw3hq	2025-05-29 13:30:20.783	2025-07-26 14:08:05.675	2025-07-26 14:08:05.658	1	1	\N	Monitoreo y Acciones de Mantenimiento de Centros de Cómputo	Monitoreo y Acciones de Mantenimiento de Centros de Cómputo	2	\N	528	20	15	t	monitoreo-mantenimiento-computo	\N
7	ti3q76vva62bl3gqtd7zv0a1	2025-05-29 13:31:59.05	2025-07-26 14:09:06.43	2025-07-26 14:09:06.414	1	1	\N	Ofimática	Ofimática	1	\N	300	\N	15	t	ofimatica	\N
8	mrpkusioji6nsk0c8pkwpj3e	2025-05-29 13:33:02.343	2025-07-26 14:09:40.926	2025-07-26 14:09:40.908	1	1	\N	Diseño Publicitario	Diseño Publicitario	2	\N	300	\N	15	t	disenio-publicitario	\N
9	sny04jqizrrellqdjj4ya5vx	2025-05-29 13:36:56.783	2025-07-26 14:09:57.483	2025-07-26 14:09:57.458	1	1	\N	Diseño Web	Diseño Web	3	\N	300	\N	15	t	disenio-web	\N
10	iis0a3s8s3ry2e3a0vij4p4i	2025-05-29 13:39:59.757	2025-07-26 14:10:36.732	2025-07-26 14:10:36.714	1	1	\N	Técnicas de Tizado, Tendido y Corte de Prendas de Vestir	Técnicas de Tizado, Tendido y Corte de Prendas de Vestir	1	\N	560	21	15	t	tizado-tendido-corte	\N
14	tpm59g3ev7o0lg3k8oa0hi2i	2025-05-29 13:46:36.262	2025-07-26 14:11:00.616	2025-07-26 14:11:00.587	1	1	\N	Bordados Computarizado	Bordados Computarizado	1	\N	528	20	15	t	bordado-computarizado	\N
15	fy4gm37ey3zg1iivt0l7zp89	2025-05-29 13:47:36.11	2025-07-26 14:14:37.008	2025-07-26 14:14:36.987	1	1	\N	Tejido a Maquina	Tejido a Maquina	1	\N	300	\N	15	t	tejido-maquina	\N
16	u1p7wfhn2kyw8x1a8l1vi5uv	2025-05-29 13:48:18.5	2025-07-26 14:14:59.171	2025-07-26 14:14:59.147	1	1	\N	Tejido a Mano	Tejido a Mano	2	\N	300	\N	15	t	tejido-mano	\N
18	xhy61e54ticqubp776izh60w	2025-05-29 13:52:34.184	2025-07-26 14:16:36.089	2025-07-26 14:16:36.076	1	1	\N	Ensamblado y Acabado de Artículos de Cuero	Ensamblado y Acabado de Artículos de Cuero	2	\N	528	20	15	t	ensamblado-acabado-articulos-cuero	\N
17	ce0kzk6kc7c9ywlmy08xf3ho	2025-05-29 13:51:41.201	2025-07-26 14:16:57.53	2025-07-26 14:16:57.517	1	1	\N	Diseño y Corte de Articulos de Cuero	Patronaje y Corte de Artículos de Cuero y Marroquinería	1	\N	528	20	15	t	disenio-corte-articulos-cuero	\N
19	tuoyeqvy9xxxkwd5b69fergf	2025-05-29 13:56:44.948	2025-07-26 14:17:22.51	2025-07-26 14:17:22.494	1	1	\N	Diseño y Corte de Calzado	Patronaje y Corte de Calzado	1	\N	528	20	15	t	disenio-corte-calzado	\N
20	soe6ojnvmbumzn81ylm0hdxr	2025-05-29 13:57:49.439	2025-07-26 14:18:26.9	2025-07-26 14:18:26.885	1	1	\N	Aparado, Armado y Acabado de Calzado	Aparado, Armado y Acabado de Calzado	2	\N	528	20	15	t	aparado-armado-acabado-calzado	\N
21	iv5cbp2yw0e6w1piuzyr18ow	2025-05-29 13:59:52.509	2025-07-26 14:19:00.347	2025-07-26 14:19:00.323	1	1	\N	Decoración de Eventos Especiales	Decoración de Eventos Especiales	1	\N	300	\N	15	t	decoracion-eventos-especiales	\N
22	snvdz5bu2uwcevnuvxs86z1j	2025-05-29 14:01:28.729	2025-07-26 14:19:17.886	2025-07-26 14:19:17.858	1	1	\N	Bisuterías	Bisutería	2	\N	150	\N	15	t	bisuteria	\N
\.


--
-- Data for Name: modulos_carrera_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modulos_carrera_lnk (id, modulo_id, carrera_id) FROM stdin;
1	1	1
2	2	1
3	3	2
4	4	3
5	5	4
6	6	4
7	7	5
8	8	5
9	9	5
10	10	6
11	11	6
12	12	7
13	13	7
14	14	8
15	15	9
16	16	9
19	17	11
20	18	11
21	19	10
22	20	10
23	21	12
24	22	12
25	23	12
26	24	12
27	25	13
28	26	13
29	27	14
30	28	14
31	29	14
32	30	14
33	31	15
34	32	15
\.


--
-- Data for Name: modulos_cmps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modulos_cmps (id, entity_id, cmp_id, component_type, field, "order") FROM stdin;
1	1	1	default.video-youtube	videosYoutube	1
2	1	2	default.video-youtube	videosYoutube	2
\.


--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paquetes (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, archivado) FROM stdin;
13	gc395yv2t6sqf0ntahynn053	2025-06-03 15:28:13.319	2025-06-10 13:39:48.102	2025-06-10 13:39:48.1	1	1	\N	Bisutería / Cocina Nacional  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)	\N	f
14	mg0e3dsqc49cmiedzcdr0nv8	2025-06-10 13:32:43.768	2025-06-20 11:51:09.124	2025-06-20 11:51:09.122	2	2	\N	Bisutería / Cerámica al Frio  [Tarde]  lu, mi, vi@  (Marco Palomino)	\N	t
\.


--
-- Data for Name: paquetes_grupos_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paquetes_grupos_lnk (id, paquete_id, grupo_id, grupo_ord) FROM stdin;
51	13	19	0
52	13	20	1
53	14	21	0
54	14	22	1
\.


--
-- Data for Name: personales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personales (id, document_id, memo, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, display_name) FROM stdin;
3	nxb5cpcuncipanxvmfvcm5vu	<p>Mi reseña</p>	2025-06-01 11:22:31.182	2025-06-01 11:48:32.629	2025-06-01 11:48:32.626	1	1	\N	Manuel Quispe
4	c4pyiqrth7jajsms0ybpm7g9	\N	2025-06-01 12:12:46.762	2025-06-01 12:12:46.874	2025-06-01 12:12:46.866	1	1	\N	Margarita Postillon
1	bvk9pie0eykss15u3paf147d	<p>Este es su trayector</p>	2025-05-31 20:11:49.881	2025-07-29 14:42:08.445	2025-07-29 14:42:08.365	1	1	\N	Marco Palomino
\.


--
-- Data for Name: personales_especialidad_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personales_especialidad_lnk (id, personal_id, especialidad_id, especialidad_ord) FROM stdin;
10	3	8	1
12	3	6	2
13	4	4	0
9	1	5	1
14	1	8	2
\.


--
-- Data for Name: personales_user_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personales_user_lnk (id, personal_id, user_id) FROM stdin;
7	3	7
9	4	8
11	1	6
\.


--
-- Data for Name: pruebas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pruebas (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, descripcion, descripcion_2, descripcion_3) FROM stdin;
\.


--
-- Data for Name: publicaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publicaciones (id, document_id, titulo, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, slug, tipo, descripcion_corta, fecha_publicacion, fecha_evento_inicio, fecha_evento_fin, ubicacion, destacado, contenido_2, contenido_1) FROM stdin;
3	e8msz69b491teu1zrow62yns	Novenario a la Virgen del Carmen	2025-07-29 21:10:27.727	2025-07-29 21:10:27.727	\N	1	1	\N	novenario-virgen-carmen-2025	noticia	\N	2025-07-21	\N	\N	\N	t	\N	\N
4	e8msz69b491teu1zrow62yns	Novenario a la Virgen del Carmen	2025-07-29 21:10:27.727	2025-07-29 21:10:27.727	2025-07-29 21:10:27.746	1	1	\N	novenario-virgen-carmen-2025	noticia	\N	2025-07-21	\N	\N	\N	t	\N	\N
1	yyg2j46wlys43uaig85gjou8	Matricula 2025-2 (Agosto - Diciembre)	2025-07-29 21:08:33.052	2025-08-10 20:28:48.708	\N	1	1	\N	matricula-2025-	comunicado	Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...	2025-07-21	2025-07-21 00:00:00	2025-09-10 00:00:00	CETPRO "SAN MARTIN DE PORRES"	t	\N	\N
15	f0s2clovur6issqjbvhabufv	Gran Inicio de Clasess Periodo Academico  2025-2	2025-08-10 20:33:45.559	2025-08-10 20:33:45.559	\N	1	1	\N	publicacion	evento	\N	2025-08-10	\N	\N	\N	t	<h1>Contenido 2</h1>	\N
14	yyg2j46wlys43uaig85gjou8	Matricula 2025-2 (Agosto - Diciembre)	2025-07-29 21:08:33.052	2025-08-10 20:28:48.708	2025-08-10 20:28:48.765	1	1	\N	matricula-2025-	comunicado	Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...	2025-07-21	2025-07-21 00:00:00	2025-09-10 00:00:00	CETPRO "SAN MARTIN DE PORRES"	t	\N	\N
9	ql3k450nh56nq25ukya9lvwj	Se busca personal de servicio	2025-07-29 21:18:30.808	2025-08-10 20:41:34.436	\N	1	1	\N	personal-servicio	comunicado	\N	2025-07-30	\N	\N	\N	t	\N	\N
17	ql3k450nh56nq25ukya9lvwj	Se busca personal de servicio	2025-07-29 21:18:30.808	2025-08-10 20:41:34.436	2025-08-10 20:41:34.471	1	1	\N	personal-servicio	comunicado	\N	2025-07-30	\N	\N	\N	t	\N	\N
21	eu7k2bljayqze2mn1047so77	Bienvenidos al CETPRO "San Martin de Porres"	2025-08-15 22:02:16.891	2025-08-15 22:03:01.444	2025-08-15 22:03:01.473	1	1	\N	presentacion	noticia	\N	2025-08-16	\N	\N	\N	f	\N	[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]
20	eu7k2bljayqze2mn1047so77	Bienvenidos al CETPRO "San Martin de Porres"	2025-08-15 22:02:16.891	2025-08-15 22:03:01.444	\N	1	1	\N	presentacion	noticia	\N	2025-08-16	\N	\N	\N	f	\N	[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]
7	trjmzv26fqtz8zkzyk731zm8	MISION / VISION	2025-07-29 21:15:07.065	2025-08-15 23:20:13.042	\N	1	1	\N	mision-vision	noticia	Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.	2025-01-01	\N	\N	\N	f	<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>	[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]
23	trjmzv26fqtz8zkzyk731zm8	MISION / VISION	2025-07-29 21:15:07.065	2025-08-15 23:20:13.042	2025-08-15 23:20:13.069	1	1	\N	mision-vision	noticia	Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.	2025-01-01	\N	\N	\N	f	<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>	[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]
\.


--
-- Data for Name: publicaciones_cmps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publicaciones_cmps (id, entity_id, cmp_id, component_type, field, "order") FROM stdin;
\.


--
-- Data for Name: sectores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sectores (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion) FROM stdin;
1	ksic21k90iexd2qj76s9f55v	2025-05-28 15:43:06.571	2025-05-28 15:43:06.571	2025-05-28 15:43:06.564	1	1	\N	OTRAS ACTIVIDADES DE SERVICIOS	\N
2	joqs621wwvbggyslc432y87r	2025-05-28 15:43:23.45	2025-05-28 15:43:23.45	2025-05-28 15:43:23.444	1	1	\N	ELECTRICIDAD, GAS Y AGUA	\N
3	pkt3aj0zjh0oybbdi971c1yz	2025-05-28 15:43:37.578	2025-05-28 15:43:37.578	2025-05-28 15:43:37.574	1	1	\N	INFORMACIÓN Y COMUNICACIONES	\N
4	n54ledd28nu6944zlgvu7g01	2025-05-28 15:43:53.091	2025-05-28 15:44:19.609	2025-05-28 15:44:19.558	1	1	\N	INDUSTRIAS MANUFACTURERAS	\N
\.


--
-- Data for Name: semestres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semestres (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, archivado) FROM stdin;
1	pt5yevsoi7s95e6hfn2daw8y	2025-05-29 14:25:37.223	2025-06-10 13:39:48.163	2025-06-10 13:39:48.16	1	1	\N	2025-1	\N	f
2	mryevrg1hc9si9qn3mhnfzec	2025-05-29 14:25:56.805	2025-06-20 11:51:09.156	2025-06-20 11:51:09.153	1	1	\N	2025-2	\N	t
\.


--
-- Data for Name: semestres_coordinador_1_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semestres_coordinador_1_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	4
2	2	4
\.


--
-- Data for Name: semestres_coordinador_2_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semestres_coordinador_2_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	1
2	2	3
\.


--
-- Data for Name: semestres_director_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semestres_director_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	3
2	2	1
\.


--
-- Data for Name: strapi_api_token_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_api_token_permissions (id, document_id, action, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_api_token_permissions_token_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_api_token_permissions_token_lnk (id, api_token_permission_id, api_token_id, api_token_permission_ord) FROM stdin;
\.


--
-- Data for Name: strapi_api_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_api_tokens (id, document_id, name, description, type, access_key, last_used_at, expires_at, lifespan, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
2	av50g4btnsiwdiu8ebfmmp7s	Full Access	A default API token with full access permissions, used for accessing or modifying resources	full-access	cbef89b32e1373b787988929b5a76cb39e16e8f0f17fdc0c2d2842352b25cf72bbee9a5f3ea1eeb539358df3a4ba4952754fc6080feb2bd085784d7e05dacf48	\N	\N	\N	2025-04-18 21:45:43.049	2025-04-18 21:45:43.049	2025-04-18 21:45:43.049	\N	\N	\N
1	iw33k6s0pv4zsglpvr3prast	Read Only	A default API token with read-only permissions, only used for accessing resources	read-only	407aea9d645f95d1199d853648892f78990b46469f8080691d6f4d331eedc67800f5402b070eaae9d341ea1c9e2243c15d35c39beecc38669dd29bf645804303	\N	\N	\N	2025-04-18 21:45:43.044	2025-07-02 01:52:51.638	2025-04-18 21:45:43.044	\N	\N	\N
3	z5c30535f36q25i10kd34b3y	Act-economicas		read-only	c2afa37a787a478b43db7518150662bdf258869588e0bdf6f00694228d2fccb9eb21d33a3009653d31e0b4c9044d6c0780e4f9748e44bf45353be70745903b09	\N	\N	\N	2025-07-02 01:55:32.105	2025-07-02 01:55:32.105	2025-07-02 01:55:32.106	\N	\N	\N
\.


--
-- Data for Name: strapi_core_store_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_core_store_settings (id, key, value, type, environment, tag) FROM stdin;
2	plugin_content_manager_configuration_content_types::plugin::upload.file	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"alternativeText":{"edit":{"label":"alternativeText","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"alternativeText","searchable":true,"sortable":true}},"caption":{"edit":{"label":"caption","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"caption","searchable":true,"sortable":true}},"width":{"edit":{"label":"width","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"width","searchable":true,"sortable":true}},"height":{"edit":{"label":"height","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"height","searchable":true,"sortable":true}},"formats":{"edit":{"label":"formats","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"formats","searchable":false,"sortable":false}},"hash":{"edit":{"label":"hash","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"hash","searchable":true,"sortable":true}},"ext":{"edit":{"label":"ext","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"ext","searchable":true,"sortable":true}},"mime":{"edit":{"label":"mime","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"mime","searchable":true,"sortable":true}},"size":{"edit":{"label":"size","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"size","searchable":true,"sortable":true}},"url":{"edit":{"label":"url","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"url","searchable":true,"sortable":true}},"previewUrl":{"edit":{"label":"previewUrl","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"previewUrl","searchable":true,"sortable":true}},"provider":{"edit":{"label":"provider","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"provider","searchable":true,"sortable":true}},"provider_metadata":{"edit":{"label":"provider_metadata","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"provider_metadata","searchable":false,"sortable":false}},"folder":{"edit":{"label":"folder","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"folder","searchable":true,"sortable":true}},"folderPath":{"edit":{"label":"folderPath","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"folderPath","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","alternativeText","caption"],"edit":[[{"name":"name","size":6},{"name":"alternativeText","size":6}],[{"name":"caption","size":6},{"name":"width","size":4}],[{"name":"height","size":4}],[{"name":"formats","size":12}],[{"name":"hash","size":6},{"name":"ext","size":6}],[{"name":"mime","size":6},{"name":"size","size":4}],[{"name":"url","size":6},{"name":"previewUrl","size":6}],[{"name":"provider","size":6}],[{"name":"provider_metadata","size":12}],[{"name":"folder","size":6},{"name":"folderPath","size":6}]]},"uid":"plugin::upload.file"}	object	\N	\N
3	plugin_content_manager_configuration_content_types::plugin::i18n.locale	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"code":{"edit":{"label":"code","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"code","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","code","createdAt"],"edit":[[{"name":"name","size":6},{"name":"code","size":6}]]},"uid":"plugin::i18n.locale"}	object	\N	\N
4	plugin_content_manager_configuration_content_types::plugin::content-releases.release	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"releasedAt":{"edit":{"label":"releasedAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"releasedAt","searchable":true,"sortable":true}},"scheduledAt":{"edit":{"label":"scheduledAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"scheduledAt","searchable":true,"sortable":true}},"timezone":{"edit":{"label":"timezone","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"timezone","searchable":true,"sortable":true}},"status":{"edit":{"label":"status","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"status","searchable":true,"sortable":true}},"actions":{"edit":{"label":"actions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"contentType"},"list":{"label":"actions","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","releasedAt","scheduledAt"],"edit":[[{"name":"name","size":6},{"name":"releasedAt","size":6}],[{"name":"scheduledAt","size":6},{"name":"timezone","size":6}],[{"name":"status","size":6},{"name":"actions","size":6}]]},"uid":"plugin::content-releases.release"}	object	\N	\N
5	plugin_content_manager_configuration_content_types::plugin::content-releases.release-action	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"contentType","defaultSortBy":"contentType","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"type":{"edit":{"label":"type","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"type","searchable":true,"sortable":true}},"contentType":{"edit":{"label":"contentType","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"contentType","searchable":true,"sortable":true}},"entryDocumentId":{"edit":{"label":"entryDocumentId","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"entryDocumentId","searchable":true,"sortable":true}},"release":{"edit":{"label":"release","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"release","searchable":true,"sortable":true}},"isEntryValid":{"edit":{"label":"isEntryValid","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"isEntryValid","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","type","contentType","entryDocumentId"],"edit":[[{"name":"type","size":6},{"name":"contentType","size":6}],[{"name":"entryDocumentId","size":6},{"name":"release","size":6}],[{"name":"isEntryValid","size":4}]]},"uid":"plugin::content-releases.release-action"}	object	\N	\N
6	plugin_content_manager_configuration_content_types::plugin::review-workflows.workflow	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"stages":{"edit":{"label":"stages","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"stages","searchable":false,"sortable":false}},"stageRequiredToPublish":{"edit":{"label":"stageRequiredToPublish","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"stageRequiredToPublish","searchable":true,"sortable":true}},"contentTypes":{"edit":{"label":"contentTypes","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"contentTypes","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","stages","stageRequiredToPublish"],"edit":[[{"name":"name","size":6},{"name":"stages","size":6}],[{"name":"stageRequiredToPublish","size":6}],[{"name":"contentTypes","size":12}]]},"uid":"plugin::review-workflows.workflow"}	object	\N	\N
7	plugin_content_manager_configuration_content_types::plugin::review-workflows.workflow-stage	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"color":{"edit":{"label":"color","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"color","searchable":true,"sortable":true}},"workflow":{"edit":{"label":"workflow","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"workflow","searchable":true,"sortable":true}},"permissions":{"edit":{"label":"permissions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"action"},"list":{"label":"permissions","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","color","workflow"],"edit":[[{"name":"name","size":6},{"name":"color","size":6}],[{"name":"workflow","size":6},{"name":"permissions","size":6}]]},"uid":"plugin::review-workflows.workflow-stage"}	object	\N	\N
1	strapi_content_types_schema	{"plugin::upload.file":{"collectionName":"files","info":{"singularName":"file","pluralName":"files","displayName":"File","description":""},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","configurable":false,"required":true},"alternativeText":{"type":"string","configurable":false},"caption":{"type":"string","configurable":false},"width":{"type":"integer","configurable":false},"height":{"type":"integer","configurable":false},"formats":{"type":"json","configurable":false},"hash":{"type":"string","configurable":false,"required":true},"ext":{"type":"string","configurable":false},"mime":{"type":"string","configurable":false,"required":true},"size":{"type":"decimal","configurable":false,"required":true},"url":{"type":"string","configurable":false,"required":true},"previewUrl":{"type":"string","configurable":false},"provider":{"type":"string","configurable":false,"required":true},"provider_metadata":{"type":"json","configurable":false},"related":{"type":"relation","relation":"morphToMany","configurable":false},"folder":{"type":"relation","relation":"manyToOne","target":"plugin::upload.folder","inversedBy":"files","private":true},"folderPath":{"type":"string","minLength":1,"required":true,"private":true,"searchable":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::upload.file","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"files"}}},"indexes":[{"name":"upload_files_folder_path_index","columns":["folder_path"],"type":null},{"name":"upload_files_created_at_index","columns":["created_at"],"type":null},{"name":"upload_files_updated_at_index","columns":["updated_at"],"type":null},{"name":"upload_files_name_index","columns":["name"],"type":null},{"name":"upload_files_size_index","columns":["size"],"type":null},{"name":"upload_files_ext_index","columns":["ext"],"type":null}],"plugin":"upload","globalId":"UploadFile","uid":"plugin::upload.file","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"files","info":{"singularName":"file","pluralName":"files","displayName":"File","description":""},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","configurable":false,"required":true},"alternativeText":{"type":"string","configurable":false},"caption":{"type":"string","configurable":false},"width":{"type":"integer","configurable":false},"height":{"type":"integer","configurable":false},"formats":{"type":"json","configurable":false},"hash":{"type":"string","configurable":false,"required":true},"ext":{"type":"string","configurable":false},"mime":{"type":"string","configurable":false,"required":true},"size":{"type":"decimal","configurable":false,"required":true},"url":{"type":"string","configurable":false,"required":true},"previewUrl":{"type":"string","configurable":false},"provider":{"type":"string","configurable":false,"required":true},"provider_metadata":{"type":"json","configurable":false},"related":{"type":"relation","relation":"morphToMany","configurable":false},"folder":{"type":"relation","relation":"manyToOne","target":"plugin::upload.folder","inversedBy":"files","private":true},"folderPath":{"type":"string","minLength":1,"required":true,"private":true,"searchable":false}},"kind":"collectionType"},"modelName":"file"},"plugin::upload.folder":{"collectionName":"upload_folders","info":{"singularName":"folder","pluralName":"folders","displayName":"Folder"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"required":true},"pathId":{"type":"integer","unique":true,"required":true},"parent":{"type":"relation","relation":"manyToOne","target":"plugin::upload.folder","inversedBy":"children"},"children":{"type":"relation","relation":"oneToMany","target":"plugin::upload.folder","mappedBy":"parent"},"files":{"type":"relation","relation":"oneToMany","target":"plugin::upload.file","mappedBy":"folder"},"path":{"type":"string","minLength":1,"required":true},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::upload.folder","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"upload_folders"}}},"indexes":[{"name":"upload_folders_path_id_index","columns":["path_id"],"type":"unique"},{"name":"upload_folders_path_index","columns":["path"],"type":"unique"}],"plugin":"upload","globalId":"UploadFolder","uid":"plugin::upload.folder","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"upload_folders","info":{"singularName":"folder","pluralName":"folders","displayName":"Folder"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"required":true},"pathId":{"type":"integer","unique":true,"required":true},"parent":{"type":"relation","relation":"manyToOne","target":"plugin::upload.folder","inversedBy":"children"},"children":{"type":"relation","relation":"oneToMany","target":"plugin::upload.folder","mappedBy":"parent"},"files":{"type":"relation","relation":"oneToMany","target":"plugin::upload.file","mappedBy":"folder"},"path":{"type":"string","minLength":1,"required":true}},"kind":"collectionType"},"modelName":"folder"},"plugin::i18n.locale":{"info":{"singularName":"locale","pluralName":"locales","collectionName":"locales","displayName":"Locale","description":""},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","min":1,"max":50,"configurable":false},"code":{"type":"string","unique":true,"configurable":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::i18n.locale","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"i18n_locale"}}},"plugin":"i18n","collectionName":"i18n_locale","globalId":"I18NLocale","uid":"plugin::i18n.locale","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"i18n_locale","info":{"singularName":"locale","pluralName":"locales","collectionName":"locales","displayName":"Locale","description":""},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","min":1,"max":50,"configurable":false},"code":{"type":"string","unique":true,"configurable":false}},"kind":"collectionType"},"modelName":"locale"},"plugin::content-releases.release":{"collectionName":"strapi_releases","info":{"singularName":"release","pluralName":"releases","displayName":"Release"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","required":true},"releasedAt":{"type":"datetime"},"scheduledAt":{"type":"datetime"},"timezone":{"type":"string"},"status":{"type":"enumeration","enum":["ready","blocked","failed","done","empty"],"required":true},"actions":{"type":"relation","relation":"oneToMany","target":"plugin::content-releases.release-action","mappedBy":"release"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::content-releases.release","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_releases"}}},"plugin":"content-releases","globalId":"ContentReleasesRelease","uid":"plugin::content-releases.release","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_releases","info":{"singularName":"release","pluralName":"releases","displayName":"Release"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","required":true},"releasedAt":{"type":"datetime"},"scheduledAt":{"type":"datetime"},"timezone":{"type":"string"},"status":{"type":"enumeration","enum":["ready","blocked","failed","done","empty"],"required":true},"actions":{"type":"relation","relation":"oneToMany","target":"plugin::content-releases.release-action","mappedBy":"release"}},"kind":"collectionType"},"modelName":"release"},"plugin::content-releases.release-action":{"collectionName":"strapi_release_actions","info":{"singularName":"release-action","pluralName":"release-actions","displayName":"Release Action"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"type":{"type":"enumeration","enum":["publish","unpublish"],"required":true},"contentType":{"type":"string","required":true},"entryDocumentId":{"type":"string"},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"release":{"type":"relation","relation":"manyToOne","target":"plugin::content-releases.release","inversedBy":"actions"},"isEntryValid":{"type":"boolean"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::content-releases.release-action","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_release_actions"}}},"plugin":"content-releases","globalId":"ContentReleasesReleaseAction","uid":"plugin::content-releases.release-action","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_release_actions","info":{"singularName":"release-action","pluralName":"release-actions","displayName":"Release Action"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"type":{"type":"enumeration","enum":["publish","unpublish"],"required":true},"contentType":{"type":"string","required":true},"entryDocumentId":{"type":"string"},"locale":{"type":"string"},"release":{"type":"relation","relation":"manyToOne","target":"plugin::content-releases.release","inversedBy":"actions"},"isEntryValid":{"type":"boolean"}},"kind":"collectionType"},"modelName":"release-action"},"plugin::review-workflows.workflow":{"collectionName":"strapi_workflows","info":{"name":"Workflow","description":"","singularName":"workflow","pluralName":"workflows","displayName":"Workflow"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","required":true,"unique":true},"stages":{"type":"relation","target":"plugin::review-workflows.workflow-stage","relation":"oneToMany","mappedBy":"workflow"},"stageRequiredToPublish":{"type":"relation","target":"plugin::review-workflows.workflow-stage","relation":"oneToOne","required":false},"contentTypes":{"type":"json","required":true,"default":"[]"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::review-workflows.workflow","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_workflows"}}},"plugin":"review-workflows","globalId":"ReviewWorkflowsWorkflow","uid":"plugin::review-workflows.workflow","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_workflows","info":{"name":"Workflow","description":"","singularName":"workflow","pluralName":"workflows","displayName":"Workflow"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","required":true,"unique":true},"stages":{"type":"relation","target":"plugin::review-workflows.workflow-stage","relation":"oneToMany","mappedBy":"workflow"},"stageRequiredToPublish":{"type":"relation","target":"plugin::review-workflows.workflow-stage","relation":"oneToOne","required":false},"contentTypes":{"type":"json","required":true,"default":"[]"}},"kind":"collectionType"},"modelName":"workflow"},"plugin::review-workflows.workflow-stage":{"collectionName":"strapi_workflows_stages","info":{"name":"Workflow Stage","description":"","singularName":"workflow-stage","pluralName":"workflow-stages","displayName":"Stages"},"options":{"version":"1.1.0","draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","configurable":false},"color":{"type":"string","configurable":false,"default":"#4945FF"},"workflow":{"type":"relation","target":"plugin::review-workflows.workflow","relation":"manyToOne","inversedBy":"stages","configurable":false},"permissions":{"type":"relation","target":"admin::permission","relation":"manyToMany","configurable":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::review-workflows.workflow-stage","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_workflows_stages"}}},"plugin":"review-workflows","globalId":"ReviewWorkflowsWorkflowStage","uid":"plugin::review-workflows.workflow-stage","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_workflows_stages","info":{"name":"Workflow Stage","description":"","singularName":"workflow-stage","pluralName":"workflow-stages","displayName":"Stages"},"options":{"version":"1.1.0"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","configurable":false},"color":{"type":"string","configurable":false,"default":"#4945FF"},"workflow":{"type":"relation","target":"plugin::review-workflows.workflow","relation":"manyToOne","inversedBy":"stages","configurable":false},"permissions":{"type":"relation","target":"admin::permission","relation":"manyToMany","configurable":false}},"kind":"collectionType"},"modelName":"workflow-stage"},"plugin::users-permissions.permission":{"collectionName":"up_permissions","info":{"name":"permission","description":"","singularName":"permission","pluralName":"permissions","displayName":"Permission"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","required":true,"configurable":false},"role":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.role","inversedBy":"permissions","configurable":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.permission","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"up_permissions"}}},"plugin":"users-permissions","globalId":"UsersPermissionsPermission","uid":"plugin::users-permissions.permission","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"up_permissions","info":{"name":"permission","description":"","singularName":"permission","pluralName":"permissions","displayName":"Permission"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","required":true,"configurable":false},"role":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.role","inversedBy":"permissions","configurable":false}},"kind":"collectionType"},"modelName":"permission","options":{"draftAndPublish":false}},"plugin::users-permissions.role":{"collectionName":"up_roles","info":{"name":"role","description":"","singularName":"role","pluralName":"roles","displayName":"Role"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":3,"required":true,"configurable":false},"description":{"type":"string","configurable":false},"type":{"type":"string","unique":true,"configurable":false},"permissions":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.permission","mappedBy":"role","configurable":false},"users":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.user","mappedBy":"role"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.role","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"up_roles"}}},"plugin":"users-permissions","globalId":"UsersPermissionsRole","kind":"collectionType","__filename__":"schema.json","uid":"plugin::users-permissions.role","modelType":"contentType","__schema__":{"collectionName":"up_roles","info":{"name":"role","description":"","singularName":"role","pluralName":"roles","displayName":"Role"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":3,"required":true,"configurable":false},"description":{"type":"string","configurable":false},"type":{"type":"string","unique":true,"configurable":false},"permissions":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.permission","mappedBy":"role","configurable":false},"users":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.user","mappedBy":"role"}},"kind":"collectionType"},"modelName":"role","options":{"draftAndPublish":false}},"plugin::users-permissions.user":{"collectionName":"users","info":{"singularName":"user","pluralName":"users","displayName":"User","description":"Extended user model"},"options":{"draftAndPublish":false},"attributes":{"username":{"type":"string","minLength":3},"email":{"type":"email","minLength":6,"required":true,"unique":true,"regex":"^[\\\\w-.]+@([\\\\w-]+\\\\.)+[\\\\w-]{2,4}$"},"provider":{"type":"string"},"password":{"type":"password","required":true,"minLength":8},"resetPasswordToken":{"type":"string"},"confirmationToken":{"type":"string"},"confirmed":{"type":"boolean","default":false},"blocked":{"type":"boolean","default":false},"role":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.role","inversedBy":"users","required":true},"nombre":{"type":"string"},"apellido_materno":{"type":"string"},"apellido_paterno":{"type":"string"},"apellidos":{"type":"string"},"celular":{"type":"string","required":true,"minLength":9,"maxLength":9,"regex":"^[0-9]{9}$"},"fecha_nacimiento":{"type":"date"},"direccion":{"type":"text"},"distrito":{"type":"string"},"avatar":{"type":"string"},"foto":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"tipo_documento":{"type":"enumeration","enum":["DNI","CE"],"default":"DNI","required":true},"dni":{"type":"string","unique":true,"required":true,"minLength":8,"maxLength":8,"regex":"^[0-9]{8}$"},"dni_frente":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files"]},"dni_reverso":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files"]},"sexo":{"type":"enumeration","enum":["F","M"]},"estado_civil":{"type":"enumeration","enum":["Soltero","Casado(a)","Viudo(a)","Divorciado(a)"]},"telefono":{"type":"string"},"instruccion":{"type":"enumeration","enum":["Primaria completa","Primaria incompleta","Secundaria completa","Secundaria incompleta","Superior"]},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"plugin::users-permissions.user","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"users"}}},"config":{"attributes":{"resetPasswordToken":{"hidden":true},"confirmationToken":{"hidden":true},"provider":{"hidden":true}}},"plugin":"users-permissions","globalId":"UsersPermissionsUser","kind":"collectionType","pluginOptions":{"users-permissions":{"plugin":true}},"__filename__":"schema.json","uid":"plugin::users-permissions.user","modelType":"contentType","__schema__":{"collectionName":"users","info":{"singularName":"user","pluralName":"users","displayName":"User","description":"Extended user model"},"options":{"draftAndPublish":false},"pluginOptions":{"users-permissions":{"plugin":true}},"attributes":{"username":{"type":"string","minLength":3},"email":{"type":"email","minLength":6,"required":true,"unique":true,"regex":"^[\\\\w-.]+@([\\\\w-]+\\\\.)+[\\\\w-]{2,4}$"},"provider":{"type":"string"},"password":{"type":"password","required":true,"minLength":8},"resetPasswordToken":{"type":"string"},"confirmationToken":{"type":"string"},"confirmed":{"type":"boolean","default":false},"blocked":{"type":"boolean","default":false},"role":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.role","inversedBy":"users","required":true},"nombre":{"type":"string"},"apellido_materno":{"type":"string"},"apellido_paterno":{"type":"string"},"apellidos":{"type":"string"},"celular":{"type":"string","required":true,"minLength":9,"maxLength":9,"regex":"^[0-9]{9}$"},"fecha_nacimiento":{"type":"date"},"direccion":{"type":"text"},"distrito":{"type":"string"},"avatar":{"type":"string"},"foto":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"tipo_documento":{"type":"enumeration","enum":["DNI","CE"],"default":"DNI","required":true},"dni":{"type":"string","unique":true,"required":true,"minLength":8,"maxLength":8,"regex":"^[0-9]{8}$"},"dni_frente":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files"]},"dni_reverso":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files"]},"sexo":{"type":"enumeration","enum":["F","M"]},"estado_civil":{"type":"enumeration","enum":["Soltero","Casado(a)","Viudo(a)","Divorciado(a)"]},"telefono":{"type":"string"},"instruccion":{"type":"enumeration","enum":["Primaria completa","Primaria incompleta","Secundaria completa","Secundaria incompleta","Superior"]}},"kind":"collectionType"},"modelName":"user"},"api::act-economica.act-economica":{"kind":"collectionType","collectionName":"act-economicas","info":{"singularName":"act-economica","pluralName":"act-economicas","displayName":"Act-Economica","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false},"especialidad":{"type":"relation","relation":"manyToOne","target":"api::especialidad.especialidad"},"familia":{"type":"relation","relation":"manyToOne","target":"api::familia.familia"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::act-economica.act-economica","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"act-economicas"}}},"apiName":"act-economica","globalId":"ActEconomica","uid":"api::act-economica.act-economica","modelType":"contentType","__schema__":{"collectionName":"act-economicas","info":{"singularName":"act-economica","pluralName":"act-economicas","displayName":"Act-Economica","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false},"especialidad":{"type":"relation","relation":"manyToOne","target":"api::especialidad.especialidad"},"familia":{"type":"relation","relation":"manyToOne","target":"api::familia.familia"}},"kind":"collectionType"},"modelName":"act-economica","actions":{},"lifecycles":{}},"api::calendario.calendario":{"kind":"collectionType","collectionName":"calendarios","info":{"singularName":"calendario","pluralName":"calendarios","displayName":"Calendario"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"fecha-ini":{"type":"date","required":true},"fecha-fin":{"type":"date","required":true},"tipo":{"type":"enumeration","enum":["Academico","Simulacro","Festividad"],"default":"Academico","required":true},"semestre":{"type":"relation","relation":"manyToOne","target":"api::semestre.semestre"},"archivado":{"type":"boolean","default":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::calendario.calendario","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"calendarios"}}},"apiName":"calendario","globalId":"Calendario","uid":"api::calendario.calendario","modelType":"contentType","__schema__":{"collectionName":"calendarios","info":{"singularName":"calendario","pluralName":"calendarios","displayName":"Calendario"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"fecha-ini":{"type":"date","required":true},"fecha-fin":{"type":"date","required":true},"tipo":{"type":"enumeration","enum":["Academico","Simulacro","Festividad"],"default":"Academico","required":true},"semestre":{"type":"relation","relation":"manyToOne","target":"api::semestre.semestre"},"archivado":{"type":"boolean","default":false}},"kind":"collectionType"},"modelName":"calendario","actions":{},"lifecycles":{}},"api::carrera.carrera":{"kind":"collectionType","collectionName":"carreras","info":{"singularName":"carrera","pluralName":"carreras","displayName":"Carrera","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"codigo":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"duracion":{"type":"integer"},"descripcion2":{"type":"blocks"},"creditos":{"type":"integer"},"nivel":{"type":"enumeration","enum":["Auxiliar Técnico","Técnico","Profesional"]},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files","videos","audios"]},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"act-economica":{"type":"relation","relation":"manyToOne","target":"api::act-economica.act-economica"},"slug":{"type":"string"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::carrera.carrera","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"carreras"}}},"apiName":"carrera","globalId":"Carrera","uid":"api::carrera.carrera","modelType":"contentType","__schema__":{"collectionName":"carreras","info":{"singularName":"carrera","pluralName":"carreras","displayName":"Carrera","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"codigo":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"duracion":{"type":"integer"},"descripcion2":{"type":"blocks"},"creditos":{"type":"integer"},"nivel":{"type":"enumeration","enum":["Auxiliar Técnico","Técnico","Profesional"]},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files","videos","audios"]},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"act-economica":{"type":"relation","relation":"manyToOne","target":"api::act-economica.act-economica"},"slug":{"type":"string"}},"kind":"collectionType"},"modelName":"carrera","actions":{},"lifecycles":{}},"api::dato-general.dato-general":{"kind":"singleType","collectionName":"dato_general","info":{"singularName":"dato-general","pluralName":"datos-generales","displayName":"Datos Generales","description":"Información general de la institución educativa"},"options":{"draftAndPublish":false},"attributes":{"nombreInstitucion":{"type":"string","required":true},"direccion":{"type":"string","required":true},"telefono1":{"type":"string","required":true},"telefono2":{"type":"string"},"correo":{"type":"email"},"paginaWeb":{"type":"string","regex":"^(https?://)?([\\\\w.-]+)\\\\.([a-z\\\\.]{2,6})([/\\\\w\\\\.-]*)*/?$"},"facebook":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?facebook\\\\.com\\\\/[a-zA-Z0-9(.?)?]"},"youtube":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?(youtube\\\\.com\\\\/(watch\\\\?v=|embed\\\\/|shorts\\\\/|@[\\u0000-]{1,})|youtu\\\\.be\\\\/)[\\\\w\\\\-]{0,11}.*$"},"twitter":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?(twitter\\\\.com|x\\\\.com)\\\\/([A-Za-z0-9_]{1,15})(\\\\/status\\\\/\\\\d+)?$"},"instagram":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?instagram\\\\.com\\\\/(p|reel|tv|[A-Za-z0-9_.]+)\\\\/?$"},"tiktok":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?tiktok\\\\.com\\\\/@[A-Za-z0-9._]+(\\\\/video\\\\/\\\\d+)?\\\\/?$"},"ruc":{"type":"string","regex":"^\\\\d{11}$","required":true},"rd":{"type":"string","required":true},"logo":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::dato-general.dato-general","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"dato_general"}}},"apiName":"dato-general","globalId":"DatoGeneral","uid":"api::dato-general.dato-general","modelType":"contentType","__schema__":{"collectionName":"dato_general","info":{"singularName":"dato-general","pluralName":"datos-generales","displayName":"Datos Generales","description":"Información general de la institución educativa"},"options":{"draftAndPublish":false},"attributes":{"nombreInstitucion":{"type":"string","required":true},"direccion":{"type":"string","required":true},"telefono1":{"type":"string","required":true},"telefono2":{"type":"string"},"correo":{"type":"email"},"paginaWeb":{"type":"string","regex":"^(https?://)?([\\\\w.-]+)\\\\.([a-z\\\\.]{2,6})([/\\\\w\\\\.-]*)*/?$"},"facebook":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?facebook\\\\.com\\\\/[a-zA-Z0-9(.?)?]"},"youtube":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?(youtube\\\\.com\\\\/(watch\\\\?v=|embed\\\\/|shorts\\\\/|@[\\u0000-]{1,})|youtu\\\\.be\\\\/)[\\\\w\\\\-]{0,11}.*$"},"twitter":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?(twitter\\\\.com|x\\\\.com)\\\\/([A-Za-z0-9_]{1,15})(\\\\/status\\\\/\\\\d+)?$"},"instagram":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?instagram\\\\.com\\\\/(p|reel|tv|[A-Za-z0-9_.]+)\\\\/?$"},"tiktok":{"type":"string","regex":"^(https?:\\\\/\\\\/)?(www\\\\.)?tiktok\\\\.com\\\\/@[A-Za-z0-9._]+(\\\\/video\\\\/\\\\d+)?\\\\/?$"},"ruc":{"type":"string","regex":"^\\\\d{11}$","required":true},"rd":{"type":"string","required":true},"logo":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]}},"kind":"singleType"},"modelName":"dato-general","actions":{},"lifecycles":{}},"api::especialidad.especialidad":{"kind":"collectionType","collectionName":"especialidades","info":{"singularName":"especialidad","pluralName":"especialidades","displayName":"Especialidad","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"descripcion2":{"type":"blocks"},"slug":{"type":"string"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::especialidad.especialidad","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"especialidades"}}},"apiName":"especialidad","globalId":"Especialidad","uid":"api::especialidad.especialidad","modelType":"contentType","__schema__":{"collectionName":"especialidades","info":{"singularName":"especialidad","pluralName":"especialidades","displayName":"Especialidad","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"descripcion2":{"type":"blocks"},"slug":{"type":"string"}},"kind":"collectionType"},"modelName":"especialidad","actions":{},"lifecycles":{}},"api::familia.familia":{"kind":"collectionType","collectionName":"familias","info":{"singularName":"familia","pluralName":"familias","displayName":"Familia"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files","videos","audios"]},"Sector":{"type":"relation","relation":"manyToOne","target":"api::sector.sector"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::familia.familia","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"familias"}}},"apiName":"familia","globalId":"Familia","uid":"api::familia.familia","modelType":"contentType","__schema__":{"collectionName":"familias","info":{"singularName":"familia","pluralName":"familias","displayName":"Familia"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images","files","videos","audios"]},"Sector":{"type":"relation","relation":"manyToOne","target":"api::sector.sector"}},"kind":"collectionType"},"modelName":"familia","actions":{},"lifecycles":{}},"api::grupo.grupo":{"kind":"collectionType","collectionName":"grupos","info":{"singularName":"grupo","pluralName":"grupos","displayName":"Grupo","description":""},"options":{"draftAndPublish":false},"attributes":{"nombre_display":{"type":"string","unique":true},"turno":{"type":"enumeration","enum":["Mañana","Tarde","Noche"],"required":true},"calendario":{"type":"relation","relation":"manyToOne","target":"api::calendario.calendario"},"modulo":{"type":"relation","relation":"manyToOne","target":"api::modulo.modulo"},"descripcion":{"type":"string"},"personal":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"archivado":{"type":"boolean","default":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::grupo.grupo","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"grupos"}}},"apiName":"grupo","globalId":"Grupo","uid":"api::grupo.grupo","modelType":"contentType","__schema__":{"collectionName":"grupos","info":{"singularName":"grupo","pluralName":"grupos","displayName":"Grupo","description":""},"options":{"draftAndPublish":false},"attributes":{"nombre_display":{"type":"string","unique":true},"turno":{"type":"enumeration","enum":["Mañana","Tarde","Noche"],"required":true},"calendario":{"type":"relation","relation":"manyToOne","target":"api::calendario.calendario"},"modulo":{"type":"relation","relation":"manyToOne","target":"api::modulo.modulo"},"descripcion":{"type":"string"},"personal":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"archivado":{"type":"boolean","default":false}},"kind":"collectionType"},"modelName":"grupo","actions":{},"lifecycles":{}},"api::matricula.matricula":{"kind":"collectionType","collectionName":"matriculas","info":{"singularName":"matricula","pluralName":"matriculas","displayName":"Matricula","description":""},"options":{"draftAndPublish":false},"attributes":{"recibo":{"type":"string"},"fecha":{"type":"date"},"grupo":{"type":"relation","relation":"manyToOne","target":"api::grupo.grupo"},"paquete":{"type":"relation","relation":"manyToOne","target":"api::paquete.paquete"},"users":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.user"},"archivado":{"type":"boolean","default":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::matricula.matricula","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"matriculas"}}},"apiName":"matricula","globalId":"Matricula","uid":"api::matricula.matricula","modelType":"contentType","__schema__":{"collectionName":"matriculas","info":{"singularName":"matricula","pluralName":"matriculas","displayName":"Matricula","description":""},"options":{"draftAndPublish":false},"attributes":{"recibo":{"type":"string"},"fecha":{"type":"date"},"grupo":{"type":"relation","relation":"manyToOne","target":"api::grupo.grupo"},"paquete":{"type":"relation","relation":"manyToOne","target":"api::paquete.paquete"},"users":{"type":"relation","relation":"manyToOne","target":"plugin::users-permissions.user"},"archivado":{"type":"boolean","default":false}},"kind":"collectionType"},"modelName":"matricula","actions":{},"lifecycles":{}},"api::modulo.modulo":{"kind":"collectionType","collectionName":"modulos","info":{"singularName":"modulo","pluralName":"modulos","displayName":"Modulo","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"orden":{"type":"integer"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"descripcion2":{"type":"blocks"},"horas":{"type":"integer"},"creditos":{"type":"integer"},"metas":{"type":"integer","default":15},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"activo":{"type":"boolean","default":true},"carrera":{"type":"relation","relation":"manyToOne","target":"api::carrera.carrera"},"slug":{"type":"string"},"videosYoutube":{"type":"component","repeatable":true,"component":"default.video-youtube"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::modulo.modulo","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"modulos"}}},"apiName":"modulo","globalId":"Modulo","uid":"api::modulo.modulo","modelType":"contentType","__schema__":{"collectionName":"modulos","info":{"singularName":"modulo","pluralName":"modulos","displayName":"Modulo","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"titulo-comercial":{"type":"string"},"orden":{"type":"integer"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"descripcion2":{"type":"blocks"},"horas":{"type":"integer"},"creditos":{"type":"integer"},"metas":{"type":"integer","default":15},"imagenes":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"imagen":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"activo":{"type":"boolean","default":true},"carrera":{"type":"relation","relation":"manyToOne","target":"api::carrera.carrera"},"slug":{"type":"string"},"videosYoutube":{"type":"component","repeatable":true,"component":"default.video-youtube"}},"kind":"collectionType"},"modelName":"modulo","actions":{},"lifecycles":{}},"api::paquete.paquete":{"kind":"collectionType","collectionName":"paquetes","info":{"singularName":"paquete","pluralName":"paquetes","displayName":"Paquete","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string","required":false},"descripcion":{"type":"text"},"grupos":{"type":"relation","relation":"manyToMany","target":"api::grupo.grupo"},"archivado":{"type":"boolean","default":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::paquete.paquete","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"paquetes"}}},"apiName":"paquete","globalId":"Paquete","uid":"api::paquete.paquete","modelType":"contentType","__schema__":{"collectionName":"paquetes","info":{"singularName":"paquete","pluralName":"paquetes","displayName":"Paquete","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string","required":false},"descripcion":{"type":"text"},"grupos":{"type":"relation","relation":"manyToMany","target":"api::grupo.grupo"},"archivado":{"type":"boolean","default":false}},"kind":"collectionType"},"modelName":"paquete","actions":{},"lifecycles":{}},"api::personal.personal":{"kind":"collectionType","collectionName":"personales","info":{"singularName":"personal","pluralName":"personales","displayName":"Personal"},"options":{"draftAndPublish":false},"attributes":{"display_name":{"type":"string","configurable":false},"user":{"type":"relation","relation":"oneToOne","target":"plugin::users-permissions.user"},"memo":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"especialidad":{"type":"relation","relation":"manyToMany","target":"api::especialidad.especialidad"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::personal.personal","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"personales"}}},"apiName":"personal","globalId":"Personal","uid":"api::personal.personal","modelType":"contentType","__schema__":{"collectionName":"personales","info":{"singularName":"personal","pluralName":"personales","displayName":"Personal"},"options":{"draftAndPublish":false},"attributes":{"display_name":{"type":"string","configurable":false},"user":{"type":"relation","relation":"oneToOne","target":"plugin::users-permissions.user"},"memo":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"especialidad":{"type":"relation","relation":"manyToMany","target":"api::especialidad.especialidad"}},"kind":"collectionType"},"modelName":"personal","actions":{},"lifecycles":{}},"api::prueba.prueba":{"kind":"collectionType","collectionName":"pruebas","info":{"singularName":"prueba","pluralName":"pruebas","displayName":"Prueba","description":""},"options":{"draftAndPublish":true},"attributes":{"Descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"Descripcion_2":{"type":"blocks"},"Descripcion_3":{"type":"richtext"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::prueba.prueba","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"pruebas"}}},"apiName":"prueba","globalId":"Prueba","uid":"api::prueba.prueba","modelType":"contentType","__schema__":{"collectionName":"pruebas","info":{"singularName":"prueba","pluralName":"pruebas","displayName":"Prueba","description":""},"options":{"draftAndPublish":true},"attributes":{"Descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"Descripcion_2":{"type":"blocks"},"Descripcion_3":{"type":"richtext"}},"kind":"collectionType"},"modelName":"prueba","actions":{},"lifecycles":{}},"api::publicacion.publicacion":{"kind":"collectionType","collectionName":"publicaciones","info":{"singularName":"publicacion","pluralName":"publicaciones","displayName":"Publicación","description":"Agrupa noticias, eventos y avisos"},"options":{"draftAndPublish":true},"attributes":{"titulo":{"type":"string","required":true},"slug":{"type":"uid","targetField":"titulo","required":true},"tipo":{"type":"enumeration","enum":["noticia","evento","comunicado"],"required":true},"descripcionCorta":{"type":"text"},"contenido1":{"type":"blocks"},"contenido2":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"fechaPublicacion":{"type":"date","required":true},"fechaEventoInicio":{"type":"datetime"},"fechaEventoFin":{"type":"datetime"},"ubicacion":{"type":"string"},"destacado":{"type":"boolean","default":false},"imagenPrincipal":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"galeria":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"videosYoutube":{"type":"component","repeatable":true,"component":"default.video-youtube"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::publicacion.publicacion","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"publicaciones"}}},"apiName":"publicacion","globalId":"Publicacion","uid":"api::publicacion.publicacion","modelType":"contentType","__schema__":{"collectionName":"publicaciones","info":{"singularName":"publicacion","pluralName":"publicaciones","displayName":"Publicación","description":"Agrupa noticias, eventos y avisos"},"options":{"draftAndPublish":true},"attributes":{"titulo":{"type":"string","required":true},"slug":{"type":"uid","targetField":"titulo","required":true},"tipo":{"type":"enumeration","enum":["noticia","evento","comunicado"],"required":true},"descripcionCorta":{"type":"text"},"contenido1":{"type":"blocks"},"contenido2":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"fechaPublicacion":{"type":"date","required":true},"fechaEventoInicio":{"type":"datetime"},"fechaEventoFin":{"type":"datetime"},"ubicacion":{"type":"string"},"destacado":{"type":"boolean","default":false},"imagenPrincipal":{"type":"media","multiple":false,"required":false,"allowedTypes":["images"]},"galeria":{"type":"media","multiple":true,"required":false,"allowedTypes":["images"]},"videosYoutube":{"type":"component","repeatable":true,"component":"default.video-youtube"}},"kind":"collectionType"},"modelName":"publicacion","actions":{},"lifecycles":{}},"api::sector.sector":{"kind":"collectionType","collectionName":"sectores","info":{"singularName":"sector","pluralName":"sectores","displayName":"Sector"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"richtext","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::sector.sector","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"sectores"}}},"apiName":"sector","globalId":"Sector","uid":"api::sector.sector","modelType":"contentType","__schema__":{"collectionName":"sectores","info":{"singularName":"sector","pluralName":"sectores","displayName":"Sector"},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"customField","customField":"plugin::ckeditor5.CKEditor","options":{"preset":"defaultHtml"}},"imagen":{"type":"media","multiple":false}},"kind":"collectionType"},"modelName":"sector","actions":{},"lifecycles":{}},"api::semestre.semestre":{"kind":"collectionType","collectionName":"semestres","info":{"singularName":"semestre","pluralName":"semestres","displayName":"Semestre","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"text"},"director":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"coordinador_1":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"coordinador_2":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"archivado":{"type":"boolean","default":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"api::semestre.semestre","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"semestres"}}},"apiName":"semestre","globalId":"Semestre","uid":"api::semestre.semestre","modelType":"contentType","__schema__":{"collectionName":"semestres","info":{"singularName":"semestre","pluralName":"semestres","displayName":"Semestre","description":""},"options":{"draftAndPublish":false},"attributes":{"titulo":{"type":"string"},"descripcion":{"type":"text"},"director":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"coordinador_1":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"coordinador_2":{"type":"relation","relation":"manyToOne","target":"api::personal.personal"},"archivado":{"type":"boolean","default":false}},"kind":"collectionType"},"modelName":"semestre","actions":{},"lifecycles":{}},"admin::permission":{"collectionName":"admin_permissions","info":{"name":"Permission","description":"","singularName":"permission","pluralName":"permissions","displayName":"Permission"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"actionParameters":{"type":"json","configurable":false,"required":false,"default":{}},"subject":{"type":"string","minLength":1,"configurable":false,"required":false},"properties":{"type":"json","configurable":false,"required":false,"default":{}},"conditions":{"type":"json","configurable":false,"required":false,"default":[]},"role":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::role"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::permission","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"admin_permissions"}}},"plugin":"admin","globalId":"AdminPermission","uid":"admin::permission","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"admin_permissions","info":{"name":"Permission","description":"","singularName":"permission","pluralName":"permissions","displayName":"Permission"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"actionParameters":{"type":"json","configurable":false,"required":false,"default":{}},"subject":{"type":"string","minLength":1,"configurable":false,"required":false},"properties":{"type":"json","configurable":false,"required":false,"default":{}},"conditions":{"type":"json","configurable":false,"required":false,"default":[]},"role":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::role"}},"kind":"collectionType"},"modelName":"permission"},"admin::user":{"collectionName":"admin_users","info":{"name":"User","description":"","singularName":"user","pluralName":"users","displayName":"User"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"firstname":{"type":"string","unique":false,"minLength":1,"configurable":false,"required":false},"lastname":{"type":"string","unique":false,"minLength":1,"configurable":false,"required":false},"username":{"type":"string","unique":false,"configurable":false,"required":false},"email":{"type":"email","minLength":6,"configurable":false,"required":true,"unique":true,"private":true},"password":{"type":"password","minLength":6,"configurable":false,"required":false,"private":true,"searchable":false},"resetPasswordToken":{"type":"string","configurable":false,"private":true,"searchable":false},"registrationToken":{"type":"string","configurable":false,"private":true,"searchable":false},"isActive":{"type":"boolean","default":false,"configurable":false,"private":true},"roles":{"configurable":false,"private":true,"type":"relation","relation":"manyToMany","inversedBy":"users","target":"admin::role","collectionName":"strapi_users_roles"},"blocked":{"type":"boolean","default":false,"configurable":false,"private":true},"preferedLanguage":{"type":"string","configurable":false,"required":false,"searchable":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::user","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"admin_users"}}},"config":{"attributes":{"resetPasswordToken":{"hidden":true},"registrationToken":{"hidden":true}}},"plugin":"admin","globalId":"AdminUser","uid":"admin::user","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"admin_users","info":{"name":"User","description":"","singularName":"user","pluralName":"users","displayName":"User"},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"firstname":{"type":"string","unique":false,"minLength":1,"configurable":false,"required":false},"lastname":{"type":"string","unique":false,"minLength":1,"configurable":false,"required":false},"username":{"type":"string","unique":false,"configurable":false,"required":false},"email":{"type":"email","minLength":6,"configurable":false,"required":true,"unique":true,"private":true},"password":{"type":"password","minLength":6,"configurable":false,"required":false,"private":true,"searchable":false},"resetPasswordToken":{"type":"string","configurable":false,"private":true,"searchable":false},"registrationToken":{"type":"string","configurable":false,"private":true,"searchable":false},"isActive":{"type":"boolean","default":false,"configurable":false,"private":true},"roles":{"configurable":false,"private":true,"type":"relation","relation":"manyToMany","inversedBy":"users","target":"admin::role","collectionName":"strapi_users_roles"},"blocked":{"type":"boolean","default":false,"configurable":false,"private":true},"preferedLanguage":{"type":"string","configurable":false,"required":false,"searchable":false}},"kind":"collectionType"},"modelName":"user","options":{"draftAndPublish":false}},"admin::role":{"collectionName":"admin_roles","info":{"name":"Role","description":"","singularName":"role","pluralName":"roles","displayName":"Role"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"unique":true,"configurable":false,"required":true},"code":{"type":"string","minLength":1,"unique":true,"configurable":false,"required":true},"description":{"type":"string","configurable":false},"users":{"configurable":false,"type":"relation","relation":"manyToMany","mappedBy":"roles","target":"admin::user"},"permissions":{"configurable":false,"type":"relation","relation":"oneToMany","mappedBy":"role","target":"admin::permission"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::role","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"admin_roles"}}},"plugin":"admin","globalId":"AdminRole","uid":"admin::role","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"admin_roles","info":{"name":"Role","description":"","singularName":"role","pluralName":"roles","displayName":"Role"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"unique":true,"configurable":false,"required":true},"code":{"type":"string","minLength":1,"unique":true,"configurable":false,"required":true},"description":{"type":"string","configurable":false},"users":{"configurable":false,"type":"relation","relation":"manyToMany","mappedBy":"roles","target":"admin::user"},"permissions":{"configurable":false,"type":"relation","relation":"oneToMany","mappedBy":"role","target":"admin::permission"}},"kind":"collectionType"},"modelName":"role"},"admin::api-token":{"collectionName":"strapi_api_tokens","info":{"name":"Api Token","singularName":"api-token","pluralName":"api-tokens","displayName":"Api Token","description":""},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"configurable":false,"required":true,"unique":true},"description":{"type":"string","minLength":1,"configurable":false,"required":false,"default":""},"type":{"type":"enumeration","enum":["read-only","full-access","custom"],"configurable":false,"required":true,"default":"read-only"},"accessKey":{"type":"string","minLength":1,"configurable":false,"required":true,"searchable":false},"lastUsedAt":{"type":"datetime","configurable":false,"required":false},"permissions":{"type":"relation","target":"admin::api-token-permission","relation":"oneToMany","mappedBy":"token","configurable":false,"required":false},"expiresAt":{"type":"datetime","configurable":false,"required":false},"lifespan":{"type":"biginteger","configurable":false,"required":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::api-token","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_api_tokens"}}},"plugin":"admin","globalId":"AdminApiToken","uid":"admin::api-token","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_api_tokens","info":{"name":"Api Token","singularName":"api-token","pluralName":"api-tokens","displayName":"Api Token","description":""},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"configurable":false,"required":true,"unique":true},"description":{"type":"string","minLength":1,"configurable":false,"required":false,"default":""},"type":{"type":"enumeration","enum":["read-only","full-access","custom"],"configurable":false,"required":true,"default":"read-only"},"accessKey":{"type":"string","minLength":1,"configurable":false,"required":true,"searchable":false},"lastUsedAt":{"type":"datetime","configurable":false,"required":false},"permissions":{"type":"relation","target":"admin::api-token-permission","relation":"oneToMany","mappedBy":"token","configurable":false,"required":false},"expiresAt":{"type":"datetime","configurable":false,"required":false},"lifespan":{"type":"biginteger","configurable":false,"required":false}},"kind":"collectionType"},"modelName":"api-token"},"admin::api-token-permission":{"collectionName":"strapi_api_token_permissions","info":{"name":"API Token Permission","description":"","singularName":"api-token-permission","pluralName":"api-token-permissions","displayName":"API Token Permission"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"token":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::api-token"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::api-token-permission","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_api_token_permissions"}}},"plugin":"admin","globalId":"AdminApiTokenPermission","uid":"admin::api-token-permission","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_api_token_permissions","info":{"name":"API Token Permission","description":"","singularName":"api-token-permission","pluralName":"api-token-permissions","displayName":"API Token Permission"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"token":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::api-token"}},"kind":"collectionType"},"modelName":"api-token-permission"},"admin::transfer-token":{"collectionName":"strapi_transfer_tokens","info":{"name":"Transfer Token","singularName":"transfer-token","pluralName":"transfer-tokens","displayName":"Transfer Token","description":""},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"configurable":false,"required":true,"unique":true},"description":{"type":"string","minLength":1,"configurable":false,"required":false,"default":""},"accessKey":{"type":"string","minLength":1,"configurable":false,"required":true},"lastUsedAt":{"type":"datetime","configurable":false,"required":false},"permissions":{"type":"relation","target":"admin::transfer-token-permission","relation":"oneToMany","mappedBy":"token","configurable":false,"required":false},"expiresAt":{"type":"datetime","configurable":false,"required":false},"lifespan":{"type":"biginteger","configurable":false,"required":false},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::transfer-token","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_transfer_tokens"}}},"plugin":"admin","globalId":"AdminTransferToken","uid":"admin::transfer-token","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_transfer_tokens","info":{"name":"Transfer Token","singularName":"transfer-token","pluralName":"transfer-tokens","displayName":"Transfer Token","description":""},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"name":{"type":"string","minLength":1,"configurable":false,"required":true,"unique":true},"description":{"type":"string","minLength":1,"configurable":false,"required":false,"default":""},"accessKey":{"type":"string","minLength":1,"configurable":false,"required":true},"lastUsedAt":{"type":"datetime","configurable":false,"required":false},"permissions":{"type":"relation","target":"admin::transfer-token-permission","relation":"oneToMany","mappedBy":"token","configurable":false,"required":false},"expiresAt":{"type":"datetime","configurable":false,"required":false},"lifespan":{"type":"biginteger","configurable":false,"required":false}},"kind":"collectionType"},"modelName":"transfer-token"},"admin::transfer-token-permission":{"collectionName":"strapi_transfer_token_permissions","info":{"name":"Transfer Token Permission","description":"","singularName":"transfer-token-permission","pluralName":"transfer-token-permissions","displayName":"Transfer Token Permission"},"options":{"draftAndPublish":false},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"token":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::transfer-token"},"createdAt":{"type":"datetime"},"updatedAt":{"type":"datetime"},"publishedAt":{"type":"datetime","configurable":false,"writable":true,"visible":false},"createdBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"updatedBy":{"type":"relation","relation":"oneToOne","target":"admin::user","configurable":false,"writable":false,"visible":false,"useJoinTable":false,"private":true},"locale":{"writable":true,"private":true,"configurable":false,"visible":false,"type":"string"},"localizations":{"type":"relation","relation":"oneToMany","target":"admin::transfer-token-permission","writable":false,"private":true,"configurable":false,"visible":false,"unstable_virtual":true,"joinColumn":{"name":"document_id","referencedColumn":"document_id","referencedTable":"strapi_transfer_token_permissions"}}},"plugin":"admin","globalId":"AdminTransferTokenPermission","uid":"admin::transfer-token-permission","modelType":"contentType","kind":"collectionType","__schema__":{"collectionName":"strapi_transfer_token_permissions","info":{"name":"Transfer Token Permission","description":"","singularName":"transfer-token-permission","pluralName":"transfer-token-permissions","displayName":"Transfer Token Permission"},"options":{},"pluginOptions":{"content-manager":{"visible":false},"content-type-builder":{"visible":false}},"attributes":{"action":{"type":"string","minLength":1,"configurable":false,"required":true},"token":{"configurable":false,"type":"relation","relation":"manyToOne","inversedBy":"permissions","target":"admin::transfer-token"}},"kind":"collectionType"},"modelName":"transfer-token-permission"}}	object	\N	\N
8	plugin_content_manager_configuration_content_types::plugin::users-permissions.permission	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"action","defaultSortBy":"action","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"action":{"edit":{"label":"action","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"action","searchable":true,"sortable":true}},"role":{"edit":{"label":"role","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"role","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","action","role","createdAt"],"edit":[[{"name":"action","size":6},{"name":"role","size":6}]]},"uid":"plugin::users-permissions.permission"}	object	\N	\N
11	plugin_content_manager_configuration_content_types::plugin::upload.folder	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"pathId":{"edit":{"label":"pathId","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"pathId","searchable":true,"sortable":true}},"parent":{"edit":{"label":"parent","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"parent","searchable":true,"sortable":true}},"children":{"edit":{"label":"children","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"children","searchable":false,"sortable":false}},"files":{"edit":{"label":"files","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"files","searchable":false,"sortable":false}},"path":{"edit":{"label":"path","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"path","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","pathId","parent"],"edit":[[{"name":"name","size":6},{"name":"pathId","size":4}],[{"name":"parent","size":6},{"name":"children","size":6}],[{"name":"files","size":6},{"name":"path","size":6}]]},"uid":"plugin::upload.folder"}	object	\N	\N
13	plugin_content_manager_configuration_content_types::admin::user	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"firstname","defaultSortBy":"firstname","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"firstname":{"edit":{"label":"firstname","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"firstname","searchable":true,"sortable":true}},"lastname":{"edit":{"label":"lastname","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"lastname","searchable":true,"sortable":true}},"username":{"edit":{"label":"username","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"username","searchable":true,"sortable":true}},"email":{"edit":{"label":"email","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"email","searchable":true,"sortable":true}},"password":{"edit":{"label":"password","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"password","searchable":true,"sortable":true}},"resetPasswordToken":{"edit":{"label":"resetPasswordToken","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"resetPasswordToken","searchable":true,"sortable":true}},"registrationToken":{"edit":{"label":"registrationToken","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"registrationToken","searchable":true,"sortable":true}},"isActive":{"edit":{"label":"isActive","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"isActive","searchable":true,"sortable":true}},"roles":{"edit":{"label":"roles","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"roles","searchable":false,"sortable":false}},"blocked":{"edit":{"label":"blocked","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"blocked","searchable":true,"sortable":true}},"preferedLanguage":{"edit":{"label":"preferedLanguage","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"preferedLanguage","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","firstname","lastname","username"],"edit":[[{"name":"firstname","size":6},{"name":"lastname","size":6}],[{"name":"username","size":6},{"name":"email","size":6}],[{"name":"password","size":6},{"name":"isActive","size":4}],[{"name":"roles","size":6},{"name":"blocked","size":4}],[{"name":"preferedLanguage","size":6}]]},"uid":"admin::user"}	object	\N	\N
14	plugin_content_manager_configuration_content_types::admin::role	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"code":{"edit":{"label":"code","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"code","searchable":true,"sortable":true}},"description":{"edit":{"label":"description","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"description","searchable":true,"sortable":true}},"users":{"edit":{"label":"users","description":"","placeholder":"","visible":true,"editable":true,"mainField":"firstname"},"list":{"label":"users","searchable":false,"sortable":false}},"permissions":{"edit":{"label":"permissions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"action"},"list":{"label":"permissions","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","code","description"],"edit":[[{"name":"name","size":6},{"name":"code","size":6}],[{"name":"description","size":6},{"name":"users","size":6}],[{"name":"permissions","size":6}]]},"uid":"admin::role"}	object	\N	\N
16	plugin_content_manager_configuration_content_types::admin::api-token-permission	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"action","defaultSortBy":"action","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"action":{"edit":{"label":"action","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"action","searchable":true,"sortable":true}},"token":{"edit":{"label":"token","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"token","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","action","token","createdAt"],"edit":[[{"name":"action","size":6},{"name":"token","size":6}]]},"uid":"admin::api-token-permission"}	object	\N	\N
18	plugin_content_manager_configuration_content_types::admin::transfer-token-permission	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"action","defaultSortBy":"action","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"action":{"edit":{"label":"action","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"action","searchable":true,"sortable":true}},"token":{"edit":{"label":"token","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"token","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","action","token","createdAt"],"edit":[[{"name":"action","size":6},{"name":"token","size":6}]]},"uid":"admin::transfer-token-permission"}	object	\N	\N
19	plugin_upload_settings	{"sizeOptimization":true,"responsiveDimensions":true,"autoOrientation":false}	object	\N	\N
20	plugin_upload_view_configuration	{"pageSize":10,"sort":"createdAt:DESC"}	object	\N	\N
21	plugin_upload_metrics	{"weeklySchedule":"41 19 11 * * 0","lastWeeklyUpdate":1776615617842}	object	\N	\N
12	plugin_content_manager_configuration_content_types::admin::permission	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"action","defaultSortBy":"action","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"action":{"edit":{"label":"action","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"action","searchable":true,"sortable":true}},"actionParameters":{"edit":{"label":"actionParameters","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"actionParameters","searchable":false,"sortable":false}},"subject":{"edit":{"label":"subject","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"subject","searchable":true,"sortable":true}},"properties":{"edit":{"label":"properties","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"properties","searchable":false,"sortable":false}},"conditions":{"edit":{"label":"conditions","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"conditions","searchable":false,"sortable":false}},"role":{"edit":{"label":"role","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"role","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","action","subject","role"],"edit":[[{"name":"action","size":6}],[{"name":"actionParameters","size":12}],[{"name":"subject","size":6}],[{"name":"properties","size":12}],[{"name":"conditions","size":12}],[{"name":"role","size":6}]]},"uid":"admin::permission"}	object	\N	\N
17	plugin_content_manager_configuration_content_types::admin::transfer-token	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"description":{"edit":{"label":"description","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"description","searchable":true,"sortable":true}},"accessKey":{"edit":{"label":"accessKey","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"accessKey","searchable":true,"sortable":true}},"lastUsedAt":{"edit":{"label":"lastUsedAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"lastUsedAt","searchable":true,"sortable":true}},"permissions":{"edit":{"label":"permissions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"action"},"list":{"label":"permissions","searchable":false,"sortable":false}},"expiresAt":{"edit":{"label":"expiresAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"expiresAt","searchable":true,"sortable":true}},"lifespan":{"edit":{"label":"lifespan","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"lifespan","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","description","accessKey"],"edit":[[{"name":"name","size":6},{"name":"description","size":6}],[{"name":"accessKey","size":6},{"name":"lastUsedAt","size":6}],[{"name":"permissions","size":6},{"name":"expiresAt","size":6}],[{"name":"lifespan","size":4}]]},"uid":"admin::transfer-token"}	object	\N	\N
24	plugin_users-permissions_email	{"reset_password":{"display":"Email.template.reset_password","icon":"sync","options":{"from":{"name":"Administration Panel","email":"no-reply@strapi.io"},"response_email":"","object":"Reset password","message":"<p>We heard that you lost your password. Sorry about that!</p>\\n\\n<p>But don’t worry! You can use the following link to reset your password:</p>\\n<p><%= URL %>?code=<%= TOKEN %></p>\\n\\n<p>Thanks.</p>"}},"email_confirmation":{"display":"Email.template.email_confirmation","icon":"check-square","options":{"from":{"name":"Administration Panel","email":"no-reply@strapi.io"},"response_email":"","object":"Account confirmation","message":"<p>Thank you for registering!</p>\\n\\n<p>You have to confirm your email address. Please click on the link below.</p>\\n\\n<p><%= URL %>?confirmation=<%= CODE %></p>\\n\\n<p>Thanks.</p>"}}}	object	\N	\N
25	plugin_users-permissions_advanced	{"unique_email":true,"allow_register":true,"email_confirmation":false,"email_reset_password":null,"email_confirmation_redirection":null,"default_role":"authenticated"}	object	\N	\N
23	plugin_users-permissions_grant	{"email":{"icon":"envelope","enabled":true},"discord":{"icon":"discord","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/discord/callback","scope":["identify","email"]},"facebook":{"icon":"facebook-square","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/facebook/callback","scope":["email"]},"google":{"icon":"google","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/google/callback","scope":["email"]},"github":{"icon":"github","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/github/callback","scope":["user","user:email"]},"microsoft":{"icon":"windows","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/microsoft/callback","scope":["user.read"]},"twitter":{"icon":"twitter","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/twitter/callback"},"instagram":{"icon":"instagram","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/instagram/callback","scope":["user_profile"]},"vk":{"icon":"vk","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/vk/callback","scope":["email"]},"twitch":{"icon":"twitch","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/twitch/callback","scope":["user:read:email"]},"linkedin":{"icon":"linkedin","enabled":false,"key":"","secret":"","callbackUrl":"api/auth/linkedin/callback","scope":["r_liteprofile","r_emailaddress"]},"cognito":{"icon":"aws","enabled":false,"key":"","secret":"","subdomain":"my.subdomain.com","callback":"api/auth/cognito/callback","scope":["email","openid","profile"]},"reddit":{"icon":"reddit","enabled":false,"key":"","secret":"","callback":"api/auth/reddit/callback","scope":["identity"]},"auth0":{"icon":"","enabled":false,"key":"","secret":"","subdomain":"my-tenant.eu","callback":"api/auth/auth0/callback","scope":["openid","email","profile"]},"cas":{"icon":"book","enabled":false,"key":"","secret":"","callback":"api/auth/cas/callback","scope":["openid email"],"subdomain":"my.subdomain.com/cas"},"patreon":{"icon":"","enabled":false,"key":"","secret":"","callback":"api/auth/patreon/callback","scope":["identity","identity[email]"]},"keycloak":{"icon":"","enabled":false,"key":"","secret":"","subdomain":"myKeycloakProvider.com/realms/myrealm","callback":"api/auth/keycloak/callback","scope":["openid","email","profile"]}}	object	\N	\N
26	core_admin_auth	{"providers":{"autoRegister":false,"defaultRole":null,"ssoLockedRoles":null}}	object	\N	\N
22	plugin_i18n_default_locale	"es-PE"	string	\N	\N
15	plugin_content_manager_configuration_content_types::admin::api-token	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"description":{"edit":{"label":"description","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"description","searchable":true,"sortable":true}},"type":{"edit":{"label":"type","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"type","searchable":true,"sortable":true}},"accessKey":{"edit":{"label":"accessKey","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"accessKey","searchable":true,"sortable":true}},"lastUsedAt":{"edit":{"label":"lastUsedAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"lastUsedAt","searchable":true,"sortable":true}},"permissions":{"edit":{"label":"permissions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"action"},"list":{"label":"permissions","searchable":false,"sortable":false}},"expiresAt":{"edit":{"label":"expiresAt","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"expiresAt","searchable":true,"sortable":true}},"lifespan":{"edit":{"label":"lifespan","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"lifespan","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","description","type"],"edit":[[{"name":"name","size":6},{"name":"description","size":6}],[{"name":"type","size":6},{"name":"accessKey","size":6}],[{"name":"lastUsedAt","size":6},{"name":"permissions","size":6}],[{"name":"expiresAt","size":6},{"name":"lifespan","size":4}]]},"uid":"admin::api-token"}	object	\N	\N
75	plugin_content_manager_configuration_content_types::api::carrera.carrera	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"titulo-comercial":{"edit":{"label":"titulo-comercial","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo-comercial","searchable":true,"sortable":true}},"codigo":{"edit":{"label":"codigo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"codigo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"duracion":{"edit":{"label":"duracion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"duracion","searchable":true,"sortable":true}},"descripcion2":{"edit":{"label":"descripcion2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion2","searchable":false,"sortable":false}},"creditos":{"edit":{"label":"creditos","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"creditos","searchable":true,"sortable":true}},"nivel":{"edit":{"label":"nivel","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"nivel","searchable":true,"sortable":true}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"imagenes":{"edit":{"label":"imagenes","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagenes","searchable":false,"sortable":false}},"act-economica":{"edit":{"label":"act-economica","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"act-economica","searchable":true,"sortable":true}},"slug":{"edit":{"label":"slug","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"slug","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"titulo","size":12}],[{"name":"titulo-comercial","size":8},{"name":"slug","size":4}],[{"name":"codigo","size":4},{"name":"act-economica","size":8}],[{"name":"duracion","size":4},{"name":"creditos","size":4},{"name":"nivel","size":4}],[{"name":"descripcion2","size":12}],[{"name":"imagen","size":6},{"name":"imagenes","size":6}]],"list":["id","titulo","duracion","titulo-comercial","act-economica"]},"uid":"api::carrera.carrera"}	object	\N	\N
98	plugin_content_manager_configuration_content_types::api::matricula.matricula	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"recibo","defaultSortBy":"recibo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"recibo":{"edit":{"label":"recibo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"recibo","searchable":true,"sortable":true}},"fecha":{"edit":{"label":"fecha","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fecha","searchable":true,"sortable":true}},"grupo":{"edit":{"label":"grupo","description":"","placeholder":"","visible":true,"editable":true,"mainField":"nombre_display"},"list":{"label":"grupo","searchable":true,"sortable":true}},"paquete":{"edit":{"label":"paquete","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"paquete","searchable":true,"sortable":true}},"users":{"edit":{"label":"users","description":"","placeholder":"","visible":true,"editable":true,"mainField":"username"},"list":{"label":"users","searchable":true,"sortable":true}},"archivado":{"edit":{"label":"archivado","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"archivado","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"users","size":12}],[{"name":"grupo","size":12}],[{"name":"paquete","size":12}],[{"name":"fecha","size":4},{"name":"recibo","size":4}]],"list":["fecha","users","paquete","grupo","recibo"]},"uid":"api::matricula.matricula"}	object	\N	\N
84	plugin_content_manager_configuration_content_types::api::personal.personal	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"id","defaultSortBy":"id","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"display_name":{"edit":{"label":"display_name","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"display_name","searchable":true,"sortable":true}},"user":{"edit":{"label":"user","description":"","placeholder":"","visible":true,"editable":true,"mainField":"username"},"list":{"label":"user","searchable":true,"sortable":true}},"memo":{"edit":{"label":"memo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"memo","searchable":false,"sortable":false}},"especialidad":{"edit":{"label":"especialidad","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"especialidad","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","user","especialidad","display_name"],"edit":[[{"name":"user","size":8}],[{"name":"especialidad","size":6}],[{"name":"memo","size":12}]]},"uid":"api::personal.personal"}	object	\N	\N
97	plugin_content_manager_configuration_content_types::api::calendario.calendario	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"fecha-ini":{"edit":{"label":"fecha-ini","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fecha-ini","searchable":true,"sortable":true}},"fecha-fin":{"edit":{"label":"fecha-fin","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fecha-fin","searchable":true,"sortable":true}},"tipo":{"edit":{"label":"tipo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"tipo","searchable":true,"sortable":true}},"semestre":{"edit":{"label":"semestre","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"semestre","searchable":true,"sortable":true}},"archivado":{"edit":{"label":"archivado","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"archivado","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","semestre","titulo","fecha-ini","fecha-fin","tipo"],"edit":[[{"name":"semestre","size":4},{"name":"titulo","size":8}],[{"name":"fecha-ini","size":4},{"name":"fecha-fin","size":4},{"name":"tipo","size":4}],[{"name":"descripcion","size":12}]]},"uid":"api::calendario.calendario"}	object	\N	\N
83	plugin_content_manager_configuration_content_types::api::paquete.paquete	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":true,"sortable":true}},"grupos":{"edit":{"label":"grupos","description":"","placeholder":"","visible":true,"editable":true,"mainField":"nombre_display"},"list":{"label":"grupos","searchable":false,"sortable":false}},"archivado":{"edit":{"label":"archivado","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"archivado","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","titulo","grupos","archivado"],"edit":[[{"name":"titulo","size":12}],[{"name":"grupos","size":12}],[{"name":"descripcion","size":12}]]},"uid":"api::paquete.paquete"}	object	\N	\N
78	plugin_content_manager_configuration_content_types::api::grupo.grupo	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"nombre_display","defaultSortBy":"nombre_display","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"nombre_display":{"edit":{"label":"nombre_display","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"nombre_display","searchable":true,"sortable":true}},"turno":{"edit":{"label":"turno","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"turno","searchable":true,"sortable":true}},"calendario":{"edit":{"label":"calendario","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"calendario","searchable":true,"sortable":true}},"modulo":{"edit":{"label":"modulo","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"modulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":true,"sortable":true}},"personal":{"edit":{"label":"personal","description":"","placeholder":"","visible":true,"editable":true,"mainField":"display_name"},"list":{"label":"personal","searchable":true,"sortable":true}},"archivado":{"edit":{"label":"archivado","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"archivado","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","nombre_display","modulo","calendario"],"edit":[[{"name":"modulo","size":12}],[{"name":"turno","size":6},{"name":"calendario","size":6}],[{"name":"personal","size":6}],[{"name":"descripcion","size":12}],[{"name":"nombre_display","size":12}]]},"uid":"api::grupo.grupo"}	object	\N	\N
101	plugin_content_manager_configuration_content_types::api::publicacion.publicacion	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"slug":{"edit":{"label":"slug","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"slug","searchable":true,"sortable":true}},"tipo":{"edit":{"label":"tipo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"tipo","searchable":true,"sortable":true}},"descripcionCorta":{"edit":{"label":"descripcionCorta","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcionCorta","searchable":true,"sortable":true}},"contenido1":{"edit":{"label":"contenido1","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"contenido1","searchable":false,"sortable":false}},"contenido2":{"edit":{"label":"contenido2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"contenido2","searchable":false,"sortable":false}},"fechaPublicacion":{"edit":{"label":"fechaPublicacion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fechaPublicacion","searchable":true,"sortable":true}},"fechaEventoInicio":{"edit":{"label":"fechaEventoInicio","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fechaEventoInicio","searchable":true,"sortable":true}},"fechaEventoFin":{"edit":{"label":"fechaEventoFin","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fechaEventoFin","searchable":true,"sortable":true}},"ubicacion":{"edit":{"label":"ubicacion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"ubicacion","searchable":true,"sortable":true}},"destacado":{"edit":{"label":"destacado","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"destacado","searchable":true,"sortable":true}},"imagenPrincipal":{"edit":{"label":"imagenPrincipal","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagenPrincipal","searchable":false,"sortable":false}},"galeria":{"edit":{"label":"galeria","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"galeria","searchable":false,"sortable":false}},"videosYoutube":{"edit":{"label":"videosYoutube","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"videosYoutube","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","titulo","tipo","createdAt","updatedAt","destacado"],"edit":[[{"name":"titulo","size":8},{"name":"slug","size":4}],[{"name":"tipo","size":4},{"name":"descripcionCorta","size":8}],[{"name":"contenido1","size":12}],[{"name":"fechaPublicacion","size":4},{"name":"fechaEventoInicio","size":4},{"name":"fechaEventoFin","size":4}],[{"name":"ubicacion","size":8},{"name":"destacado","size":4}],[{"name":"imagenPrincipal","size":6},{"name":"galeria","size":6}],[{"name":"videosYoutube","size":12}]]},"uid":"api::publicacion.publicacion"}	object	\N	\N
85	plugin_content_manager_configuration_content_types::api::prueba.prueba	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"id","defaultSortBy":"id","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"Descripcion":{"edit":{"label":"Descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"Descripcion","searchable":false,"sortable":false}},"Descripcion_2":{"edit":{"label":"Descripcion_2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"Descripcion_2","searchable":false,"sortable":false}},"Descripcion_3":{"edit":{"label":"Descripcion_3","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"Descripcion_3","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","createdAt","updatedAt"],"edit":[[{"name":"Descripcion","size":12}],[{"name":"Descripcion_2","size":12}],[{"name":"Descripcion_3","size":12}]]},"uid":"api::prueba.prueba"}	object	\N	\N
39	type_setup_initHasRun	true	boolean	development	\N
86	plugin_content_manager_configuration_content_types::api::sector.sector	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","titulo","createdAt","updatedAt"],"edit":[[{"name":"titulo","size":12}],[{"name":"descripcion","size":12}],[{"name":"imagen","size":6}]]},"uid":"api::sector.sector"}	object	\N	\N
87	plugin_content_manager_configuration_content_types::api::semestre.semestre	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":true,"sortable":true}},"director":{"edit":{"label":"director","description":"","placeholder":"","visible":true,"editable":true,"mainField":"display_name"},"list":{"label":"director","searchable":true,"sortable":true}},"coordinador_1":{"edit":{"label":"coordinador_1","description":"","placeholder":"","visible":true,"editable":true,"mainField":"display_name"},"list":{"label":"coordinador_1","searchable":true,"sortable":true}},"coordinador_2":{"edit":{"label":"coordinador_2","description":"","placeholder":"","visible":true,"editable":true,"mainField":"display_name"},"list":{"label":"coordinador_2","searchable":true,"sortable":true}},"archivado":{"edit":{"label":"archivado","description":"","placeholder":"","visible":true,"editable":false},"list":{"label":"archivado","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"titulo","size":4}],[{"name":"director","size":6},{"name":"coordinador_1","size":6}],[{"name":"coordinador_2","size":6}],[{"name":"descripcion","size":12}]],"list":["id","titulo","director","coordinador_1","coordinador_2"]},"uid":"api::semestre.semestre"}	object	\N	\N
88	plugin_content_manager_configuration_content_types::api::dato-general.dato-general	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"nombreInstitucion","defaultSortBy":"nombreInstitucion","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"nombreInstitucion":{"edit":{"label":"nombreInstitucion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"nombreInstitucion","searchable":true,"sortable":true}},"direccion":{"edit":{"label":"direccion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"direccion","searchable":true,"sortable":true}},"telefono1":{"edit":{"label":"telefono1","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"telefono1","searchable":true,"sortable":true}},"telefono2":{"edit":{"label":"telefono2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"telefono2","searchable":true,"sortable":true}},"correo":{"edit":{"label":"correo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"correo","searchable":true,"sortable":true}},"paginaWeb":{"edit":{"label":"paginaWeb","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"paginaWeb","searchable":true,"sortable":true}},"facebook":{"edit":{"label":"facebook","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"facebook","searchable":true,"sortable":true}},"youtube":{"edit":{"label":"youtube","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"youtube","searchable":true,"sortable":true}},"twitter":{"edit":{"label":"twitter","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"twitter","searchable":true,"sortable":true}},"instagram":{"edit":{"label":"instagram","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"instagram","searchable":true,"sortable":true}},"tiktok":{"edit":{"label":"tiktok","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"tiktok","searchable":true,"sortable":true}},"ruc":{"edit":{"label":"ruc","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"ruc","searchable":true,"sortable":true}},"rd":{"edit":{"label":"rd","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"rd","searchable":true,"sortable":true}},"logo":{"edit":{"label":"logo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"logo","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"nombreInstitucion","size":6},{"name":"direccion","size":6}],[{"name":"telefono1","size":6},{"name":"telefono2","size":6}],[{"name":"correo","size":6},{"name":"paginaWeb","size":6}],[{"name":"facebook","size":6},{"name":"youtube","size":6}],[{"name":"twitter","size":6},{"name":"instagram","size":6}],[{"name":"tiktok","size":6},{"name":"ruc","size":6}],[{"name":"rd","size":6},{"name":"logo","size":6}]],"list":["id","createdAt","updatedAt","nombreInstitucion"]},"uid":"api::dato-general.dato-general"}	object	\N	\N
9	plugin_content_manager_configuration_content_types::plugin::users-permissions.role	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"name","defaultSortBy":"name","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"name":{"edit":{"label":"name","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"name","searchable":true,"sortable":true}},"description":{"edit":{"label":"description","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"description","searchable":true,"sortable":true}},"type":{"edit":{"label":"type","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"type","searchable":true,"sortable":true}},"permissions":{"edit":{"label":"permissions","description":"","placeholder":"","visible":true,"editable":true,"mainField":"action"},"list":{"label":"permissions","searchable":false,"sortable":false}},"users":{"edit":{"label":"users","description":"","placeholder":"","visible":true,"editable":true,"mainField":"dni"},"list":{"label":"users","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","name","description","type"],"edit":[[{"name":"name","size":6},{"name":"description","size":6}],[{"name":"type","size":6},{"name":"permissions","size":6}],[{"name":"users","size":6}]]},"uid":"plugin::users-permissions.role"}	object	\N	\N
76	plugin_content_manager_configuration_content_types::api::familia.familia	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"Sector":{"edit":{"label":"Sector","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"Sector","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"titulo","size":12}],[{"name":"Sector","size":12}],[{"name":"descripcion","size":12}],[{"name":"imagen","size":6}]],"list":["id","titulo","Sector"]},"uid":"api::familia.familia"}	object	\N	\N
10	plugin_content_manager_configuration_content_types::plugin::users-permissions.user	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"dni","defaultSortBy":"dni","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"username":{"edit":{"label":"username","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"username","searchable":true,"sortable":true}},"email":{"edit":{"label":"email","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"email","searchable":true,"sortable":true}},"provider":{"edit":{"label":"provider","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"provider","searchable":true,"sortable":true}},"password":{"edit":{"label":"password","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"password","searchable":true,"sortable":true}},"resetPasswordToken":{"edit":{"label":"resetPasswordToken","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"resetPasswordToken","searchable":true,"sortable":true}},"confirmationToken":{"edit":{"label":"confirmationToken","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"confirmationToken","searchable":true,"sortable":true}},"confirmed":{"edit":{"label":"confirmed","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"confirmed","searchable":true,"sortable":true}},"blocked":{"edit":{"label":"blocked","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"blocked","searchable":true,"sortable":true}},"role":{"edit":{"label":"role","description":"","placeholder":"","visible":true,"editable":true,"mainField":"name"},"list":{"label":"role","searchable":true,"sortable":true}},"nombre":{"edit":{"label":"nombre","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"nombre","searchable":true,"sortable":true}},"apellido_materno":{"edit":{"label":"apellido_materno","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"apellido_materno","searchable":true,"sortable":true}},"apellido_paterno":{"edit":{"label":"apellido_paterno","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"apellido_paterno","searchable":true,"sortable":true}},"apellidos":{"edit":{"label":"apellidos","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"apellidos","searchable":true,"sortable":true}},"celular":{"edit":{"label":"celular","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"celular","searchable":true,"sortable":true}},"fecha_nacimiento":{"edit":{"label":"fecha_nacimiento","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"fecha_nacimiento","searchable":true,"sortable":true}},"direccion":{"edit":{"label":"direccion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"direccion","searchable":true,"sortable":true}},"distrito":{"edit":{"label":"distrito","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"distrito","searchable":true,"sortable":true}},"avatar":{"edit":{"label":"avatar","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"avatar","searchable":true,"sortable":true}},"foto":{"edit":{"label":"foto","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"foto","searchable":false,"sortable":false}},"tipo_documento":{"edit":{"label":"tipo_documento","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"tipo_documento","searchable":true,"sortable":true}},"dni":{"edit":{"label":"dni","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"dni","searchable":true,"sortable":true}},"dni_frente":{"edit":{"label":"dni_frente","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"dni_frente","searchable":false,"sortable":false}},"dni_reverso":{"edit":{"label":"dni_reverso","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"dni_reverso","searchable":false,"sortable":false}},"sexo":{"edit":{"label":"sexo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"sexo","searchable":true,"sortable":true}},"estado_civil":{"edit":{"label":"estado_civil","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"estado_civil","searchable":true,"sortable":true}},"telefono":{"edit":{"label":"telefono","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"telefono","searchable":true,"sortable":true}},"instruccion":{"edit":{"label":"instruccion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"instruccion","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"nombre","size":4},{"name":"apellido_paterno","size":4},{"name":"apellido_materno","size":4}],[{"name":"password","size":4},{"name":"confirmed","size":4},{"name":"blocked","size":4}],[{"name":"email","size":6},{"name":"username","size":6}],[{"name":"celular","size":4},{"name":"telefono","size":4},{"name":"sexo","size":4}],[{"name":"fecha_nacimiento","size":4},{"name":"estado_civil","size":4},{"name":"instruccion","size":4}],[{"name":"tipo_documento","size":6},{"name":"dni","size":6}],[{"name":"dni_frente","size":6},{"name":"dni_reverso","size":6}],[{"name":"direccion","size":8},{"name":"distrito","size":4}],[{"name":"role","size":6},{"name":"foto","size":6}],[{"name":"apellidos","size":6},{"name":"avatar","size":6}]],"list":["id","username","celular","role","dni"]},"uid":"plugin::users-permissions.user"}	object	\N	\N
89	plugin_content_manager_configuration_content_types::api::especialidad.especialidad	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"titulo-comercial":{"edit":{"label":"titulo-comercial","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo-comercial","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"imagenes":{"edit":{"label":"imagenes","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagenes","searchable":false,"sortable":false}},"descripcion2":{"edit":{"label":"descripcion2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion2","searchable":false,"sortable":false}},"slug":{"edit":{"label":"slug","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"slug","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"titulo","size":12}],[{"name":"titulo-comercial","size":8},{"name":"slug","size":4}],[{"name":"descripcion2","size":12}],[{"name":"imagen","size":4},{"name":"imagenes","size":8}]],"list":["id","titulo","imagen","createdAt","updatedAt"]},"uid":"api::especialidad.especialidad"}	object	\N	\N
74	plugin_content_manager_configuration_content_types::api::act-economica.act-economica	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"titulo","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"especialidad":{"edit":{"label":"especialidad","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"especialidad","searchable":true,"sortable":true}},"familia":{"edit":{"label":"familia","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"familia","searchable":true,"sortable":true}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"edit":[[{"name":"titulo","size":12}],[{"name":"familia","size":6},{"name":"especialidad","size":6}],[{"name":"descripcion","size":12}],[{"name":"imagen","size":6}]],"list":["id","titulo","familia","especialidad"]},"uid":"api::act-economica.act-economica"}	object	\N	\N
90	plugin_content_manager_configuration_content_types::api::modulo.modulo	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"titulo","defaultSortBy":"id","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":true,"sortable":true}},"titulo":{"edit":{"label":"titulo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo","searchable":true,"sortable":true}},"titulo-comercial":{"edit":{"label":"titulo-comercial","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"titulo-comercial","searchable":true,"sortable":true}},"orden":{"edit":{"label":"orden","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"orden","searchable":true,"sortable":true}},"descripcion":{"edit":{"label":"descripcion","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion","searchable":false,"sortable":false}},"descripcion2":{"edit":{"label":"descripcion2","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"descripcion2","searchable":false,"sortable":false}},"horas":{"edit":{"label":"horas","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"horas","searchable":true,"sortable":true}},"creditos":{"edit":{"label":"creditos","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"creditos","searchable":true,"sortable":true}},"metas":{"edit":{"label":"metas","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"metas","searchable":true,"sortable":true}},"imagenes":{"edit":{"label":"imagenes","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagenes","searchable":false,"sortable":false}},"imagen":{"edit":{"label":"imagen","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"imagen","searchable":false,"sortable":false}},"activo":{"edit":{"label":"activo","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"activo","searchable":true,"sortable":true}},"carrera":{"edit":{"label":"carrera","description":"","placeholder":"","visible":true,"editable":true,"mainField":"titulo"},"list":{"label":"carrera","searchable":true,"sortable":true}},"slug":{"edit":{"label":"slug","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"slug","searchable":true,"sortable":true}},"videosYoutube":{"edit":{"label":"videosYoutube","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"videosYoutube","searchable":false,"sortable":false}},"createdAt":{"edit":{"label":"createdAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"createdAt","searchable":true,"sortable":true}},"updatedAt":{"edit":{"label":"updatedAt","description":"","placeholder":"","visible":false,"editable":true},"list":{"label":"updatedAt","searchable":true,"sortable":true}},"createdBy":{"edit":{"label":"createdBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"createdBy","searchable":true,"sortable":true}},"updatedBy":{"edit":{"label":"updatedBy","description":"","placeholder":"","visible":false,"editable":true,"mainField":"firstname"},"list":{"label":"updatedBy","searchable":true,"sortable":true}}},"layouts":{"list":["id","titulo-comercial","orden","horas","activo","carrera"],"edit":[[{"name":"titulo","size":8},{"name":"slug","size":4}],[{"name":"orden","size":4},{"name":"titulo-comercial","size":8}],[{"name":"carrera","size":8},{"name":"activo","size":4}],[{"name":"horas","size":4},{"name":"creditos","size":4},{"name":"metas","size":4}],[{"name":"descripcion2","size":12}],[{"name":"imagen","size":6},{"name":"imagenes","size":6}],[{"name":"videosYoutube","size":12}]]},"uid":"api::modulo.modulo"}	object	\N	\N
99	plugin_content_manager_configuration_components::default.video-youtube	{"settings":{"bulkable":true,"filterable":true,"searchable":true,"pageSize":10,"mainField":"url","defaultSortBy":"url","defaultSortOrder":"ASC"},"metadatas":{"id":{"edit":{},"list":{"label":"id","searchable":false,"sortable":false}},"url":{"edit":{"label":"url","description":"","placeholder":"","visible":true,"editable":true},"list":{"label":"url","searchable":true,"sortable":true}}},"layouts":{"list":["id","url"],"edit":[[{"name":"url","size":6}]]},"uid":"default.video-youtube","isComponent":true}	object	\N	\N
\.


--
-- Data for Name: strapi_database_schema; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_database_schema (id, schema, "time", hash) FROM stdin;
225	{"tables":[{"name":"files","indexes":[{"name":"upload_files_folder_path_index","columns":["folder_path"],"type":null},{"name":"upload_files_created_at_index","columns":["created_at"],"type":null},{"name":"upload_files_updated_at_index","columns":["updated_at"],"type":null},{"name":"upload_files_name_index","columns":["name"],"type":null},{"name":"upload_files_size_index","columns":["size"],"type":null},{"name":"upload_files_ext_index","columns":["ext"],"type":null},{"name":"files_documents_idx","columns":["document_id","locale","published_at"]},{"name":"files_created_by_id_fk","columns":["created_by_id"]},{"name":"files_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"files_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"files_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"alternative_text","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"caption","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"width","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"height","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"formats","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"hash","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"ext","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"mime","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"size","type":"decimal","args":[10,2],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"url","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"preview_url","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"provider","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"provider_metadata","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"folder_path","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"upload_folders","indexes":[{"name":"upload_folders_path_id_index","columns":["path_id"],"type":"unique"},{"name":"upload_folders_path_index","columns":["path"],"type":"unique"},{"name":"upload_folders_documents_idx","columns":["document_id","locale","published_at"]},{"name":"upload_folders_created_by_id_fk","columns":["created_by_id"]},{"name":"upload_folders_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"upload_folders_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"upload_folders_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"path_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"path","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"i18n_locale","indexes":[{"name":"i18n_locale_documents_idx","columns":["document_id","locale","published_at"]},{"name":"i18n_locale_created_by_id_fk","columns":["created_by_id"]},{"name":"i18n_locale_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"i18n_locale_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"i18n_locale_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"code","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_releases","indexes":[{"name":"strapi_releases_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_releases_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_releases_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_releases_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_releases_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"released_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"scheduled_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"timezone","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"status","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_release_actions","indexes":[{"name":"strapi_release_actions_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_release_actions_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_release_actions_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_release_actions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_release_actions_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"content_type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"entry_document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"is_entry_valid","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_workflows","indexes":[{"name":"strapi_workflows_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_workflows_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_workflows_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_workflows_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_workflows_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"content_types","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_workflows_stages","indexes":[{"name":"strapi_workflows_stages_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_workflows_stages_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_workflows_stages_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_workflows_stages_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_workflows_stages_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"color","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"up_permissions","indexes":[{"name":"up_permissions_documents_idx","columns":["document_id","locale","published_at"]},{"name":"up_permissions_created_by_id_fk","columns":["created_by_id"]},{"name":"up_permissions_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"up_permissions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"up_permissions_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"action","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"up_roles","indexes":[{"name":"up_roles_documents_idx","columns":["document_id","locale","published_at"]},{"name":"up_roles_created_by_id_fk","columns":["created_by_id"]},{"name":"up_roles_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"up_roles_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"up_roles_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"description","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"users","indexes":[{"name":"users_documents_idx","columns":["document_id","locale","published_at"]},{"name":"users_created_by_id_fk","columns":["created_by_id"]},{"name":"users_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"users_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"users_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"username","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"email","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"provider","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"password","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"reset_password_token","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"confirmation_token","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"confirmed","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"blocked","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"nombre","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"apellido_materno","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"apellido_paterno","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"apellidos","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"celular","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_nacimiento","type":"date","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"direccion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"distrito","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"avatar","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"tipo_documento","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"dni","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"sexo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"estado_civil","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"telefono","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"instruccion","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"act-economicas","indexes":[{"name":"act-economicas_documents_idx","columns":["document_id","locale","published_at"]},{"name":"act-economicas_created_by_id_fk","columns":["created_by_id"]},{"name":"act-economicas_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"act-economicas_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"act-economicas_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"calendarios","indexes":[{"name":"calendarios_documents_idx","columns":["document_id","locale","published_at"]},{"name":"calendarios_created_by_id_fk","columns":["created_by_id"]},{"name":"calendarios_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"calendarios_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"calendarios_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_ini","type":"date","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_fin","type":"date","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"tipo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"archivado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"carreras","indexes":[{"name":"carreras_documents_idx","columns":["document_id","locale","published_at"]},{"name":"carreras_created_by_id_fk","columns":["created_by_id"]},{"name":"carreras_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"carreras_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"carreras_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo_comercial","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"codigo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"duracion","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_2","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"creditos","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"nivel","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"slug","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"dato_general","indexes":[{"name":"dato_general_documents_idx","columns":["document_id","locale","published_at"]},{"name":"dato_general_created_by_id_fk","columns":["created_by_id"]},{"name":"dato_general_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"dato_general_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"dato_general_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"nombre_institucion","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"direccion","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"telefono_1","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"telefono_2","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"correo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"pagina_web","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"facebook","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"youtube","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"twitter","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"instagram","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"tiktok","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"ruc","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"rd","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"especialidades","indexes":[{"name":"especialidades_documents_idx","columns":["document_id","locale","published_at"]},{"name":"especialidades_created_by_id_fk","columns":["created_by_id"]},{"name":"especialidades_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"especialidades_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"especialidades_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo_comercial","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_2","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"slug","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"familias","indexes":[{"name":"familias_documents_idx","columns":["document_id","locale","published_at"]},{"name":"familias_created_by_id_fk","columns":["created_by_id"]},{"name":"familias_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"familias_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"familias_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"grupos","indexes":[{"name":"grupos_documents_idx","columns":["document_id","locale","published_at"]},{"name":"grupos_created_by_id_fk","columns":["created_by_id"]},{"name":"grupos_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"grupos_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"grupos_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"nombre_display","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"turno","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"archivado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"matriculas","indexes":[{"name":"matriculas_documents_idx","columns":["document_id","locale","published_at"]},{"name":"matriculas_created_by_id_fk","columns":["created_by_id"]},{"name":"matriculas_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"matriculas_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"matriculas_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"recibo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha","type":"date","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"archivado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"modulos_cmps","indexes":[{"name":"modulos_field_idx","columns":["field"]},{"name":"modulos_component_type_idx","columns":["component_type"]},{"name":"modulos_entity_fk","columns":["entity_id"]},{"name":"modulos_uq","columns":["entity_id","cmp_id","field","component_type"],"type":"unique"}],"foreignKeys":[{"name":"modulos_entity_fk","columns":["entity_id"],"referencedColumns":["id"],"referencedTable":"modulos","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"entity_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"cmp_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"component_type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"field","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"order","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"modulos","indexes":[{"name":"modulos_documents_idx","columns":["document_id","locale","published_at"]},{"name":"modulos_created_by_id_fk","columns":["created_by_id"]},{"name":"modulos_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"modulos_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"modulos_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo_comercial","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"orden","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_2","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"horas","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"creditos","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"metas","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"activo","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"slug","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"paquetes","indexes":[{"name":"paquetes_documents_idx","columns":["document_id","locale","published_at"]},{"name":"paquetes_created_by_id_fk","columns":["created_by_id"]},{"name":"paquetes_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"paquetes_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"paquetes_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"archivado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"personales","indexes":[{"name":"personales_documents_idx","columns":["document_id","locale","published_at"]},{"name":"personales_created_by_id_fk","columns":["created_by_id"]},{"name":"personales_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"personales_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"personales_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"display_name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"memo","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"pruebas","indexes":[{"name":"pruebas_documents_idx","columns":["document_id","locale","published_at"]},{"name":"pruebas_created_by_id_fk","columns":["created_by_id"]},{"name":"pruebas_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"pruebas_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"pruebas_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_2","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_3","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"publicaciones_cmps","indexes":[{"name":"publicaciones_field_idx","columns":["field"]},{"name":"publicaciones_component_type_idx","columns":["component_type"]},{"name":"publicaciones_entity_fk","columns":["entity_id"]},{"name":"publicaciones_uq","columns":["entity_id","cmp_id","field","component_type"],"type":"unique"}],"foreignKeys":[{"name":"publicaciones_entity_fk","columns":["entity_id"],"referencedColumns":["id"],"referencedTable":"publicaciones","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"entity_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"cmp_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"component_type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"field","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"order","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"publicaciones","indexes":[{"name":"publicaciones_documents_idx","columns":["document_id","locale","published_at"]},{"name":"publicaciones_created_by_id_fk","columns":["created_by_id"]},{"name":"publicaciones_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"publicaciones_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"publicaciones_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"slug","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"tipo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion_corta","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"contenido_1","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"contenido_2","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_publicacion","type":"date","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_evento_inicio","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"fecha_evento_fin","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"ubicacion","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"destacado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"sectores","indexes":[{"name":"sectores_documents_idx","columns":["document_id","locale","published_at"]},{"name":"sectores_created_by_id_fk","columns":["created_by_id"]},{"name":"sectores_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"sectores_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"sectores_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"semestres","indexes":[{"name":"semestres_documents_idx","columns":["document_id","locale","published_at"]},{"name":"semestres_created_by_id_fk","columns":["created_by_id"]},{"name":"semestres_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"semestres_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"semestres_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"titulo","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"descripcion","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"archivado","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"admin_permissions","indexes":[{"name":"admin_permissions_documents_idx","columns":["document_id","locale","published_at"]},{"name":"admin_permissions_created_by_id_fk","columns":["created_by_id"]},{"name":"admin_permissions_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"admin_permissions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"admin_permissions_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"action","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"action_parameters","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"subject","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"properties","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"conditions","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"admin_users","indexes":[{"name":"admin_users_documents_idx","columns":["document_id","locale","published_at"]},{"name":"admin_users_created_by_id_fk","columns":["created_by_id"]},{"name":"admin_users_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"admin_users_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"admin_users_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"firstname","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"lastname","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"username","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"email","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"password","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"reset_password_token","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"registration_token","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"is_active","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"blocked","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"prefered_language","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"admin_roles","indexes":[{"name":"admin_roles_documents_idx","columns":["document_id","locale","published_at"]},{"name":"admin_roles_created_by_id_fk","columns":["created_by_id"]},{"name":"admin_roles_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"admin_roles_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"admin_roles_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"code","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"description","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_api_tokens","indexes":[{"name":"strapi_api_tokens_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_api_tokens_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_api_tokens_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_api_tokens_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_api_tokens_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"description","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"access_key","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"last_used_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"expires_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"lifespan","type":"bigInteger","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_api_token_permissions","indexes":[{"name":"strapi_api_token_permissions_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_api_token_permissions_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_api_token_permissions_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_api_token_permissions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_api_token_permissions_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"action","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_transfer_tokens","indexes":[{"name":"strapi_transfer_tokens_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_transfer_tokens_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_transfer_tokens_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_transfer_tokens_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_transfer_tokens_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"description","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"access_key","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"last_used_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"expires_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"lifespan","type":"bigInteger","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_transfer_token_permissions","indexes":[{"name":"strapi_transfer_token_permissions_documents_idx","columns":["document_id","locale","published_at"]},{"name":"strapi_transfer_token_permissions_created_by_id_fk","columns":["created_by_id"]},{"name":"strapi_transfer_token_permissions_updated_by_id_fk","columns":["updated_by_id"]}],"foreignKeys":[{"name":"strapi_transfer_token_permissions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"},{"name":"strapi_transfer_token_permissions_updated_by_id_fk","columns":["updated_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"action","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"updated_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"published_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"updated_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"components_video_youtubes","indexes":[],"foreignKeys":[],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"url","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_core_store_settings","indexes":[],"foreignKeys":[],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"key","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"value","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"environment","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"tag","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_webhooks","indexes":[],"foreignKeys":[],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"name","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"url","type":"text","args":["longtext"],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"headers","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"events","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"enabled","type":"boolean","args":[],"defaultTo":null,"notNullable":false,"unsigned":false}]},{"name":"strapi_history_versions","indexes":[{"name":"strapi_history_versions_created_by_id_fk","columns":["created_by_id"]}],"foreignKeys":[{"name":"strapi_history_versions_created_by_id_fk","columns":["created_by_id"],"referencedTable":"admin_users","referencedColumns":["id"],"onDelete":"SET NULL"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"content_type","type":"string","args":[],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"related_document_id","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"locale","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"status","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"data","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"schema","type":"jsonb","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_at","type":"datetime","args":[{"useTz":false,"precision":6}],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"created_by_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"files_related_mph","indexes":[{"name":"files_related_mph_fk","columns":["file_id"]},{"name":"files_related_mph_oidx","columns":["order"]},{"name":"files_related_mph_idix","columns":["related_id"]}],"foreignKeys":[{"name":"files_related_mph_fk","columns":["file_id"],"referencedColumns":["id"],"referencedTable":"files","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"file_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"related_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"related_type","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"field","type":"string","args":[],"defaultTo":null,"notNullable":false,"unsigned":false},{"name":"order","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"files_folder_lnk","indexes":[{"name":"files_folder_lnk_fk","columns":["file_id"]},{"name":"files_folder_lnk_ifk","columns":["folder_id"]},{"name":"files_folder_lnk_uq","columns":["file_id","folder_id"],"type":"unique"},{"name":"files_folder_lnk_oifk","columns":["file_ord"]}],"foreignKeys":[{"name":"files_folder_lnk_fk","columns":["file_id"],"referencedColumns":["id"],"referencedTable":"files","onDelete":"CASCADE"},{"name":"files_folder_lnk_ifk","columns":["folder_id"],"referencedColumns":["id"],"referencedTable":"upload_folders","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"file_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"folder_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"file_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"upload_folders_parent_lnk","indexes":[{"name":"upload_folders_parent_lnk_fk","columns":["folder_id"]},{"name":"upload_folders_parent_lnk_ifk","columns":["inv_folder_id"]},{"name":"upload_folders_parent_lnk_uq","columns":["folder_id","inv_folder_id"],"type":"unique"},{"name":"upload_folders_parent_lnk_oifk","columns":["folder_ord"]}],"foreignKeys":[{"name":"upload_folders_parent_lnk_fk","columns":["folder_id"],"referencedColumns":["id"],"referencedTable":"upload_folders","onDelete":"CASCADE"},{"name":"upload_folders_parent_lnk_ifk","columns":["inv_folder_id"],"referencedColumns":["id"],"referencedTable":"upload_folders","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"folder_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"inv_folder_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"folder_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_release_actions_release_lnk","indexes":[{"name":"strapi_release_actions_release_lnk_fk","columns":["release_action_id"]},{"name":"strapi_release_actions_release_lnk_ifk","columns":["release_id"]},{"name":"strapi_release_actions_release_lnk_uq","columns":["release_action_id","release_id"],"type":"unique"},{"name":"strapi_release_actions_release_lnk_oifk","columns":["release_action_ord"]}],"foreignKeys":[{"name":"strapi_release_actions_release_lnk_fk","columns":["release_action_id"],"referencedColumns":["id"],"referencedTable":"strapi_release_actions","onDelete":"CASCADE"},{"name":"strapi_release_actions_release_lnk_ifk","columns":["release_id"],"referencedColumns":["id"],"referencedTable":"strapi_releases","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"release_action_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"release_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"release_action_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_workflows_stage_required_to_publish_lnk","indexes":[{"name":"strapi_workflows_stage_required_to_publish_lnk_fk","columns":["workflow_id"]},{"name":"strapi_workflows_stage_required_to_publish_lnk_ifk","columns":["workflow_stage_id"]},{"name":"strapi_workflows_stage_required_to_publish_lnk_uq","columns":["workflow_id","workflow_stage_id"],"type":"unique"}],"foreignKeys":[{"name":"strapi_workflows_stage_required_to_publish_lnk_fk","columns":["workflow_id"],"referencedColumns":["id"],"referencedTable":"strapi_workflows","onDelete":"CASCADE"},{"name":"strapi_workflows_stage_required_to_publish_lnk_ifk","columns":["workflow_stage_id"],"referencedColumns":["id"],"referencedTable":"strapi_workflows_stages","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"workflow_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"workflow_stage_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_workflows_stages_workflow_lnk","indexes":[{"name":"strapi_workflows_stages_workflow_lnk_fk","columns":["workflow_stage_id"]},{"name":"strapi_workflows_stages_workflow_lnk_ifk","columns":["workflow_id"]},{"name":"strapi_workflows_stages_workflow_lnk_uq","columns":["workflow_stage_id","workflow_id"],"type":"unique"},{"name":"strapi_workflows_stages_workflow_lnk_oifk","columns":["workflow_stage_ord"]}],"foreignKeys":[{"name":"strapi_workflows_stages_workflow_lnk_fk","columns":["workflow_stage_id"],"referencedColumns":["id"],"referencedTable":"strapi_workflows_stages","onDelete":"CASCADE"},{"name":"strapi_workflows_stages_workflow_lnk_ifk","columns":["workflow_id"],"referencedColumns":["id"],"referencedTable":"strapi_workflows","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"workflow_stage_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"workflow_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"workflow_stage_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_workflows_stages_permissions_lnk","indexes":[{"name":"strapi_workflows_stages_permissions_lnk_fk","columns":["workflow_stage_id"]},{"name":"strapi_workflows_stages_permissions_lnk_ifk","columns":["permission_id"]},{"name":"strapi_workflows_stages_permissions_lnk_uq","columns":["workflow_stage_id","permission_id"],"type":"unique"},{"name":"strapi_workflows_stages_permissions_lnk_ofk","columns":["permission_ord"]}],"foreignKeys":[{"name":"strapi_workflows_stages_permissions_lnk_fk","columns":["workflow_stage_id"],"referencedColumns":["id"],"referencedTable":"strapi_workflows_stages","onDelete":"CASCADE"},{"name":"strapi_workflows_stages_permissions_lnk_ifk","columns":["permission_id"],"referencedColumns":["id"],"referencedTable":"admin_permissions","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"workflow_stage_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"permission_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"permission_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"up_permissions_role_lnk","indexes":[{"name":"up_permissions_role_lnk_fk","columns":["permission_id"]},{"name":"up_permissions_role_lnk_ifk","columns":["role_id"]},{"name":"up_permissions_role_lnk_uq","columns":["permission_id","role_id"],"type":"unique"},{"name":"up_permissions_role_lnk_oifk","columns":["permission_ord"]}],"foreignKeys":[{"name":"up_permissions_role_lnk_fk","columns":["permission_id"],"referencedColumns":["id"],"referencedTable":"up_permissions","onDelete":"CASCADE"},{"name":"up_permissions_role_lnk_ifk","columns":["role_id"],"referencedColumns":["id"],"referencedTable":"up_roles","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"permission_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"role_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"permission_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"users_role_lnk","indexes":[{"name":"users_role_lnk_fk","columns":["user_id"]},{"name":"users_role_lnk_ifk","columns":["role_id"]},{"name":"users_role_lnk_uq","columns":["user_id","role_id"],"type":"unique"},{"name":"users_role_lnk_oifk","columns":["user_ord"]}],"foreignKeys":[{"name":"users_role_lnk_fk","columns":["user_id"],"referencedColumns":["id"],"referencedTable":"users","onDelete":"CASCADE"},{"name":"users_role_lnk_ifk","columns":["role_id"],"referencedColumns":["id"],"referencedTable":"up_roles","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"user_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"role_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"user_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"act_economicas_especialidad_lnk","indexes":[{"name":"act_economicas_especialidad_lnk_fk","columns":["act_economica_id"]},{"name":"act_economicas_especialidad_lnk_ifk","columns":["especialidad_id"]},{"name":"act_economicas_especialidad_lnk_uq","columns":["act_economica_id","especialidad_id"],"type":"unique"}],"foreignKeys":[{"name":"act_economicas_especialidad_lnk_fk","columns":["act_economica_id"],"referencedColumns":["id"],"referencedTable":"act-economicas","onDelete":"CASCADE"},{"name":"act_economicas_especialidad_lnk_ifk","columns":["especialidad_id"],"referencedColumns":["id"],"referencedTable":"especialidades","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"act_economica_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"especialidad_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"act_economicas_familia_lnk","indexes":[{"name":"act_economicas_familia_lnk_fk","columns":["act_economica_id"]},{"name":"act_economicas_familia_lnk_ifk","columns":["familia_id"]},{"name":"act_economicas_familia_lnk_uq","columns":["act_economica_id","familia_id"],"type":"unique"}],"foreignKeys":[{"name":"act_economicas_familia_lnk_fk","columns":["act_economica_id"],"referencedColumns":["id"],"referencedTable":"act-economicas","onDelete":"CASCADE"},{"name":"act_economicas_familia_lnk_ifk","columns":["familia_id"],"referencedColumns":["id"],"referencedTable":"familias","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"act_economica_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"familia_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"calendarios_semestre_lnk","indexes":[{"name":"calendarios_semestre_lnk_fk","columns":["calendario_id"]},{"name":"calendarios_semestre_lnk_ifk","columns":["semestre_id"]},{"name":"calendarios_semestre_lnk_uq","columns":["calendario_id","semestre_id"],"type":"unique"}],"foreignKeys":[{"name":"calendarios_semestre_lnk_fk","columns":["calendario_id"],"referencedColumns":["id"],"referencedTable":"calendarios","onDelete":"CASCADE"},{"name":"calendarios_semestre_lnk_ifk","columns":["semestre_id"],"referencedColumns":["id"],"referencedTable":"semestres","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"calendario_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"semestre_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"carreras_act_economica_lnk","indexes":[{"name":"carreras_act_economica_lnk_fk","columns":["carrera_id"]},{"name":"carreras_act_economica_lnk_ifk","columns":["act_economica_id"]},{"name":"carreras_act_economica_lnk_uq","columns":["carrera_id","act_economica_id"],"type":"unique"}],"foreignKeys":[{"name":"carreras_act_economica_lnk_fk","columns":["carrera_id"],"referencedColumns":["id"],"referencedTable":"carreras","onDelete":"CASCADE"},{"name":"carreras_act_economica_lnk_ifk","columns":["act_economica_id"],"referencedColumns":["id"],"referencedTable":"act-economicas","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"carrera_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"act_economica_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"familias_sector_lnk","indexes":[{"name":"familias_sector_lnk_fk","columns":["familia_id"]},{"name":"familias_sector_lnk_ifk","columns":["sector_id"]},{"name":"familias_sector_lnk_uq","columns":["familia_id","sector_id"],"type":"unique"}],"foreignKeys":[{"name":"familias_sector_lnk_fk","columns":["familia_id"],"referencedColumns":["id"],"referencedTable":"familias","onDelete":"CASCADE"},{"name":"familias_sector_lnk_ifk","columns":["sector_id"],"referencedColumns":["id"],"referencedTable":"sectores","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"familia_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"sector_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"grupos_calendario_lnk","indexes":[{"name":"grupos_calendario_lnk_fk","columns":["grupo_id"]},{"name":"grupos_calendario_lnk_ifk","columns":["calendario_id"]},{"name":"grupos_calendario_lnk_uq","columns":["grupo_id","calendario_id"],"type":"unique"}],"foreignKeys":[{"name":"grupos_calendario_lnk_fk","columns":["grupo_id"],"referencedColumns":["id"],"referencedTable":"grupos","onDelete":"CASCADE"},{"name":"grupos_calendario_lnk_ifk","columns":["calendario_id"],"referencedColumns":["id"],"referencedTable":"calendarios","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"grupo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"calendario_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"grupos_modulo_lnk","indexes":[{"name":"grupos_modulo_lnk_fk","columns":["grupo_id"]},{"name":"grupos_modulo_lnk_ifk","columns":["modulo_id"]},{"name":"grupos_modulo_lnk_uq","columns":["grupo_id","modulo_id"],"type":"unique"}],"foreignKeys":[{"name":"grupos_modulo_lnk_fk","columns":["grupo_id"],"referencedColumns":["id"],"referencedTable":"grupos","onDelete":"CASCADE"},{"name":"grupos_modulo_lnk_ifk","columns":["modulo_id"],"referencedColumns":["id"],"referencedTable":"modulos","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"grupo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"modulo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"grupos_personal_lnk","indexes":[{"name":"grupos_personal_lnk_fk","columns":["grupo_id"]},{"name":"grupos_personal_lnk_ifk","columns":["personal_id"]},{"name":"grupos_personal_lnk_uq","columns":["grupo_id","personal_id"],"type":"unique"}],"foreignKeys":[{"name":"grupos_personal_lnk_fk","columns":["grupo_id"],"referencedColumns":["id"],"referencedTable":"grupos","onDelete":"CASCADE"},{"name":"grupos_personal_lnk_ifk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"grupo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"matriculas_grupo_lnk","indexes":[{"name":"matriculas_grupo_lnk_fk","columns":["matricula_id"]},{"name":"matriculas_grupo_lnk_ifk","columns":["grupo_id"]},{"name":"matriculas_grupo_lnk_uq","columns":["matricula_id","grupo_id"],"type":"unique"}],"foreignKeys":[{"name":"matriculas_grupo_lnk_fk","columns":["matricula_id"],"referencedColumns":["id"],"referencedTable":"matriculas","onDelete":"CASCADE"},{"name":"matriculas_grupo_lnk_ifk","columns":["grupo_id"],"referencedColumns":["id"],"referencedTable":"grupos","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"matricula_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"grupo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"matriculas_paquete_lnk","indexes":[{"name":"matriculas_paquete_lnk_fk","columns":["matricula_id"]},{"name":"matriculas_paquete_lnk_ifk","columns":["paquete_id"]},{"name":"matriculas_paquete_lnk_uq","columns":["matricula_id","paquete_id"],"type":"unique"}],"foreignKeys":[{"name":"matriculas_paquete_lnk_fk","columns":["matricula_id"],"referencedColumns":["id"],"referencedTable":"matriculas","onDelete":"CASCADE"},{"name":"matriculas_paquete_lnk_ifk","columns":["paquete_id"],"referencedColumns":["id"],"referencedTable":"paquetes","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"matricula_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"paquete_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"matriculas_users_lnk","indexes":[{"name":"matriculas_users_lnk_fk","columns":["matricula_id"]},{"name":"matriculas_users_lnk_ifk","columns":["user_id"]},{"name":"matriculas_users_lnk_uq","columns":["matricula_id","user_id"],"type":"unique"}],"foreignKeys":[{"name":"matriculas_users_lnk_fk","columns":["matricula_id"],"referencedColumns":["id"],"referencedTable":"matriculas","onDelete":"CASCADE"},{"name":"matriculas_users_lnk_ifk","columns":["user_id"],"referencedColumns":["id"],"referencedTable":"users","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"matricula_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"user_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"modulos_carrera_lnk","indexes":[{"name":"modulos_carrera_lnk_fk","columns":["modulo_id"]},{"name":"modulos_carrera_lnk_ifk","columns":["carrera_id"]},{"name":"modulos_carrera_lnk_uq","columns":["modulo_id","carrera_id"],"type":"unique"}],"foreignKeys":[{"name":"modulos_carrera_lnk_fk","columns":["modulo_id"],"referencedColumns":["id"],"referencedTable":"modulos","onDelete":"CASCADE"},{"name":"modulos_carrera_lnk_ifk","columns":["carrera_id"],"referencedColumns":["id"],"referencedTable":"carreras","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"modulo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"carrera_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"paquetes_grupos_lnk","indexes":[{"name":"paquetes_grupos_lnk_fk","columns":["paquete_id"]},{"name":"paquetes_grupos_lnk_ifk","columns":["grupo_id"]},{"name":"paquetes_grupos_lnk_uq","columns":["paquete_id","grupo_id"],"type":"unique"},{"name":"paquetes_grupos_lnk_ofk","columns":["grupo_ord"]}],"foreignKeys":[{"name":"paquetes_grupos_lnk_fk","columns":["paquete_id"],"referencedColumns":["id"],"referencedTable":"paquetes","onDelete":"CASCADE"},{"name":"paquetes_grupos_lnk_ifk","columns":["grupo_id"],"referencedColumns":["id"],"referencedTable":"grupos","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"paquete_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"grupo_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"grupo_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"personales_user_lnk","indexes":[{"name":"personales_user_lnk_fk","columns":["personal_id"]},{"name":"personales_user_lnk_ifk","columns":["user_id"]},{"name":"personales_user_lnk_uq","columns":["personal_id","user_id"],"type":"unique"}],"foreignKeys":[{"name":"personales_user_lnk_fk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"},{"name":"personales_user_lnk_ifk","columns":["user_id"],"referencedColumns":["id"],"referencedTable":"users","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"user_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"personales_especialidad_lnk","indexes":[{"name":"personales_especialidad_lnk_fk","columns":["personal_id"]},{"name":"personales_especialidad_lnk_ifk","columns":["especialidad_id"]},{"name":"personales_especialidad_lnk_uq","columns":["personal_id","especialidad_id"],"type":"unique"},{"name":"personales_especialidad_lnk_ofk","columns":["especialidad_ord"]}],"foreignKeys":[{"name":"personales_especialidad_lnk_fk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"},{"name":"personales_especialidad_lnk_ifk","columns":["especialidad_id"],"referencedColumns":["id"],"referencedTable":"especialidades","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"especialidad_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"especialidad_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"semestres_director_lnk","indexes":[{"name":"semestres_director_lnk_fk","columns":["semestre_id"]},{"name":"semestres_director_lnk_ifk","columns":["personal_id"]},{"name":"semestres_director_lnk_uq","columns":["semestre_id","personal_id"],"type":"unique"}],"foreignKeys":[{"name":"semestres_director_lnk_fk","columns":["semestre_id"],"referencedColumns":["id"],"referencedTable":"semestres","onDelete":"CASCADE"},{"name":"semestres_director_lnk_ifk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"semestre_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"semestres_coordinador_1_lnk","indexes":[{"name":"semestres_coordinador_1_lnk_fk","columns":["semestre_id"]},{"name":"semestres_coordinador_1_lnk_ifk","columns":["personal_id"]},{"name":"semestres_coordinador_1_lnk_uq","columns":["semestre_id","personal_id"],"type":"unique"}],"foreignKeys":[{"name":"semestres_coordinador_1_lnk_fk","columns":["semestre_id"],"referencedColumns":["id"],"referencedTable":"semestres","onDelete":"CASCADE"},{"name":"semestres_coordinador_1_lnk_ifk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"semestre_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"semestres_coordinador_2_lnk","indexes":[{"name":"semestres_coordinador_2_lnk_fk","columns":["semestre_id"]},{"name":"semestres_coordinador_2_lnk_ifk","columns":["personal_id"]},{"name":"semestres_coordinador_2_lnk_uq","columns":["semestre_id","personal_id"],"type":"unique"}],"foreignKeys":[{"name":"semestres_coordinador_2_lnk_fk","columns":["semestre_id"],"referencedColumns":["id"],"referencedTable":"semestres","onDelete":"CASCADE"},{"name":"semestres_coordinador_2_lnk_ifk","columns":["personal_id"],"referencedColumns":["id"],"referencedTable":"personales","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"semestre_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"personal_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"admin_permissions_role_lnk","indexes":[{"name":"admin_permissions_role_lnk_fk","columns":["permission_id"]},{"name":"admin_permissions_role_lnk_ifk","columns":["role_id"]},{"name":"admin_permissions_role_lnk_uq","columns":["permission_id","role_id"],"type":"unique"},{"name":"admin_permissions_role_lnk_oifk","columns":["permission_ord"]}],"foreignKeys":[{"name":"admin_permissions_role_lnk_fk","columns":["permission_id"],"referencedColumns":["id"],"referencedTable":"admin_permissions","onDelete":"CASCADE"},{"name":"admin_permissions_role_lnk_ifk","columns":["role_id"],"referencedColumns":["id"],"referencedTable":"admin_roles","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"permission_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"role_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"permission_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"admin_users_roles_lnk","indexes":[{"name":"admin_users_roles_lnk_fk","columns":["user_id"]},{"name":"admin_users_roles_lnk_ifk","columns":["role_id"]},{"name":"admin_users_roles_lnk_uq","columns":["user_id","role_id"],"type":"unique"},{"name":"admin_users_roles_lnk_ofk","columns":["role_ord"]},{"name":"admin_users_roles_lnk_oifk","columns":["user_ord"]}],"foreignKeys":[{"name":"admin_users_roles_lnk_fk","columns":["user_id"],"referencedColumns":["id"],"referencedTable":"admin_users","onDelete":"CASCADE"},{"name":"admin_users_roles_lnk_ifk","columns":["role_id"],"referencedColumns":["id"],"referencedTable":"admin_roles","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"user_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"role_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"role_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"user_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_api_token_permissions_token_lnk","indexes":[{"name":"strapi_api_token_permissions_token_lnk_fk","columns":["api_token_permission_id"]},{"name":"strapi_api_token_permissions_token_lnk_ifk","columns":["api_token_id"]},{"name":"strapi_api_token_permissions_token_lnk_uq","columns":["api_token_permission_id","api_token_id"],"type":"unique"},{"name":"strapi_api_token_permissions_token_lnk_oifk","columns":["api_token_permission_ord"]}],"foreignKeys":[{"name":"strapi_api_token_permissions_token_lnk_fk","columns":["api_token_permission_id"],"referencedColumns":["id"],"referencedTable":"strapi_api_token_permissions","onDelete":"CASCADE"},{"name":"strapi_api_token_permissions_token_lnk_ifk","columns":["api_token_id"],"referencedColumns":["id"],"referencedTable":"strapi_api_tokens","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"api_token_permission_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"api_token_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"api_token_permission_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]},{"name":"strapi_transfer_token_permissions_token_lnk","indexes":[{"name":"strapi_transfer_token_permissions_token_lnk_fk","columns":["transfer_token_permission_id"]},{"name":"strapi_transfer_token_permissions_token_lnk_ifk","columns":["transfer_token_id"]},{"name":"strapi_transfer_token_permissions_token_lnk_uq","columns":["transfer_token_permission_id","transfer_token_id"],"type":"unique"},{"name":"strapi_transfer_token_permissions_token_lnk_oifk","columns":["transfer_token_permission_ord"]}],"foreignKeys":[{"name":"strapi_transfer_token_permissions_token_lnk_fk","columns":["transfer_token_permission_id"],"referencedColumns":["id"],"referencedTable":"strapi_transfer_token_permissions","onDelete":"CASCADE"},{"name":"strapi_transfer_token_permissions_token_lnk_ifk","columns":["transfer_token_id"],"referencedColumns":["id"],"referencedTable":"strapi_transfer_tokens","onDelete":"CASCADE"}],"columns":[{"name":"id","type":"increments","args":[{"primary":true,"primaryKey":true}],"defaultTo":null,"notNullable":true,"unsigned":false},{"name":"transfer_token_permission_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"transfer_token_id","type":"integer","args":[],"defaultTo":null,"notNullable":false,"unsigned":true},{"name":"transfer_token_permission_ord","type":"double","args":[],"defaultTo":null,"notNullable":false,"unsigned":true}]}]}	2025-08-10 21:34:59.048	3a7197bbc114608bf0304ab131a456e2
\.


--
-- Data for Name: strapi_history_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_history_versions (id, content_type, related_document_id, locale, status, data, schema, created_at, created_by_id) FROM stdin;
\.


--
-- Data for Name: strapi_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_migrations (id, name, "time") FROM stdin;
\.


--
-- Data for Name: strapi_migrations_internal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_migrations_internal (id, name, "time") FROM stdin;
1	5.0.0-rename-identifiers-longer-than-max-length	2025-04-18 21:45:41.878
2	5.0.0-02-created-document-id	2025-04-18 21:45:41.908
3	5.0.0-03-created-locale	2025-04-18 21:45:41.937
4	5.0.0-04-created-published-at	2025-04-18 21:45:41.964
5	5.0.0-05-drop-slug-fields-index	2025-04-18 21:45:41.99
6	core::5.0.0-discard-drafts	2025-04-18 21:45:42.015
\.


--
-- Data for Name: strapi_release_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_release_actions (id, document_id, type, content_type, entry_document_id, locale, is_entry_valid, created_at, updated_at, published_at, created_by_id, updated_by_id) FROM stdin;
\.


--
-- Data for Name: strapi_release_actions_release_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_release_actions_release_lnk (id, release_action_id, release_id, release_action_ord) FROM stdin;
\.


--
-- Data for Name: strapi_releases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_releases (id, document_id, name, released_at, scheduled_at, timezone, status, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_transfer_token_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_transfer_token_permissions (id, document_id, action, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_transfer_token_permissions_token_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_transfer_token_permissions_token_lnk (id, transfer_token_permission_id, transfer_token_id, transfer_token_permission_ord) FROM stdin;
\.


--
-- Data for Name: strapi_transfer_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_transfer_tokens (id, document_id, name, description, access_key, last_used_at, expires_at, lifespan, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_webhooks (id, name, url, headers, events, enabled) FROM stdin;
\.


--
-- Data for Name: strapi_workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_workflows (id, document_id, name, content_types, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_workflows_stage_required_to_publish_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_workflows_stage_required_to_publish_lnk (id, workflow_id, workflow_stage_id) FROM stdin;
\.


--
-- Data for Name: strapi_workflows_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_workflows_stages (id, document_id, name, color, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
\.


--
-- Data for Name: strapi_workflows_stages_permissions_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_workflows_stages_permissions_lnk (id, workflow_stage_id, permission_id, permission_ord) FROM stdin;
\.


--
-- Data for Name: strapi_workflows_stages_workflow_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.strapi_workflows_stages_workflow_lnk (id, workflow_stage_id, workflow_id, workflow_stage_ord) FROM stdin;
\.


--
-- Data for Name: up_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.up_permissions (id, document_id, action, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	w8sveds8jwto4uyyhhydpwgv	plugin::users-permissions.user.me	2025-04-18 21:45:42.748	2025-04-18 21:45:42.748	2025-04-18 21:45:42.749	\N	\N	\N
2	juf4x0uaixr8bx890cxru1sr	plugin::users-permissions.auth.changePassword	2025-04-18 21:45:42.748	2025-04-18 21:45:42.748	2025-04-18 21:45:42.749	\N	\N	\N
3	s3drtt9kvzy6nwgsx0c1p9dk	plugin::users-permissions.auth.callback	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	\N	\N	\N
4	dwrlr4wqhs5t2ca98dp7rzh1	plugin::users-permissions.auth.connect	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
5	zz5wy7yd2qhwh8nb1xsyn4p2	plugin::users-permissions.auth.resetPassword	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
9	gxvac8446p5cep4ehj9602rt	plugin::users-permissions.auth.sendEmailConfirmation	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
6	sj8jhkmfebouf9insn4f7vol	plugin::users-permissions.auth.register	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
7	mmlxwwblqiedbwe9e4ydgnt3	plugin::users-permissions.auth.emailConfirmation	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
8	vsfufcyafvdabkb401gez8zc	plugin::users-permissions.auth.forgotPassword	2025-04-18 21:45:42.76	2025-04-18 21:45:42.76	2025-04-18 21:45:42.761	\N	\N	\N
24	muhhehle3bnsx6ehk8ku81og	api::modulo.modulo.find	2025-05-30 12:02:17.042	2025-05-30 12:02:17.042	2025-05-30 12:02:17.042	\N	\N	\N
25	m1lzzvda8p11xkt70s8ic5en	plugin::users-permissions.user.find	2025-05-30 12:02:17.042	2025-05-30 12:02:17.042	2025-05-30 12:02:17.043	\N	\N	\N
26	jrmeo397j3h3pt1y4jdh37na	api::semestre.semestre.findOne	2025-06-04 10:01:21.441	2025-06-04 10:01:21.441	2025-06-04 10:01:21.443	\N	\N	\N
27	kvs61p9q0dprdbszux3vlrnm	api::semestre.semestre.find	2025-06-04 10:01:21.441	2025-06-04 10:01:21.441	2025-06-04 10:01:21.442	\N	\N	\N
28	ne7du85ctudqeidrog7v3mon	api::semestre.semestre.find	2025-06-04 10:22:46.91	2025-06-04 10:22:46.91	2025-06-04 10:22:46.91	\N	\N	\N
29	yw1oy5ttbjcpasmofc8cyi82	api::semestre.semestre.findOne	2025-06-04 10:22:46.91	2025-06-04 10:22:46.91	2025-06-04 10:22:46.91	\N	\N	\N
30	wid6dqs56dq6zedn8jlfvax8	plugin::content-type-builder.content-types.getContentTypes	2025-06-04 13:44:42.644	2025-06-04 13:44:42.644	2025-06-04 13:44:42.644	\N	\N	\N
31	rcaa8oxpdy9mop9cdg848cwm	plugin::content-type-builder.content-types.getContentType	2025-06-04 13:44:42.644	2025-06-04 13:44:42.644	2025-06-04 13:44:42.646	\N	\N	\N
40	a8ke57vrkymtwfm6bqbgg4s8	plugin::archivador.controller.index	2025-06-07 23:17:04.798	2025-06-07 23:17:04.798	2025-06-07 23:17:04.798	\N	\N	\N
41	pn9wfh7ilyayqjxfggv3yltd	plugin::archivador.controller.index	2025-06-08 00:43:57.758	2025-06-08 00:43:57.758	2025-06-08 00:43:57.759	\N	\N	\N
44	u44k83drxb96l2zqjzp4w6bn	api::calendario.calendario.find	2025-06-08 09:33:06.913	2025-06-08 09:33:06.913	2025-06-08 09:33:06.915	\N	\N	\N
45	ateiguhe8vzv9russv8hzbet	api::calendario.calendario.findOne	2025-06-08 09:33:06.913	2025-06-08 09:33:06.913	2025-06-08 09:33:06.915	\N	\N	\N
46	pgxu6sa1ku9hmm0565kqmz4w	api::calendario.calendario.create	2025-06-08 09:33:06.913	2025-06-08 09:33:06.913	2025-06-08 09:33:06.916	\N	\N	\N
47	c326a7r1zl73hwvfmhs7by34	api::calendario.calendario.update	2025-06-08 09:33:06.913	2025-06-08 09:33:06.913	2025-06-08 09:33:06.916	\N	\N	\N
48	fyz3cg3mu4camxa5adpev88a	api::calendario.calendario.delete	2025-06-08 09:33:06.913	2025-06-08 09:33:06.913	2025-06-08 09:33:06.917	\N	\N	\N
49	x4wjvds2xff3se2ek5c4owww	api::grupo.grupo.find	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.917	\N	\N	\N
50	ohfmxsuqp86k87bl52ajg3tr	api::grupo.grupo.findOne	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.918	\N	\N	\N
51	gre02mmqxq8jgaj9ny9jdk98	api::grupo.grupo.create	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.919	\N	\N	\N
52	zuzqrrj96j3qi9xsxaaz1my1	api::grupo.grupo.update	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.92	\N	\N	\N
53	zboj0htr6jq851l3q8cssapn	api::grupo.grupo.delete	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.92	\N	\N	\N
54	h37mhjs73fltctgywm0143e7	api::matricula.matricula.find	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.92	\N	\N	\N
55	ed0b40pzuaie003o8hh2zpof	api::matricula.matricula.findOne	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.92	\N	\N	\N
56	il4se3f7re23fk5935c0czi9	api::matricula.matricula.create	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.921	\N	\N	\N
57	xg68b2k1xob339s1iyw6qnvh	api::matricula.matricula.update	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.921	\N	\N	\N
58	qdv5in7d4hqhzywiyvkpo2zx	api::matricula.matricula.delete	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.921	\N	\N	\N
59	lka3e7pji6w5kivajn3gqc9o	api::paquete.paquete.find	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.921	\N	\N	\N
60	vz8t9jkh4t7nfb8e0mg7qaum	api::paquete.paquete.findOne	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.922	\N	\N	\N
61	z8k06wu9m3e7tf3vfzmgjbj7	api::paquete.paquete.create	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.922	\N	\N	\N
62	d90pa4luf8fqsk4mtn9nbtsu	api::paquete.paquete.update	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.922	\N	\N	\N
63	lkcrzveho2k77fq5hranh2t1	api::paquete.paquete.delete	2025-06-08 09:33:06.914	2025-06-08 09:33:06.914	2025-06-08 09:33:06.923	\N	\N	\N
64	vupboeuzkit6351pgo561vmx	api::semestre.semestre.create	2025-06-08 09:39:58.793	2025-06-08 09:39:58.793	2025-06-08 09:39:58.794	\N	\N	\N
65	gnu32hvb30kt4zo99c947781	api::semestre.semestre.update	2025-06-08 09:39:58.794	2025-06-08 09:39:58.794	2025-06-08 09:39:58.795	\N	\N	\N
66	pq02vbieqwubkcfiqz21oivo	api::semestre.semestre.delete	2025-06-08 09:39:58.794	2025-06-08 09:39:58.794	2025-06-08 09:39:58.795	\N	\N	\N
67	vauguyuqtee2kh84qdn4038x	api::matricula.matricula.find	2025-06-08 21:14:55.053	2025-06-08 21:14:55.053	2025-06-08 21:14:55.056	\N	\N	\N
68	me7s99a9fxt4i2yw9cb4l7uh	api::matricula.matricula.findOne	2025-06-08 21:14:55.053	2025-06-08 21:14:55.053	2025-06-08 21:14:55.057	\N	\N	\N
69	s4vpj56wa31r5oehw1bhmw89	api::matricula.matricula.create	2025-06-08 21:14:55.053	2025-06-08 21:14:55.053	2025-06-08 21:14:55.058	\N	\N	\N
70	bh6424jtka58t8hgjvmx4oq2	api::matricula.matricula.update	2025-06-08 21:14:55.053	2025-06-08 21:14:55.053	2025-06-08 21:14:55.059	\N	\N	\N
71	ymzq1oy6gxk7v7c3l9ihx4e8	api::matricula.matricula.delete	2025-06-08 21:14:55.053	2025-06-08 21:14:55.053	2025-06-08 21:14:55.059	\N	\N	\N
72	ssnd371xvm9p7g00ivqqhznw	api::grupo.grupo.find	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	\N	\N	\N
73	vt10877kbzc8awheoz92zkj1	api::grupo.grupo.create	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	2025-06-08 21:15:02.485	\N	\N	\N
74	uizl05pceqc7e329iv44vf3g	api::grupo.grupo.update	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	2025-06-08 21:15:02.485	\N	\N	\N
76	rvcmuji389glqn44zq2t7yun	api::grupo.grupo.delete	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	2025-06-08 21:15:02.485	\N	\N	\N
75	lljw4ahrl9g9a4i52t93z5xg	api::grupo.grupo.findOne	2025-06-08 21:15:02.484	2025-06-08 21:15:02.484	2025-06-08 21:15:02.485	\N	\N	\N
77	fhlos23xmgt9kbuuyczcy2a0	api::paquete.paquete.find	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	\N	\N	\N
78	hn959zjfa58rs0wfyaq3fmzc	api::paquete.paquete.findOne	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	2025-06-08 21:15:14.875	\N	\N	\N
79	bpezlqrso0pckp20cwm2qnpf	api::paquete.paquete.create	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	2025-06-08 21:15:14.875	\N	\N	\N
80	irbeexvx0yiv9d17d5a21whe	api::paquete.paquete.update	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	2025-06-08 21:15:14.875	\N	\N	\N
81	f44ygk0ev8hwrh9yjmxe3hlj	api::paquete.paquete.delete	2025-06-08 21:15:14.874	2025-06-08 21:15:14.874	2025-06-08 21:15:14.876	\N	\N	\N
82	lnftj6wg267snprdpza8s17u	api::semestre.semestre.create	2025-06-08 21:15:26.644	2025-06-08 21:15:26.644	2025-06-08 21:15:26.644	\N	\N	\N
83	enkmxuewc02xsixinj6z80hn	api::semestre.semestre.update	2025-06-08 21:15:26.644	2025-06-08 21:15:26.644	2025-06-08 21:15:26.645	\N	\N	\N
84	a494yem20cx8fqwqz5u45n1n	api::semestre.semestre.delete	2025-06-08 21:15:26.644	2025-06-08 21:15:26.644	2025-06-08 21:15:26.645	\N	\N	\N
85	efbpxx7a01jfpq41eivkvotz	api::calendario.calendario.find	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	\N	\N	\N
86	zdox4oee92cxmjpp9nhilh68	api::calendario.calendario.findOne	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	\N	\N	\N
87	gt4j4j9kp8hscyz1dw2rxqrv	api::calendario.calendario.create	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	\N	\N	\N
88	jrwqdiaah8oz9g0o6ivbg2ja	api::calendario.calendario.update	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	\N	\N	\N
89	keoqrzwvaty21u0qn0kvrq2h	api::calendario.calendario.delete	2025-06-08 21:15:47.58	2025-06-08 21:15:47.58	2025-06-08 21:15:47.581	\N	\N	\N
91	o1m2hn63pr3is9ov3t7v2g0i	api::calendario.calendario.find	2025-06-09 14:50:07.498	2025-06-09 14:50:07.498	2025-06-09 14:50:07.499	\N	\N	\N
90	f42jmi69ofiyqjfweq1skqam	api::calendario.calendario.findOne	2025-06-09 14:50:07.499	2025-06-09 14:50:07.499	2025-06-09 14:50:07.5	\N	\N	\N
92	k0gb12wclu7monka0ef0g80o	api::calendario.calendario.create	2025-06-09 14:50:07.499	2025-06-09 14:50:07.499	2025-06-09 14:50:07.5	\N	\N	\N
93	vrqs2sczaqxo6yi7v3vppjo7	api::calendario.calendario.update	2025-06-09 14:50:07.499	2025-06-09 14:50:07.499	2025-06-09 14:50:07.5	\N	\N	\N
94	prod62wyyeliqi1uxdaqq4be	api::calendario.calendario.delete	2025-06-09 14:50:07.499	2025-06-09 14:50:07.499	2025-06-09 14:50:07.5	\N	\N	\N
95	z3rmu8izi9vi9e26pm8esclh	plugin::users-permissions.role.findOne	2025-07-02 01:02:12.056	2025-07-02 01:02:12.056	2025-07-02 01:02:12.058	\N	\N	\N
96	cs0bjnutefaob9mtjh5x19ao	plugin::users-permissions.role.find	2025-07-02 01:02:12.056	2025-07-02 01:02:12.056	2025-07-02 01:02:12.059	\N	\N	\N
97	l13yje552orx1xqd5pbcr2hg	plugin::users-permissions.role.findOne	2025-07-02 01:02:50.149	2025-07-02 01:02:50.149	2025-07-02 01:02:50.149	\N	\N	\N
98	e99retsgaaor6xrm1djadpnf	plugin::users-permissions.role.find	2025-07-02 01:02:50.149	2025-07-02 01:02:50.149	2025-07-02 01:02:50.149	\N	\N	\N
106	rghym5m9d9euzxedw55r1f2e	api::especialidad.especialidad.find	2025-07-10 10:21:45.313	2025-07-10 10:21:45.313	2025-07-10 10:21:45.314	\N	\N	\N
105	ubj07whn0mku76l0ypl8qvpm	api::especialidad.especialidad.findOne	2025-07-10 10:21:45.314	2025-07-10 10:21:45.314	2025-07-10 10:21:45.315	\N	\N	\N
107	edja2nsvq5dwb6tr7r47dud5	api::especialidad.especialidad.create	2025-07-10 10:21:45.314	2025-07-10 10:21:45.314	2025-07-10 10:21:45.315	\N	\N	\N
108	x7qcqrjrw28xmyu5s0j74aaa	api::especialidad.especialidad.update	2025-07-10 10:21:45.314	2025-07-10 10:21:45.314	2025-07-10 10:21:45.316	\N	\N	\N
109	ls16furg4p7jcsz25gr4s3qp	api::especialidad.especialidad.delete	2025-07-10 10:21:45.314	2025-07-10 10:21:45.314	2025-07-10 10:21:45.316	\N	\N	\N
\.


--
-- Data for Name: up_permissions_role_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.up_permissions_role_lnk (id, permission_id, role_id, permission_ord) FROM stdin;
1	1	1	1
2	2	1	1
3	3	2	1
4	4	2	1
5	5	2	2
6	6	2	2
7	9	2	2
8	8	2	2
9	7	2	2
24	25	3	1
25	24	3	1
26	27	1	2
27	26	1	2
28	28	2	3
29	29	2	4
30	30	1	3
31	31	1	3
40	40	1	4
41	41	2	5
44	44	2	6
45	45	2	6
46	46	2	7
47	47	2	8
48	48	2	8
49	49	2	9
50	50	2	9
51	51	2	10
52	52	2	10
53	53	2	11
54	54	2	11
55	55	2	12
56	56	2	12
57	57	2	13
58	58	2	13
59	59	2	14
60	60	2	14
61	61	2	14
62	62	2	15
63	63	2	15
64	64	2	16
65	65	2	16
66	66	2	17
67	68	1	5
68	69	1	5
69	67	1	5
70	71	1	6
71	70	1	6
72	72	1	7
73	73	1	7
74	74	1	7
75	76	1	7
76	75	1	8
77	77	1	9
78	78	1	9
79	79	1	9
80	80	1	9
81	81	1	9
82	82	1	10
83	83	1	10
84	84	1	10
85	86	1	11
86	85	1	12
87	88	1	12
88	87	1	12
89	89	1	13
90	90	8	1
91	92	8	1
92	91	8	1
93	93	8	2
94	94	8	2
96	96	1	14
95	95	1	14
97	97	2	18
98	98	2	18
105	105	1	15
106	106	1	15
107	107	1	16
108	108	1	16
109	109	1	17
\.


--
-- Data for Name: up_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.up_roles (id, document_id, name, description, type, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
3	ctxfcw65uwcrs9cf2ak0ym2b	Estudiante	El Estudiante solo podrá ver los módulos a los cuales esta matriculado y sus asistencias y notas en dichos módulos.	estudiante	2025-05-30 12:02:17.032	2025-05-30 12:02:17.032	2025-05-30 12:02:17.032	\N	\N	\N
4	c0a6vhoig1tngob3sfz6p0ru	Docente	El Docente podrá ver todos los grupos a los que fue asignado, sus integrantes, colocar notas y asistencias.\n	docente	2025-05-30 12:19:18.923	2025-05-30 12:19:18.923	2025-05-30 12:19:18.923	\N	\N	\N
5	wzedlxxd067ehss5mjy6ohx9	Oficinista	El Oficinista podrá ver todos los grupos, sus integrantes, notas y asistencias.	oficinista	2025-05-30 12:20:51.088	2025-05-30 12:20:51.088	2025-05-30 12:20:51.088	\N	\N	\N
6	r29nxoe3l8e5e1gp8f84qt94	Coordinador 	El Coordinador podrá ver todos los grupos, estudiantes, asistencias y notas, demás podrá gestionar módulos y grupos.	coordinador	2025-05-30 12:25:11.616	2025-05-30 12:25:11.616	2025-05-30 12:25:11.616	\N	\N	\N
7	owgtjneypxg9pn6ghon7ketf	Director	El Director podrá ver todos los grupos, integrantes, asistencias y notas, además de gestionar docentes, módulos, grupos.	director	2025-05-30 12:27:23.776	2025-05-30 12:27:23.776	2025-05-30 12:27:23.776	\N	\N	\N
8	vln18s9jw3ij3nr60ycwngp5	Sevicio	El Servidor, solo podrá ver la lista de docentes, grupos, e integrantes.	sevicio	2025-05-30 12:28:32.305	2025-06-09 14:50:07.492	2025-05-30 12:28:32.305	\N	\N	\N
2	bmklb7mwfdvb4xisc0d9ydl1	Public	Default role given to unauthenticated user.	public	2025-04-18 21:45:42.742	2025-07-02 02:00:49.202	2025-04-18 21:45:42.742	\N	\N	\N
1	t6fi2z3pabm30xaghzkj4b13	Authenticated	Default role given to authenticated user.	authenticated	2025-04-18 21:45:42.738	2025-07-10 10:21:45.306	2025-04-18 21:45:42.738	\N	\N	\N
9	b5dfbk2ruo6griufwwammpfn	Visitante	Persones que se loguean con su cuenta de Google pero que no pertenecen a la institución, pueden comentar.	visitante	2025-07-29 15:47:56.364	2025-07-29 15:47:56.364	2025-07-29 15:47:56.366	\N	\N	\N
\.


--
-- Data for Name: upload_folders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.upload_folders (id, document_id, name, path_id, path, created_at, updated_at, published_at, created_by_id, updated_by_id, locale) FROM stdin;
1	b1gncrkjqsye9gccnlh8fiuj	computacion	1	/1	2025-07-06 16:01:55.785	2025-07-06 16:01:55.785	2025-07-06 16:01:55.787	1	1	\N
2	nlh7xw7g8ko8i8dw7207s3ey	computacion-fondos	2	/1/2	2025-07-06 16:09:23.331	2025-07-06 16:09:23.331	2025-07-06 16:09:23.331	1	1	\N
3	udg3z832jgi2ukmnxqo5md6i	Institucionales	3	/3	2025-07-27 20:27:31.91	2025-07-27 20:27:31.91	2025-07-27 20:27:31.913	1	1	\N
\.


--
-- Data for Name: upload_folders_parent_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.upload_folders_parent_lnk (id, folder_id, inv_folder_id, folder_ord) FROM stdin;
1	2	1	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, document_id, dni, telefono, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, username, email, provider, password, reset_password_token, confirmation_token, confirmed, blocked, direccion, fecha_nacimiento, celular, distrito, tipo_documento, sexo, estado_civil, instruccion, apellido_materno, apellido_paterno, nombre, apellidos, avatar) FROM stdin;
7	ji7fnbke040ltkunbbzaeh97	69587589	\N	2025-05-31 23:33:00.094	2025-05-31 23:33:00.094	2025-05-31 23:32:59.975	1	1	\N	Manuel Quispe	manuel@gmail.com	local	$2a$10$CZB3uu75uAO2TZs5AWsDhOFbAiiXviAFCAI7jmYVE1dbWzU2xCmZ2	\N	\N	t	f	\N	2000-10-21	962325873	\N	DNI	M	\N	\N	Aliaga	Quipe	Manuel Jesús	\N	\N
8	ylx21hugj011wbivzlmlu3gz	14698579	\N	2025-06-01 12:12:08.659	2025-06-01 12:12:08.659	2025-06-01 12:12:08.546	1	1	\N	Margarita Postillon	margarita@gmail.com	local	$2a$10$0wM17Pfcp1gOQznfYxhidOj1OnWQCpHNNStLf9mQYYxx9N/PUKL1a	\N	\N	t	f	\N	\N	963232587	\N	DNI	\N	\N	\N	Vega	Postillon	Margarita Liliana	\N	\N
6	kfzpyy7v08fkgajxmhew1o9q	10698579	\N	2025-05-30 16:12:03.653	2025-06-10 13:04:39.086	2025-06-10 13:04:39.061	1	2	\N	Marco Palomino	enkee03@gmail.com	local	$2a$10$86gwVMI.CSZEaEXuRItugO8BOZEXdRDS.h4XwtF8lhPzacj45GuRe	\N	\N	t	f	\N	\N	963232358	\N	DNI	\N	\N	\N	Horna	Palomino	Marco Polo	\N	\N
9	hut66giaazya8gpoe3rbt72b	10000010	941689574	2025-06-20 13:45:12.017	2025-07-05 15:32:02.351	2025-06-20 13:45:12.021	\N	\N	\N	Alberto Jimmy Adama Hilario	10000010@cetprosmp.edu.pe	google	\N	\N	\N	t	f	Jr. Las Grullas 1135 Santa Anita	1977-11-01	941689574	\N	DNI	\N	Soltero	Superior	\N	\N	Alberto Jimmy	Adama Hilario	https://lh3.googleusercontent.com/a-/ALV-UjWQ6MHjheOGcwF7zlQq5syMv1wwasbs2L2Rs4jXEFu-P8vPrS4=s96-c
12	em3qww97h0321whpowpqmzup	epalomin	\N	2025-06-29 13:21:52.125	2025-08-14 00:13:33.184	2025-06-29 13:21:52.135	\N	\N	\N	Enrique Rafael Palomino Horna	epalominoh@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N	941689574	\N	DNI	\N			\N	\N	Enrique Rafael	Palomino Horna	https://lh3.googleusercontent.com/a-/ALV-UjWBcAZg3CZKv-EEYeMWK8htvd_YZARktO1ZH96jjiVw7iyxlgE=s96-c
10	d7pin51shj5oejzyn7sdol3t	enkee03@		2025-06-20 14:01:27.966	2025-08-14 00:18:02.399	2025-06-20 14:01:27.967	\N	\N	\N	Enrique Rafael Palomino Horna	enkee03@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N		\N	DNI	\N			\N	\N	Enrique Rafael	Palomino Horna	https://lh3.googleusercontent.com/a-/ALV-UjXV5jenZ71qCyXVDnoRVStcdR4qRQocWbv6e5Qkzbc-vW2FEea_=s96-c
11	s3j2dgy7iejsm1xrkj2aeli1	11111111		2025-06-20 15:23:01.845	2025-07-05 14:35:22.965	2025-06-20 15:23:01.847	\N	\N	\N	Octavio Horna Palomino	11111111@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N		\N	DNI	\N			\N	\N	Octavio	Horna Palomino	https://lh3.googleusercontent.com/a-/ALV-UjVF5mdDlo1GrbBEGXT9XHMEp2sEighIcyLVk_G4J4j7Pu5nSeE=s96-c
\.


--
-- Data for Name: users_role_lnk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users_role_lnk (id, user_id, role_id, user_ord) FROM stdin;
7	7	6	1
8	8	4	1
9	6	1	1
\.


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
-- Name: admin_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_permissions_id_seq', 1255, true);


--
-- Name: admin_permissions_role_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_permissions_role_lnk_id_seq', 1255, true);


--
-- Name: admin_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_roles_id_seq', 3, true);


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 2, true);


--
-- Name: admin_users_roles_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_users_roles_lnk_id_seq', 4, true);


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
-- Name: files_folder_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.files_folder_lnk_id_seq', 10, true);


--
-- Name: files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.files_id_seq', 32, true);


--
-- Name: files_related_mph_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.files_related_mph_id_seq', 205, true);


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
-- Name: i18n_locale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.i18n_locale_id_seq', 2, true);


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
-- Name: pruebas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pruebas_id_seq', 1, false);


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
-- Name: strapi_api_token_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_api_token_permissions_id_seq', 1, false);


--
-- Name: strapi_api_token_permissions_token_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_api_token_permissions_token_lnk_id_seq', 1, false);


--
-- Name: strapi_api_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_api_tokens_id_seq', 3, true);


--
-- Name: strapi_core_store_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_core_store_settings_id_seq', 101, true);


--
-- Name: strapi_database_schema_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_database_schema_id_seq', 225, true);


--
-- Name: strapi_history_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_history_versions_id_seq', 1, false);


--
-- Name: strapi_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_migrations_id_seq', 1, false);


--
-- Name: strapi_migrations_internal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_migrations_internal_id_seq', 6, true);


--
-- Name: strapi_release_actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_release_actions_id_seq', 1, false);


--
-- Name: strapi_release_actions_release_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_release_actions_release_lnk_id_seq', 1, false);


--
-- Name: strapi_releases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_releases_id_seq', 1, false);


--
-- Name: strapi_transfer_token_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_transfer_token_permissions_id_seq', 1, false);


--
-- Name: strapi_transfer_token_permissions_token_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_transfer_token_permissions_token_lnk_id_seq', 1, false);


--
-- Name: strapi_transfer_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_transfer_tokens_id_seq', 1, false);


--
-- Name: strapi_webhooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_webhooks_id_seq', 1, false);


--
-- Name: strapi_workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_workflows_id_seq', 1, false);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_workflows_stage_required_to_publish_lnk_id_seq', 1, false);


--
-- Name: strapi_workflows_stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_workflows_stages_id_seq', 1, false);


--
-- Name: strapi_workflows_stages_permissions_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_workflows_stages_permissions_lnk_id_seq', 1, false);


--
-- Name: strapi_workflows_stages_workflow_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.strapi_workflows_stages_workflow_lnk_id_seq', 1, false);


--
-- Name: up_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.up_permissions_id_seq', 109, true);


--
-- Name: up_permissions_role_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.up_permissions_role_lnk_id_seq', 109, true);


--
-- Name: up_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.up_roles_id_seq', 9, true);


--
-- Name: upload_folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.upload_folders_id_seq', 3, true);


--
-- Name: upload_folders_parent_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.upload_folders_parent_lnk_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: users_role_lnk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_role_lnk_id_seq', 9, true);


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
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions_role_lnk admin_permissions_role_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions_role_lnk
    ADD CONSTRAINT admin_permissions_role_lnk_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions_role_lnk admin_permissions_role_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions_role_lnk
    ADD CONSTRAINT admin_permissions_role_lnk_uq UNIQUE (permission_id, role_id);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users_roles_lnk admin_users_roles_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users_roles_lnk
    ADD CONSTRAINT admin_users_roles_lnk_pkey PRIMARY KEY (id);


--
-- Name: admin_users_roles_lnk admin_users_roles_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users_roles_lnk
    ADD CONSTRAINT admin_users_roles_lnk_uq UNIQUE (user_id, role_id);


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
-- Name: files_folder_lnk files_folder_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_folder_lnk
    ADD CONSTRAINT files_folder_lnk_pkey PRIMARY KEY (id);


--
-- Name: files_folder_lnk files_folder_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_folder_lnk
    ADD CONSTRAINT files_folder_lnk_uq UNIQUE (file_id, folder_id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: files_related_mph files_related_mph_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_related_mph
    ADD CONSTRAINT files_related_mph_pkey PRIMARY KEY (id);


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
-- Name: i18n_locale i18n_locale_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_locale
    ADD CONSTRAINT i18n_locale_pkey PRIMARY KEY (id);


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
-- Name: pruebas pruebas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pruebas
    ADD CONSTRAINT pruebas_pkey PRIMARY KEY (id);


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
-- Name: strapi_api_token_permissions strapi_api_token_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions
    ADD CONSTRAINT strapi_api_token_permissions_pkey PRIMARY KEY (id);


--
-- Name: strapi_api_token_permissions_token_lnk strapi_api_token_permissions_token_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions_token_lnk
    ADD CONSTRAINT strapi_api_token_permissions_token_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_api_token_permissions_token_lnk strapi_api_token_permissions_token_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions_token_lnk
    ADD CONSTRAINT strapi_api_token_permissions_token_lnk_uq UNIQUE (api_token_permission_id, api_token_id);


--
-- Name: strapi_api_tokens strapi_api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_tokens
    ADD CONSTRAINT strapi_api_tokens_pkey PRIMARY KEY (id);


--
-- Name: strapi_core_store_settings strapi_core_store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_core_store_settings
    ADD CONSTRAINT strapi_core_store_settings_pkey PRIMARY KEY (id);


--
-- Name: strapi_database_schema strapi_database_schema_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_database_schema
    ADD CONSTRAINT strapi_database_schema_pkey PRIMARY KEY (id);


--
-- Name: strapi_history_versions strapi_history_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_history_versions
    ADD CONSTRAINT strapi_history_versions_pkey PRIMARY KEY (id);


--
-- Name: strapi_migrations_internal strapi_migrations_internal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_migrations_internal
    ADD CONSTRAINT strapi_migrations_internal_pkey PRIMARY KEY (id);


--
-- Name: strapi_migrations strapi_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_migrations
    ADD CONSTRAINT strapi_migrations_pkey PRIMARY KEY (id);


--
-- Name: strapi_release_actions strapi_release_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions
    ADD CONSTRAINT strapi_release_actions_pkey PRIMARY KEY (id);


--
-- Name: strapi_release_actions_release_lnk strapi_release_actions_release_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions_release_lnk
    ADD CONSTRAINT strapi_release_actions_release_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_release_actions_release_lnk strapi_release_actions_release_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions_release_lnk
    ADD CONSTRAINT strapi_release_actions_release_lnk_uq UNIQUE (release_action_id, release_id);


--
-- Name: strapi_releases strapi_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_releases
    ADD CONSTRAINT strapi_releases_pkey PRIMARY KEY (id);


--
-- Name: strapi_transfer_token_permissions strapi_transfer_token_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions
    ADD CONSTRAINT strapi_transfer_token_permissions_pkey PRIMARY KEY (id);


--
-- Name: strapi_transfer_token_permissions_token_lnk strapi_transfer_token_permissions_token_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions_token_lnk
    ADD CONSTRAINT strapi_transfer_token_permissions_token_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_transfer_token_permissions_token_lnk strapi_transfer_token_permissions_token_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions_token_lnk
    ADD CONSTRAINT strapi_transfer_token_permissions_token_lnk_uq UNIQUE (transfer_token_permission_id, transfer_token_id);


--
-- Name: strapi_transfer_tokens strapi_transfer_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_tokens
    ADD CONSTRAINT strapi_transfer_tokens_pkey PRIMARY KEY (id);


--
-- Name: strapi_webhooks strapi_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_webhooks
    ADD CONSTRAINT strapi_webhooks_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows strapi_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows
    ADD CONSTRAINT strapi_workflows_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk strapi_workflows_stage_required_to_publish_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stage_required_to_publish_lnk
    ADD CONSTRAINT strapi_workflows_stage_required_to_publish_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk strapi_workflows_stage_required_to_publish_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stage_required_to_publish_lnk
    ADD CONSTRAINT strapi_workflows_stage_required_to_publish_lnk_uq UNIQUE (workflow_id, workflow_stage_id);


--
-- Name: strapi_workflows_stages_permissions_lnk strapi_workflows_stages_permissions_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_permissions_lnk
    ADD CONSTRAINT strapi_workflows_stages_permissions_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows_stages_permissions_lnk strapi_workflows_stages_permissions_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_permissions_lnk
    ADD CONSTRAINT strapi_workflows_stages_permissions_lnk_uq UNIQUE (workflow_stage_id, permission_id);


--
-- Name: strapi_workflows_stages strapi_workflows_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages
    ADD CONSTRAINT strapi_workflows_stages_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows_stages_workflow_lnk strapi_workflows_stages_workflow_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_workflow_lnk
    ADD CONSTRAINT strapi_workflows_stages_workflow_lnk_pkey PRIMARY KEY (id);


--
-- Name: strapi_workflows_stages_workflow_lnk strapi_workflows_stages_workflow_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_workflow_lnk
    ADD CONSTRAINT strapi_workflows_stages_workflow_lnk_uq UNIQUE (workflow_stage_id, workflow_id);


--
-- Name: up_permissions up_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions
    ADD CONSTRAINT up_permissions_pkey PRIMARY KEY (id);


--
-- Name: up_permissions_role_lnk up_permissions_role_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions_role_lnk
    ADD CONSTRAINT up_permissions_role_lnk_pkey PRIMARY KEY (id);


--
-- Name: up_permissions_role_lnk up_permissions_role_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions_role_lnk
    ADD CONSTRAINT up_permissions_role_lnk_uq UNIQUE (permission_id, role_id);


--
-- Name: up_roles up_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_roles
    ADD CONSTRAINT up_roles_pkey PRIMARY KEY (id);


--
-- Name: upload_folders_parent_lnk upload_folders_parent_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders_parent_lnk
    ADD CONSTRAINT upload_folders_parent_lnk_pkey PRIMARY KEY (id);


--
-- Name: upload_folders_parent_lnk upload_folders_parent_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders_parent_lnk
    ADD CONSTRAINT upload_folders_parent_lnk_uq UNIQUE (folder_id, inv_folder_id);


--
-- Name: upload_folders upload_folders_path_id_index; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders
    ADD CONSTRAINT upload_folders_path_id_index UNIQUE (path_id);


--
-- Name: upload_folders upload_folders_path_index; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders
    ADD CONSTRAINT upload_folders_path_index UNIQUE (path);


--
-- Name: upload_folders upload_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders
    ADD CONSTRAINT upload_folders_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_role_lnk users_role_lnk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_role_lnk
    ADD CONSTRAINT users_role_lnk_pkey PRIMARY KEY (id);


--
-- Name: users_role_lnk users_role_lnk_uq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_role_lnk
    ADD CONSTRAINT users_role_lnk_uq UNIQUE (user_id, role_id);


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
-- Name: admin_permissions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_created_by_id_fk ON public.admin_permissions USING btree (created_by_id);


--
-- Name: admin_permissions_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_documents_idx ON public.admin_permissions USING btree (document_id, locale, published_at);


--
-- Name: admin_permissions_role_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_role_lnk_fk ON public.admin_permissions_role_lnk USING btree (permission_id);


--
-- Name: admin_permissions_role_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_role_lnk_ifk ON public.admin_permissions_role_lnk USING btree (role_id);


--
-- Name: admin_permissions_role_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_role_lnk_oifk ON public.admin_permissions_role_lnk USING btree (permission_ord);


--
-- Name: admin_permissions_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_permissions_updated_by_id_fk ON public.admin_permissions USING btree (updated_by_id);


--
-- Name: admin_roles_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_roles_created_by_id_fk ON public.admin_roles USING btree (created_by_id);


--
-- Name: admin_roles_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_roles_documents_idx ON public.admin_roles USING btree (document_id, locale, published_at);


--
-- Name: admin_roles_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_roles_updated_by_id_fk ON public.admin_roles USING btree (updated_by_id);


--
-- Name: admin_users_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_created_by_id_fk ON public.admin_users USING btree (created_by_id);


--
-- Name: admin_users_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_documents_idx ON public.admin_users USING btree (document_id, locale, published_at);


--
-- Name: admin_users_roles_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_roles_lnk_fk ON public.admin_users_roles_lnk USING btree (user_id);


--
-- Name: admin_users_roles_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_roles_lnk_ifk ON public.admin_users_roles_lnk USING btree (role_id);


--
-- Name: admin_users_roles_lnk_ofk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_roles_lnk_ofk ON public.admin_users_roles_lnk USING btree (role_ord);


--
-- Name: admin_users_roles_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_roles_lnk_oifk ON public.admin_users_roles_lnk USING btree (user_ord);


--
-- Name: admin_users_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_updated_by_id_fk ON public.admin_users USING btree (updated_by_id);


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
-- Name: files_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_created_by_id_fk ON public.files USING btree (created_by_id);


--
-- Name: files_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_documents_idx ON public.files USING btree (document_id, locale, published_at);


--
-- Name: files_folder_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_folder_lnk_fk ON public.files_folder_lnk USING btree (file_id);


--
-- Name: files_folder_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_folder_lnk_ifk ON public.files_folder_lnk USING btree (folder_id);


--
-- Name: files_folder_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_folder_lnk_oifk ON public.files_folder_lnk USING btree (file_ord);


--
-- Name: files_related_mph_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_related_mph_fk ON public.files_related_mph USING btree (file_id);


--
-- Name: files_related_mph_idix; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_related_mph_idix ON public.files_related_mph USING btree (related_id);


--
-- Name: files_related_mph_oidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_related_mph_oidx ON public.files_related_mph USING btree ("order");


--
-- Name: files_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_updated_by_id_fk ON public.files USING btree (updated_by_id);


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
-- Name: i18n_locale_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX i18n_locale_created_by_id_fk ON public.i18n_locale USING btree (created_by_id);


--
-- Name: i18n_locale_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX i18n_locale_documents_idx ON public.i18n_locale USING btree (document_id, locale, published_at);


--
-- Name: i18n_locale_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX i18n_locale_updated_by_id_fk ON public.i18n_locale USING btree (updated_by_id);


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
-- Name: pruebas_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pruebas_created_by_id_fk ON public.pruebas USING btree (created_by_id);


--
-- Name: pruebas_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pruebas_documents_idx ON public.pruebas USING btree (document_id, locale, published_at);


--
-- Name: pruebas_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pruebas_updated_by_id_fk ON public.pruebas USING btree (updated_by_id);


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
-- Name: strapi_api_token_permissions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_created_by_id_fk ON public.strapi_api_token_permissions USING btree (created_by_id);


--
-- Name: strapi_api_token_permissions_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_documents_idx ON public.strapi_api_token_permissions USING btree (document_id, locale, published_at);


--
-- Name: strapi_api_token_permissions_token_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_token_lnk_fk ON public.strapi_api_token_permissions_token_lnk USING btree (api_token_permission_id);


--
-- Name: strapi_api_token_permissions_token_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_token_lnk_ifk ON public.strapi_api_token_permissions_token_lnk USING btree (api_token_id);


--
-- Name: strapi_api_token_permissions_token_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_token_lnk_oifk ON public.strapi_api_token_permissions_token_lnk USING btree (api_token_permission_ord);


--
-- Name: strapi_api_token_permissions_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_token_permissions_updated_by_id_fk ON public.strapi_api_token_permissions USING btree (updated_by_id);


--
-- Name: strapi_api_tokens_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_tokens_created_by_id_fk ON public.strapi_api_tokens USING btree (created_by_id);


--
-- Name: strapi_api_tokens_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_tokens_documents_idx ON public.strapi_api_tokens USING btree (document_id, locale, published_at);


--
-- Name: strapi_api_tokens_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_api_tokens_updated_by_id_fk ON public.strapi_api_tokens USING btree (updated_by_id);


--
-- Name: strapi_history_versions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_history_versions_created_by_id_fk ON public.strapi_history_versions USING btree (created_by_id);


--
-- Name: strapi_release_actions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_created_by_id_fk ON public.strapi_release_actions USING btree (created_by_id);


--
-- Name: strapi_release_actions_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_documents_idx ON public.strapi_release_actions USING btree (document_id, locale, published_at);


--
-- Name: strapi_release_actions_release_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_release_lnk_fk ON public.strapi_release_actions_release_lnk USING btree (release_action_id);


--
-- Name: strapi_release_actions_release_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_release_lnk_ifk ON public.strapi_release_actions_release_lnk USING btree (release_id);


--
-- Name: strapi_release_actions_release_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_release_lnk_oifk ON public.strapi_release_actions_release_lnk USING btree (release_action_ord);


--
-- Name: strapi_release_actions_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_release_actions_updated_by_id_fk ON public.strapi_release_actions USING btree (updated_by_id);


--
-- Name: strapi_releases_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_releases_created_by_id_fk ON public.strapi_releases USING btree (created_by_id);


--
-- Name: strapi_releases_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_releases_documents_idx ON public.strapi_releases USING btree (document_id, locale, published_at);


--
-- Name: strapi_releases_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_releases_updated_by_id_fk ON public.strapi_releases USING btree (updated_by_id);


--
-- Name: strapi_transfer_token_permissions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_created_by_id_fk ON public.strapi_transfer_token_permissions USING btree (created_by_id);


--
-- Name: strapi_transfer_token_permissions_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_documents_idx ON public.strapi_transfer_token_permissions USING btree (document_id, locale, published_at);


--
-- Name: strapi_transfer_token_permissions_token_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_token_lnk_fk ON public.strapi_transfer_token_permissions_token_lnk USING btree (transfer_token_permission_id);


--
-- Name: strapi_transfer_token_permissions_token_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_token_lnk_ifk ON public.strapi_transfer_token_permissions_token_lnk USING btree (transfer_token_id);


--
-- Name: strapi_transfer_token_permissions_token_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_token_lnk_oifk ON public.strapi_transfer_token_permissions_token_lnk USING btree (transfer_token_permission_ord);


--
-- Name: strapi_transfer_token_permissions_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_token_permissions_updated_by_id_fk ON public.strapi_transfer_token_permissions USING btree (updated_by_id);


--
-- Name: strapi_transfer_tokens_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_tokens_created_by_id_fk ON public.strapi_transfer_tokens USING btree (created_by_id);


--
-- Name: strapi_transfer_tokens_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_tokens_documents_idx ON public.strapi_transfer_tokens USING btree (document_id, locale, published_at);


--
-- Name: strapi_transfer_tokens_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_transfer_tokens_updated_by_id_fk ON public.strapi_transfer_tokens USING btree (updated_by_id);


--
-- Name: strapi_workflows_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_created_by_id_fk ON public.strapi_workflows USING btree (created_by_id);


--
-- Name: strapi_workflows_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_documents_idx ON public.strapi_workflows USING btree (document_id, locale, published_at);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stage_required_to_publish_lnk_fk ON public.strapi_workflows_stage_required_to_publish_lnk USING btree (workflow_id);


--
-- Name: strapi_workflows_stage_required_to_publish_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stage_required_to_publish_lnk_ifk ON public.strapi_workflows_stage_required_to_publish_lnk USING btree (workflow_stage_id);


--
-- Name: strapi_workflows_stages_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_created_by_id_fk ON public.strapi_workflows_stages USING btree (created_by_id);


--
-- Name: strapi_workflows_stages_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_documents_idx ON public.strapi_workflows_stages USING btree (document_id, locale, published_at);


--
-- Name: strapi_workflows_stages_permissions_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_permissions_lnk_fk ON public.strapi_workflows_stages_permissions_lnk USING btree (workflow_stage_id);


--
-- Name: strapi_workflows_stages_permissions_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_permissions_lnk_ifk ON public.strapi_workflows_stages_permissions_lnk USING btree (permission_id);


--
-- Name: strapi_workflows_stages_permissions_lnk_ofk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_permissions_lnk_ofk ON public.strapi_workflows_stages_permissions_lnk USING btree (permission_ord);


--
-- Name: strapi_workflows_stages_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_updated_by_id_fk ON public.strapi_workflows_stages USING btree (updated_by_id);


--
-- Name: strapi_workflows_stages_workflow_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_workflow_lnk_fk ON public.strapi_workflows_stages_workflow_lnk USING btree (workflow_stage_id);


--
-- Name: strapi_workflows_stages_workflow_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_workflow_lnk_ifk ON public.strapi_workflows_stages_workflow_lnk USING btree (workflow_id);


--
-- Name: strapi_workflows_stages_workflow_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_stages_workflow_lnk_oifk ON public.strapi_workflows_stages_workflow_lnk USING btree (workflow_stage_ord);


--
-- Name: strapi_workflows_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX strapi_workflows_updated_by_id_fk ON public.strapi_workflows USING btree (updated_by_id);


--
-- Name: up_permissions_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_created_by_id_fk ON public.up_permissions USING btree (created_by_id);


--
-- Name: up_permissions_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_documents_idx ON public.up_permissions USING btree (document_id, locale, published_at);


--
-- Name: up_permissions_role_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_role_lnk_fk ON public.up_permissions_role_lnk USING btree (permission_id);


--
-- Name: up_permissions_role_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_role_lnk_ifk ON public.up_permissions_role_lnk USING btree (role_id);


--
-- Name: up_permissions_role_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_role_lnk_oifk ON public.up_permissions_role_lnk USING btree (permission_ord);


--
-- Name: up_permissions_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_permissions_updated_by_id_fk ON public.up_permissions USING btree (updated_by_id);


--
-- Name: up_roles_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_roles_created_by_id_fk ON public.up_roles USING btree (created_by_id);


--
-- Name: up_roles_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_roles_documents_idx ON public.up_roles USING btree (document_id, locale, published_at);


--
-- Name: up_roles_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX up_roles_updated_by_id_fk ON public.up_roles USING btree (updated_by_id);


--
-- Name: upload_files_created_at_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_created_at_index ON public.files USING btree (created_at);


--
-- Name: upload_files_ext_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_ext_index ON public.files USING btree (ext);


--
-- Name: upload_files_folder_path_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_folder_path_index ON public.files USING btree (folder_path);


--
-- Name: upload_files_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_name_index ON public.files USING btree (name);


--
-- Name: upload_files_size_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_size_index ON public.files USING btree (size);


--
-- Name: upload_files_updated_at_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_files_updated_at_index ON public.files USING btree (updated_at);


--
-- Name: upload_folders_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_created_by_id_fk ON public.upload_folders USING btree (created_by_id);


--
-- Name: upload_folders_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_documents_idx ON public.upload_folders USING btree (document_id, locale, published_at);


--
-- Name: upload_folders_parent_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_parent_lnk_fk ON public.upload_folders_parent_lnk USING btree (folder_id);


--
-- Name: upload_folders_parent_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_parent_lnk_ifk ON public.upload_folders_parent_lnk USING btree (inv_folder_id);


--
-- Name: upload_folders_parent_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_parent_lnk_oifk ON public.upload_folders_parent_lnk USING btree (folder_ord);


--
-- Name: upload_folders_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX upload_folders_updated_by_id_fk ON public.upload_folders USING btree (updated_by_id);


--
-- Name: users_created_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_created_by_id_fk ON public.users USING btree (created_by_id);


--
-- Name: users_documents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_documents_idx ON public.users USING btree (document_id, locale, published_at);


--
-- Name: users_role_lnk_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_lnk_fk ON public.users_role_lnk USING btree (user_id);


--
-- Name: users_role_lnk_ifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_lnk_ifk ON public.users_role_lnk USING btree (role_id);


--
-- Name: users_role_lnk_oifk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_lnk_oifk ON public.users_role_lnk USING btree (user_ord);


--
-- Name: users_updated_by_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_updated_by_id_fk ON public.users USING btree (updated_by_id);


--
-- Name: act-economicas act-economicas_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."act-economicas"
    ADD CONSTRAINT "act-economicas_created_by_id_fk" FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: act-economicas act-economicas_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."act-economicas"
    ADD CONSTRAINT "act-economicas_updated_by_id_fk" FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: admin_permissions admin_permissions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: admin_permissions_role_lnk admin_permissions_role_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions_role_lnk
    ADD CONSTRAINT admin_permissions_role_lnk_fk FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE CASCADE;


--
-- Name: admin_permissions_role_lnk admin_permissions_role_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions_role_lnk
    ADD CONSTRAINT admin_permissions_role_lnk_ifk FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: admin_permissions admin_permissions_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: admin_roles admin_roles_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: admin_roles admin_roles_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: admin_users admin_users_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: admin_users_roles_lnk admin_users_roles_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users_roles_lnk
    ADD CONSTRAINT admin_users_roles_lnk_fk FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: admin_users_roles_lnk admin_users_roles_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users_roles_lnk
    ADD CONSTRAINT admin_users_roles_lnk_ifk FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: admin_users admin_users_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: calendarios calendarios_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: calendarios calendarios_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendarios
    ADD CONSTRAINT calendarios_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: carreras carreras_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: carreras carreras_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carreras
    ADD CONSTRAINT carreras_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: dato_general dato_general_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dato_general
    ADD CONSTRAINT dato_general_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: dato_general dato_general_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dato_general
    ADD CONSTRAINT dato_general_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: especialidades especialidades_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: especialidades especialidades_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: familias familias_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT familias_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: familias familias_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT familias_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: files files_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: files_folder_lnk files_folder_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_folder_lnk
    ADD CONSTRAINT files_folder_lnk_fk FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: files_folder_lnk files_folder_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_folder_lnk
    ADD CONSTRAINT files_folder_lnk_ifk FOREIGN KEY (folder_id) REFERENCES public.upload_folders(id) ON DELETE CASCADE;


--
-- Name: files_related_mph files_related_mph_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files_related_mph
    ADD CONSTRAINT files_related_mph_fk FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: files files_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: grupos grupos_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: grupos grupos_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: i18n_locale i18n_locale_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_locale
    ADD CONSTRAINT i18n_locale_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: i18n_locale i18n_locale_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_locale
    ADD CONSTRAINT i18n_locale_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: matriculas matriculas_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: matriculas matriculas_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: modulos modulos_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: modulos_cmps modulos_entity_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos_cmps
    ADD CONSTRAINT modulos_entity_fk FOREIGN KEY (entity_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- Name: modulos modulos_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: paquetes paquetes_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: paquetes paquetes_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: personales personales_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales
    ADD CONSTRAINT personales_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: personales personales_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personales
    ADD CONSTRAINT personales_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: pruebas pruebas_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pruebas
    ADD CONSTRAINT pruebas_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: pruebas pruebas_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pruebas
    ADD CONSTRAINT pruebas_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: publicaciones publicaciones_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones
    ADD CONSTRAINT publicaciones_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: publicaciones_cmps publicaciones_entity_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones_cmps
    ADD CONSTRAINT publicaciones_entity_fk FOREIGN KEY (entity_id) REFERENCES public.publicaciones(id) ON DELETE CASCADE;


--
-- Name: publicaciones publicaciones_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicaciones
    ADD CONSTRAINT publicaciones_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: sectores sectores_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: sectores sectores_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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
-- Name: semestres semestres_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


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


--
-- Name: semestres semestres_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semestres
    ADD CONSTRAINT semestres_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_api_token_permissions strapi_api_token_permissions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions
    ADD CONSTRAINT strapi_api_token_permissions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_api_token_permissions_token_lnk strapi_api_token_permissions_token_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions_token_lnk
    ADD CONSTRAINT strapi_api_token_permissions_token_lnk_fk FOREIGN KEY (api_token_permission_id) REFERENCES public.strapi_api_token_permissions(id) ON DELETE CASCADE;


--
-- Name: strapi_api_token_permissions_token_lnk strapi_api_token_permissions_token_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions_token_lnk
    ADD CONSTRAINT strapi_api_token_permissions_token_lnk_ifk FOREIGN KEY (api_token_id) REFERENCES public.strapi_api_tokens(id) ON DELETE CASCADE;


--
-- Name: strapi_api_token_permissions strapi_api_token_permissions_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_token_permissions
    ADD CONSTRAINT strapi_api_token_permissions_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_api_tokens strapi_api_tokens_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_tokens
    ADD CONSTRAINT strapi_api_tokens_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_api_tokens strapi_api_tokens_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_api_tokens
    ADD CONSTRAINT strapi_api_tokens_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_history_versions strapi_history_versions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_history_versions
    ADD CONSTRAINT strapi_history_versions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_release_actions strapi_release_actions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions
    ADD CONSTRAINT strapi_release_actions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_release_actions_release_lnk strapi_release_actions_release_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions_release_lnk
    ADD CONSTRAINT strapi_release_actions_release_lnk_fk FOREIGN KEY (release_action_id) REFERENCES public.strapi_release_actions(id) ON DELETE CASCADE;


--
-- Name: strapi_release_actions_release_lnk strapi_release_actions_release_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions_release_lnk
    ADD CONSTRAINT strapi_release_actions_release_lnk_ifk FOREIGN KEY (release_id) REFERENCES public.strapi_releases(id) ON DELETE CASCADE;


--
-- Name: strapi_release_actions strapi_release_actions_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_release_actions
    ADD CONSTRAINT strapi_release_actions_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_releases strapi_releases_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_releases
    ADD CONSTRAINT strapi_releases_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_releases strapi_releases_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_releases
    ADD CONSTRAINT strapi_releases_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_transfer_token_permissions strapi_transfer_token_permissions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions
    ADD CONSTRAINT strapi_transfer_token_permissions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_transfer_token_permissions_token_lnk strapi_transfer_token_permissions_token_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions_token_lnk
    ADD CONSTRAINT strapi_transfer_token_permissions_token_lnk_fk FOREIGN KEY (transfer_token_permission_id) REFERENCES public.strapi_transfer_token_permissions(id) ON DELETE CASCADE;


--
-- Name: strapi_transfer_token_permissions_token_lnk strapi_transfer_token_permissions_token_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions_token_lnk
    ADD CONSTRAINT strapi_transfer_token_permissions_token_lnk_ifk FOREIGN KEY (transfer_token_id) REFERENCES public.strapi_transfer_tokens(id) ON DELETE CASCADE;


--
-- Name: strapi_transfer_token_permissions strapi_transfer_token_permissions_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_token_permissions
    ADD CONSTRAINT strapi_transfer_token_permissions_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_transfer_tokens strapi_transfer_tokens_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_tokens
    ADD CONSTRAINT strapi_transfer_tokens_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_transfer_tokens strapi_transfer_tokens_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_transfer_tokens
    ADD CONSTRAINT strapi_transfer_tokens_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_workflows strapi_workflows_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows
    ADD CONSTRAINT strapi_workflows_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_workflows_stage_required_to_publish_lnk strapi_workflows_stage_required_to_publish_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stage_required_to_publish_lnk
    ADD CONSTRAINT strapi_workflows_stage_required_to_publish_lnk_fk FOREIGN KEY (workflow_id) REFERENCES public.strapi_workflows(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows_stage_required_to_publish_lnk strapi_workflows_stage_required_to_publish_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stage_required_to_publish_lnk
    ADD CONSTRAINT strapi_workflows_stage_required_to_publish_lnk_ifk FOREIGN KEY (workflow_stage_id) REFERENCES public.strapi_workflows_stages(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows_stages strapi_workflows_stages_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages
    ADD CONSTRAINT strapi_workflows_stages_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_workflows_stages_permissions_lnk strapi_workflows_stages_permissions_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_permissions_lnk
    ADD CONSTRAINT strapi_workflows_stages_permissions_lnk_fk FOREIGN KEY (workflow_stage_id) REFERENCES public.strapi_workflows_stages(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows_stages_permissions_lnk strapi_workflows_stages_permissions_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_permissions_lnk
    ADD CONSTRAINT strapi_workflows_stages_permissions_lnk_ifk FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows_stages strapi_workflows_stages_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages
    ADD CONSTRAINT strapi_workflows_stages_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: strapi_workflows_stages_workflow_lnk strapi_workflows_stages_workflow_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_workflow_lnk
    ADD CONSTRAINT strapi_workflows_stages_workflow_lnk_fk FOREIGN KEY (workflow_stage_id) REFERENCES public.strapi_workflows_stages(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows_stages_workflow_lnk strapi_workflows_stages_workflow_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows_stages_workflow_lnk
    ADD CONSTRAINT strapi_workflows_stages_workflow_lnk_ifk FOREIGN KEY (workflow_id) REFERENCES public.strapi_workflows(id) ON DELETE CASCADE;


--
-- Name: strapi_workflows strapi_workflows_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strapi_workflows
    ADD CONSTRAINT strapi_workflows_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: up_permissions up_permissions_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions
    ADD CONSTRAINT up_permissions_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: up_permissions_role_lnk up_permissions_role_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions_role_lnk
    ADD CONSTRAINT up_permissions_role_lnk_fk FOREIGN KEY (permission_id) REFERENCES public.up_permissions(id) ON DELETE CASCADE;


--
-- Name: up_permissions_role_lnk up_permissions_role_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions_role_lnk
    ADD CONSTRAINT up_permissions_role_lnk_ifk FOREIGN KEY (role_id) REFERENCES public.up_roles(id) ON DELETE CASCADE;


--
-- Name: up_permissions up_permissions_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_permissions
    ADD CONSTRAINT up_permissions_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: up_roles up_roles_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_roles
    ADD CONSTRAINT up_roles_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: up_roles up_roles_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.up_roles
    ADD CONSTRAINT up_roles_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: upload_folders upload_folders_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders
    ADD CONSTRAINT upload_folders_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: upload_folders_parent_lnk upload_folders_parent_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders_parent_lnk
    ADD CONSTRAINT upload_folders_parent_lnk_fk FOREIGN KEY (folder_id) REFERENCES public.upload_folders(id) ON DELETE CASCADE;


--
-- Name: upload_folders_parent_lnk upload_folders_parent_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders_parent_lnk
    ADD CONSTRAINT upload_folders_parent_lnk_ifk FOREIGN KEY (inv_folder_id) REFERENCES public.upload_folders(id) ON DELETE CASCADE;


--
-- Name: upload_folders upload_folders_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_folders
    ADD CONSTRAINT upload_folders_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: users users_created_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: users_role_lnk users_role_lnk_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_role_lnk
    ADD CONSTRAINT users_role_lnk_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users_role_lnk users_role_lnk_ifk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_role_lnk
    ADD CONSTRAINT users_role_lnk_ifk FOREIGN KEY (role_id) REFERENCES public.up_roles(id) ON DELETE CASCADE;


--
-- Name: users users_updated_by_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

