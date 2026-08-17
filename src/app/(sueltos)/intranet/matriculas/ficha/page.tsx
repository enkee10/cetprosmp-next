'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, GlobalStyles } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSearchParams } from 'next/navigation';
import { app } from '@/lib/firebase';
import { formatDateOnly, formatDateTimeInAppTimeZone, getDateOnlyLocalDate } from '@/lib/dateOnly';
import { useAppSettings } from '@/hooks/useAppSettings';
import PrintDocumentViewer, {
  cmToMm,
  getA4PageSizeMm,
  getPrintContentHeightMm,
  getPrintContentWidthMm,
  type PrintMarginsCm,
  type PrintOrientation,
} from '@/components/print/PrintDocumentViewer';
import { EditorImagenesModal } from '@/components/intranet/editor-documentos/EditorDocumentosClient';

type DocumentoSide = 'frente' | 'reverso';

type MatriculaFichaUser = {
  id?: number | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  celular?: string | null;
  telefono?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
  avatar?: string | null;
  avatarMediano?: string | null;
  dniImagenFrenteUrl?: string | null;
  dniImagenReversoUrl?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  instruccion?: string | null;
  estadoCivil?: string | null;
  nombreColegio?: string | null;
};

type MatriculaFichaUnidad = {
  id: number;
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  orden?: number | null;
};

type MatriculaFichaPersonal = {
  id?: number | null;
  displayName?: string | null;
  user?: {
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
  } | null;
};

type MatriculaFichaActor = {
  id?: number | null;
  username?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
};

type MatriculaFichaModuloLink = {
  id?: number | null;
  grupoModuloId?: number | null;
  moduloId?: number | null;
  grupoModulo?: {
    id?: number | null;
    nombre?: string | null;
    inicio?: string | null;
    fin?: string | null;
    grupo?: {
      nombreDisplay?: string | null;
      turnoNombre?: string | null;
      semestre?: { titulo?: string | null; inicio?: string | null; fin?: string | null } | null;
      turno?: { nombre?: string | null } | null;
    } | null;
    modulo?: {
      id?: number | null;
      titulo?: string | null;
      tituloComercial?: string | null;
      horas?: number | null;
      creditos?: number | null;
      duracionEfsrt?: number | null;
      creditosEfsrt?: number | null;
      plan?: {
        planEstudio?: string | null;
        carrera?: {
          nombre?: string | null;
          titulo?: string | null;
          nivel?: string | null;
          ciclo?: string | null;
          tipoCarrera?: { nombre?: string | null } | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

type MatriculaFichaCambioModulo = {
  id?: number | null;
  fechaCambio?: string | null;
  grupoModuloAnterior?: {
    id?: number | null;
    nombre?: string | null;
  } | null;
  grupoModuloNuevo?: {
    id?: number | null;
    nombre?: string | null;
  } | null;
  grupoAnterior?: {
    id?: number | null;
    nombreDisplay?: string | null;
  } | null;
  grupoNuevo?: {
    id?: number | null;
    nombreDisplay?: string | null;
  } | null;
  moduloAnterior?: {
    id?: number | null;
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
  moduloNuevo?: {
    id?: number | null;
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
  semestre?: {
    id?: number | null;
    titulo?: string | null;
  } | null;
  registradoPor?: MatriculaFichaActor | null;
};

type MatriculaFicha = {
  id: number;
  fecha?: string | null;
  fechaActualizacion?: string | null;
  recibo?: string | null;
  codigoInscripcion?: string | null;
  user?: MatriculaFichaUser | null;
  responsable?: MatriculaFichaPersonal | null;
  responsableUser?: MatriculaFichaActor | null;
  semestre?: {
    id?: number | null;
    titulo?: string | null;
    inicio?: string | null;
    fin?: string | null;
    director?: MatriculaFichaPersonal | null;
  } | null;
  fichaUnidadesDidacticas?: MatriculaFichaUnidad[];
  modulosEstudiantes?: MatriculaFichaModuloLink[];
  cambiosModulo?: MatriculaFichaCambioModulo[];
};

type FichaModuloTimelineRow = {
  marker: '*' | '<-';
  name: string;
  details: string;
};

const DEFAULT_MARGINS: PrintMarginsCm = {
  top: 0.5,
  bottom: 0.5,
  left: 0.5,
  right: 0.5,
};

const MODULAR_MARGINS: PrintMarginsCm = {
  top: 1,
  bottom: 1,
  left: 1,
  right: 1,
};

const normalizeText = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const asValue = (value: string | number | null | undefined, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const asUpper = (value: string | number | null | undefined) => asValue(value).toLocaleUpperCase('es-PE');

const asTitleCase = (value: string | null | undefined) =>
  asValue(value)
    .toLocaleLowerCase('es-PE')
    .replace(/(^|\s)(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase('es-PE')}`);

const getPreviousModuloChangeName = (change: MatriculaFichaCambioModulo) =>
  asValue(change.grupoModuloAnterior?.nombre)
  || asValue(change.grupoAnterior?.nombreDisplay)
  || asValue(change.moduloAnterior?.titulo)
  || asValue(change.moduloAnterior?.tituloComercial);

const getNewModuloChangeName = (change: MatriculaFichaCambioModulo) =>
  asValue(change.grupoModuloNuevo?.nombre)
  || asValue(change.grupoNuevo?.nombreDisplay)
  || asValue(change.moduloNuevo?.titulo)
  || asValue(change.moduloNuevo?.tituloComercial);

const asDate = (value: string | null | undefined) => formatDateOnly(value) || '';

const asDateTime = (value: string | null | undefined) => {
  return formatDateTimeInAppTimeZone(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatFichaActorName = (actor: MatriculaFichaActor | null | undefined) =>
  asValue(actor?.username)
  || [actor?.apellidoPaterno, actor?.apellidoMaterno, actor?.nombre].filter(Boolean).join(' ').trim()
  || asValue(actor?.correoInstitucional)
  || asValue(actor?.email);

const formatFichaPersonalActorName = (
  responsable: MatriculaFichaPersonal | null | undefined,
  responsableUser: MatriculaFichaActor | null | undefined,
) =>
  getFichaPersonalName(responsable)
  || formatFichaActorName(responsableUser);

const formatModuloTimelineDetails = (date: string | null | undefined, actorName: string, dateLabel = 'Fecha de cambio') =>
  [
    date ? `${dateLabel}: ${asDateTime(date) || asDate(date)}` : '',
    actorName ? `Registrado por: ${actorName}` : '',
  ].filter(Boolean).join(' · ');

const asDateRange = (inicio: string | null | undefined, fin: string | null | undefined) => {
  const start = asDate(inicio);
  const end = asDate(fin);
  if (start && end) return `${start} al ${end}`;
  return start || end || '';
};

const isProgramaModulo = (item: MatriculaFichaModuloLink) => {
  const tipo = item.grupoModulo?.modulo?.plan?.carrera?.tipoCarrera?.nombre;
  const normalizedTipo = normalizeText(tipo);
  if (normalizedTipo) return normalizedTipo.includes('programa');

  const planEstudio = normalizeText(item.grupoModulo?.modulo?.plan?.planEstudio);
  return planEstudio.includes('plan') || planEstudio.includes('programa');
};

const getProgramaModulo = (matricula: MatriculaFicha | null) => {
  const links = matricula?.modulosEstudiantes || [];
  const explicitPrograma = links.find(isProgramaModulo);
  return explicitPrograma ?? links[0] ?? null;
};

const getPeriodoLectivo = (matricula: MatriculaFicha | null) => {
  const semestreTitle = asValue(matricula?.semestre?.titulo);
  const yearFromSemestre = semestreTitle.match(/\d{4}/)?.[0];
  const yearFromDate = asValue(matricula?.fecha).match(/\d{4}/)?.[0];
  return yearFromSemestre || yearFromDate || String(new Date().getFullYear());
};

const getSemestreShortLabel = (value: string | null | undefined) => {
  const text = asValue(value);
  const match = text.match(/(\d{2,4}-\d+)/);
  if (!match) return text.slice(-4);
  const [year, period] = match[1].split('-');
  return `${year.slice(-2)}-${period}`;
};

const getTurnoValue = (link: MatriculaFichaModuloLink | null | undefined) => {
  const turno = normalizeText(link?.grupoModulo?.grupo?.turno?.nombre || link?.grupoModulo?.grupo?.turnoNombre);
  if (turno.includes('manana') || turno === 'm') return 'M';
  if (turno.includes('tarde') || turno === 't') return 'T';
  if (turno.includes('noche') || turno === 'n') return 'N';
  return '';
};

const getAge = (value: string | null | undefined, reference: string | null | undefined) => {
  const birth = getDateOnlyLocalDate(value);
  const date = getDateOnlyLocalDate(reference) ?? new Date();
  if (!birth) return '';

  let age = date.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    date.getMonth() < birth.getMonth() ||
    (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? String(age) : '';
};

const normalizeDocumento = (value: string | null | undefined) => {
  const normalized = normalizeText(value).replace(/[.\s-]/g, '');
  if (normalized.includes('extranjeria') || normalized === 'ce' || normalized === 'carnet') return 'CE';
  return 'DNI';
};

const getSexoValue = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (normalized === 'h' || normalized === 'm' || normalized.includes('masculino') || normalized.includes('hombre')) {
    return 'H';
  }
  if (normalized === 'f' || normalized.includes('femenino') || normalized.includes('mujer')) {
    return 'M';
  }
  return '';
};

const getTipoMatricula = (recibo: string | null | undefined) => {
  const normalized = normalizeText(recibo);
  if (normalized === 'conadis') return 'CONADIS';
  return asValue(recibo) ? 'REGULAR' : '';
};

const formatCodigoInscripcionFicha = (
  codigoInscripcion: string | null | undefined,
  recibo: string | null | undefined,
) => {
  const codigo = asValue(codigoInscripcion);
  const numeroRecibo = asValue(recibo);
  if (codigo && numeroRecibo) return `${codigo} - ${numeroRecibo}`;
  if (codigo) return `${codigo} - `;
  return codigo || numeroRecibo;
};

const getFichaPersonalName = (personal: MatriculaFichaPersonal | null | undefined) => {
  if (!personal) return '';
  const user = personal.user;
  const nombres = asTitleCase(user?.nombre);
  const apellidos = [user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).map((item) => asUpper(item)).join(' ').trim();
  const formattedName = [nombres, apellidos].filter(Boolean).join(' ').trim();
  if (formattedName) return formattedName;

  return (
    asValue(personal.displayName)
    || [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre].filter(Boolean).join(' ').trim()
    || asValue(user?.username)
  );
};

const getHorarioFromGrupoModuloName = (value: string | null | undefined) => {
  const text = asValue(value);
  const afterTurno = text.includes(']') ? text.slice(text.indexOf(']') + 1) : text;
  return afterTurno.replace(/\([^)]*\)\s*$/, '').trim();
};

function RadioMark({ checked = false }: { checked?: boolean }) {
  return <span className={checked ? 'radio-mark checked' : 'radio-mark'} />;
}

type ModularTemplateProps = {
  contentWidthMm: number;
  contentHeightMm: number;
  scalePercent: number;
  periodoLectivo: string;
  codigoInscripcion: string;
  avatar: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  sexoValue: string;
  edad: string;
  fechaNacimiento: string;
  estadoCivil: string;
  instruccion: string;
  documentoValue: string;
  documentoNumero: string;
  domicilio: string;
  distrito: string;
  colegio: string;
  telefono: string;
  correo: string;
  ciclo: string;
  opcionOcupacional: string;
  modulo: string;
  horario: string;
  duracion: string;
  inicio: string;
  termino: string;
  fechaMatricula: string;
  cambiosModuloText?: string;
};

function FichaMatriculaModularTemplate({
  contentWidthMm,
  contentHeightMm,
  scalePercent,
  periodoLectivo,
  codigoInscripcion,
  avatar,
  apellidoPaterno,
  apellidoMaterno,
  nombres,
  sexoValue,
  edad,
  fechaNacimiento,
  estadoCivil,
  instruccion,
  documentoValue,
  documentoNumero,
  domicilio,
  distrito,
  colegio,
  telefono,
  correo,
  ciclo,
  opcionOcupacional,
  modulo,
  horario,
  duracion,
  inicio,
  termino,
  fechaMatricula,
  cambiosModuloText = '',
}: ModularTemplateProps) {
  return (
    <Box className="print-page">
      <Box
        className="print-page-inner"
        sx={{
          transform: `scale(${scalePercent / 100})`,
          transformOrigin: 'top left',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
        }}
      >
        <Box
          className="ficha-modular-template"
          sx={{
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#111',
            fontSize: '8.2pt',
            lineHeight: 1.08,
            boxSizing: 'border-box',
            overflow: 'hidden',
            '& table': { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' },
            '& td, & th': { border: '0.85px solid #333', padding: '1.1mm 1.5mm', verticalAlign: 'middle' },
            '& .outer': { border: '1.5px double #333' },
            '& .label': { fontWeight: 800, textTransform: 'uppercase' },
            '& .value': { fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' },
            '& .center': { textAlign: 'center' },
            '& .section': { fontWeight: 900, textTransform: 'uppercase', height: '7mm' },
            '& .thin td': { height: '7mm' },
            '& .student-data td': { height: '9mm' },
            '& .radio-mark': {
              display: 'inline-block',
              width: '3.8mm',
              height: '3.8mm',
              border: '0.85px solid #111',
              borderRadius: '50%',
              verticalAlign: '-0.9mm',
              marginRight: '1.4mm',
              position: 'relative',
              background: '#fff',
            },
            '& .radio-mark.checked::after': {
              content: '""',
              position: 'absolute',
              width: '2mm',
              height: '2mm',
              borderRadius: '50%',
              background: '#111',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            },
            '& .photo-box': {
              width: '27mm',
              height: '35mm',
              border: '0.85px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '12pt',
              marginLeft: 'auto',
              overflow: 'hidden',
              lineHeight: 0,
            },
            '& .photo-box img': {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block',
            },
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '45mm 1fr 31mm', alignItems: 'start', gap: '6mm' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box component="img" src="/media/reportes/logos/republica-peru.jpg" alt="Republica del Peru" sx={{ width: '25mm', height: '31mm', objectFit: 'contain' }} />
              <Box sx={{ fontWeight: 800, fontSize: '7.5pt', mt: '1mm' }}>MINISTERIO DE EDUCACION</Box>
            </Box>
            <Box sx={{ textAlign: 'center', pt: '8mm' }}>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 900, fontSize: '21pt', letterSpacing: '1.2px' }}>
                FICHA DE MATRICULA
              </Box>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 900, fontSize: '14pt', letterSpacing: '0.8px' }}>
                EDUCACION TECNICO - PRODUCTIVA
              </Box>
            </Box>
            <Box className="photo-box">
              {avatar ? <Box component="img" src={avatar} alt="Foto" /> : '\u00a0'}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '47mm 1fr', gap: '31mm', mt: '7mm', mb: '7mm' }}>
            <table className="outer">
              <tbody>
                <tr>
                  <td className="center label" style={{ width: '22mm' }}>AÑO</td>
                  <td className="center value">{periodoLectivo || '\u00a0'}</td>
                </tr>
              </tbody>
            </table>
            <table className="outer">
              <tbody>
                <tr>
                  <td className="center label" style={{ width: '52mm' }}>CODIGO DE INSCRIPCION</td>
                  <td className="center value">{codigoInscripcion || '\u00a0'}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          <table className="outer">
            <tbody>
              <tr className="thin">
                <td className="label" style={{ width: '21mm' }}>CETPRO</td>
                <td colSpan={5} className="value">SAN MARTIN DE PORRES</td>
              </tr>
              <tr className="thin">
                <td className="label">GESTION PUBLICA</td>
                <td className="value" style={{ width: '35mm' }}>X</td>
                <td className="label" style={{ width: '34mm' }}>GESTION PRIVADA</td>
                <td style={{ width: '32mm' }}>&nbsp;</td>
                <td className="label center" style={{ width: '31mm' }}>CONVENIO</td>
                <td>&nbsp;</td>
              </tr>
              <tr className="thin">
                <td className="label">REGION</td>
                <td className="value">LIMA</td>
                <td className="label">DRE</td>
                <td className="value">LIMA</td>
                <td className="label center">UGEL</td>
                <td className="value">02</td>
              </tr>
              <tr className="thin">
                <td className="label">PROVINCIA</td>
                <td className="value">LIMA</td>
                <td className="label">DISTRITO</td>
                <td colSpan={3} className="value">SAN MARTIN DE PORRES</td>
              </tr>
              <tr className="thin">
                <td className="label">LUGAR</td>
                <td className="value">URB. PALAO</td>
                <td className="label">DIRECCION (Av. Jr. Calle)</td>
                <td colSpan={2} className="value">JR. SANTA CLORINDA</td>
                <td className="value">N° 971</td>
              </tr>
            </tbody>
          </table>

          <table className="outer student-data" style={{ marginTop: '7mm' }}>
            <tbody>
              <tr>
                <td colSpan={8} className="section">DATOS DEL ESTUDIANTE</td>
              </tr>
              <tr>
                <td colSpan={2} className="center">Apellido Paterno</td>
                <td colSpan={2} className="center">Apellido Materno</td>
                <td colSpan={2} className="center">Nombres</td>
                <td colSpan={2} className="center">Sexo</td>
              </tr>
              <tr>
                <td colSpan={2} className="value">{apellidoPaterno || '\u00a0'}</td>
                <td colSpan={2} className="value">{apellidoMaterno || '\u00a0'}</td>
                <td colSpan={2} className="value">{nombres || '\u00a0'}</td>
                <td className="center label">H</td>
                <td className="center"><RadioMark checked={sexoValue === 'H'} /> M <RadioMark checked={sexoValue === 'M'} /></td>
              </tr>
              <tr>
                <td className="center label">Edad</td>
                <td colSpan={2} className="center label">Fecha de Nacimiento</td>
                <td className="center label">Estado Civil</td>
                <td colSpan={2} className="center label">Grado de Instruccion</td>
                <td colSpan={2} className="center label">Documento de Identidad</td>
              </tr>
              <tr>
                <td className="value">{edad || '\u00a0'}</td>
                <td colSpan={2} className="value">{fechaNacimiento || '\u00a0'}</td>
                <td className="value">{estadoCivil || '\u00a0'}</td>
                <td colSpan={2} className="value">{instruccion || '\u00a0'}</td>
                <td colSpan={2} className="value">({documentoValue}) N° {documentoNumero || '\u00a0'}</td>
              </tr>
              <tr>
                <td className="label">DOMICILIO</td>
                <td colSpan={7}>{domicilio || '\u00a0'}</td>
              </tr>
              <tr>
                <td className="label">PROVINCIA</td>
                <td colSpan={3} className="value">LIMA</td>
                <td className="label">DISTRITO</td>
                <td colSpan={3}>{distrito || '\u00a0'}</td>
              </tr>
              <tr>
                <td colSpan={3} className="center label">COLEGIO (Solo Escolares)</td>
                <td colSpan={2} className="center label">TELEFONO</td>
                <td colSpan={3} className="center label">CORREO ELECTRONICO</td>
              </tr>
              <tr>
                <td colSpan={3}>{colegio || '\u00a0'}</td>
                <td colSpan={2} className="center">{telefono || '\u00a0'}</td>
                <td colSpan={3}>{correo || '\u00a0'}</td>
              </tr>
            </tbody>
          </table>

          <table className="outer" style={{ marginTop: '7mm' }}>
            <tbody>
              <tr>
                <td colSpan={6} className="section">DATOS ACADEMICOS</td>
              </tr>
              <tr className="thin">
                <td className="label" style={{ width: '18mm' }}>Ciclo</td>
                <td className="value" style={{ width: '47mm' }}>{ciclo || '\u00a0'}</td>
                <td className="label" style={{ width: '48mm' }}>Especialidad / Opcion Ocupacional</td>
                <td colSpan={3}>{opcionOcupacional || '\u00a0'}</td>
              </tr>
              <tr className="thin">
                <td className="label">Modulo</td>
                <td colSpan={3}>{modulo || '\u00a0'}</td>
                <td className="label center" style={{ width: '22mm' }}>Horario</td>
                <td>{horario || '\u00a0'}</td>
              </tr>
              <tr className="thin">
                <td className="label">Duracion</td>
                <td>{duracion || '\u00a0'} Hs.</td>
                <td className="label center">Inicio</td>
                <td>{inicio || '\u00a0'}</td>
                <td className="label center">Termino</td>
                <td>{termino || '\u00a0'}</td>
              </tr>
            </tbody>
          </table>

          <Box sx={{ textAlign: 'right', fontSize: '7.2pt', mt: '2mm' }}>IMP. MED. TP-0121-2008</Box>
          <Box sx={{ mt: '11mm', fontSize: '9pt' }}>FECHA: {fechaMatricula || '........................................................'}</Box>

          <Box sx={{ mt: '19mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35mm', alignItems: 'start' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ borderTop: '0.85px solid #111', mx: '3mm', mb: '1.5mm' }} />
              <Box sx={{ fontWeight: 800 }}>ESTUDIANTE</Box>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ borderTop: '0.85px solid #111', mx: '3mm', mb: '1.5mm' }} />
              <Box sx={{ fontWeight: 800 }}>COORDINADOR(A)</Box>
              <Box sx={{ fontSize: '7.6pt' }}>(Firma, sello, post firma)</Box>
            </Box>
          </Box>
          <Box sx={{ mt: '23mm', display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center', width: '65mm' }}>
              <Box sx={{ borderTop: '0.85px solid #111', mb: '1.5mm' }} />
              <Box sx={{ fontWeight: 800 }}>DIRECTOR(A)</Box>
              <Box sx={{ fontSize: '7.6pt' }}>(Firma, sello, post firma)</Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function FichaMatriculaModularTemplateV2({
  contentWidthMm,
  contentHeightMm,
  scalePercent,
  periodoLectivo,
  codigoInscripcion,
  avatar,
  apellidoPaterno,
  apellidoMaterno,
  nombres,
  sexoValue,
  edad,
  fechaNacimiento,
  estadoCivil,
  instruccion,
  documentoValue,
  documentoNumero,
  domicilio,
  distrito,
  colegio,
  telefono,
  correo,
  ciclo,
  opcionOcupacional,
  modulo,
  horario,
  duracion,
  inicio,
  termino,
  fechaMatricula,
}: ModularTemplateProps) {
  const fechaDisplay = fechaMatricula || '';

  return (
    <Box className="print-page">
      <Box
        className="print-page-inner"
        sx={{
          transform: `scale(${scalePercent / 100})`,
          transformOrigin: 'top left',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
        }}
      >
        <Box
          className="ficha-modular-template-v2"
          sx={{
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '7.15pt',
            lineHeight: 1.02,
            '& .ficha-grid': {
              borderTop: '2.1px double #222',
              borderLeft: '2.1px double #222',
              borderRight: '1.25px solid #222',
              borderBottom: '1.25px solid #222',
              boxSizing: 'border-box',
            },
            '& .ficha-cell': {
              borderRight: '0.72px solid #222',
              borderBottom: '0.72px solid #222',
              boxSizing: 'border-box',
              padding: '0.65mm 1mm',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
            },
            '& .label': { fontWeight: 800 },
            '& .value': {
              fontWeight: 800,
              justifyContent: 'center',
              textAlign: 'center',
              textTransform: 'uppercase',
            },
            '& .heading-cell': { justifyContent: 'center', textAlign: 'center', fontWeight: 400 },
            '& .section-cell': { fontWeight: 800, textTransform: 'uppercase' },
            '& .radio-mark': {
              display: 'inline-block',
              flex: '0 0 auto',
              width: '3.5mm',
              height: '3.5mm',
              border: '0.72px solid #111',
              borderRadius: '50%',
              position: 'relative',
              background: '#fff',
            },
            '& .radio-mark.checked::after': {
              content: '""',
              position: 'absolute',
              width: '1.75mm',
              height: '1.75mm',
              borderRadius: '50%',
              background: '#111',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            },
            '& .modular-photo-box': {
              width: '25mm',
              height: '31mm',
              border: '0.72px solid #222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 'auto',
              fontSize: '11pt',
              fontWeight: 800,
              overflow: 'hidden',
              lineHeight: 0,
            },
            '& .modular-photo-box img': {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block',
            },
            '& .signature-line': {
              borderTop: '0.8px solid #111',
              height: 0,
              marginBottom: '1.4mm',
            },
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '45mm 1fr 28mm', columnGap: '6mm', alignItems: 'start' }}>
            <Box sx={{ textAlign: 'center', pt: '0.4mm' }}>
              <Box
                component="img"
                src="/media/reportes/logos/republica-peru.jpg"
                alt="Republica del Peru"
                sx={{ width: '21.5mm', height: '27mm', objectFit: 'contain' }}
              />
              <Box sx={{ fontSize: '6.8pt', fontWeight: 800, mt: '0.4mm' }}>MINISTERIO DE EDUCACION</Box>
            </Box>
            <Box sx={{ textAlign: 'center', pt: '9.5mm' }}>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '20pt', fontWeight: 900, letterSpacing: '1px' }}>
                FICHA DE MATRICULA
              </Box>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '13.6pt', fontWeight: 900, letterSpacing: '0.7px', mt: '-0.7mm' }}>
                EDUCACION TECNICO - PRODUCTIVA
              </Box>
            </Box>
            <Box className="modular-photo-box">{avatar ? <Box component="img" src={avatar} alt="Foto" /> : '\u00a0'}</Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '46mm 1fr', gap: '31mm', mt: '5.5mm', mb: '5.8mm' }}>
            <Box className="ficha-grid" sx={{ display: 'grid', gridTemplateColumns: '22mm 1fr', height: '8.5mm' }}>
              <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>AÑO</Box>
              <Box className="ficha-cell value">{periodoLectivo || '\u00a0'}</Box>
            </Box>
            <Box className="ficha-grid" sx={{ display: 'grid', gridTemplateColumns: '53mm 1fr', height: '8.5mm' }}>
              <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>CODIGO DE INSCRIPCION</Box>
              <Box className="ficha-cell value">{codigoInscripcion || '\u00a0'}</Box>
            </Box>
          </Box>

          <Box
            className="ficha-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: '20mm 44mm 38mm 31mm 33mm 1fr 9mm 10mm',
              gridAutoRows: '6.15mm',
            }}
          >
            <Box className="ficha-cell label">CETPRO</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 7' }}>SAN MARTIN DE PORRES</Box>
            <Box className="ficha-cell label" sx={{ gridColumn: 'span 2' }}>GESTION PUBLICA</Box>
            <Box className="ficha-cell value">X</Box>
            <Box className="ficha-cell label">GESTION PRIVADA</Box>
            <Box className="ficha-cell" />
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>CONVENIO</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 2' }} />
            <Box className="ficha-cell label">REGION</Box>
            <Box className="ficha-cell value">LIMA</Box>
            <Box className="ficha-cell label">DRE</Box>
            <Box className="ficha-cell value">LIMA</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>UGEL</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 3' }}>02</Box>
            <Box className="ficha-cell label">PROVINCIA</Box>
            <Box className="ficha-cell value">LIMA</Box>
            <Box className="ficha-cell label">DISTRITO</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 5' }}>SAN MARTIN DE PORRES</Box>
            <Box className="ficha-cell label">LUGAR</Box>
            <Box className="ficha-cell value">URB. PALAO</Box>
            <Box className="ficha-cell label">DIRECCION (Av. Jr. Calle)</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 3' }}>JR. SANTA CLORINDA</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>N°</Box>
            <Box className="ficha-cell value">971</Box>
          </Box>

          <Box
            className="ficha-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: '20mm 23mm 31mm 33mm 34mm 33mm 9mm 14mm',
              gridAutoRows: '6.15mm',
              mt: '6.5mm',
            }}
          >
            <Box className="ficha-cell section-cell" sx={{ gridColumn: 'span 8' }}>DATOS DEL ESTUDIANTE</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Apellido Paterno</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Apellido Materno</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Nombres</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Sexo</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2', height: '7.9mm' }}>{apellidoPaterno || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2', height: '7.9mm' }}>{apellidoMaterno || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2', height: '7.9mm' }}>{nombres || '\u00a0'}</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center', height: '7.9mm' }}>H</Box>
            <Box className="ficha-cell" sx={{ justifyContent: 'space-around', height: '7.9mm' }}>
              <RadioMark checked={sexoValue === 'H'} />
              <span>M</span>
              <RadioMark checked={sexoValue === 'M'} />
            </Box>
            <Box className="ficha-cell heading-cell">Edad</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Fecha de Nacimiento</Box>
            <Box className="ficha-cell heading-cell">Estado Civil</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Grado de Instruccion</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>Documento de Identidad</Box>
            <Box className="ficha-cell value">{edad || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2' }}>{fechaNacimiento || '\u00a0'}</Box>
            <Box className="ficha-cell value">{estadoCivil || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2' }}>{instruccion || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2' }}>({documentoValue}) N° {documentoNumero || '\u00a0'}</Box>
            <Box className="ficha-cell label">DOMICILIO</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 7' }}>{domicilio || '\u00a0'}</Box>
            <Box className="ficha-cell label">PROVINCIA</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 3' }}>LIMA</Box>
            <Box className="ficha-cell label">DISTRITO</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 3' }}>{distrito || '\u00a0'}</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 3' }}>COLEGIO (Solo Escolares)</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 2' }}>TELEFONO</Box>
            <Box className="ficha-cell heading-cell" sx={{ gridColumn: 'span 3' }}>CORREO ELECTRONICO</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 3', height: '7.2mm' }}>{colegio || '\u00a0'}</Box>
            <Box className="ficha-cell value" sx={{ gridColumn: 'span 2', height: '7.2mm' }}>{telefono || '\u00a0'}</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 3', height: '7.2mm' }}>{correo || '\u00a0'}</Box>
          </Box>

          <Box
            className="ficha-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: '16mm 46mm 50mm 1fr 18mm 32mm',
              gridAutoRows: '6.2mm',
              mt: '6.5mm',
            }}
          >
            <Box className="ficha-cell section-cell" sx={{ gridColumn: 'span 6' }}>DATOS ACADEMICOS</Box>
            <Box className="ficha-cell label">Ciclo</Box>
            <Box className="ficha-cell value">{ciclo || '\u00a0'}</Box>
            <Box className="ficha-cell label">Especialidad / Opcion Ocupacional</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 3' }}>{opcionOcupacional || '\u00a0'}</Box>
            <Box className="ficha-cell label">Modulo</Box>
            <Box className="ficha-cell" sx={{ gridColumn: 'span 3' }}>{modulo || '\u00a0'}</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>Horario</Box>
            <Box className="ficha-cell">{horario || '\u00a0'}</Box>
            <Box className="ficha-cell label">Duracion</Box>
            <Box className="ficha-cell">{duracion || '\u00a0'} Hs.</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>Inicio</Box>
            <Box className="ficha-cell">{inicio || '\u00a0'}</Box>
            <Box className="ficha-cell label" sx={{ justifyContent: 'center' }}>Termino</Box>
            <Box className="ficha-cell">{termino || '\u00a0'}</Box>
          </Box>

          <Box sx={{ textAlign: 'right', fontSize: '6.7pt', mt: '2.5mm' }}>IMP. MED. TP-0121-2008</Box>

          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <Box sx={{ fontSize: '9pt', mb: '24mm' }}>
              FECHA:{' '}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  minWidth: '68mm',
                  borderBottom: '0.8px dotted #111',
                  textAlign: 'center',
                  pb: '0.35mm',
                }}
              >
                {fechaDisplay}
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '70mm 1fr 70mm', alignItems: 'start' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box className="signature-line" sx={{ mx: '1mm' }} />
                <Box sx={{ fontWeight: 800 }}>ESTUDIANTE</Box>
              </Box>
              <Box />
              <Box sx={{ textAlign: 'center' }}>
                <Box className="signature-line" sx={{ mx: '1mm' }} />
                <Box sx={{ fontWeight: 800 }}>COORDINADOR(A)</Box>
                <Box sx={{ fontSize: '7.1pt' }}>(Firma, sello, post firma)</Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: '22mm' }}>
              <Box sx={{ textAlign: 'center', width: '62mm' }}>
                <Box className="signature-line" />
                <Box sx={{ fontWeight: 800 }}>DIRECTOR(A)</Box>
                <Box sx={{ fontSize: '7.1pt' }}>(Firma, sello, post firma)</Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function FichaMatriculaModularTemplateV3({
  contentWidthMm,
  contentHeightMm,
  scalePercent,
  periodoLectivo,
  codigoInscripcion,
  avatar,
  apellidoPaterno,
  apellidoMaterno,
  nombres,
  sexoValue,
  edad,
  fechaNacimiento,
  estadoCivil,
  instruccion,
  documentoValue,
  documentoNumero,
  domicilio,
  distrito,
  colegio,
  telefono,
  correo,
  ciclo,
  opcionOcupacional,
  modulo,
  horario,
  duracion,
  inicio,
  termino,
  fechaMatricula,
  cambiosModuloText = '',
}: ModularTemplateProps) {
  const Cell = ({
    children,
    className = '',
    sx,
  }: {
    children?: ReactNode;
    className?: string;
    sx?: Record<string, unknown>;
  }) => (
    <Box className={`mod-cell ${className}`} sx={sx}>
      {children ?? '\u00a0'}
    </Box>
  );

  const Row = ({
    columns,
    height,
    children,
  }: {
    columns: string;
    height: string;
    children: ReactNode;
  }) => (
    <Box className="mod-row" sx={{ gridTemplateColumns: columns, minHeight: height, height }}>
      {children}
    </Box>
  );

  const optionCircle = (checked: boolean) => <RadioMark checked={checked} />;
  const fechaDisplay = fechaMatricula || '';

  return (
    <Box className="print-page">
      <Box
        className="print-page-inner"
        sx={{
          transform: `scale(${scalePercent / 100})`,
          transformOrigin: 'top left',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
        }}
      >
        <Box
          className="ficha-modular-div-template"
          sx={{
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '7.05pt',
            lineHeight: 1,
            '& .mod-table': {
              border: '2.1px double #222',
              boxSizing: 'border-box',
              width: '100%',
            },
            '& .mod-row': {
              display: 'grid',
              width: '100%',
              boxSizing: 'border-box',
            },
            '& .mod-row:not(:last-of-type) .mod-cell': {
              borderBottom: '0.72px solid #222',
            },
            '& .mod-cell': {
              borderRight: '0.72px solid #222',
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              minHeight: 0,
              boxSizing: 'border-box',
              overflow: 'hidden',
              padding: '0.65mm 1mm',
            },
            '& .mod-cell:last-child': { borderRight: 'none' },
            '& .label': { fontWeight: 800, backgroundColor: '#f1f1f1' },
            '& .center': { justifyContent: 'center', textAlign: 'center' },
            '& .value': {
              justifyContent: 'center',
              textAlign: 'center',
              textTransform: 'uppercase',
              fontWeight: 800,
            },
            '& .email-value': {
              textTransform: 'lowercase',
            },
            '& .section': { fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#f1f1f1' },
            '& .soft': { fontWeight: 400, backgroundColor: '#f1f1f1' },
            '& .nowrap-label': {
              whiteSpace: 'nowrap',
              fontFamily: '"Arial Narrow", "Roboto Condensed", Arial, Helvetica, sans-serif',
              fontSize: '6.65pt',
              letterSpacing: 0,
            },
            '& .academic-special-label': {
              fontSize: '6.65pt',
              fontWeight: 900,
            },
            '& .radio-mark': {
              display: 'inline-block',
              flex: '0 0 auto',
              width: '3.45mm',
              height: '3.45mm',
              border: '0.72px solid #111',
              borderRadius: '50%',
              position: 'relative',
              background: '#fff',
            },
            '& .radio-mark.checked::after': {
              content: '""',
              position: 'absolute',
              width: '1.75mm',
              height: '1.75mm',
              borderRadius: '50%',
              background: '#111',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            },
            '& .photo-box': {
              width: '24mm',
              height: '30mm',
              border: '0.72px solid #222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10.6pt',
              fontWeight: 800,
              marginLeft: 'auto',
              overflow: 'hidden',
              lineHeight: 0,
            },
            '& .photo-box img': {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block',
            },
            '& .signature-line': {
              borderTop: '0.8px solid #111',
              height: 0,
              marginBottom: '1.2mm',
            },
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '43mm 1fr 27mm', columnGap: '6mm', alignItems: 'start' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                component="img"
                src="/media/reportes/logos/republica-peru.jpg"
                alt="Republica del Peru"
                sx={{ width: '18.8mm', height: '24mm', objectFit: 'contain' }}
              />
              <Box sx={{ fontSize: '6.7pt', fontWeight: 800, mt: '0.2mm' }}>MINISTERIO DE EDUCACION</Box>
            </Box>
            <Box sx={{ textAlign: 'center', pt: '8.8mm' }}>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '20.6pt', fontWeight: 900, letterSpacing: '0.7px' }}>
                FICHA DE MATRICULA
              </Box>
              <Box sx={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '13.9pt', fontWeight: 900, letterSpacing: '0.45px', mt: '1.2mm' }}>
                EDUCACION TECNICO - PRODUCTIVA
              </Box>
            </Box>
            <Box className="photo-box">{avatar ? <Box component="img" src={avatar} alt="Foto" /> : '\u00a0'}</Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '45mm 1fr', gap: '31mm', mt: '5.2mm', mb: '5.2mm' }}>
            <Box className="mod-table">
              <Row columns="22mm 1fr" height="8.1mm">
                <Cell className="label center">AÑO</Cell>
                <Cell className="value">{periodoLectivo || '\u00a0'}</Cell>
              </Row>
            </Box>
            <Box className="mod-table">
              <Row columns="53mm 1fr" height="8.1mm">
                <Cell className="label center">CODIGO DE INSCRIPCION</Cell>
                <Cell className="value">{codigoInscripcion || '\u00a0'}</Cell>
              </Row>
            </Box>
          </Box>

          <Box className="mod-table">
            <Row columns="20mm 1fr" height="6.1mm">
              <Cell className="label">CETPRO</Cell>
              <Cell className="value">SAN MARTIN DE PORRES</Cell>
            </Row>
            <Row columns="31mm 22mm 35mm 32mm 31mm 1fr" height="6.1mm">
              <Cell className="label">GESTION PUBLICA</Cell>
              <Cell className="value">X</Cell>
              <Cell className="label">GESTION PRIVADA</Cell>
              <Cell />
              <Cell className="label center">CONVENIO</Cell>
              <Cell />
            </Row>
            <Row columns="20mm 44mm 12mm 52mm 31mm 1fr" height="6.1mm">
              <Cell className="label">REGION</Cell>
              <Cell className="value">LIMA</Cell>
              <Cell className="label">DRE</Cell>
              <Cell className="value">LIMA</Cell>
              <Cell className="label center">UGEL</Cell>
              <Cell className="value">02</Cell>
            </Row>
            <Row columns="20mm 44mm 20mm 1fr" height="6.1mm">
              <Cell className="label">PROVINCIA</Cell>
              <Cell className="value">LIMA</Cell>
              <Cell className="label">DISTRITO</Cell>
              <Cell className="value">SAN MARTIN DE PORRES</Cell>
            </Row>
            <Row columns="20mm 44mm 40mm 1fr 8mm 10mm" height="6.1mm">
              <Cell className="label">LUGAR</Cell>
              <Cell className="value">URB. PALAO</Cell>
              <Cell className="label">DIRECCION (Av. Jr. Calle)</Cell>
              <Cell className="value">JR. SANTA CLORINDA</Cell>
              <Cell className="label center">N°</Cell>
              <Cell className="value">971</Cell>
            </Row>
          </Box>

          <Box className="mod-table" sx={{ mt: '6.1mm' }}>
            <Row columns="1fr" height="6.7mm">
              <Cell className="section">DATOS DEL ESTUDIANTE</Cell>
            </Row>
            <Row columns="52mm 52mm 48mm 1fr" height="6.8mm">
              <Cell className="label center">Apellido Paterno</Cell>
              <Cell className="label center">Apellido Materno</Cell>
              <Cell className="label center">Nombres</Cell>
              <Cell className="label center">Sexo</Cell>
            </Row>
            <Row columns="52mm 52mm 48mm 8mm 10mm 8mm 12mm" height="8mm">
              <Cell className="value">{apellidoPaterno || '\u00a0'}</Cell>
              <Cell className="value">{apellidoMaterno || '\u00a0'}</Cell>
              <Cell className="value">{nombres || '\u00a0'}</Cell>
              <Cell className="label center">H</Cell>
              <Cell className="center">{optionCircle(sexoValue === 'H')}</Cell>
              <Cell className="label center">M</Cell>
              <Cell className="center">{optionCircle(sexoValue === 'M')}</Cell>
            </Row>
            <Row columns="28mm 44mm 31.1mm 34.9mm 1fr" height="6.6mm">
              <Cell className="label center">Edad</Cell>
              <Cell className="label center">Fecha de Nacimiento</Cell>
              <Cell className="label center">Estado Civil</Cell>
              <Cell className="label center">Grado de Instruccion</Cell>
              <Cell className="label center">Documento de Identidad</Cell>
            </Row>
            <Row columns="28mm 44mm 31.1mm 34.9mm 1fr" height="7.8mm">
              <Cell className="value">{edad || '\u00a0'}</Cell>
              <Cell className="value">{fechaNacimiento || '\u00a0'}</Cell>
              <Cell className="value">{estadoCivil || '\u00a0'}</Cell>
              <Cell className="value">{instruccion || '\u00a0'}</Cell>
              <Cell className="value">({documentoValue}) N° {documentoNumero || '\u00a0'}</Cell>
            </Row>
            <Row columns="27mm 1fr" height="7.2mm">
              <Cell className="label">DOMICILIO</Cell>
              <Cell>{domicilio || '\u00a0'}</Cell>
            </Row>
            <Row columns="27mm 65mm 18mm 1fr" height="6.9mm">
              <Cell className="label">PROVINCIA</Cell>
              <Cell className="value">LIMA</Cell>
              <Cell className="label">DISTRITO</Cell>
              <Cell>{distrito || '\u00a0'}</Cell>
            </Row>
            <Row columns="70mm 45mm 1fr" height="6.8mm">
              <Cell className="label center">COLEGIO (Solo Escolares)</Cell>
              <Cell className="label center">TELEFONO</Cell>
              <Cell className="label center">CORREO ELECTRONICO</Cell>
            </Row>
            <Row columns="70mm 45mm 1fr" height="7.9mm">
              <Cell className="value">{colegio || '\u00a0'}</Cell>
              <Cell className="value">{telefono || '\u00a0'}</Cell>
              <Cell className="value email-value">{correo || '\u00a0'}</Cell>
            </Row>
          </Box>

          <Box className="mod-table" sx={{ mt: '6.1mm' }}>
            <Row columns="1fr" height="6.7mm">
              <Cell className="section">DATOS ACADEMICOS</Cell>
            </Row>
            <Row columns="16mm 46mm 50mm 1fr" height="7.9mm">
              <Cell className="label">Ciclo</Cell>
              <Cell className="value">{ciclo || '\u00a0'}</Cell>
              <Cell className="label nowrap-label academic-special-label">Especialidad / Opcion Ocupacional</Cell>
              <Cell className="value">{opcionOcupacional || '\u00a0'}</Cell>
            </Row>
            <Row columns="16mm 1fr 18mm 45mm" height="7.9mm">
              <Cell className="label">Modulo</Cell>
              <Cell className="value">{modulo || '\u00a0'}</Cell>
              <Cell className="label center">Horario</Cell>
              <Cell className="value" sx={{ justifyContent: 'center', textAlign: 'center', textTransform: 'uppercase', fontWeight: 800 }}>
                {horario || '\u00a0'}
              </Cell>
            </Row>
            <Row columns="16mm 45mm 18mm 45mm 20mm 46mm" height="7.9mm">
              <Cell className="label">Duracion</Cell>
              <Cell className="value">{duracion || '\u00a0'} Hs.</Cell>
              <Cell className="label center">Inicio</Cell>
              <Cell className="value">{inicio || '\u00a0'}</Cell>
              <Cell className="label center">Termino</Cell>
              <Cell className="value">{termino || '\u00a0'}</Cell>
            </Row>
          </Box>

          <Box sx={{ textAlign: 'right', fontSize: '6.7pt', mt: '2mm' }}>IMP. MED. TP-0121-2008</Box>

          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: '15mm' }}>
            {false && cambiosModuloText ? (
              <Box sx={{ fontSize: '6.4pt', lineHeight: 1.1, mb: '1.5mm', transform: 'translateY(-12px)' }}>
                {cambiosModuloText}
              </Box>
            ) : null}
            <Box sx={{ fontSize: '9pt', mb: '23.5mm' }}>
              FECHA:{' '}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  minWidth: '67mm',
                  borderBottom: '0.8px dotted #111',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  pb: '0.35mm',
                }}
              >
                {fechaMatricula ? fechaDisplay : '\u00a0'}
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '58mm 1fr 58mm', alignItems: 'start' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box className="signature-line" />
                <Box sx={{ fontWeight: 800 }}>ESTUDIANTE</Box>
              </Box>
              <Box />
              <Box sx={{ textAlign: 'center' }}>
                <Box className="signature-line" />
                <Box sx={{ fontWeight: 800 }}>COORDINADOR(A)</Box>
                <Box sx={{ fontSize: '7pt' }}>(Firma, sello, post firma)</Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: '21mm' }}>
              <Box sx={{ textAlign: 'center', width: '58mm' }}>
                <Box className="signature-line" />
                <Box sx={{ fontWeight: 800 }}>DIRECTOR(A)</Box>
                <Box sx={{ fontSize: '7pt' }}>(Firma, sello, post firma)</Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

type FichaDniImagesPageProps = {
  contentWidthMm: number;
  contentHeightMm: number;
  scalePercent: number;
  frenteUrl: string;
  reversoUrl: string;
  timelineRows?: FichaModuloTimelineRow[];
  onEditSide?: (side: DocumentoSide) => void;
};

function FichaDniImagesPage({
  contentWidthMm,
  contentHeightMm,
  scalePercent,
  frenteUrl,
  reversoUrl,
  timelineRows = [],
  onEditSide,
}: FichaDniImagesPageProps) {
  if (!frenteUrl && !reversoUrl && timelineRows.length === 0) return null;

  const renderImage = (src: string, alt: string, side: DocumentoSide) =>
    src ? (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            width: '350px',
            height: 'auto',
            maxHeight: '38%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {onEditSide ? (
          <Button
            className="no-print"
            variant="outlined"
            size="small"
            onClick={() => onEditSide(side)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {side === 'frente' ? 'Editar Frente' : 'Editar Reverso'}
          </Button>
        ) : null}
      </Box>
    ) : null;

  return (
    <Box className="print-page">
      <Box
        className="print-page-inner"
        sx={{
          transform: `scale(${scalePercent / 100})`,
          transformOrigin: 'top left',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
        }}
      >
        <Box
          sx={{
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {timelineRows.length > 0 ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                maxWidth: '72%',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '7pt',
                lineHeight: 1.12,
                color: '#111',
              }}
            >
              <Box sx={{ fontWeight: 800, mb: '1.2mm' }}>Historial de cambios</Box>
              <Box sx={{ display: 'grid', rowGap: '1.2mm' }}>
                {timelineRows.map((row, index) => (
                  <Box
                    key={`${row.marker}-${row.name}-${index}`}
                    sx={{ display: 'grid', gridTemplateColumns: '5mm 1fr', columnGap: '0.6mm' }}
                  >
                    <Box sx={{ fontWeight: 800 }}>{row.marker}</Box>
                    <Box>
                      <Box sx={{ fontWeight: 800 }}>{row.name}</Box>
                      {row.details ? <Box sx={{ color: '#333' }}>{row.details}</Box> : null}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '150px' }}>
            {renderImage(frenteUrl, 'DNI frente', 'frente')}
            {renderImage(reversoUrl, 'DNI reverso', 'reverso')}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function FichaMatriculaProgramaPage() {
  const searchParams = useSearchParams();
  const matriculaId = Number(searchParams.get('matriculaId') || 0);
  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const { settings, loading: loadingSettings } = useAppSettings();
  const [matricula, setMatricula] = useState<MatriculaFicha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const [margins, setMargins] = useState<PrintMarginsCm>(DEFAULT_MARGINS);
  const [showOverflow, setShowOverflow] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);
  const [editorTarget, setEditorTarget] = useState<DocumentoSide | null>(null);
  const [dniImageVersion, setDniImageVersion] = useState(0);

  const pageSizeMm = useMemo(() => getA4PageSizeMm(orientation), [orientation]);
  const contentWidthMm = useMemo(() => getPrintContentWidthMm(pageSizeMm, margins), [pageSizeMm, margins]);
  const contentHeightMm = useMemo(() => getPrintContentHeightMm(pageSizeMm, margins), [pageSizeMm, margins]);

  useEffect(() => {
    document.title = 'Ficha de Matricula';
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!matriculaId) {
        setError('No se recibio la matricula.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken(true);
        const getMatricula = httpsCallable<{ id: number }, { matricula?: MatriculaFicha | null }>(
          functions,
          'getMatricula',
        );
        const result = await getMatricula({ id: matriculaId });
        if (!active) return;
        setMatricula(result.data.matricula ?? null);
        setError(null);
      } catch (err) {
        console.error('Error loading ficha matricula:', err);
        if (active) setError('No se pudo cargar la ficha de matricula.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [auth, functions, matriculaId]);

  const programaModulo = getProgramaModulo(matricula);
  const grupoModulo = programaModulo?.grupoModulo ?? null;
  const modulo = grupoModulo?.modulo ?? null;
  const carrera = modulo?.plan?.carrera ?? null;
  const user = matricula?.user ?? null;
  const mostrarAvatarFicha = settings.visualizaciones.visualizarAvatarEstudianteFichaMatricula !== false;
  const fichaAvatar = mostrarAvatarFicha ? asValue(user?.avatarMediano || user?.avatar) : '';
  const tipoCarrera = normalizeText(carrera?.tipoCarrera?.nombre);
  const isOpcionOcupacional = tipoCarrera.includes('opcion') || tipoCarrera.includes('ocupacional');
  const programaNombre = asUpper(carrera?.titulo || carrera?.nombre || modulo?.plan?.planEstudio);
  const moduloNombre = asUpper(modulo?.titulo || modulo?.tituloComercial || grupoModulo?.nombre);
  const periodoAcademico = asValue(matricula?.semestre?.titulo) || asValue(grupoModulo?.grupo?.semestre?.titulo);
  const periodoLectivo = getPeriodoLectivo(matricula);
  const codigoInscripcion = formatCodigoInscripcionFicha(matricula?.codigoInscripcion, matricula?.recibo);
  const periodoClases = asDateRange(
    grupoModulo?.inicio || grupoModulo?.grupo?.semestre?.inicio || matricula?.semestre?.inicio,
    grupoModulo?.fin || grupoModulo?.grupo?.semestre?.fin || matricula?.semestre?.fin,
  );
  const sexoValue = getSexoValue(user?.sexo);
  const documentoValue = normalizeDocumento(user?.tipoDocumento);
  const tipoMatricula = getTipoMatricula(matricula?.recibo);
  const turnoValue = getTurnoValue(programaModulo);
  const unidadesDidacticas = matricula?.fichaUnidadesDidacticas ?? [];
  const unidadRows = Array.from({ length: Math.max(8, unidadesDidacticas.length) }, (_, index) =>
    unidadesDidacticas[index] ?? null,
  );
  const efsrtCreditos = asValue(modulo?.creditosEfsrt);
  const efsrtHoras = asValue(modulo?.duracionEfsrt);
  const horarioModulo = getHorarioFromGrupoModuloName(grupoModulo?.nombre);
  const directorSemestre = getFichaPersonalName(matricula?.semestre?.director);
  const addDniImageVersion = (url: string) => {
    if (!url || !dniImageVersion) return url;
    return `${url}${url.includes('?') ? '&' : '?'}v=${dniImageVersion}`;
  };
  const dniFrenteUrl = addDniImageVersion(asValue(user?.dniImagenFrenteProcesadaUrl || user?.dniImagenFrenteUrl));
  const dniReversoUrl = addDniImageVersion(asValue(user?.dniImagenReversoProcesadaUrl || user?.dniImagenReversoUrl));
  const cambiosModuloOrdenados = (matricula?.cambiosModulo ?? [])
    .slice()
    .sort((a, b) =>
      Number(b.id ?? 0) - Number(a.id ?? 0)
      || asValue(b.fechaCambio).localeCompare(asValue(a.fechaCambio)),
    );
  const cambiosModuloEventos = Array.from(
    cambiosModuloOrdenados.reduce((map, cambio) => {
      const anterior = getPreviousModuloChangeName(cambio);
      if (!anterior) return map;
      const key = asValue(cambio.fechaCambio) || `id:${cambio.id ?? map.size}`;
      if (!map.has(key)) map.set(key, cambio);
      return map;
    }, new Map<string, MatriculaFichaCambioModulo>()).values(),
  );
  const fechaFicha = asDate(cambiosModuloEventos[0]?.fechaCambio || matricula?.fecha);
  const matriculaActorName = formatFichaPersonalActorName(matricula?.responsable, matricula?.responsableUser);
  const cambiosModuloTimeline: FichaModuloTimelineRow[] = cambiosModuloEventos.length > 0
    ? [
      {
        marker: '*',
        name: getNewModuloChangeName(cambiosModuloEventos[0]) || asValue(grupoModulo?.nombre) || 'Modulo actual',
        details: formatModuloTimelineDetails(
          cambiosModuloEventos[0]?.fechaCambio,
          formatFichaActorName(cambiosModuloEventos[0]?.registradoPor),
        ),
      },
      ...cambiosModuloEventos.flatMap((cambio, index) => {
        const name = getPreviousModuloChangeName(cambio);
        if (!name) return [];
        const isOriginal = index === cambiosModuloEventos.length - 1;
        return [{
          marker: '<-' as const,
          name,
          details: isOriginal
            ? formatModuloTimelineDetails(matricula?.fecha, matriculaActorName, 'Fecha de creacion')
            : formatModuloTimelineDetails(cambio.fechaCambio, formatFichaActorName(cambio.registradoPor)),
        }];
      }),
    ]
    : [];
  const cambiosModuloText = '';

  useEffect(() => {
    if (!matricula) return;
    if (isOpcionOcupacional) {
      setOrientation('portrait');
      setMargins(MODULAR_MARGINS);
    } else {
      setOrientation('landscape');
      setMargins(DEFAULT_MARGINS);
    }
  }, [isOpcionOcupacional, matricula]);

  const handleFichaDniSaved = (payload: {
    side: DocumentoSide;
    processedUrl?: string | null;
    originalUrl?: string | null;
  }) => {
    setMatricula((current) => {
      if (!current?.user) return current;
      return {
        ...current,
        user: {
          ...current.user,
          ...(payload.side === 'frente'
            ? {
              dniImagenFrenteProcesadaUrl: payload.processedUrl || current.user.dniImagenFrenteProcesadaUrl,
              dniImagenFrenteUrl: payload.originalUrl || current.user.dniImagenFrenteUrl,
            }
            : {
              dniImagenReversoProcesadaUrl: payload.processedUrl || current.user.dniImagenReversoProcesadaUrl,
              dniImagenReversoUrl: payload.originalUrl || current.user.dniImagenReversoUrl,
            }),
        },
      };
    });
    setDniImageVersion(Date.now());
    setEditorTarget(null);
  };

  return (
    <PrintDocumentViewer
      title="Ficha de Matricula"
      orientation={orientation}
      onOrientationChange={setOrientation}
      margins={margins}
      onMarginsChange={setMargins}
      showPageOverflow={showOverflow}
      onShowPageOverflowChange={setShowOverflow}
      scalePercent={scalePercent}
      onScalePercentChange={setScalePercent}
      minScalePercent={55}
      maxScalePercent={100}
      loading={loading || loadingSettings}
      error={error}
      canPrint={Boolean(matricula) && !loadingSettings}
      pageSizeMm={pageSizeMm}
      contentMinWidthMm={pageSizeMm.width}
    >
      <GlobalStyles
        styles={{
          '@media print': {
            '.no-print': { display: 'none !important' },
            '.print-viewer': { overflow: 'visible !important', padding: '0 !important' },
            '.print-viewer-inner': { minWidth: '0 !important', width: 'auto !important' },
            '.print-page': {
              width: `${contentWidthMm}mm !important`,
              height: `${contentHeightMm}mm !important`,
              boxShadow: 'none !important',
              margin: '0 !important',
              padding: '0 !important',
              pageBreakAfter: 'auto',
              breakAfter: 'auto',
            },
            '.print-page-inner': { outline: 'none !important' },
          },
          '.print-page': {
            width: `${pageSizeMm.width}mm`,
            height: `${pageSizeMm.height}mm`,
            position: 'relative',
            marginLeft: 'auto',
            marginRight: 'auto',
            backgroundColor: '#fff',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
            marginBottom: '18px',
            padding: `${cmToMm(margins.top)}mm ${cmToMm(margins.right)}mm ${cmToMm(margins.bottom)}mm ${cmToMm(margins.left)}mm`,
            boxSizing: 'border-box',
            overflow: showOverflow ? 'visible' : 'hidden',
          },
          '.print-page-inner': {
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            outline: '1px dashed #c8d2df',
            overflow: showOverflow ? 'visible' : 'hidden',
          },
        }}
      />
      {!matricula ? null : (
        <>
          {isOpcionOcupacional ? (
            <FichaMatriculaModularTemplateV3
              contentWidthMm={contentWidthMm}
              contentHeightMm={contentHeightMm}
              scalePercent={scalePercent}
              periodoLectivo={periodoLectivo}
              codigoInscripcion={codigoInscripcion}
              avatar={fichaAvatar}
              apellidoPaterno={asUpper(user?.apellidoPaterno)}
              apellidoMaterno={asUpper(user?.apellidoMaterno)}
              nombres={asUpper(user?.nombre)}
              sexoValue={sexoValue}
              edad={getAge(user?.fechaNacimiento, matricula.fecha)}
              fechaNacimiento={asDate(user?.fechaNacimiento)}
              estadoCivil={asUpper(user?.estadoCivil)}
              instruccion={asUpper(user?.instruccion)}
              documentoValue={documentoValue}
              documentoNumero={asValue(user?.dni)}
              domicilio={asUpper(user?.direccion)}
              distrito={asUpper(user?.distrito)}
              colegio={asUpper(user?.nombreColegio) || '-'}
              telefono={asValue(user?.celular || user?.telefono)}
              correo={asValue(user?.email || user?.correoInstitucional)}
              ciclo={asUpper(carrera?.ciclo || carrera?.nivel)}
              opcionOcupacional={asUpper(carrera?.titulo || carrera?.nombre || programaNombre)}
              modulo={moduloNombre}
              horario={asUpper(horarioModulo)}
              duracion={asValue(modulo?.horas)}
              inicio={asDate(grupoModulo?.inicio)}
              termino={asDate(grupoModulo?.fin)}
              fechaMatricula={asDate(matricula.fecha)}
              cambiosModuloText={cambiosModuloText}
            />
          ) : (
            <Box className="print-page">
          <Box
            className="print-page-inner"
            sx={{
              transform: `scale(${scalePercent / 100})`,
              transformOrigin: 'top left',
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#111',
            }}
          >
            <Box
              className="ficha-template"
              sx={{
                width: `${contentWidthMm}mm`,
                height: `${contentHeightMm}mm`,
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#000',
                fontSize: '7.7pt',
                lineHeight: 1.04,
                boxSizing: 'border-box',
                overflow: 'hidden',
                '& table': { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' },
                '& td, & th': { border: '0.7px solid #111', padding: '0.9mm 1.6mm', verticalAlign: 'middle' },
                '& .blue': { background: '#9fc4e2', fontWeight: 800 },
                '& .center': { textAlign: 'center' },
                '& .bold': { fontWeight: 800 },
                '& .heavy': { fontWeight: 900 },
                '& .upper': { textTransform: 'uppercase' },
                '& .thin-row td, & .thin-row th': { height: '4.95mm', paddingTop: '0.51mm', paddingBottom: '0.51mm' },
                '& .data-row td': { height: '5.42mm' },
                '& .section-title': {
                  fontWeight: 900,
                  fontSize: '8.6pt',
                  textAlign: 'center',
                  border: 0,
                  padding: '1.72mm 0 0.95mm',
                },
                '& .blank-line': { letterSpacing: '1.4px' },
                '& .radio-mark': {
                  display: 'inline-block',
                  width: '3.4mm',
                  height: '3.4mm',
                  border: '0.7px solid #111',
                  borderRadius: '50%',
                  verticalAlign: '-0.8mm',
                  marginRight: '1.5mm',
                  position: 'relative',
                  background: '#fff',
                },
                '& .radio-mark.checked::after': {
                  content: '""',
                  position: 'absolute',
                  width: '1.8mm',
                  height: '1.8mm',
                  borderRadius: '50%',
                  background: '#111',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                },
                '& .photo-cell': {
                  padding: '0.7mm',
                  textAlign: 'center',
                  overflow: 'hidden',
                  lineHeight: 0,
                },
                '& .photo-cell img': {
                  width: '19mm',
                  height: '24mm',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  display: 'block',
                  margin: '0 auto',
                },
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '82mm 1fr 70mm', alignItems: 'center', mb: '1.6mm' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
                  <Box
                    component="img"
                    src="/media/reportes/logos/minedu.png"
                    alt="MINEDU"
                    sx={{ width: '58mm', height: '13mm', objectFit: 'contain', objectPosition: 'left center' }}
                  />
                  <Box
                    component="img"
                    src="/media/reportes/logos/logo-smp-nuevo-chico.png"
                    alt="CETPRO SMP"
                    sx={{ width: '14.5mm', height: '14.5mm', objectFit: 'contain' }}
                  />
                </Box>
                <Box sx={{ textAlign: 'center', fontWeight: 900, fontSize: '14pt', letterSpacing: 0 }}>
                  FICHA DE REGISTRO DE MATRICULA {periodoLectivo}
                </Box>
                <table>
                  <tbody>
                    <tr className="thin-row">
                      <td className="center" style={{ width: 'calc(37mm - 30px)' }}>CODIGO DE INSCRIPCION</td>
                      <td className="center">{codigoInscripcion || '\u00a0'}</td>
                    </tr>
                  </tbody>
                </table>
              </Box>

              <table>
                <colgroup>
                  <col style={{ width: '41mm' }} />
                  <col style={{ width: '51mm' }} />
                  <col style={{ width: '34mm' }} />
                  <col style={{ width: '34mm' }} />
                  <col style={{ width: '34mm' }} />
                  <col style={{ width: '63mm' }} />
                  <col style={{ width: '21mm' }} />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td className="blue">Nombre del CETPRO:</td>
                    <td>SAN MARTIN DE PORRES</td>
                    <td className="blue">Codigo modular:</td>
                    <td className="center">0437863</td>
                    <td className="blue">DRE:</td>
                    <td className="center">LIMA- METROPOLITANA</td>
                    <td rowSpan={4} className="photo-cell">
                      {fichaAvatar ? <Box component="img" src={fichaAvatar} alt="Fotografia" /> : '\u00a0'}
                    </td>
                  </tr>
                  <tr className="thin-row">
                    <td className="blue">Departamento:</td>
                    <td>LIMA</td>
                    <td className="blue">Provincia</td>
                    <td className="center">LIMA</td>
                    <td className="blue">Distrito</td>
                    <td className="center">SAN MARTIN DE PORRES</td>
                  </tr>
                  <tr className="thin-row">
                    <td className="blue">Tipo de Gestion:</td>
                    <td>PUBLICA</td>
                    <td className="blue">Periodo Lectivo</td>
                    <td className="center">{periodoLectivo}</td>
                    <td className="blue">Periodo Academico</td>
                    <td className="center">{periodoAcademico || '\u00a0'}</td>
                  </tr>
                  <tr className="thin-row">
                    <td className="blue">Nivel Formativo</td>
                    <td>{asUpper(carrera?.nivel) || '\u00a0'}</td>
                    <td className="blue">Periodo de Clases</td>
                    <td colSpan={2} className="center">{periodoClases || '\u00a0'}</td>
                    <td className="blue center">Fotografia</td>
                  </tr>
                </tbody>
              </table>

              <table style={{ marginTop: '0.8mm' }}>
                <colgroup>
                  <col style={{ width: '41mm' }} />
                  <col style={{ width: '84mm' }} />
                  <col style={{ width: '25mm' }} />
                  <col />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td className="blue center">PROGRAMA DE ESTUDIOS</td>
                    <td className="center heavy">{programaNombre || '\u00a0'}</td>
                    <td className="blue center">MODULO</td>
                    <td className="center heavy">{moduloNombre || '\u00a0'}</td>
                  </tr>
                </tbody>
              </table>

              <table style={{ marginTop: '1mm' }}>
                <colgroup>
                  <col style={{ width: '20mm' }} />
                  <col style={{ width: '20mm' }} />
                  <col style={{ width: '54mm' }} />
                  <col style={{ width: '45mm' }} />
                  <col style={{ width: '25mm' }} />
                  <col style={{ width: '28mm' }} />
                  <col style={{ width: '28mm' }} />
                  <col style={{ width: '17mm' }} />
                  <col style={{ width: '17mm' }} />
                  <col style={{ width: '24mm' }} />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td colSpan={2} className="blue center heavy">APELLIDO PATERNO</td>
                    <td colSpan={2} className="blue center heavy">APELLIDO MATERNO</td>
                    <td colSpan={3} className="blue center heavy">NOMBRES</td>
                    <td colSpan={3} className="blue center heavy">SEXO</td>
                  </tr>
                  <tr className="data-row">
                    <td colSpan={2} className="center bold">{asUpper(user?.apellidoPaterno) || '\u00a0'}</td>
                    <td colSpan={2} className="center bold">{asUpper(user?.apellidoMaterno) || '\u00a0'}</td>
                    <td colSpan={3} className="center bold">{asUpper(user?.nombre) || '\u00a0'}</td>
                    <td className="blue center">H</td>
                    <td className="center"><RadioMark checked={sexoValue === 'H'} /></td>
                    <td className="center">M&nbsp;&nbsp;&nbsp;<RadioMark checked={sexoValue === 'M'} /></td>
                  </tr>
                  <tr className="thin-row">
                    <td colSpan={2} className="blue center heavy">TIPO DOC.</td>
                    <td className="blue center heavy">NRO. DE DOCUMENTO</td>
                    <td className="blue center heavy">FECHA DE NACIMIENTO</td>
                    <td className="blue center heavy">EDAD</td>
                    <td colSpan={2} className="blue center heavy">TIPO DE MATRICULA</td>
                    <td colSpan={3} className="blue center heavy">TURNO</td>
                  </tr>
                  <tr className="thin-row">
                    <td className="center"><RadioMark checked={documentoValue === 'CE'} />C.E</td>
                    <td className="center"><RadioMark checked={documentoValue === 'DNI'} />DNI</td>
                    <td className="center bold">{asValue(user?.dni) || '\u00a0'}</td>
                    <td className="center">{asDate(user?.fechaNacimiento) || <span className="blank-line">_____/_____/______</span>}</td>
                    <td className="center">{getAge(user?.fechaNacimiento, matricula?.fecha) || '\u00a0'}</td>
                    <td className="center"><RadioMark checked={tipoMatricula === 'REGULAR'} />REGULAR</td>
                    <td className="center"><RadioMark checked={tipoMatricula === 'CONADIS'} />CONADIS</td>
                    <td className="center"><RadioMark checked={turnoValue === 'M'} />M</td>
                    <td className="center"><RadioMark checked={turnoValue === 'T'} />T</td>
                    <td className="center"><RadioMark checked={turnoValue === 'N'} />N</td>
                  </tr>
                  <tr className="thin-row">
                    <td colSpan={2} className="blue center heavy">Nro. Telefono</td>
                    <td className="center">{asValue(user?.celular || user?.telefono) || '\u00a0'}</td>
                    <td className="blue center heavy">Correo electronico</td>
                    <td colSpan={6}>{asValue(user?.email || user?.correoInstitucional) || '\u00a0'}</td>
                  </tr>
                  <tr className="thin-row">
                    <td colSpan={2} className="blue center heavy">Grado De Instruccion</td>
                    <td colSpan={3}>{asValue(user?.instruccion) || '\u00a0'}</td>
                    <td colSpan={2} className="blue center heavy">Nombre De Colegio (Solo Escolares)</td>
                    <td colSpan={3}>{asValue(user?.nombreColegio, '-')}</td>
                  </tr>
                  <tr className="thin-row">
                    <td colSpan={2} className="blue center heavy">Domicilio</td>
                    <td colSpan={4}>{asValue(user?.direccion) || '\u00a0'}</td>
                    <td className="blue center heavy">Distrito</td>
                    <td colSpan={3}>{asValue(user?.distrito) || '\u00a0'}</td>
                  </tr>
                </tbody>
              </table>

              <Box className="section-title">UNIDADES DIDACTICAS</Box>
              <table>
                <colgroup>
                  <col style={{ width: '13mm' }} />
                  <col />
                  <col style={{ width: '25mm' }} />
                  <col style={{ width: '23mm' }} />
                  <col style={{ width: '30mm' }} />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td className="blue center heavy">NRO.</td>
                    <td className="blue center heavy">UNIDAD DIDACTICA</td>
                    <td className="blue center heavy">CREDITOS</td>
                    <td className="blue center heavy">HORAS</td>
                    <td className="blue center heavy">CONDICION</td>
                  </tr>
                  {unidadRows.map((unidad, index) => (
                    <tr key={`${unidad?.id ?? 'empty'}-${index}`} className="thin-row">
                      <td className="blue center heavy">{index + 1}</td>
                      <td className="bold">{asUpper(unidad?.nombre) || '\u00a0'}</td>
                      <td className="center heavy">{asValue(unidad?.creditos)}</td>
                      <td className="center heavy">{asValue(unidad?.duracion)}</td>
                      <td className="center heavy">{unidad ? 'G' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Box className="section-title">UNIDADES DIDACTICAS DE SUBSANACION</Box>
              <table>
                <colgroup>
                  <col style={{ width: '13mm' }} />
                  <col />
                  <col style={{ width: '25mm' }} />
                  <col style={{ width: '23mm' }} />
                  <col style={{ width: '30mm' }} />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td className="blue center heavy">NRO.</td>
                    <td className="blue center heavy">UNIDADES DIDACTICAS</td>
                    <td className="blue center heavy">CREDITOS</td>
                    <td className="blue center heavy">HORAS</td>
                    <td className="blue center heavy">CONDICION</td>
                  </tr>
                  <tr className="thin-row">
                    <td className="blue center heavy">&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                </tbody>
              </table>

              <Box className="section-title">EXPERIENCIAS FORMATIVAS EN SITUACIONES REALES DE TRABAJO</Box>
              <table>
                <colgroup>
                  <col style={{ width: '13mm' }} />
                  <col />
                  <col style={{ width: '25mm' }} />
                  <col style={{ width: '23mm' }} />
                  <col style={{ width: '30mm' }} />
                </colgroup>
                <tbody>
                  <tr className="thin-row">
                    <td className="blue center heavy">NRO.</td>
                    <td className="blue center heavy">EN EL CETPRO / CENTRO LABORAL</td>
                    <td className="blue center heavy">CREDITOS</td>
                    <td className="blue center heavy">HORAS</td>
                    <td className="blue center heavy">OBSERVACION</td>
                  </tr>
                  <tr className="thin-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td className="center heavy">{efsrtCreditos}</td>
                    <td className="center heavy">{efsrtHoras}</td>
                    <td>&nbsp;</td>
                  </tr>
                </tbody>
              </table>

              <Box sx={{ mt: '4mm', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8mm' }}>
              {false && cambiosModuloText ? (
                <Box sx={{ textAlign: 'left', fontSize: '6.4pt', lineHeight: 1.1, flex: 1, transform: 'translateY(-10px)' }}>
                  {cambiosModuloText}
                </Box>
              ) : (
                <Box sx={{ flex: 1 }} />
              )}
                <Box sx={{ textAlign: 'right', fontSize: '8.7pt', whiteSpace: 'nowrap' }}>
                  FECHA: {fechaFicha || '......../............/............'}
                </Box>
              </Box>

              <Box sx={{ mt: '13mm', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '22mm', alignItems: 'start', fontSize: '8.3pt' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: '0', borderTop: '0.7px solid #111', mx: '14mm', mb: '1mm' }} />
                  <Box>DIRECTOR(A)</Box>
                  <Box>{directorSemestre ? `Lic. ${directorSemestre}` : '\u00a0'}</Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: '0', borderTop: '0.7px solid #111', mx: '10mm', mb: '1mm' }} />
                  <Box>COORDINADOR(A) ACADEMICA</Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: '0', borderTop: '0.7px solid #111', mx: '9mm', mb: '1mm' }} />
                  <Box>ESTUDIANTE</Box>
                  <Box sx={{ textAlign: 'left', pl: '16mm' }}>NRO. DNI: {asValue(user?.dni)}</Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
          )}
          <FichaDniImagesPage
            contentWidthMm={contentWidthMm}
            contentHeightMm={contentHeightMm}
            scalePercent={scalePercent}
            frenteUrl={dniFrenteUrl}
            reversoUrl={dniReversoUrl}
            timelineRows={cambiosModuloTimeline}
            onEditSide={setEditorTarget}
          />
          <EditorImagenesModal
            open={Boolean(editorTarget)}
            matriculaId={matriculaId}
            side={editorTarget ?? 'frente'}
            variant="simple"
            instructionText="Gira la imagen a su posision correcta y haz clic en las 4 esquinas del documento, luego guarda para terminar la edicion."
            onClose={() => setEditorTarget(null)}
            onSaved={handleFichaDniSaved}
          />
        </>
      )}
    </PrintDocumentViewer>
  );
}
