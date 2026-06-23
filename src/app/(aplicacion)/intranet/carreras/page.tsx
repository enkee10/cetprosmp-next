'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
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
  tipo: string | null;
  estado: string | null;
  actEconomicaId: number | null;
}

export default function CarrerasPage() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCarreraModal, setOpenCarreraModal] = useState(false);
  const [editingCarreraId, setEditingCarreraId] = useState<string | null>(null);
  const [carreraFormResetKey, setCarreraFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuCarreraId, setMenuCarreraId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    nombre: true,
    codigo: true,
    tipo: true,
    estado: true,
    actEconomicaId: true,
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
      const result = await listCarreras();
      setCarreras(result.data.carreras || []);
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
      { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 180, valueGetter: (_value, row: Carrera) => row.nombre || '' },
      { field: 'codigo', headerName: 'Codigo', flex: 0.7, minWidth: 110, valueGetter: (_value, row: Carrera) => row.codigo || '' },
      { field: 'tipo', headerName: 'Tipo', flex: 0.8, minWidth: 120, valueGetter: (_value, row: Carrera) => row.tipo || '' },
      { field: 'estado', headerName: 'Estado', flex: 0.8, minWidth: 120, valueGetter: (_value, row: Carrera) => row.estado || '' },
      { field: 'actEconomicaId', headerName: 'Act. Economica ID', flex: 0.85, minWidth: 145, valueGetter: (_value, row: Carrera) => (row.actEconomicaId != null ? row.actEconomicaId : '') },
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
    [],
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
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} disableScrollLock onClose={() => { setMenuAnchorEl(null); setMenuCarreraId(null); }}>
        <MenuItem onClick={() => { if (menuCarreraId) handleEditCarrera(menuCarreraId); }}>Editar</MenuItem>
        <MenuItem onClick={() => { if (menuCarreraId) void handleDeleteCarrera(menuCarreraId); }}>Eliminar</MenuItem>
      </Menu>

      <Modal1 open={openCarreraModal} onClose={handleDismissCarreraModal} title={editingCarreraId ? 'Editar Carrera' : 'Crear Carrera'}>
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
