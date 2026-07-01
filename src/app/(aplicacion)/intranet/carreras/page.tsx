'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { CarreraForm } from '@/components/intranet/carreras/CarreraForm';

interface Carrera {
  id: number;
  nombre: string | null;
  codigo: string | null;
  descripcion: string | null;
  nivel: string | null;
  imagenPortadaUrl: string | null;
  actEconomicaId: number | null;
  tipoCarreraId: number | null;
}

interface ActEconomicaOption {
  id: number;
  titulo: string | null;
}

interface TipoCarreraOption {
  id: number;
  nombre: string | null;
}

export default function CarrerasPage() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [actEconomicas, setActEconomicas] = useState<ActEconomicaOption[]>([]);
  const [tiposCarrera, setTiposCarrera] = useState<TipoCarreraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCarreraModal, setOpenCarreraModal] = useState(false);
  const [editingCarreraId, setEditingCarreraId] = useState<string | null>(null);
  const [carreraFormResetKey, setCarreraFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuCarreraId, setMenuCarreraId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    portada: true,
    nombre: true,
    codigo: true,
    nivel: true,
    tipoCarreraTitulo: true,
    actEconomicaTitulo: true,
    descripcion: false,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchCarreras = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      const listCarreras = httpsCallable<undefined, { carreras?: Carrera[] }>(functions, 'listCarreras');
      const listActEconomicas = httpsCallable<undefined, { actEconomicas?: ActEconomicaOption[] }>(
        functions,
        'listActEconomicas',
      );
      const listTiposCarrera = httpsCallable<undefined, { tiposCarrera?: TipoCarreraOption[] }>(
        functions,
        'listTiposCarrera',
      );
      const [carrerasResult, actEconomicasResult, tiposCarreraResult] = await Promise.all([
        listCarreras(),
        listActEconomicas(),
        listTiposCarrera(),
      ]);
      const nextTiposCarrera = tiposCarreraResult.data.tiposCarrera || [];
      const nextTipoCarreraTitleById = new Map(
        nextTiposCarrera.map((tipoCarrera) => [
          tipoCarrera.id,
          tipoCarrera.nombre || `Tipo ${tipoCarrera.id}`,
        ]),
      );
      const nextCarreras = (carrerasResult.data.carreras || []).slice().sort((a, b) => {
        const typeCompare = String(b.tipoCarreraId != null ? nextTipoCarreraTitleById.get(b.tipoCarreraId) || '' : '')
          .localeCompare(String(a.tipoCarreraId != null ? nextTipoCarreraTitleById.get(a.tipoCarreraId) || '' : ''), 'es');
        if (typeCompare !== 0) return typeCompare;
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
      });

      setCarreras(nextCarreras);
      setActEconomicas(actEconomicasResult.data.actEconomicas || []);
      setTiposCarrera(nextTiposCarrera);
      setError(null);
    } catch (err) {
      console.error('Error fetching carreras: ', err);
      setError('No se pudieron cargar las carreras. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchCarreras();
  }, [fetchCarreras]);

  const actEconomicaTitleById = useMemo(
    () =>
      new Map(
        actEconomicas.map((actEconomica) => [
          actEconomica.id,
          actEconomica.titulo || `Actividad economica ${actEconomica.id}`,
        ]),
      ),
    [actEconomicas],
  );

  const tipoCarreraTitleById = useMemo(
    () => new Map(tiposCarrera.map((tipoCarrera) => [tipoCarrera.id, tipoCarrera.nombre || `Tipo ${tipoCarrera.id}`])),
    [tiposCarrera],
  );

  const handleDismissCarreraModal = useCallback(() => setOpenCarreraModal(false), []);

  const handleCarreraSaved = useCallback(() => {
    setOpenCarreraModal(false);
    setEditingCarreraId(null);
    setCarreraFormResetKey((prev) => prev + 1);
    void fetchCarreras();
    setTimeout(() => void fetchCarreras(), 400);
  }, [fetchCarreras]);

  const handleCreateCarrera = useCallback(() => {
    setEditingCarreraId(null);
    setOpenCarreraModal(true);
  }, []);

  const handleEditCarrera = useCallback((id: string) => {
    setEditingCarreraId(id);
    setOpenCarreraModal(true);
    setMenuAnchorEl(null);
    setMenuCarreraId(null);
  }, []);

  const handleDeleteCarrera = useCallback(async (id: string) => {
    const carrera = carreras.find((item) => String(item.id) === id);
    const carreraTitle = carrera?.nombre ? ` "${carrera.nombre}"` : '';
    if (!window.confirm(`Estas seguro de eliminar la carrera${carreraTitle}? Esta accion es irreversible.`)) return;

    try {
      const deleteCarrera = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteCarrera');
      await deleteCarrera({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuCarreraId(null);
      void fetchCarreras();
      setTimeout(() => void fetchCarreras(), 400);
    } catch (err) {
      console.error('Error deleting carrera: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') setError('No tienes acceso para eliminar carreras (requiere level >= 600).');
      else if (message) setError(`No se pudo eliminar la carrera: ${message}`);
      else setError('No se pudo eliminar la carrera en Data Connect.');
    }
  }, [carreras, fetchCarreras, functions]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'portada',
        headerName: 'Portada',
        width: 60,
        minWidth: 60,
        maxWidth: 60,
        align: 'center',
        headerAlign: 'center',
        cellClassName: 'cover-cell',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const row = params.row as Carrera;
          return (
            <Stack
              sx={{
                width: 60,
                height: 52,
                px: '10px',
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar
                src={row.imagenPortadaUrl || undefined}
                alt={row.nombre || 'Carrera'}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              >
                {(row.nombre || 'C').trim().charAt(0).toUpperCase()}
              </Avatar>
            </Stack>
          );
        },
      },
      { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 180, valueGetter: (_value, row: Carrera) => row.nombre || '' },
      { field: 'codigo', headerName: 'Codigo', flex: 0.7, minWidth: 110, valueGetter: (_value, row: Carrera) => row.codigo || '' },
      { field: 'nivel', headerName: 'Nivel', flex: 0.8, minWidth: 150, valueGetter: (_value, row: Carrera) => row.nivel || '' },
      {
        field: 'tipoCarreraTitulo',
        headerName: 'Tipo de Carrera',
        flex: 0.9,
        minWidth: 170,
        valueGetter: (_value, row: Carrera) =>
          row.tipoCarreraId != null
            ? tipoCarreraTitleById.get(row.tipoCarreraId) || `Tipo de Carrera ${row.tipoCarreraId}`
            : '',
      },
      {
        field: 'actEconomicaTitulo',
        headerName: 'Act. Economica',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: Carrera) =>
          row.actEconomicaId != null
            ? actEconomicaTitleById.get(row.actEconomicaId) || `Actividad economica ${row.actEconomicaId}`
            : '',
      },
      { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240, valueGetter: (_value, row: Carrera) => row.descripcion || '' },
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
              setMenuCarreraId(String((params.row as Carrera).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [actEconomicaTitleById, tipoCarreraTitleById],
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
      title="Gestion de Carreras"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateCarrera}>Crear Carrera</Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={carreras}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        sx={{ '& .cover-cell': { p: 0 } }}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} disableScrollLock onClose={() => { setMenuAnchorEl(null); setMenuCarreraId(null); }}>
        <MenuItem onClick={() => { if (menuCarreraId) handleEditCarrera(menuCarreraId); }}>Editar</MenuItem>
        <MenuItem onClick={() => { if (menuCarreraId) void handleDeleteCarrera(menuCarreraId); }}>Eliminar</MenuItem>
      </Menu>

      <Modal1 open={openCarreraModal} onClose={handleDismissCarreraModal} title={editingCarreraId ? 'Editar Carrera' : 'Crear Carrera'} maxWidth={720}>
        <CarreraForm
          key={`${editingCarreraId ?? 'new-carrera'}-${carreraFormResetKey}`}
          asModal
          carreraId={editingCarreraId ?? undefined}
          onCancel={handleDismissCarreraModal}
          onSaved={handleCarreraSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
