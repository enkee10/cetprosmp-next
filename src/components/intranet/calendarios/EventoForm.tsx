'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface EventoFormProps {
  eventoId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface EventoRelacionData {
  id: number;
  entidadTipo: string | null;
  entidadId: number | null;
}

interface EventoRecurrenciaData {
  id: number;
  frecuencia: string | null;
  intervalo: number | null;
  diasSemana: string | null;
  diaMes: number | null;
  semanaMes: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  cantidadOcurrencias: number | null;
  reglaEspecial: string | null;
  activo: boolean | null;
  horarioId: number | null;
  turnoId: number | null;
}

interface EventoOcurrenciaData {
  id: number;
}

interface EventoData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  tipoEvento: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  todoElDia: boolean | null;
  ubicacion: string | null;
  color: string | null;
  estado: string | null;
  calendarioId: number;
  semestreId: number | null;
  relaciones?: EventoRelacionData[];
  recurrencias?: EventoRecurrenciaData[];
  ocurrencias?: EventoOcurrenciaData[];
}

interface CalendarioOption {
  id: number;
  titulo: string | null;
  activo: boolean | null;
  anioId?: number | null;
  semestreId?: number | null;
}

interface GrupoOption {
  id: number;
  nombreDisplay: string | null;
  turnoNombre: string | null;
  turno?: { nombre: string | null } | null;
  estado: string | null;
  grupoModulos?: GrupoModuloOption[];
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  archivado: boolean | null;
  anioId?: number | null;
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

interface GrupoModuloOption {
  id: number;
  orden: number | null;
  obligatorio: boolean | null;
  grupoId: number;
  moduloId: number;
  modulo?: {
    titulo: string | null;
    tituloComercial: string | null;
  } | null;
}

interface ModuloOption {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
}

interface UnidadDidacticaOption {
  id: number;
  nombre: string | null;
  sigla: string | null;
}

interface TextoAcademicoOption {
  id: number;
  descripcion: string | null;
  sigla: string | null;
}

interface ActividadOption {
  id: number;
  nombre: string | null;
  descripcion: string | null;
}

interface RelationRow {
  key: string;
  entidadTipo: string;
  entidadId: string;
}

const EVENTO_TIPOS = ['clase', 'evaluacion', 'feriado', 'reunion', 'actividad', 'otro'];
const EVENTO_ESTADOS = ['programado', 'confirmado', 'cancelado', 'realizado'];
const RECURRENCIA_FRECUENCIAS = ['diaria', 'semanal', 'mensual'];

const RELATION_TYPES = [
  { value: 'grupo', label: 'Grupo' },
  { value: 'grupo_modulo', label: 'Grupo + modulo' },
  { value: 'modulo', label: 'Modulo' },
  { value: 'unidad_didactica', label: 'Unidad didactica' },
  { value: 'capacidad_terminal', label: 'Capacidad terminal' },
  { value: 'indicador_capacidad', label: 'Indicador de capacidad' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'grupo_unidad_didactica', label: 'Grupo + unidad didactica' },
  { value: 'grupo_unidad_didactica_actividad', label: 'Grupo + actividad' },
];

const DIAS_SEMANA = [
  { value: '1', label: 'L' },
  { value: '2', label: 'M' },
  { value: '3', label: 'X' },
  { value: '4', label: 'J' },
  { value: '5', label: 'V' },
  { value: '6', label: 'S' },
  { value: '0', label: 'D' },
];

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const dateTimeLocalToIso = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getGrupoLabel = (grupo: GrupoOption) =>
  [grupo.nombreDisplay || `Grupo ${grupo.id}`, grupo.turno?.nombre || grupo.turnoNombre].filter(Boolean).join(' - ');

const getGrupoModuloLabel = (grupo: GrupoOption, grupoModulo: GrupoModuloOption) =>
  [
    getGrupoLabel(grupo),
    grupoModulo.modulo?.tituloComercial || grupoModulo.modulo?.titulo || `Modulo ${grupoModulo.moduloId}`,
  ].filter(Boolean).join(' / ');

const getTextLabel = (item: TextoAcademicoOption) =>
  [item.sigla, item.descripcion || `Registro ${item.id}`].filter(Boolean).join(' - ');

const makeRelationKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function EventoForm({ eventoId, asModal = false, onSaved, onCancel }: EventoFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [todoElDia, setTodoElDia] = useState(false);
  const [ubicacion, setUbicacion] = useState('');
  const [color, setColor] = useState('#2e7d32');
  const [estado, setEstado] = useState('programado');
  const [calendarioId, setCalendarioId] = useState('');
  const [semestreId, setSemestreId] = useState('');
  const [relaciones, setRelaciones] = useState<RelationRow[]>([]);
  const [recurrenciaActiva, setRecurrenciaActiva] = useState(false);
  const [frecuencia, setFrecuencia] = useState('semanal');
  const [intervalo, setIntervalo] = useState('1');
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [diaMes, setDiaMes] = useState('');
  const [fechaRecurrenciaInicio, setFechaRecurrenciaInicio] = useState('');
  const [fechaRecurrenciaFin, setFechaRecurrenciaFin] = useState('');
  const [cantidadOcurrencias, setCantidadOcurrencias] = useState('16');
  const [reglaEspecial, setReglaEspecial] = useState('');
  const [recurrenciaHorarioId, setRecurrenciaHorarioId] = useState('');
  const [recurrenciaTurnoId, setRecurrenciaTurnoId] = useState('');
  const [generarOcurrencias, setGenerarOcurrencias] = useState(true);
  const [ocurrenciasGuardadas, setOcurrenciasGuardadas] = useState(0);
  const [calendarios, setCalendarios] = useState<CalendarioOption[]>([]);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [turnos, setTurnos] = useState<TurnoOption[]>([]);
  const [horarios, setHorarios] = useState<HorarioOption[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [unidadesDidacticas, setUnidadesDidacticas] = useState<UnidadDidacticaOption[]>([]);
  const [capacidadesTerminales, setCapacidadesTerminales] = useState<TextoAcademicoOption[]>([]);
  const [indicadoresCapacidad, setIndicadoresCapacidad] = useState<TextoAcademicoOption[]>([]);
  const [aprendizajes, setAprendizajes] = useState<TextoAcademicoOption[]>([]);
  const [actividades, setActividades] = useState<ActividadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvento, setLoadingEvento] = useState(Boolean(eventoId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listCalendarios = httpsCallable<undefined, { calendarios?: CalendarioOption[] }>(
          functions,
          'listCalendarios',
        );
        const listGrupos = httpsCallable<undefined, { grupos?: GrupoOption[] }>(functions, 'listGrupos');
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const listTurnos = httpsCallable<undefined, { turnos?: TurnoOption[] }>(functions, 'listTurnos');
        const listHorarios = httpsCallable<undefined, { horarios?: HorarioOption[] }>(functions, 'listHorarios');
        const listModulos = httpsCallable<undefined, { modulos?: ModuloOption[] }>(functions, 'listModulos');
        const listUnidadesDidacticas = httpsCallable<undefined, { unidadesDidacticas?: UnidadDidacticaOption[] }>(
          functions,
          'listUnidadesDidacticas',
        );
        const listCapacidadesTerminales = httpsCallable<undefined, { capacidadesTerminales?: TextoAcademicoOption[] }>(
          functions,
          'listCapacidadesTerminales',
        );
        const listIndicadoresCapacidad = httpsCallable<undefined, { indicadoresCapacidad?: TextoAcademicoOption[] }>(
          functions,
          'listIndicadoresCapacidad',
        );
        const listAprendizajes = httpsCallable<undefined, { aprendizajes?: TextoAcademicoOption[] }>(
          functions,
          'listAprendizajes',
        );
        const listActividades = httpsCallable<undefined, { actividades?: ActividadOption[] }>(
          functions,
          'listActividades',
        );

        const [
          calendariosResult,
          gruposResult,
          semestresResult,
          turnosResult,
          horariosResult,
          modulosResult,
          unidadesResult,
          capacidadesResult,
          indicadoresResult,
          aprendizajesResult,
          actividadesResult,
        ] = await Promise.all([
          listCalendarios(),
          listGrupos(),
          listSemestres(),
          listTurnos(),
          listHorarios(),
          listModulos(),
          listUnidadesDidacticas(),
          listCapacidadesTerminales(),
          listIndicadoresCapacidad(),
          listAprendizajes(),
          listActividades(),
        ]);

        setCalendarios(calendariosResult.data.calendarios || []);
        setGrupos(gruposResult.data.grupos || []);
        setSemestres(semestresResult.data.semestres || []);
        setTurnos(turnosResult.data.turnos || []);
        setHorarios(horariosResult.data.horarios || []);
        setModulos(modulosResult.data.modulos || []);
        setUnidadesDidacticas(unidadesResult.data.unidadesDidacticas || []);
        setCapacidadesTerminales(capacidadesResult.data.capacidadesTerminales || []);
        setIndicadoresCapacidad(indicadoresResult.data.indicadoresCapacidad || []);
        setAprendizajes(aprendizajesResult.data.aprendizajes || []);
        setActividades(actividadesResult.data.actividades || []);
      } catch (err) {
        console.error('Error fetching evento options: ', err);
        setError('No se pudieron cargar las opciones para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchEvento = async () => {
      if (!eventoId) return;

      setLoadingEvento(true);
      try {
        const functions = getFunctions(app);
        const getEvento = httpsCallable<{ id: number }, { evento: EventoData | null }>(functions, 'getEvento');
        const result = await getEvento({ id: Number(eventoId) });
        const fetched = result.data.evento;

        if (fetched) {
          const recurrencia = fetched.recurrencias?.find((item) => item.activo) || fetched.recurrencias?.[0] || null;

          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
          setTipoEvento(fetched.tipoEvento || '');
          setFechaInicio(toDateTimeLocal(fetched.fechaInicio));
          setFechaFin(toDateTimeLocal(fetched.fechaFin));
          setTodoElDia(Boolean(fetched.todoElDia));
          setUbicacion(fetched.ubicacion || '');
          setColor(fetched.color || '#2e7d32');
          setEstado(fetched.estado || 'programado');
          setCalendarioId(String(fetched.calendarioId));
          setSemestreId(fetched.semestreId != null ? String(fetched.semestreId) : '');
          setRelaciones((fetched.relaciones || [])
            .filter((relacion) => relacion.entidadTipo && relacion.entidadId)
            .map((relacion) => ({
              key: `saved-${relacion.id}`,
              entidadTipo: relacion.entidadTipo || '',
              entidadId: relacion.entidadId != null ? String(relacion.entidadId) : '',
            })));
          setOcurrenciasGuardadas(fetched.ocurrencias?.length || 0);

          if (recurrencia) {
            setRecurrenciaActiva(Boolean(recurrencia.activo));
            setFrecuencia(recurrencia.frecuencia || 'semanal');
            setIntervalo(recurrencia.intervalo != null ? String(recurrencia.intervalo) : '1');
            setDiasSemana((recurrencia.diasSemana || '').split(',').filter(Boolean));
            setDiaMes(recurrencia.diaMes != null ? String(recurrencia.diaMes) : '');
            setFechaRecurrenciaInicio(toDateTimeLocal(recurrencia.fechaInicio));
            setFechaRecurrenciaFin(toDateTimeLocal(recurrencia.fechaFin));
            setCantidadOcurrencias(recurrencia.cantidadOcurrencias != null ? String(recurrencia.cantidadOcurrencias) : '16');
            setReglaEspecial(recurrencia.reglaEspecial || '');
            setRecurrenciaHorarioId(recurrencia.horarioId != null ? String(recurrencia.horarioId) : '');
            setRecurrenciaTurnoId(recurrencia.turnoId != null ? String(recurrencia.turnoId) : '');
          }
        }
      } catch (err) {
        console.error('Error fetching evento: ', err);
        setError('No se pudo cargar el evento para edicion.');
      } finally {
        setLoadingEvento(false);
      }
    };

    void fetchEvento();
  }, [eventoId]);

  const semestreTitleById = useMemo(
    () => new Map(semestres.map((semestre) => [String(semestre.id), semestre.titulo || `Semestre ${semestre.id}`])),
    [semestres],
  );

  const selectedCalendario = useMemo(
    () => calendarios.find((calendario) => String(calendario.id) === calendarioId) || null,
    [calendarioId, calendarios],
  );

  const filteredSemestres = useMemo(() => {
    if (!calendarioId) return [];
    if (!selectedCalendario) return [];
    if (selectedCalendario.semestreId != null) {
      return semestres.filter((semestre) => Number(semestre.id) === Number(selectedCalendario.semestreId));
    }
    if (selectedCalendario.anioId == null) return [];
    return semestres.filter(
      (semestre) => semestre.anioId != null && Number(semestre.anioId) === Number(selectedCalendario.anioId),
    );
  }, [calendarioId, selectedCalendario, semestres]);

  useEffect(() => {
    if (!calendarioId || !semestreId || !selectedCalendario) return;
    if (filteredSemestres.some((semestre) => String(semestre.id) === semestreId)) return;
    setSemestreId('');
  }, [calendarioId, filteredSemestres, selectedCalendario, semestreId]);

  const relationOptionsByType = useMemo(() => {
    const toOptions = <T extends { id: number }>(items: T[], getLabel: (item: T) => string) =>
      items.map((item) => ({ id: String(item.id), label: getLabel(item) }));
    const grupoModuloOptions = grupos.flatMap((grupo) =>
      (grupo.grupoModulos || []).map((grupoModulo) => ({
        id: String(grupoModulo.id),
        label: getGrupoModuloLabel(grupo, grupoModulo),
      })),
    );

    return new Map<string, { id: string; label: string }[]>([
      ['grupo', toOptions(grupos, getGrupoLabel)],
      ['grupo_modulo', grupoModuloOptions],
      ['modulo', toOptions(modulos, (item) => item.tituloComercial || item.titulo || `Modulo ${item.id}`)],
      ['unidad_didactica', toOptions(unidadesDidacticas, (item) => [item.sigla, item.nombre || `Unidad ${item.id}`].filter(Boolean).join(' - '))],
      ['capacidad_terminal', toOptions(capacidadesTerminales, getTextLabel)],
      ['indicador_capacidad', toOptions(indicadoresCapacidad, getTextLabel)],
      ['aprendizaje', toOptions(aprendizajes, getTextLabel)],
      ['actividad', toOptions(actividades, (item) => item.nombre || item.descripcion || `Actividad ${item.id}`)],
      ['grupo_unidad_didactica', toOptions(unidadesDidacticas, (item) => [item.sigla, item.nombre || `Unidad ${item.id}`].filter(Boolean).join(' - '))],
      ['grupo_unidad_didactica_actividad', toOptions(actividades, (item) => item.nombre || item.descripcion || `Actividad ${item.id}`)],
    ]);
  }, [
    actividades,
    aprendizajes,
    capacidadesTerminales,
    grupos,
    indicadoresCapacidad,
    modulos,
    unidadesDidacticas,
  ]);

  const addRelacion = () => {
    setRelaciones((prev) => [...prev, { key: makeRelationKey(), entidadTipo: 'grupo', entidadId: '' }]);
  };

  const updateRelacion = (key: string, patch: Partial<RelationRow>) => {
    setRelaciones((prev) => prev.map((relacion) => {
      if (relacion.key !== key) return relacion;
      const next = { ...relacion, ...patch };
      if (patch.entidadTipo) next.entidadId = '';
      return next;
    }));
  };

  const removeRelacion = (key: string) => {
    setRelaciones((prev) => prev.filter((relacion) => relacion.key !== key));
  };

  const toggleDiaSemana = (value: string) => {
    setDiasSemana((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value].sort(),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!calendarioId) {
      setError('Selecciona un calendario para el evento.');
      setLoading(false);
      return;
    }

    if (semestreId && selectedCalendario && !filteredSemestres.some((semestre) => String(semestre.id) === semestreId)) {
      setError('Selecciona un semestre que pertenezca al calendario.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateEvento = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          tipoEvento?: string | null;
          fechaInicio?: string | null;
          fechaFin?: string | null;
          todoElDia: boolean;
          ubicacion?: string | null;
          color?: string | null;
          estado?: string | null;
          calendarioId: number;
          semestreId?: number | null;
          relaciones: Array<{ entidadTipo: string; entidadId: number }>;
          recurrencia?: {
            activo: boolean;
            frecuencia: string;
            intervalo: number;
            diasSemana?: string | null;
            diaMes?: number | null;
            fechaInicio?: string | null;
            fechaFin?: string | null;
            cantidadOcurrencias?: number | null;
            reglaEspecial?: string | null;
            horarioId?: number | null;
            turnoId?: number | null;
          };
          generarOcurrencias: boolean;
        },
        { id: number | null }
      >(functions, 'createOrUpdateEvento');

      await createOrUpdateEvento({
        id: eventoId ? Number(eventoId) : undefined,
        titulo,
        descripcion,
        tipoEvento: tipoEvento || null,
        fechaInicio: dateTimeLocalToIso(fechaInicio),
        fechaFin: dateTimeLocalToIso(fechaFin),
        todoElDia,
        ubicacion: ubicacion || null,
        color: color || null,
        estado: estado || null,
        calendarioId: Number(calendarioId),
        semestreId: semestreId ? Number(semestreId) : null,
        relaciones: relaciones
          .filter((relacion) => relacion.entidadTipo && relacion.entidadId)
          .map((relacion) => ({ entidadTipo: relacion.entidadTipo, entidadId: Number(relacion.entidadId) })),
        recurrencia: recurrenciaActiva
          ? {
              activo: true,
              frecuencia,
              intervalo: Number(intervalo) || 1,
              diasSemana: frecuencia === 'semanal' ? diasSemana.join(',') || null : null,
              diaMes: frecuencia === 'mensual' && diaMes ? Number(diaMes) : null,
              fechaInicio: dateTimeLocalToIso(fechaRecurrenciaInicio || fechaInicio),
              fechaFin: dateTimeLocalToIso(fechaRecurrenciaFin),
              cantidadOcurrencias: cantidadOcurrencias ? Number(cantidadOcurrencias) : null,
              reglaEspecial: reglaEspecial || null,
              horarioId: recurrenciaHorarioId ? Number(recurrenciaHorarioId) : null,
              turnoId: recurrenciaTurnoId ? Number(recurrenciaTurnoId) : null,
            }
          : { activo: false, frecuencia, intervalo: Number(intervalo) || 1 },
        generarOcurrencias: recurrenciaActiva && generarOcurrencias,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/eventos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling evento form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar eventos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el evento: ${message}`);
      } else {
        setError('No se pudo guardar el evento en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingEvento) {
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
          {eventoId ? 'Editar Evento' : 'Crear Evento'}
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
            label="Titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />

          <FormControl fullWidth required sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Calendario</InputLabel>
            <Select
              label="Calendario"
              value={calendarioId}
              onChange={(event) => setCalendarioId(String(event.target.value))}
            >
              {calendarioId && !calendarios.some((calendario) => String(calendario.id) === calendarioId) ? (
                <MenuItem value={calendarioId} disabled>
                  Calendario actual no disponible
                </MenuItem>
              ) : null}
              {calendarios.map((calendario) => (
                <MenuItem key={calendario.id} value={String(calendario.id)}>
                  {calendario.titulo || `Calendario ${calendario.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Semestre</InputLabel>
            <Select label="Semestre" value={semestreId} onChange={(event) => setSemestreId(String(event.target.value))}>
              <MenuItem value="">Sin semestre</MenuItem>
              {semestreId && !filteredSemestres.some((semestre) => String(semestre.id) === semestreId) ? (
                <MenuItem value={semestreId} disabled>
                  {semestreTitleById.get(semestreId) || 'Semestre actual no disponible'}
                </MenuItem>
              ) : null}
              {calendarioId && selectedCalendario?.anioId == null && selectedCalendario?.semestreId == null ? (
                <MenuItem value="" disabled>
                  El calendario no tiene año ni semestre asociado
                </MenuItem>
              ) : null}
              {filteredSemestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={tipoEvento} onChange={(event) => setTipoEvento(String(event.target.value))}>
              <MenuItem value="">Sin tipo</MenuItem>
              {EVENTO_TIPOS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Estado</InputLabel>
            <Select label="Estado" value={estado} onChange={(event) => setEstado(String(event.target.value))}>
              <MenuItem value="">Sin estado</MenuItem>
              {EVENTO_ESTADOS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            fullWidth
            type="color"
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <TextField
            label="Fecha inicio"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            fullWidth
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
          />
          <TextField
            label="Fecha fin"
            value={fechaFin}
            onChange={(event) => setFechaFin(event.target.value)}
            fullWidth
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
          />

          <FormControlLabel
            control={<Checkbox checked={todoElDia} onChange={(event) => setTodoElDia(event.target.checked)} />}
            label="Todo el dia"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />

          <TextField
            label="Ubicacion"
            value={ubicacion}
            onChange={(event) => setUbicacion(event.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: 'auto', md: 'span 9' } }}
          />

          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />

          <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />

          <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6">Relaciones</Typography>
            <IconButton size="small" aria-label="Agregar relacion" onClick={addRelacion}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>

          {relaciones.map((relacion) => {
            const entityOptions = relationOptionsByType.get(relacion.entidadTipo) || [];
            return (
              <Box
                key={relacion.key}
                sx={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr auto', md: 'minmax(0, 5fr) minmax(0, 6fr) auto' },
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <FormControl fullWidth sx={{ gridColumn: { xs: '1 / 2', md: 'auto' } }}>
                  <InputLabel>Entidad</InputLabel>
                  <Select
                    label="Entidad"
                    value={relacion.entidadTipo}
                    onChange={(event) => updateRelacion(relacion.key, { entidadTipo: String(event.target.value) })}
                  >
                    {RELATION_TYPES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ gridColumn: { xs: '1 / 2', md: 'auto' } }}>
                  <InputLabel>Registro</InputLabel>
                  <Select
                    label="Registro"
                    value={relacion.entidadId}
                    onChange={(event) => updateRelacion(relacion.key, { entidadId: String(event.target.value) })}
                  >
                    {relacion.entidadId && !entityOptions.some((option) => option.id === relacion.entidadId) ? (
                      <MenuItem value={relacion.entidadId} disabled>
                        Registro actual no disponible
                      </MenuItem>
                    ) : null}
                    {entityOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <IconButton
                  size="small"
                  aria-label="Quitar relacion"
                  onClick={() => removeRelacion(relacion.key)}
                  sx={{ justifySelf: 'center' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}

          <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />

          <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6">Recurrencia</Typography>
            <FormControlLabel
              control={<Checkbox checked={recurrenciaActiva} onChange={(event) => setRecurrenciaActiva(event.target.checked)} />}
              label="Activa"
            />
          </Box>

          {recurrenciaActiva ? (
            <>
              <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
                <InputLabel>Frecuencia</InputLabel>
                <Select label="Frecuencia" value={frecuencia} onChange={(event) => setFrecuencia(String(event.target.value))}>
                  {RECURRENCIA_FRECUENCIAS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Intervalo"
                value={intervalo}
                onChange={(event) => setIntervalo(event.target.value)}
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}
              />

              <TextField
                label="Cantidad"
                value={cantidadOcurrencias}
                onChange={(event) => setCantidadOcurrencias(event.target.value)}
                fullWidth
                type="number"
                inputProps={{ min: 1, max: 200 }}
                sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}
              />

              <FormControlLabel
                control={<Checkbox checked={generarOcurrencias} onChange={(event) => setGenerarOcurrencias(event.target.checked)} />}
                label="Generar ocurrencias"
                sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
              />

              <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
                <InputLabel>Horario</InputLabel>
                <Select
                  label="Horario"
                  value={recurrenciaHorarioId}
                  onChange={(event) => setRecurrenciaHorarioId(String(event.target.value))}
                >
                  <MenuItem value="">Dias manuales</MenuItem>
                  {horarios.map((horario) => (
                    <MenuItem key={horario.id} value={String(horario.id)}>
                      {horario.nombre || `Horario ${horario.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
                <InputLabel>Turno</InputLabel>
                <Select
                  label="Turno"
                  value={recurrenciaTurnoId}
                  onChange={(event) => setRecurrenciaTurnoId(String(event.target.value))}
                >
                  <MenuItem value="">Horas del evento</MenuItem>
                  {turnos.map((turno) => (
                    <MenuItem key={turno.id} value={String(turno.id)}>
                      {turno.nombre || `Turno ${turno.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Desde"
                value={fechaRecurrenciaInicio}
                onChange={(event) => setFechaRecurrenciaInicio(event.target.value)}
                fullWidth
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
              />

              <TextField
                label="Hasta"
                value={fechaRecurrenciaFin}
                onChange={(event) => setFechaRecurrenciaFin(event.target.value)}
                fullWidth
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
              />

              {frecuencia === 'semanal' ? (
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {DIAS_SEMANA.map((dia) => (
                    <FormControlLabel
                      key={dia.value}
                      control={<Checkbox checked={diasSemana.includes(dia.value)} onChange={() => toggleDiaSemana(dia.value)} />}
                      label={dia.label}
                    />
                  ))}
                </Box>
              ) : null}

              {frecuencia === 'mensual' ? (
                <TextField
                  label="Dia del mes"
                  value={diaMes}
                  onChange={(event) => setDiaMes(event.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 1, max: 31 }}
                  sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
                />
              ) : null}

              <TextField
                label="Regla especial"
                value={reglaEspecial}
                onChange={(event) => setReglaEspecial(event.target.value)}
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />

              {ocurrenciasGuardadas > 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
                  Ocurrencias guardadas: {ocurrenciasGuardadas}
                </Typography>
              ) : null}
            </>
          ) : null}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (eventoId ? 'Actualizar' : 'Crear')}
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
  return <Container maxWidth="sm">{formContent}</Container>;
}
