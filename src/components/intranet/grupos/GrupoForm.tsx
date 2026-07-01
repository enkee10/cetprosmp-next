'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
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
  estado: string | null;
  archivado: boolean | null;
  semestreId: number | null;
  personalId: number | null;
  paqueteId: number | null;
  turnoId: number | null;
  horarioId: number | null;
  grupoOrd: number | null;
  grupoModulos?: GrupoModuloDetalle[];
}

interface ModuloResumen {
  titulo?: string | null;
  tituloComercial?: string | null;
}

interface PaqueteModuloOption {
  id: number;
  orden: number | null;
  obligatorio: boolean | null;
  paqueteId: number;
  moduloId: number;
  modulo?: ModuloResumen | null;
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

interface CalendarioOption {
  id: number;
  titulo: string | null;
  duracion?: number | null;
  semestreId?: number | null;
  semestre?: { titulo?: string | null } | null;
  horarioId?: number | null;
  horario?: { nombre?: string | null } | null;
}

interface GrupoModuloDetalle {
  id?: number;
  orden: number | null;
  obligatorio: boolean | null;
  grupoId?: number;
  moduloId: number;
  calendarioId?: number | null;
  modulo?: ModuloResumen | null;
}

const getSemestreCodigo = (value: string | null | undefined) => String(value ?? '').trim().slice(-4);

const getModuloTitulo = (modulo: ModuloResumen | null | undefined, moduloId: number) =>
  modulo?.tituloComercial || modulo?.titulo || `Modulo ${moduloId}`;

const getCalendarioTitulo = (calendario: CalendarioOption) => {
  const duracionText = calendario.duracion != null ? `${calendario.duracion} horas` : '';
  const horarioText = calendario.horario?.nombre?.trim() || '';
  const semestreCodigo = getSemestreCodigo(calendario.semestre?.titulo);
  const semestreText = semestreCodigo ? `(${semestreCodigo})` : '';
  return [duracionText, horarioText, semestreText].filter(Boolean).join(' ') || calendario.titulo || `Calendario ${calendario.id}`;
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
      }));

  return paqueteModulos
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
    .map((paqueteModulo, index) => {
      const existing = currentByModuloId.get(paqueteModulo.moduloId);
      return {
        id: existing?.id,
        grupoId: existing?.grupoId,
        moduloId: paqueteModulo.moduloId,
        modulo: existing?.modulo || paqueteModulo.modulo || null,
        orden: existing?.orden ?? paqueteModulo.orden ?? index + 1,
        obligatorio: existing?.obligatorio ?? paqueteModulo.obligatorio ?? true,
        calendarioId: existing?.calendarioId ?? null,
      };
    });
};

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
  const [estado, setEstado] = useState('activo');
  const [archivado, setArchivado] = useState(false);
  const [grupoOrd, setGrupoOrd] = useState('');
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
  const [calendarios, setCalendarios] = useState<CalendarioOption[]>([]);
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
        const listCalendarios = httpsCallable<undefined, { calendarios?: CalendarioOption[] }>(functions, 'listCalendarios');
        const [
          paquetesResult,
          semestresResult,
          personalResult,
          turnosResult,
          horariosResult,
          calendariosResult,
        ] = await Promise.all([
          listPaquetes(),
          listSemestres(),
          listPersonal(),
          listTurnos(),
          listHorarios(),
          listCalendarios(),
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
        setCalendarios(
          (calendariosResult.data.calendarios || [])
            .slice()
            .sort((a, b) => getCalendarioTitulo(a).localeCompare(getCalendarioTitulo(b), 'es', { numeric: true })),
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
          setEstado(fetched.estado || 'activo');
          setArchivado(Boolean(fetched.archivado));
          setGrupoOrd(fetched.grupoOrd != null ? String(fetched.grupoOrd) : '');
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
  const nombreCalculado = useMemo(
    () =>
      [
        getSemestreCodigo(selectedSemestre?.titulo),
        selectedPaquete?.titulo?.trim() || '',
        selectedTurno?.nombre ? `[${selectedTurno.nombre}]` : '',
        selectedHorario?.nombre?.trim() || '',
        getPersonalUsername(selectedPersonal) ? `(${getPersonalUsername(selectedPersonal)})` : '',
      ].filter(Boolean).join(' '),
    [selectedHorario, selectedPaquete, selectedPersonal, selectedSemestre, selectedTurno],
  );
  const updateGrupoModulo = (moduloId: number, changes: Partial<GrupoModuloDetalle>) => {
    setGrupoModulos((prev) =>
      prev.map((item) => (item.moduloId === moduloId ? { ...item, ...changes } : item)),
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

    try {
      const functions = getFunctions(app);
      const createOrUpdateGrupo = httpsCallable<
        {
          id?: number;
          nombreDisplay: string;
          descripcion: string;
          turnoNombre: string;
          estado: string;
          archivado: boolean;
          grupoOrd?: number | null;
          paqueteId?: number | null;
          semestreId?: number | null;
          personalId?: number | null;
          turnoId?: number | null;
          horarioId?: number | null;
          grupoModulos?: Array<{
            moduloId: number;
            orden?: number | null;
            obligatorio?: boolean | null;
            calendarioId?: number | null;
          }>;
        },
        { id: number | null; ids?: number[] }
      >(functions, 'createOrUpdateGrupo');

      await createOrUpdateGrupo({
        id: grupoId ? Number(grupoId) : undefined,
        nombreDisplay: nombreCalculado.trim(),
        descripcion,
        turnoNombre: selectedTurno?.nombre || turnoNombre,
        estado,
        archivado,
        grupoOrd: grupoOrd ? Number(grupoOrd) : null,
        paqueteId: paqueteId ? Number(paqueteId) : null,
        semestreId: semestreId ? Number(semestreId) : null,
        personalId: personalId ? Number(personalId) : null,
        turnoId: turnoId ? Number(turnoId) : null,
        horarioId: horarioId ? Number(horarioId) : null,
        grupoModulos: grupoModulos.map((item) => ({
          moduloId: item.moduloId,
          orden: item.orden,
          obligatorio: item.obligatorio ?? true,
          calendarioId: item.calendarioId ?? null,
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

          <TextField
            label="Orden"
            value={grupoOrd}
            onChange={(event) => setGrupoOrd(event.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}
          />

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
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

          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Modulos del grupo
            </Typography>
            <TableContainer
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxWidth: '100%',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '34%' }}>Modulo</TableCell>
                    <TableCell sx={{ width: 92 }}>Orden</TableCell>
                    <TableCell sx={{ width: 118 }} align="center">Obligatorio</TableCell>
                    <TableCell>Calendario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grupoModulos.length > 0 ? (
                    grupoModulos.map((item) => (
                      <TableRow key={item.moduloId}>
                        <TableCell>{getModuloTitulo(item.modulo, item.moduloId)}</TableCell>
                        <TableCell>
                          <TextField
                            value={item.orden ?? ''}
                            onChange={(event) =>
                              updateGrupoModulo(item.moduloId, {
                                orden: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            size="small"
                            type="number"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={item.obligatorio ?? true}
                            onChange={(event) =>
                              updateGrupoModulo(item.moduloId, { obligatorio: event.target.checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.calendarioId != null ? String(item.calendarioId) : ''}
                            onChange={(event) =>
                              updateGrupoModulo(item.moduloId, {
                                calendarioId: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            size="small"
                            displayEmpty
                            fullWidth
                            disabled={loadingOptions}
                          >
                            <MenuItem value="">Sin calendario</MenuItem>
                            {calendarios.map((calendario) => (
                              <MenuItem key={calendario.id} value={String(calendario.id)}>
                                {getCalendarioTitulo(calendario)}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                        Selecciona un paquete para ver sus modulos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />

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
  return <Container maxWidth="sm">{formContent}</Container>;
}
