'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { getPersonalShortName } from './personalName';

interface GrupoFormProps {
  grupoId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

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
  paqueteId: number | null;
  turnoId: number | null;
  horarioId: number | null;
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

interface PaqueteModuloOption {
  id: number;
  orden: number | null;
  obligatorio: boolean | null;
  paqueteId: number;
  moduloId: number;
  modulo?: ModuloResumen | null;
  unidadDidacticas?: UnidadDidacticaResumen[];
}

interface PaqueteOption {
  id: number;
  titulo: string | null;
  paqueteModulos?: PaqueteModuloOption[];
  moduloIds?: number[];
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
  userUsername?: string | null;
  user?: { username?: string | null; apellidoPaterno?: string | null } | null;
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

const trimPackageFromRight = (packageName: string, prefix: string, suffix: string, maxLength: number) => {
  const available = maxLength - prefix.length - suffix.length;
  const trimmedPackageName = packageName.slice(0, Math.max(0, available));
  const value = `${prefix}${trimmedPackageName}${suffix}`;
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

const getPrimaryPaqueteModulo = (paquete: PaqueteOption | undefined) =>
  (paquete?.paqueteModulos ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)[0] ?? null;

const getOrdenText = (value: number | string | null | undefined) =>
  value == null || value === '' ? '' : String(value);

const buildWorkspaceName = (
  semestre: SemestreOption | null,
  paquete: PaqueteOption | undefined,
  personalName: string,
) => {
  const paqueteModulo = getPrimaryPaqueteModulo(paquete);
  const semestreCodigo = getSemestreCodigo(semestre?.titulo);
  const ordenEspecialidad = getOrdenText(paqueteModulo?.modulo?.plan?.carrera?.especialidad?.orden);
  const ordenModulo = getOrdenText(paqueteModulo?.modulo?.orden ?? paqueteModulo?.orden);
  if (!semestreCodigo || !paquete?.titulo || !personalName) {
    return '';
  }

  const prefix = `:${semestreCodigo}_${ordenEspecialidad}.${ordenModulo} `;
  const suffix = personalName ? ` - ${personalName}` : '';
  return trimPackageFromRight(paquete?.titulo?.trim() || '', prefix, suffix, WORKSPACE_NAME_MAX_LENGTH);
};

const buildWorkspaceCorreo = (
  semestre: SemestreOption | null,
  paquete: PaqueteOption | undefined,
  personalName: string,
) => {
  const semestreCodigo = getSemestreCodigo(semestre?.titulo);
  if (!semestreCodigo || !paquete?.titulo || !personalName) {
    return '';
  }

  const packageSegment = normalizeEmailSegment(paquete?.titulo);
  const personalSegment = normalizeEmailSegment(personalName);
  const prefix = semestreCodigo ? `${semestreCodigo}-` : '';
  const suffix = `${personalSegment ? `-${personalSegment}` : ''}${WORKSPACE_EMAIL_DOMAIN}`;
  return trimPackageFromRight(packageSegment, prefix, suffix, WORKSPACE_CORREO_MAX_LENGTH);
};

const buildGrupoModulosFromPaquete = (
  paquete: PaqueteOption | undefined,
  current: GrupoModuloDetalle[],
): GrupoModuloDetalle[] => {
  if (!paquete) return current;

  const currentByModuloId = new Map(current.map((item) => [item.moduloId, item]));
  const paqueteModulos = paquete.paqueteModulos && paquete.paqueteModulos.length > 0
    ? paquete.paqueteModulos
    : (paquete.moduloIds || []).map((moduloId, index) => ({
        id: index + 1,
        orden: index + 1,
        obligatorio: true,
        paqueteId: paquete.id,
        moduloId,
        modulo: null,
        unidadDidacticas: [],
      }));

  return paqueteModulos
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
    .map((paqueteModulo, index) => {
      const existing = currentByModuloId.get(paqueteModulo.moduloId);
      const existingUnidadById = new Map(
        (existing?.unidadDidacticas ?? []).map((item) => [item.unidadDidacticaId, item]),
      );
      const paqueteUnidades = paqueteModulo.unidadDidacticas ?? [];
      const unidadDidacticas = paqueteUnidades.length > 0
        ? paqueteUnidades.map((unidadDidactica, unidadIndex) => {
            const existingUnidad = existingUnidadById.get(unidadDidactica.id);
            return {
              id: existingUnidad?.id,
              grupoModuloId: existingUnidad?.grupoModuloId,
              unidadDidacticaId: unidadDidactica.id,
              unidadDidactica: existingUnidad?.unidadDidactica || unidadDidactica,
              orden: existingUnidad?.orden ?? unidadIndex + 1,
              inicio: existingUnidad?.inicio ?? null,
              fin: existingUnidad?.fin ?? null,
            };
          })
        : existing?.unidadDidacticas ?? [];

      return {
        id: existing?.id,
        grupoId: existing?.grupoId,
        moduloId: paqueteModulo.moduloId,
        modulo: existing?.modulo || paqueteModulo.modulo || null,
        orden: existing?.orden ?? paqueteModulo.orden ?? index + 1,
        obligatorio: existing?.obligatorio ?? paqueteModulo.obligatorio ?? true,
        inicio: existing?.inicio ?? null,
        fin: existing?.fin ?? null,
        calendarioId: existing?.calendarioId ?? null,
        unidadDidacticas,
      };
    });
};

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const getModuloLabel = (modulo: GrupoModuloDetalle) =>
  modulo.modulo?.tituloComercial || modulo.modulo?.titulo || `Modulo ${modulo.moduloId}`;

const getUnidadLabel = (unidad: GrupoModuloUnidadDidacticaDetalle) =>
  unidad.unidadDidactica?.sigla
    ? `${unidad.unidadDidactica.sigla} - ${unidad.unidadDidactica.nombre || `Unidad ${unidad.unidadDidacticaId}`}`
    : unidad.unidadDidactica?.nombre || `Unidad ${unidad.unidadDidacticaId}`;

const getDateOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

const isAssignablePersonalForGrupo = (personal: PersonalOption) => {
  const cargo = normalizeRoleName(personal.cargo);
  return cargo === 'docente' || cargo === 'coordinador' || cargo === 'coordinadora';
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
  const [descripcion, setDescripcion] = useState('');
  const [turnoNombre, setTurnoNombre] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceCorreo, setWorkspaceCorreo] = useState('');
  const [workspaceManualEdit, setWorkspaceManualEdit] = useState(false);
  const [estado, setEstado] = useState('activo');
  const [archivado, setArchivado] = useState(false);
  const [paqueteId, setPaqueteId] = useState('');
  const [semestreId, setSemestreId] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [horarioId, setHorarioId] = useState('');
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([]);
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

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const functions = getFunctions(app);
        const listPaquetes = httpsCallable<undefined, { paquetes?: PaqueteOption[] }>(functions, 'listPaquetes');
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const listPersonal = httpsCallable<undefined, { personal?: PersonalOption[] }>(functions, 'listPersonal');
        const listTurnos = httpsCallable<undefined, { turnos?: TurnoOption[] }>(functions, 'listTurnos');
        const listHorarios = httpsCallable<undefined, { horarios?: HorarioOption[] }>(functions, 'listHorarios');
        const [
          paquetesResult,
          semestresResult,
          personalResult,
          turnosResult,
          horariosResult,
        ] = await Promise.all([
          listPaquetes(),
          listSemestres(),
          listPersonal(),
          listTurnos(),
          listHorarios(),
        ]);

        setPaquetes(
          (paquetesResult.data.paquetes || [])
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
          setDescripcion(fetched.descripcion || '');
          setTurnoNombre(fetched.turnoNombre || '');
          setWorkspaceName(fetched.workspaceName || '');
          setWorkspaceCorreo(fetched.workspaceCorreo || '');
          setEstado(fetched.estado || 'activo');
          setArchivado(Boolean(fetched.archivado));
          setPaqueteId(fetched.paqueteId != null ? String(fetched.paqueteId) : '');
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
    () => (!grupoId ? semestres.find((semestre) => isSemestreVigente(semestre, new Date())) || null : null),
    [grupoId, semestres],
  );

  useEffect(() => {
    if (grupoId || autoPeriodoAplicado || !semestreVigente) return;

    setSemestreId(String(semestreVigente.id));
    setAutoPeriodoAplicado(true);
  }, [autoPeriodoAplicado, grupoId, semestreVigente]);

  useEffect(() => {
    if (!paqueteId) {
      setGrupoModulos([]);
      return;
    }

    const paquete = paquetes.find((item) => String(item.id) === paqueteId);
    if (!paquete) return;
    setGrupoModulos((prev) => buildGrupoModulosFromPaquete(paquete, prev));
  }, [paqueteId, paquetes]);

  const selectedPaquete = paquetes.find((paquete) => String(paquete.id) === paqueteId);
  const selectedSemestre = semestres.find((semestre) => String(semestre.id) === semestreId) || null;
  const selectedPersonal = personal.find((item) => String(item.id) === personalId) || null;
  const selectedTurno = turnos.find((turno) => String(turno.id) === turnoId);
  const selectedHorario = horarios.find((horario) => String(horario.id) === horarioId) || null;
  const selectedPersonalName = getPersonalUsername(selectedPersonal);
  const nombreCalculado = useMemo(
    () =>
      [
        getSemestreCodigo(selectedSemestre?.titulo),
        selectedPaquete?.titulo?.trim() || '',
        selectedTurno?.nombre ? `[${selectedTurno.nombre}]` : '',
        selectedHorario?.nombre?.trim() || '',
        selectedPersonalName ? `(${selectedPersonalName})` : '',
      ].filter(Boolean).join(' '),
    [selectedHorario, selectedPaquete, selectedPersonalName, selectedSemestre, selectedTurno],
  );

  useEffect(() => {
    if (workspaceManualEdit) return;

    setWorkspaceName(buildWorkspaceName(selectedSemestre, selectedPaquete, selectedPersonalName));
    setWorkspaceCorreo(buildWorkspaceCorreo(selectedSemestre, selectedPaquete, selectedPersonalName));
  }, [selectedPaquete, selectedPersonalName, selectedSemestre, workspaceManualEdit]);

  const handleEnableWorkspaceEdit = () => {
    setWorkspaceManualEdit(true);
  };

  const handleRestoreWorkspaceAuto = () => {
    setWorkspaceManualEdit(false);
    setWorkspaceName(buildWorkspaceName(selectedSemestre, selectedPaquete, selectedPersonalName));
    setWorkspaceCorreo(buildWorkspaceCorreo(selectedSemestre, selectedPaquete, selectedPersonalName));
  };

  const updateGrupoModuloFecha = (moduloId: number, field: 'inicio' | 'fin', value: string) => {
    setGrupoModulos((prev) =>
      prev.map((item) =>
        item.moduloId === moduloId
          ? { ...item, [field]: value || null }
          : item,
      ),
    );
  };

  const updateGrupoModuloUnidadFecha = (
    moduloId: number,
    unidadDidacticaId: number,
    field: 'inicio' | 'fin',
    value: string,
  ) => {
    setGrupoModulos((prev) =>
      prev.map((item) => {
        if (item.moduloId !== moduloId) return item;
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (loadingOptions) {
      setError('Espera a que carguen las opciones antes de guardar.');
      setLoading(false);
      return;
    }

    if (!nombreCalculado.trim()) {
      setError('El nombre del grupo es obligatorio.');
      setLoading(false);
      return;
    }

    if (!paqueteId) {
      setError('Selecciona un paquete.');
      setLoading(false);
      return;
    }

    if (workspaceName.length > WORKSPACE_NAME_MAX_LENGTH) {
      setError('Nombre Workspace no puede superar 73 caracteres.');
      setLoading(false);
      return;
    }

    if (workspaceCorreo.length > WORKSPACE_CORREO_MAX_LENGTH) {
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
          paqueteId?: number | null;
          semestreId?: number | null;
          personalId?: number | null;
          turnoId?: number | null;
          horarioId?: number | null;
          grupoModulos?: Array<{
            moduloId: number;
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
        nombreDisplay: nombreCalculado.trim(),
        workspaceName,
        workspaceCorreo,
        descripcion,
        turnoNombre: selectedTurno?.nombre || turnoNombre,
        estado,
        archivado,
        paqueteId: paqueteId ? Number(paqueteId) : null,
        semestreId: semestreId ? Number(semestreId) : null,
        personalId: personalId ? Number(personalId) : null,
        turnoId: turnoId ? Number(turnoId) : null,
        horarioId: horarioId ? Number(horarioId) : null,
        grupoModulos: grupoModulos.map((item) => ({
          moduloId: item.moduloId,
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            value={nombreCalculado}
            fullWidth
            required
            disabled
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

          <FormControl fullWidth required sx={{ gridColumn: '1 / -1' }}>
            <InputLabel>Paquete</InputLabel>
            <Select
              label="Paquete"
              value={paqueteId}
              onChange={(event) => setPaqueteId(String(event.target.value))}
              disabled={loadingOptions}
            >
              <MenuItem value="">Selecciona un paquete</MenuItem>
              {paquetes.map((paquete) => (
                <MenuItem key={paquete.id} value={String(paquete.id)}>
                  {paquete.titulo || `Paquete ${paquete.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <TextField
            label="Estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

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
                    key={modulo.moduloId}
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
                        onChange={(event) => updateGrupoModuloFecha(modulo.moduloId, 'inicio', event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                      <TextField
                        label="Fin"
                        type="date"
                        value={toDateInputValue(modulo.fin)}
                        onChange={(event) => updateGrupoModuloFecha(modulo.moduloId, 'fin', event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Box>

                    {(modulo.unidadDidacticas ?? []).length > 0 && (
                      <>
                        <Divider />
                        <Box sx={{ display: 'grid', gap: 1 }}>
                          {(modulo.unidadDidacticas ?? []).map((unidad) => (
                            <Box
                              key={unidad.unidadDidacticaId}
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
