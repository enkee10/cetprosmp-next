'use client';

import { useEffect, useMemo, useState } from 'react';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import MultiSelectWithActions from '@/components/intranet/MultiSelectWithActions';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { getDateOnlyLocalDate, toDateOnlyInputValue } from '@/lib/dateOnly';
import { useAppSettings } from '@/hooks/useAppSettings';
import { getPersonalShortName } from './personalName';
import { isNombreGrupoGenerado, nombreGrupoCalculado, tituloModulo, tituloModulos } from './nombres';

interface GrupoFormProps {
  grupoId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

const EMPTY_MODULE_SELECTION: number[] = [];

interface GrupoData {
  id: number;
  turnoNombre: string | null;
  descripcion: string | null;
  nombreDisplay: string | null;
  workspaceName: string | null;
  workspaceCorreo: string | null;
  estado: string | null;
  archivado: boolean | null;
  semestreId: number | null;
  personalId: number | null;
  turnoId: number | null;
  horarioId: number | null;
  turno?: { nombre?: string | null } | null;
  horario?: { nombre?: string | null } | null;
  personal?: { displayName?: string | null; user?: { username?: string | null; apellidoPaterno?: string | null } | null } | null;
  grupoModulos?: GrupoModuloDetalle[];
}

interface ModuloResumen {
  titulo?: string | null;
  tituloComercial?: string | null;
  orden?: number | null;
  plan?: {
    carrera?: {
      especialidad?: {
        orden?: number | null;
      } | null;
    } | null;
  } | null;
}

interface UnidadDidacticaResumen {
  id: number;
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  sigla?: string | null;
}

interface ModuloOption extends ModuloResumen {
  id: number;
  unidadDidacticas?: UnidadDidacticaResumen[];
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  inicio?: string | null;
  fin?: string | null;
}

interface PersonalOption {
  id: number;
  displayName: string | null;
  cargo?: string | null;
  rolId?: number | string | null;
  userUsername?: string | null;
  user?: { username?: string | null; apellidoPaterno?: string | null; rolId?: number | string | null } | null;
}

interface TurnoOption {
  id: number;
  nombre: string | null;
  horaInicio: string | null;
  horaFin: string | null;
}

interface HorarioOption {
  id: number;
  nombre: string | null;
  regla: string | null;
  diasSemana: string | null;
  viernesAlternoInicio: string | null;
}

interface GrupoModuloDetalle {
  id?: number;
  orden: number | null;
  obligatorio: boolean | null;
  instancia?: number | null;
  sufijo?: string | null;
  inicio?: string | null;
  fin?: string | null;
  grupoId?: number;
  moduloId: number;
  calendarioId?: number | null;
  modulo?: ModuloResumen | null;
  unidadDidacticas?: GrupoModuloUnidadDidacticaDetalle[];
}

interface GrupoModuloUnidadDidacticaDetalle {
  id?: number;
  orden?: number | null;
  inicio?: string | null;
  fin?: string | null;
  grupoModuloId?: number;
  unidadDidacticaId: number;
  unidadDidactica?: UnidadDidacticaResumen | null;
}

const getSemestreCodigo = (value: string | null | undefined) => String(value ?? '').trim().slice(-4);

const WORKSPACE_NAME_MAX_LENGTH = 73;
const WORKSPACE_CORREO_MAX_LENGTH = 80;
const WORKSPACE_EMAIL_DOMAIN = '@cetprosmp.edu.pe';

const trimTitleFromRight = (title: string, prefix: string, suffix: string, maxLength: number) => {
  const available = maxLength - prefix.length - suffix.length;
  const trimmedTitle = title.slice(0, Math.max(0, available));
  const value = `${prefix}${trimmedTitle}${suffix}`;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const normalizeEmailSegment = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñÑ]/g, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9._\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const getOrdenText = (value: number | string | null | undefined) =>
  value == null || value === '' ? '' : String(value);

const getGrupoModuloKey = (moduloId: number, instancia: number | null | undefined) =>
  `${moduloId}:${instancia ?? 1}`;

const buildWorkspaceName = (
  semestre: SemestreOption | null,
  modulos: GrupoModuloDetalle[],
  personalName: string,
) => {
  const first = modulos.slice().sort((a,b) => (a.orden??0)-(b.orden??0))[0];
  const titulo = tituloModulos(modulos);
  const semestreCodigo = getSemestreCodigo(semestre?.titulo);
  const ordenEspecialidad = getOrdenText(first?.modulo?.plan?.carrera?.especialidad?.orden);
  const ordenModulo = getOrdenText(first?.modulo?.orden ?? first?.orden);
  if (!semestreCodigo || !titulo || !personalName) {
    return '';
  }

  const prefix = `:${semestreCodigo}_${ordenEspecialidad}.${ordenModulo} `;
  const suffix = personalName ? ` - ${personalName}` : '';
  return trimTitleFromRight(titulo, prefix, suffix, WORKSPACE_NAME_MAX_LENGTH);
};

const buildWorkspaceCorreo = (
  semestre: SemestreOption | null,
  modulos: GrupoModuloDetalle[],
  personalName: string,
) => {
  const semestreCodigo = getSemestreCodigo(semestre?.titulo);
  const titulo = tituloModulos(modulos);
  if (!semestreCodigo || !titulo || !personalName) {
    return '';
  }

  const titleSegment = normalizeEmailSegment(titulo);
  const personalSegment = normalizeEmailSegment(personalName);
  const prefix = semestreCodigo ? `${semestreCodigo}-` : '';
  const suffix = `${personalSegment ? `-${personalSegment}` : ''}${WORKSPACE_EMAIL_DOMAIN}`;
  return trimTitleFromRight(titleSegment, prefix, suffix, WORKSPACE_CORREO_MAX_LENGTH);
};

const toDateInputValue = (value: string | null | undefined) => {
  return toDateOnlyInputValue(value) || String(value ?? '').slice(0, 10);
};

const getModuloLabel = (modulo: GrupoModuloDetalle) =>
  [
    [tituloModulo(modulo), modulo.sufijo?.trim()].filter(Boolean).join(' '),
    `Instancia ${modulo.instancia ?? 1}`,
  ].filter(Boolean).join(' ');

const getUnidadLabel = (unidad: GrupoModuloUnidadDidacticaDetalle) =>
  unidad.unidadDidactica?.sigla
    ? `${unidad.unidadDidactica.sigla} - ${unidad.unidadDidactica.nombre || `Unidad ${unidad.unidadDidacticaId}`}`
    : unidad.unidadDidactica?.nombre || `Unidad ${unidad.unidadDidacticaId}`;

const getDateOrNull = (value: string | null | undefined) => {
  return getDateOnlyLocalDate(value);
};

const getPersonalUsername = (personal: PersonalOption | null | undefined) =>
  getPersonalShortName(
    personal?.userUsername || personal?.user?.username || personal?.displayName || '',
    personal?.user?.apellidoPaterno,
  );

const normalizeRoleName = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getRoleTokens = (value: string | null | undefined) =>
  normalizeRoleName(value).split(/[^a-z0-9]+/).filter(Boolean);

const isSuperusuarioRole = (tokens: string[]) =>
  tokens.includes('superusuario') || (tokens.includes('super') && tokens.includes('usuario'));

const isSuperusuarioRoleId = (personal: PersonalOption) =>
  Number(personal.rolId ?? personal.user?.rolId ?? 0) === 8;

const isAssignablePersonalForGrupo = (personal: PersonalOption) => {
  const cargoTokens = getRoleTokens(personal.cargo);
  return (
    cargoTokens.includes('docente') ||
    cargoTokens.includes('coordinador') ||
    cargoTokens.includes('coordinadora') ||
    isSuperusuarioRole(cargoTokens) ||
    isSuperusuarioRoleId(personal)
  );
};

const isSemestreVigente = (semestre: SemestreOption, date: Date) => {
  if (!semestre.inicio || !semestre.fin) return false;
  const inicio = getDateOrNull(semestre.inicio);
  const fin = getDateOrNull(semestre.fin);
  if (!inicio || !fin) return false;

  const finInclusivo = new Date(fin);
  if (
    finInclusivo.getUTCHours() === 0 &&
    finInclusivo.getUTCMinutes() === 0 &&
    finInclusivo.getUTCSeconds() === 0 &&
    finInclusivo.getUTCMilliseconds() === 0
  ) {
    finInclusivo.setUTCHours(23, 59, 59, 999);
  }

  return inicio.getTime() <= date.getTime() && date.getTime() <= finInclusivo.getTime();
};

export function GrupoForm({ grupoId, asModal = false, onSaved, onCancel }: GrupoFormProps) {
  const [nombreDisplay, setNombreDisplay] = useState('');
  const [nombreManualEdit, setNombreManualEdit] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [turnoNombre, setTurnoNombre] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceCorreo, setWorkspaceCorreo] = useState('');
  const [workspaceManualEdit, setWorkspaceManualEdit] = useState(Boolean(grupoId));
  const [estado, setEstado] = useState('activo');
  const [archivado, setArchivado] = useState(false);
  const [semestreId, setSemestreId] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [horarioId, setHorarioId] = useState('');
  const [modulosOpciones, setModulosOpciones] = useState<ModuloOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [personal, setPersonal] = useState<PersonalOption[]>([]);
  const [turnos, setTurnos] = useState<TurnoOption[]>([]);
  const [horarios, setHorarios] = useState<HorarioOption[]>([]);
  const [grupoModulos, setGrupoModulos] = useState<GrupoModuloDetalle[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingGrupo, setLoadingGrupo] = useState(Boolean(grupoId));
  const [autoPeriodoAplicado, setAutoPeriodoAplicado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { settings } = useAppSettings();

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const functions = getFunctions(app);
        const listModulos = httpsCallable<undefined, { modulos?: ModuloOption[] }>(functions, 'listGrupoConfiguracionOpciones');
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const listPersonal = httpsCallable<undefined, { personal?: PersonalOption[] }>(functions, 'listPersonal');
        const listTurnos = httpsCallable<undefined, { turnos?: TurnoOption[] }>(functions, 'listTurnos');
        const listHorarios = httpsCallable<undefined, { horarios?: HorarioOption[] }>(functions, 'listHorarios');
        const [
          modulosResult,
          semestresResult,
          personalResult,
          turnosResult,
          horariosResult,
        ] = await Promise.all([
          listModulos(),
          listSemestres(),
          listPersonal(),
          listTurnos(),
          listHorarios(),
        ]);

        setModulosOpciones(
          (modulosResult.data.modulos || [])
            .slice()
            .sort((a, b) => String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es', { numeric: true })),
        );
        setSemestres(
          (semestresResult.data.semestres || [])
            .slice()
            .sort((a, b) => String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es', { numeric: true })),
        );
        setPersonal(
          (personalResult.data.personal || [])
            .slice()
            .filter(isAssignablePersonalForGrupo)
            .sort((a, b) => getPersonalUsername(a).localeCompare(getPersonalUsername(b), 'es', { numeric: true })),
        );
        setTurnos(
          (turnosResult.data.turnos || [])
            .slice()
            .sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { numeric: true })),
        );
        setHorarios(
          (horariosResult.data.horarios || [])
            .slice()
            .sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { numeric: true })),
        );
      } catch (err) {
        console.error('Error fetching grupo form options: ', err);
        setError('No se pudieron cargar las opciones para el formulario.');
      } finally {
        setLoadingOptions(false);
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchGrupo = async () => {
      if (!grupoId) return;

      setLoadingGrupo(true);
      try {
        const functions = getFunctions(app);
        const getGrupo = httpsCallable<{ id: number }, { grupo: GrupoData | null }>(functions, 'getGrupo');
        const result = await getGrupo({ id: Number(grupoId) });
        const fetched = result.data.grupo;

        if (fetched) {
          setNombreDisplay(fetched.nombreDisplay || '');
          setNombreManualEdit(!isNombreGrupoGenerado(fetched));
          setDescripcion(fetched.descripcion || '');
          setTurnoNombre(fetched.turnoNombre || '');
          setWorkspaceName(fetched.workspaceName || '');
          setWorkspaceCorreo(fetched.workspaceCorreo || '');
          setWorkspaceManualEdit(true);
          setEstado(fetched.estado || 'activo');
          setArchivado(Boolean(fetched.archivado));
          setSemestreId(fetched.semestreId != null ? String(fetched.semestreId) : '');
          setPersonalId(fetched.personalId != null ? String(fetched.personalId) : '');
          setTurnoId(fetched.turnoId != null ? String(fetched.turnoId) : '');
          setHorarioId(fetched.horarioId != null ? String(fetched.horarioId) : '');
          setGrupoModulos(fetched.grupoModulos || []);
        }
      } catch (err) {
        console.error('Error fetching grupo: ', err);
        setError('No se pudo cargar el grupo para edicion.');
      } finally {
        setLoadingGrupo(false);
      }
    };

    void fetchGrupo();
  }, [grupoId]);

  const semestreVigente = useMemo(
    () => {
      if (grupoId) return null;
      return semestres.find((semestre) => semestre.id === settings.general.semestreActualId)
        || semestres.find((semestre) => isSemestreVigente(semestre, new Date()))
        || null;
    },
    [grupoId, semestres, settings.general.semestreActualId],
  );

  useEffect(() => {
    if (grupoId || autoPeriodoAplicado || !semestreVigente) return;

    setSemestreId(String(semestreVigente.id));
    setAutoPeriodoAplicado(true);
  }, [autoPeriodoAplicado, grupoId, semestreVigente]);

  const selectedSemestre = semestres.find((semestre) => String(semestre.id) === semestreId) || null;
  const selectedPersonal = personal.find((item) => String(item.id) === personalId) || null;
  const selectedTurno = turnos.find((turno) => String(turno.id) === turnoId);
  const selectedHorario = horarios.find((horario) => String(horario.id) === horarioId) || null;
  const selectedPersonalName = getPersonalUsername(selectedPersonal);
  const nombreCalculado = useMemo(
    () => nombreGrupoCalculado(grupoModulos, selectedTurno?.nombre, selectedHorario?.nombre, selectedPersonalName),
    [selectedHorario, grupoModulos, selectedPersonalName, selectedTurno],
  );
  const nombreGrupo = nombreManualEdit ? nombreDisplay : nombreCalculado;

  useEffect(() => {
    if (nombreManualEdit) return;
    setNombreDisplay(nombreCalculado);
  }, [nombreCalculado, nombreManualEdit]);

  useEffect(() => {
    if (workspaceManualEdit) return;

    setWorkspaceName(buildWorkspaceName(selectedSemestre, grupoModulos, selectedPersonalName));
    setWorkspaceCorreo(buildWorkspaceCorreo(selectedSemestre, grupoModulos, selectedPersonalName));
  }, [grupoModulos, selectedPersonalName, selectedSemestre, workspaceManualEdit]);

  const handleEnableWorkspaceEdit = () => {
    setWorkspaceManualEdit(true);
  };

  const handleRestoreWorkspaceAuto = () => {
    setWorkspaceManualEdit(false);
    setWorkspaceName(buildWorkspaceName(selectedSemestre, grupoModulos, selectedPersonalName));
    setWorkspaceCorreo(buildWorkspaceCorreo(selectedSemestre, grupoModulos, selectedPersonalName));
  };

  const handleRestoreNombreAuto = () => {
    setNombreManualEdit(false);
    setNombreDisplay(nombreCalculado);
  };

  const updateGrupoModuloFecha = (
    moduloId: number,
    instancia: number | null | undefined,
    field: 'inicio' | 'fin',
    value: string,
  ) => {
    const key = getGrupoModuloKey(moduloId, instancia);
    setGrupoModulos((prev) =>
      prev.map((item) =>
        getGrupoModuloKey(item.moduloId, item.instancia) === key
          ? { ...item, [field]: value || null }
          : item,
      ),
    );
  };

  const updateGrupoModuloUnidadFecha = (
    moduloId: number,
    instancia: number | null | undefined,
    unidadDidacticaId: number,
    field: 'inicio' | 'fin',
    value: string,
  ) => {
    const key = getGrupoModuloKey(moduloId, instancia);
    setGrupoModulos((prev) =>
      prev.map((item) => {
        if (getGrupoModuloKey(item.moduloId, item.instancia) !== key) return item;
        return {
          ...item,
          unidadDidacticas: (item.unidadDidacticas ?? []).map((unidad) =>
            unidad.unidadDidacticaId === unidadDidacticaId
              ? { ...unidad, [field]: value || null }
              : unidad,
          ),
        };
      }),
    );
  };

  const agregarModulos = (moduloIds: number[]) => {
    const opciones = moduloIds
      .map(id => modulosOpciones.find(item => item.id === id))
      .filter((item): item is ModuloOption => Boolean(item) && !grupoModulos.some(gm => gm.moduloId === item?.id));
    if (grupoModulos.length + opciones.length > 6) {
      setError('El grupo admite como máximo seis instancias de módulos.');
      return;
    }
    setGrupoModulos(prev => {
      const nuevas = opciones.filter(item => !prev.some(gm => gm.moduloId === item.id));
      const ordenInicial = Math.max(0, ...prev.map(item => item.orden ?? 0));
      return [...prev, ...nuevas.map((option, index) => ({
        moduloId: option.id,
        modulo: option,
        instancia: 1,
        sufijo: null,
        orden: ordenInicial + index + 1,
        obligatorio: true,
        unidadDidacticas: (option.unidadDidacticas ?? []).map((ud, unidadIndex) => ({
          unidadDidacticaId: ud.id,
          unidadDidactica: ud,
          orden: unidadIndex + 1,
          inicio: null,
          fin: null,
        })),
      }))];
    });
  };
  const cambiarInstancias = (moduloId:number,count:number) => {
    setGrupoModulos(prev=>{
      const current=prev.filter(item=>item.moduloId===moduloId).sort((a,b)=>(a.instancia??1)-(b.instancia??1));
      const option=modulosOpciones.find(item=>item.id===moduloId);
      const units=(option?.unidadDidacticas??[]).map((ud,index)=>({unidadDidacticaId:ud.id,unidadDidactica:ud,orden:index+1,inicio:null,fin:null}));
      const expanded=Array.from({length:count},(_,index)=>current[index]??{moduloId,modulo:option??current[0]?.modulo,instancia:index+1,sufijo:null,orden:Math.max(0,...prev.map(item=>item.orden??0))+index+1,obligatorio:true,unidadDidacticas:units});
      const first=prev.findIndex(item=>item.moduloId===moduloId);
      const others=prev.filter(item=>item.moduloId!==moduloId);
      others.splice(first,0,...expanded);
      return others;
    });
  };
  const actualizarInstancia = (moduloId:number,instancia:number,values:Partial<GrupoModuloDetalle>) => setGrupoModulos(prev=>prev.map(item=>item.moduloId===moduloId&&(item.instancia??1)===instancia?{...item,...values}:item));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (loadingOptions) {
      setError('Espera a que carguen las opciones antes de guardar.');
      setLoading(false);
      return;
    }

    if (!nombreGrupo.trim()) {
      setError('El nombre del grupo es obligatorio.');
      setLoading(false);
      return;
    }

    if (!grupoModulos.length) {
      setError('Selecciona al menos un módulo.');
      setLoading(false);
      return;
    }

    const finalWorkspaceName = (workspaceName || (!grupoId ? buildWorkspaceName(selectedSemestre, grupoModulos, selectedPersonalName) : '')).trim();
    const finalWorkspaceCorreo = (workspaceCorreo || (!grupoId ? buildWorkspaceCorreo(selectedSemestre, grupoModulos, selectedPersonalName) : '')).trim();

    if (finalWorkspaceName.length > WORKSPACE_NAME_MAX_LENGTH) {
      setError('Nombre Workspace no puede superar 73 caracteres.');
      setLoading(false);
      return;
    }

    if (finalWorkspaceCorreo.length > WORKSPACE_CORREO_MAX_LENGTH) {
      setError('Correo Workspace no puede superar 80 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateGrupo = httpsCallable<
        {
          id?: number;
          nombreDisplay: string;
          workspaceName?: string | null;
          workspaceCorreo?: string | null;
          descripcion: string;
          turnoNombre: string;
          estado: string;
          archivado: boolean;
          semestreId?: number | null;
          personalId?: number | null;
          turnoId?: number | null;
          horarioId?: number | null;
          grupoModulos?: Array<{
            moduloId: number;
            instancia?: number | null;
            sufijo?: string | null;
            orden?: number | null;
            obligatorio?: boolean | null;
            inicio?: string | null;
            fin?: string | null;
            calendarioId?: number | null;
            unidadDidacticas?: Array<{
              unidadDidacticaId: number;
              orden?: number | null;
              inicio?: string | null;
              fin?: string | null;
            }>;
          }>;
        },
        { id: number | null; ids?: number[] }
      >(functions, 'createOrUpdateGrupo');

      await createOrUpdateGrupo({
        id: grupoId ? Number(grupoId) : undefined,
        nombreDisplay: nombreGrupo.trim(),
        workspaceName: finalWorkspaceName,
        workspaceCorreo: finalWorkspaceCorreo,
        descripcion,
        turnoNombre: selectedTurno?.nombre || turnoNombre,
        estado,
        archivado,
        semestreId: semestreId ? Number(semestreId) : null,
        personalId: personalId ? Number(personalId) : null,
        turnoId: turnoId ? Number(turnoId) : null,
        horarioId: horarioId ? Number(horarioId) : null,
        grupoModulos: grupoModulos.map((item) => ({
          moduloId: item.moduloId,
          instancia: item.instancia ?? 1,
          sufijo: item.sufijo?.trim() || null,
          orden: item.orden,
          obligatorio: item.obligatorio ?? true,
          inicio: item.inicio || null,
          fin: item.fin || null,
          calendarioId: item.calendarioId ?? null,
          unidadDidacticas: (item.unidadDidacticas ?? []).map((unidad) => ({
            unidadDidacticaId: unidad.unidadDidacticaId,
            orden: unidad.orden ?? null,
            inicio: unidad.inicio || null,
            fin: unidad.fin || null,
          })),
        })),
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/grupos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling grupo form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar grupos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el grupo: ${message}`);
      } else {
        setError('No se pudo guardar el grupo en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingGrupo) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) return loadingContent;
    return <Container maxWidth="sm">{loadingContent}</Container>;
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          {grupoId ? 'Editar Grupo' : 'Crear Grupo'}
        </Typography>
      )}

      {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }}>{error}</AutoDismissAlert>}

      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            '& .MuiFormControl-root': { m: 0 },
          }}
        >
          <TextField
            label="Nombre del grupo"
            value={nombreGrupo}
            onChange={(event) => {
              setNombreManualEdit(true);
              setNombreDisplay(event.target.value);
            }}
            fullWidth
            required
            InputProps={
              nombreManualEdit
                ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label="Restaurar nombre automatico"
                          onClick={handleRestoreNombreAuto}
                        >
                          <AutoFixHighIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                : undefined
            }
            sx={{ gridColumn: '1 / -1' }}
          />

          <TextField
            label="Nombre Workspace"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            fullWidth
            inputProps={{ maxLength: WORKSPACE_NAME_MAX_LENGTH }}
            InputProps={{
              readOnly: !workspaceManualEdit,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label={workspaceManualEdit ? 'Restaurar calculo automatico' : 'Editar campos Workspace'}
                    onClick={workspaceManualEdit ? handleRestoreWorkspaceAuto : handleEnableWorkspaceEdit}
                  >
                    {workspaceManualEdit ? <AutoFixHighIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={`${workspaceName.length}/${WORKSPACE_NAME_MAX_LENGTH}`}
            sx={{ gridColumn: '1 / -1' }}
          />

          <TextField
            label="Correo Workspace"
            value={workspaceCorreo}
            onChange={(event) => setWorkspaceCorreo(event.target.value)}
            fullWidth
            inputProps={{ maxLength: WORKSPACE_CORREO_MAX_LENGTH }}
            InputProps={{
              readOnly: !workspaceManualEdit,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label={workspaceManualEdit ? 'Restaurar calculo automatico' : 'Editar campos Workspace'}
                    onClick={workspaceManualEdit ? handleRestoreWorkspaceAuto : handleEnableWorkspaceEdit}
                  >
                    {workspaceManualEdit ? <AutoFixHighIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={`${workspaceCorreo.length}/${WORKSPACE_CORREO_MAX_LENGTH}`}
            sx={{ gridColumn: '1 / -1' }}
          />

          <MultiSelectWithActions<number>
            label="Módulos para agregar"
            labelId="grupo-modulo-agregar-label"
            value={EMPTY_MODULE_SELECTION}
            options={modulosOpciones
              .filter(item => !grupoModulos.some(gm => gm.moduloId === item.id))
              .map(item => ({ value: item.id, label: item.titulo || `Módulo ${item.id}` }))}
            onChange={agregarModulos}
            getOptionDisabled={(option, pendientes) =>
              !pendientes.includes(option.value) && pendientes.length >= 6 - grupoModulos.length}
            disabled={loadingOptions || grupoModulos.length >= 6}
            displayEmpty
            size="medium"
            sx={{ gridColumn: '1 / -1' }}
          />
          {Array.from(new Set(grupoModulos.map(item=>item.moduloId))).map(moduloId=>{
            const items=grupoModulos.filter(item=>item.moduloId===moduloId);
            return <Box key={moduloId} sx={{gridColumn:'1 / -1',display:'flex',gap:1,alignItems:'center'}}>
              <Typography sx={{flex:1}}>{tituloModulo(items[0])}</Typography>
              <FormControl size="small" sx={{minWidth:110}}>
                <InputLabel id={`grupo-instancias-${moduloId}-label`}>Instancias</InputLabel>
                <Select labelId={`grupo-instancias-${moduloId}-label`} label="Instancias" value={items.length} onChange={event=>cambiarInstancias(moduloId,Number(event.target.value))}>
                  {Array.from({length:6-grupoModulos.length+items.length},(_,index)=><MenuItem key={index+1} value={index+1}>{index+1}</MenuItem>)}
                </Select>
              </FormControl>
              <Button color="error" size="small" onClick={()=>setGrupoModulos(prev=>prev.filter(item=>item.moduloId!==moduloId))}>Quitar</Button>
            </Box>;
          })}

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}>
            <InputLabel>Semestre</InputLabel>
            <Select
              label="Semestre"
              value={semestreId}
              onChange={(event) => setSemestreId(String(event.target.value))}
              disabled={loadingOptions}
            >
              <MenuItem value="">Sin semestre</MenuItem>
              {semestreId && !semestres.some((semestre) => String(semestre.id) === semestreId) ? (
                <MenuItem value={semestreId} disabled>
                  Semestre actual no disponible
                </MenuItem>
              ) : null}
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}>
            <InputLabel>Turno</InputLabel>
            <Select
              label="Turno"
              value={turnoId}
              onChange={(event) => setTurnoId(String(event.target.value))}
              disabled={loadingOptions}
            >
              <MenuItem value="">Sin turno</MenuItem>
              {turnos.map((turno) => (
                <MenuItem key={turno.id} value={String(turno.id)}>
                  {turno.nombre || `Turno ${turno.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Horario</InputLabel>
            <Select
              label="Horario"
              value={horarioId}
              onChange={(event) => setHorarioId(String(event.target.value))}
              disabled={loadingOptions}
            >
              <MenuItem value="">Sin horario</MenuItem>
              {horarios.map((horario) => (
                <MenuItem key={horario.id} value={String(horario.id)}>
                  {horario.nombre || `Horario ${horario.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel id="grupo-estado-label">Estado</InputLabel>
            <Select labelId="grupo-estado-label" label="Estado" value={estado} onChange={event => setEstado(String(event.target.value))}>
              {estado && !['activo', 'inactivo'].includes(estado) && <MenuItem value={estado}>{estado}</MenuItem>}
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo (oculto en formularios de matrícula)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 8' } }}>
            <InputLabel>Personal</InputLabel>
            <Select
              label="Personal"
              value={personalId}
              onChange={(event) => setPersonalId(String(event.target.value))}
              disabled={loadingOptions}
            >
              <MenuItem value="">Sin personal</MenuItem>
              {personalId && !personal.some((item) => String(item.id) === personalId) ? (
                <MenuItem value={personalId} disabled>
                  Personal actual no disponible
                </MenuItem>
              ) : null}
              {personal.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {getPersonalUsername(item) || `Personal ${item.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />

          {grupoModulos.length > 0 && (
            <Box sx={{ gridColumn: '1 / -1', mt: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Programacion academica
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {grupoModulos.map((modulo) => (
                  <Box
                    key={getGrupoModuloKey(modulo.moduloId, modulo.instancia)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1.5,
                      display: 'grid',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: { xs: '1fr', md: '1fr 160px 160px' },
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="subtitle2">{getModuloLabel(modulo)}</Typography>
                      <TextField
                        label="Inicio"
                        type="date"
                        value={toDateInputValue(modulo.inicio)}
                        onChange={(event) =>
                          updateGrupoModuloFecha(modulo.moduloId, modulo.instancia, 'inicio', event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                      <TextField
                        label="Fin"
                        type="date"
                        value={toDateInputValue(modulo.fin)}
                        onChange={(event) =>
                          updateGrupoModuloFecha(modulo.moduloId, modulo.instancia, 'fin', event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Box>

                    <Box sx={{display:'flex',gap:1,alignItems:'center',flexWrap:'wrap'}}>
                      <TextField label={`Sufijo de instancia ${modulo.instancia??1}`} value={modulo.sufijo??''} onChange={event=>actualizarInstancia(modulo.moduloId,modulo.instancia??1,{sufijo:event.target.value})} inputProps={{maxLength:80}} size="small" sx={{flex:1,minWidth:180}} />
                      <TextField label="Orden" type="number" value={modulo.orden??''} onChange={event=>actualizarInstancia(modulo.moduloId,modulo.instancia??1,{orden:event.target.value?Number(event.target.value):null})} size="small" inputProps={{min:1}} sx={{width:100}} />
                      <FormControlLabel label="Obligatorio" control={<Checkbox checked={modulo.obligatorio??true} onChange={event=>actualizarInstancia(modulo.moduloId,modulo.instancia??1,{obligatorio:event.target.checked})} />} />
                    </Box>

                    {(modulo.unidadDidacticas ?? []).length > 0 && (
                      <>
                        <Divider />
                        <Box sx={{ display: 'grid', gap: 1 }}>
                          {(modulo.unidadDidacticas ?? []).map((unidad) => (
                            <Box
                              key={`${getGrupoModuloKey(modulo.moduloId, modulo.instancia)}:${unidad.unidadDidacticaId}`}
                              sx={{
                                display: 'grid',
                                gap: 1,
                                gridTemplateColumns: { xs: '1fr', md: '1fr 160px 160px' },
                                alignItems: 'center',
                              }}
                            >
                              <Typography variant="body2">{getUnidadLabel(unidad)}</Typography>
                              <TextField
                                label="Inicio"
                                type="date"
                                value={toDateInputValue(unidad.inicio)}
                                onChange={(event) =>
                                  updateGrupoModuloUnidadFecha(
                                    modulo.moduloId,
                                    modulo.instancia,
                                    unidad.unidadDidacticaId,
                                    'inicio',
                                    event.target.value,
                                  )
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                              <TextField
                                label="Fin"
                                type="date"
                                value={toDateInputValue(unidad.fin)}
                                onChange={(event) =>
                                  updateGrupoModuloUnidadFecha(
                                    modulo.moduloId,
                                    modulo.instancia,
                                    unidad.unidadDidacticaId,
                                    'fin',
                                    event.target.value,
                                  )
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <FormControlLabel
            control={<Checkbox checked={archivado} onChange={(event) => setArchivado(event.target.checked)} />}
            label="Archivado"
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading || loadingOptions}>
            {loading ? <CircularProgress size={24} /> : (grupoId ? 'Actualizar' : 'Crear')}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );

  if (asModal) return formContent;
  return <Container maxWidth="md">{formContent}</Container>;
}
