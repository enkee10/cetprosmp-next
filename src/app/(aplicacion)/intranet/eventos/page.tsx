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
import { EventoForm } from '@/components/intranet/calendarios/EventoForm';

interface Evento {
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
  grupoId: number | null;
}

interface CalendarioOption {
  id: number;
  titulo: string | null;
}

interface GrupoOption {
  id: number;
  nombreDisplay: string | null;
  turnoNombre: string | null;
}

const formatDateTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const getGrupoLabel = (grupo: GrupoOption) =>
  [grupo.nombreDisplay || `Grupo ${grupo.id}`, grupo.turnoNombre].filter(Boolean).join(' - ');

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [calendarios, setCalendarios] = useState<CalendarioOption[]>([]);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEventoModal, setOpenEventoModal] = useState(false);
  const [editingEventoId, setEditingEventoId] = useState<string | null>(null);
  const [eventoFormResetKey, setEventoFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuEventoId, setMenuEventoId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    titulo: true,
    calendario: true,
    tipoEvento: true,
    fechaInicio: true,
    fechaFin: true,
    grupo: true,
    estado: true,
    todoElDia: false,
    ubicacion: false,
    color: false,
    descripcion: false,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEventos = httpsCallable<undefined, { eventos?: Evento[] }>(functions, 'listEventos');
      const listCalendarios = httpsCallable<undefined, { calendarios?: CalendarioOption[] }>(functions, 'listCalendarios');
      const listGrupos = httpsCallable<undefined, { grupos?: GrupoOption[] }>(functions, 'listGrupos');
      const [eventosResult, calendariosResult, gruposResult] = await Promise.all([
        listEventos(),
        listCalendarios(),
        listGrupos(),
      ]);
      setEventos(eventosResult.data.eventos || []);
      setCalendarios(calendariosResult.data.calendarios || []);
      setGrupos(gruposResult.data.grupos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching eventos: ', err);
      setError('No se pudieron cargar los eventos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchEventos();
  }, [fetchEventos]);

  const calendarioTitleById = useMemo(
    () => new Map(calendarios.map((calendario) => [calendario.id, calendario.titulo || `Calendario ${calendario.id}`])),
    [calendarios],
  );

  const grupoTitleById = useMemo(
    () => new Map(grupos.map((grupo) => [grupo.id, getGrupoLabel(grupo)])),
    [grupos],
  );

  const handleEventoSaved = useCallback(() => {
    setOpenEventoModal(false);
    setEditingEventoId(null);
    setEventoFormResetKey((prev) => prev + 1);
    void fetchEventos();
    setTimeout(() => void fetchEventos(), 400);
  }, [fetchEventos]);

  const handleDeleteEvento = useCallback(async (id: string) => {
    const evento = eventos.find((item) => String(item.id) === id);
    const eventoTitle = evento?.titulo ? ` "${evento.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el evento${eventoTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteEvento = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteEvento');
      await deleteEvento({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuEventoId(null);
      void fetchEventos();
      setTimeout(() => void fetchEventos(), 400);
    } catch (err) {
      console.error('Error deleting evento: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar eventos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el evento: ${message}`);
      } else {
        setError('No se pudo eliminar el evento en Data Connect.');
      }
    }
  }, [eventos, fetchEventos, functions]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'titulo', headerName: 'Titulo', flex: 1.2, minWidth: 180, valueGetter: (_value, row: Evento) => row.titulo || '' },
      {
        field: 'calendario',
        headerName: 'Calendario',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Evento) => calendarioTitleById.get(row.calendarioId) || `Calendario ${row.calendarioId}`,
      },
      { field: 'tipoEvento', headerName: 'Tipo', flex: 0.75, minWidth: 120, valueGetter: (_value, row: Evento) => row.tipoEvento || '' },
      { field: 'fechaInicio', headerName: 'Inicio', flex: 0.9, minWidth: 145, valueGetter: (_value, row: Evento) => formatDateTime(row.fechaInicio) },
      { field: 'fechaFin', headerName: 'Fin', flex: 0.9, minWidth: 145, valueGetter: (_value, row: Evento) => formatDateTime(row.fechaFin) },
      {
        field: 'grupo',
        headerName: 'Grupo',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Evento) =>
          row.grupoId != null ? grupoTitleById.get(row.grupoId) || `Grupo ${row.grupoId}` : '',
      },
      { field: 'estado', headerName: 'Estado', flex: 0.75, minWidth: 115, valueGetter: (_value, row: Evento) => row.estado || '' },
      { field: 'todoElDia', headerName: 'Todo el dia', flex: 0.75, minWidth: 120, valueGetter: (_value, row: Evento) => (row.todoElDia ? 'Si' : 'No') },
      { field: 'ubicacion', headerName: 'Ubicacion', flex: 1, minWidth: 160, valueGetter: (_value, row: Evento) => row.ubicacion || '' },
      {
        field: 'color',
        headerName: 'Color',
        width: 90,
        minWidth: 90,
        renderCell: (params) => (
          <Box
            aria-label={String((params.row as Evento).color || '')}
            sx={{
              width: 22,
              height: 22,
              borderRadius: 0.75,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (params.row as Evento).color || 'transparent',
              mt: 1.5,
            }}
          />
        ),
      },
      { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240, valueGetter: (_value, row: Evento) => row.descripcion || '' },
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
              setMenuEventoId(String((params.row as Evento).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [calendarioTitleById, grupoTitleById],
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
      title="Gestion de Eventos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={() => {
              setEditingEventoId(null);
              setOpenEventoModal(true);
            }}
          >
            Crear Evento
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={eventos}
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
          setMenuEventoId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuEventoId) {
              setEditingEventoId(menuEventoId);
              setOpenEventoModal(true);
              setMenuAnchorEl(null);
              setMenuEventoId(null);
            }
          }}
        >
          Editar
        </MenuItem>
        <MenuItem onClick={() => { if (menuEventoId) void handleDeleteEvento(menuEventoId); }}>
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openEventoModal}
        onClose={() => setOpenEventoModal(false)}
        title={editingEventoId ? 'Editar Evento' : 'Crear Evento'}
      >
        <EventoForm
          key={`${editingEventoId ?? 'new-evento'}-${eventoFormResetKey}`}
          asModal
          eventoId={editingEventoId ?? undefined}
          onCancel={() => setOpenEventoModal(false)}
          onSaved={handleEventoSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
