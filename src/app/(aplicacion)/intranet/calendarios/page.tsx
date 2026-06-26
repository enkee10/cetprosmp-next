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
  fechaIni: string | null;
  fechaFin: string | null;
  tipo: string | null;
  color: string | null;
  activo: boolean | null;
  archivado: boolean | null;
  semestreId: number | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  archivado: boolean | null;
}

const formatDateTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export default function CalendariosPage() {
  const [calendarios, setCalendarios] = useState<Calendario[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCalendarioModal, setOpenCalendarioModal] = useState(false);
  const [editingCalendarioId, setEditingCalendarioId] = useState<string | null>(null);
  const [calendarioFormResetKey, setCalendarioFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuCalendarioId, setMenuCalendarioId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    titulo: true,
    semestre: true,
    tipo: true,
    fechaIni: true,
    fechaFin: true,
    activo: true,
    archivado: true,
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
      const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
      const [calendariosResult, semestresResult] = await Promise.all([listCalendarios(), listSemestres()]);
      setCalendarios(calendariosResult.data.calendarios || []);
      setSemestres(semestresResult.data.semestres || []);
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

  const semestreTitleById = useMemo(
    () => new Map(semestres.map((semestre) => [semestre.id, semestre.titulo || `Semestre ${semestre.id}`])),
    [semestres],
  );

  const handleCalendarioSaved = useCallback(() => {
    setOpenCalendarioModal(false);
    setEditingCalendarioId(null);
    setCalendarioFormResetKey((prev) => prev + 1);
    void fetchCalendarios();
    setTimeout(() => void fetchCalendarios(), 400);
  }, [fetchCalendarios]);

  const handleDeleteCalendario = useCallback(async (id: string) => {
    const calendario = calendarios.find((item) => String(item.id) === id);
    const calendarioTitle = calendario?.titulo ? ` "${calendario.titulo}"` : '';

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
  }, [calendarios, fetchCalendarios, functions]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'titulo', headerName: 'Titulo', flex: 1.2, minWidth: 180, valueGetter: (_value, row: Calendario) => row.titulo || '' },
      {
        field: 'semestre',
        headerName: 'Semestre',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Calendario) =>
          row.semestreId != null ? semestreTitleById.get(row.semestreId) || `Semestre ${row.semestreId}` : '',
      },
      { field: 'tipo', headerName: 'Tipo', flex: 0.75, minWidth: 120, valueGetter: (_value, row: Calendario) => row.tipo || '' },
      { field: 'fechaIni', headerName: 'Inicio', flex: 0.9, minWidth: 145, valueGetter: (_value, row: Calendario) => formatDateTime(row.fechaIni) },
      { field: 'fechaFin', headerName: 'Fin', flex: 0.9, minWidth: 145, valueGetter: (_value, row: Calendario) => formatDateTime(row.fechaFin) },
      { field: 'activo', headerName: 'Activo', flex: 0.6, minWidth: 95, valueGetter: (_value, row: Calendario) => (row.activo ? 'Si' : 'No') },
      { field: 'archivado', headerName: 'Archivado', flex: 0.7, minWidth: 115, valueGetter: (_value, row: Calendario) => (row.archivado ? 'Si' : 'No') },
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
    [semestreTitleById],
  );

  const columnToggleItems = useMemo(
    () => columns.map((column) => ({
      field: column.field,
      label: typeof column.headerName === 'string' && column.headerName.trim().length > 0 ? column.headerName : column.field,
      checked: columnVisibilityModel[column.field] !== false,
      disabled: column.field === 'actions',
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
