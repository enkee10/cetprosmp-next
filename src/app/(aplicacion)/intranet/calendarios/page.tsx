'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { CalendarioForm } from '@/components/intranet/calendarios/CalendarioForm';

interface Calendario {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  inicio: string | null;
  fin: string | null;
  duracion: number | null;
  color: string | null;
  activo: boolean | null;
  anioId: number | null;
  semestreId: number | null;
  horarioId: number | null;
}

interface AnioOption {
  id: number;
  nombre: string | null;
  titulo: string | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  fin?: string | null;
}

interface HorarioOption {
  id: number;
  nombre: string | null;
}

const formatDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getSemestreCodigo = (value: string | null | undefined) => {
  return String(value ?? '').trim().slice(-4);
};

const normalizeHorarioNombre = (value: string | null | undefined) =>
  String(value ?? '').trim().replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').toLowerCase();

const getDateOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDatePartsOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const date = getDateOrNull(value);
  if (!date) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const getDateKey = (year: number, month: number, day: number) => year * 10000 + month * 100 + day;

const getCalendarioPeriodoSuffix = (
  horarioNombre: string | null | undefined,
  duracionValue: string | number | null | undefined,
  calendarioFin: string | null | undefined,
  semestreFin: string | null | undefined,
) => {
  const duracionText = String(duracionValue ?? '').trim();

  if (duracionText === '150') {
    const calendarioFinParts = getDatePartsOrNull(calendarioFin);
    if (!calendarioFinParts) return '';

    const calendarioFinKey = getDateKey(
      calendarioFinParts.year,
      calendarioFinParts.month,
      calendarioFinParts.day,
    );
    const cortes = [
      { key: getDateKey(calendarioFinParts.year, 5, 30), suffix: '-1' },
      { key: getDateKey(calendarioFinParts.year, 7, 30), suffix: '-2' },
      { key: getDateKey(calendarioFinParts.year, 10, 30), suffix: '-3' },
      { key: getDateKey(calendarioFinParts.year, 12, 30), suffix: '-4' },
    ];

    return cortes.find((corte) => calendarioFinKey < corte.key)?.suffix || '';
  }

  if (normalizeHorarioNombre(horarioNombre) !== 'lun - vie') return '';
  if (duracionText !== '300') return '';

  const calendarioFinDate = getDateOrNull(calendarioFin);
  const semestreFinDate = getDateOrNull(semestreFin);
  if (!calendarioFinDate || !semestreFinDate) return '-2';

  const limitePrimerBloque = new Date(semestreFinDate.getTime() - 30 * MS_PER_DAY);
  return calendarioFinDate.getTime() < limitePrimerBloque.getTime() ? '-1' : '-2';
};

export default function CalendariosPage() {
  const [calendarios, setCalendarios] = useState<Calendario[]>([]);
  const [anios, setAnios] = useState<AnioOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [horarios, setHorarios] = useState<HorarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCalendarioModal, setOpenCalendarioModal] = useState(false);
  const [editingCalendarioId, setEditingCalendarioId] = useState<string | null>(null);
  const [calendarioFormResetKey, setCalendarioFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuCalendarioId, setMenuCalendarioId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    numero: true,
    titulo: true,
    anio: false,
    semestre: false,
    horario: false,
    inicio: true,
    fin: true,
    activo: true,
    color: false,
    descripcion: false,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchCalendarios = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listCalendarios = httpsCallable<undefined, { calendarios?: Calendario[] }>(functions, 'listCalendarios');
      const listAnios = httpsCallable<undefined, { anios?: AnioOption[] }>(functions, 'listAnios');
      const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
      const listHorarios = httpsCallable<undefined, { horarios?: HorarioOption[] }>(functions, 'listHorarios');
      const [calendariosResult, aniosResult, semestresResult, horariosResult] = await Promise.all([
        listCalendarios(),
        listAnios(),
        listSemestres(),
        listHorarios(),
      ]);
      setCalendarios(calendariosResult.data.calendarios || []);
      setAnios(aniosResult.data.anios || []);
      setSemestres(semestresResult.data.semestres || []);
      setHorarios(horariosResult.data.horarios || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching calendarios: ', err);
      setError('No se pudieron cargar los calendarios. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchCalendarios();
  }, [fetchCalendarios]);

  const anioTitleById = useMemo(
    () => new Map(anios.map((anio) => [anio.id, anio.nombre || anio.titulo || `Año ${anio.id}`])),
    [anios],
  );
  const semestreTitleById = useMemo(
    () => new Map(semestres.map((semestre) => [semestre.id, semestre.titulo || `Semestre ${semestre.id}`])),
    [semestres],
  );
  const semestreById = useMemo(
    () => new Map(semestres.map((semestre) => [semestre.id, semestre])),
    [semestres],
  );
  const horarioTitleById = useMemo(
    () => new Map(horarios.map((horario) => [horario.id, horario.nombre || `Horario ${horario.id}`])),
    [horarios],
  );

  const getCalendarioTitulo = useCallback((calendario: Calendario) => {
    const semestre = calendario.semestreId != null ? semestreById.get(calendario.semestreId) : null;
    const semestreTitulo =
      calendario.semestreId != null ? semestreTitleById.get(calendario.semestreId) || `Semestre ${calendario.semestreId}` : '';
    const horarioTitulo =
      calendario.horarioId != null ? horarioTitleById.get(calendario.horarioId) || `Horario ${calendario.horarioId}` : '';
    const duracionText = calendario.duracion != null ? String(calendario.duracion) : '';
    const semestreCodigo = getSemestreCodigo(semestreTitulo);
    const semestreText = semestreCodigo
      ? `(${semestreCodigo}${getCalendarioPeriodoSuffix(horarioTitulo, duracionText, calendario.fin, semestre?.fin)})`
      : '';

    return [
      duracionText,
      duracionText ? 'horas' : '',
      horarioTitulo.trim(),
      semestreText,
    ].filter(Boolean).join(' ') || calendario.titulo || '';
  }, [horarioTitleById, semestreById, semestreTitleById]);

  const handleCalendarioSaved = useCallback(() => {
    setOpenCalendarioModal(false);
    setEditingCalendarioId(null);
    setCalendarioFormResetKey((prev) => prev + 1);
    void fetchCalendarios();
    setTimeout(() => void fetchCalendarios(), 400);
  }, [fetchCalendarios]);

  const handleDeleteCalendario = useCallback(async (id: string) => {
    const calendario = calendarios.find((item) => String(item.id) === id);
    const calendarioTitle = calendario ? ` "${getCalendarioTitulo(calendario)}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el calendario${calendarioTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteCalendario = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteCalendario');
      await deleteCalendario({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuCalendarioId(null);
      void fetchCalendarios();
      setTimeout(() => void fetchCalendarios(), 400);
    } catch (err) {
      console.error('Error deleting calendario: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar calendarios (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el calendario: ${message}`);
      } else {
        setError('No se pudo eliminar el calendario en Data Connect.');
      }
    }
  }, [calendarios, fetchCalendarios, functions, getCalendarioTitulo]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        width: 64,
        minWidth: 64,
        maxWidth: 64,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1.2,
        minWidth: 180,
        valueGetter: (_value, row: Calendario) => getCalendarioTitulo(row),
      },
      {
        field: 'anio',
        headerName: 'Año',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Calendario) =>
          row.anioId != null ? anioTitleById.get(row.anioId) || `Año ${row.anioId}` : '',
      },
      {
        field: 'semestre',
        headerName: 'Semestre',
        flex: 0.9,
        minWidth: 145,
        valueGetter: (_value, row: Calendario) =>
          row.semestreId != null ? semestreTitleById.get(row.semestreId) || `Semestre ${row.semestreId}` : '',
      },
      {
        field: 'horario',
        headerName: 'Horario',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Calendario) =>
          row.horarioId != null ? horarioTitleById.get(row.horarioId) || `Horario ${row.horarioId}` : '',
      },
      { field: 'inicio', headerName: 'Inicio', flex: 0.75, minWidth: 120, valueGetter: (_value, row: Calendario) => formatDate(row.inicio) },
      { field: 'fin', headerName: 'Fin', flex: 0.75, minWidth: 120, valueGetter: (_value, row: Calendario) => formatDate(row.fin) },
      { field: 'activo', headerName: 'Activo', flex: 0.6, minWidth: 95, valueGetter: (_value, row: Calendario) => (row.activo ? 'Si' : 'No') },
      {
        field: 'color',
        headerName: 'Color',
        width: 90,
        minWidth: 90,
        renderCell: (params) => (
          <Box
            aria-label={String((params.row as Calendario).color || '')}
            sx={{
              width: 22,
              height: 22,
              borderRadius: 0.75,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (params.row as Calendario).color || 'transparent',
              mt: 1.5,
            }}
          />
        ),
      },
      { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240, valueGetter: (_value, row: Calendario) => row.descripcion || '' },
      {
        field: 'actions',
        headerName: '...',
        align: 'center',
        headerAlign: 'center',
        width: 56,
        minWidth: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Opciones"
            onClick={(event) => {
              setMenuAnchorEl(event.currentTarget);
              setMenuCalendarioId(String((params.row as Calendario).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [anioTitleById, getCalendarioTitulo, horarioTitleById, semestreTitleById],
  );

  const columnToggleItems = useMemo(
    () => columns.map((column) => ({
      field: column.field,
      label: typeof column.headerName === 'string' && column.headerName.trim().length > 0 ? column.headerName : column.field,
      checked: columnVisibilityModel[column.field] !== false,
      disabled: column.field === 'numero' || column.field === 'actions',
    })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Calendarios"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={() => {
              setEditingCalendarioId(null);
              setOpenCalendarioModal(true);
            }}
          >
            Crear Calendario
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={calendarios}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuCalendarioId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuCalendarioId) {
              setEditingCalendarioId(menuCalendarioId);
              setOpenCalendarioModal(true);
              setMenuAnchorEl(null);
              setMenuCalendarioId(null);
            }
          }}
        >
          Editar
        </MenuItem>
        <MenuItem onClick={() => { if (menuCalendarioId) void handleDeleteCalendario(menuCalendarioId); }}>
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openCalendarioModal}
        onClose={() => setOpenCalendarioModal(false)}
        title={editingCalendarioId ? 'Editar Calendario' : 'Crear Calendario'}
        maxWidth={720}
      >
        <CalendarioForm
          key={`${editingCalendarioId ?? 'new-calendario'}-${calendarioFormResetKey}`}
          asModal
          calendarioId={editingCalendarioId ?? undefined}
          onCancel={() => setOpenCalendarioModal(false)}
          onSaved={handleCalendarioSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
