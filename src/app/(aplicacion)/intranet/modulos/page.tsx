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
import { ModuloForm } from '@/components/intranet/modulos/ModuloForm';

interface Modulo {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  descripcion: string | null;
  horas: number | null;
  creditos: number | null;
  duracionEfsrt: number | null;
  creditosEfsrt: number | null;
  metas: number | null;
  activo: boolean | null;
  slug: string | null;
  comun: boolean | null;
  carrera?: {
    id?: number | null;
    nombre?: string | null;
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
  plan: {
    planEstudio: string | null;
    carreraId?: number | null;
    carrera?: {
      nombre?: string | null;
      titulo?: string | null;
      tituloComercial?: string | null;
      especialidad?: {
        id?: number | null;
        titulo?: string | null;
        tituloComercial?: string | null;
        orden?: number | null;
      } | null;
    } | null;
  } | null;
  planId: number | null;
  planIds?: number[];
}

interface CarreraOption {
  id: number;
  nombre: string | null;
  titulo?: string | null;
  tituloComercial?: string | null;
}

interface PlanOption {
  id: number;
  carreraId: number | null;
}

const normalizeOrden = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const getModuloEspecialidadLabel = (modulo: Modulo) =>
  modulo.plan?.carrera?.especialidad?.tituloComercial ||
  modulo.plan?.carrera?.especialidad?.titulo ||
  '';

const getModuloEspecialidadOrden = (modulo: Modulo) =>
  modulo.plan?.carrera?.especialidad?.orden ?? Number.MAX_SAFE_INTEGER;

const normalizeEspecialidad = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getModuloCarreraLabel = (modulo: Modulo) =>
  modulo.carrera?.nombre ||
  modulo.carrera?.titulo ||
  modulo.carrera?.tituloComercial ||
  modulo.plan?.carrera?.nombre ||
  modulo.plan?.carrera?.titulo ||
  modulo.plan?.carrera?.tituloComercial ||
  '';

const sortModulos = (items: Modulo[]) =>
  items
    .slice()
    .sort(
      (a, b) =>
        getModuloEspecialidadOrden(a) - getModuloEspecialidadOrden(b) ||
        getModuloEspecialidadLabel(a).localeCompare(getModuloEspecialidadLabel(b), 'es', { numeric: true }) ||
        (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
        String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es', { numeric: true }) ||
        a.id - b.id,
    );

const getModuloEspecialidadRowClassName = (modulo: Modulo) => {
  const especialidad = normalizeEspecialidad(getModuloEspecialidadLabel(modulo));

  if (especialidad.includes('estetica')) return 'modulo-row-estetica';
  if (especialidad.includes('confeccion')) return 'modulo-row-confeccion';
  if (especialidad.includes('cuero')) return 'modulo-row-cuero';
  if (especialidad.includes('textil')) return 'modulo-row-textil';
  if (especialidad.includes('computacion')) return 'modulo-row-computacion';
  if (especialidad.includes('manualidad')) return 'modulo-row-manualidades';
  if (especialidad.includes('hosteleria')) return 'modulo-row-hosteleria';
  if (especialidad.includes('electricidad')) return 'modulo-row-electricidad';
  if (especialidad.includes('construccion') || especialidad.includes('carpinteria')) {
    return 'modulo-row-construccion-carpinteria';
  }

  return '';
};

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModuloModal, setOpenModuloModal] = useState(false);
  const [editingModuloId, setEditingModuloId] = useState<string | null>(null);
  const [moduloFormResetKey, setModuloFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuModuloId, setMenuModuloId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      numero: true,
      carrera: true,
      titulo: true,
      orden: true,
      plan: true,
      horas: true,
      creditos: true,
      duracionEfsrt: true,
      creditosEfsrt: true,
      comun: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchModulos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listModulos = httpsCallable<undefined, { modulos?: Modulo[] }>(functions, 'listModulos');
      const listPlanes = httpsCallable<undefined, { planes?: PlanOption[] }>(functions, 'listPlanes');
      const listCarreras = httpsCallable<undefined, { carreras?: CarreraOption[] }>(functions, 'listCarreras');
      const [modulosResult, planesResult, carrerasResult] = await Promise.all([
        listModulos(),
        listPlanes(),
        listCarreras(),
      ]);
      const carreraById = new Map((carrerasResult.data.carreras || []).map((carrera) => [carrera.id, carrera]));
      const carreraIdByPlanId = new Map(
        (planesResult.data.planes || [])
          .filter((plan) => plan.carreraId != null)
          .map((plan) => [plan.id, plan.carreraId as number]),
      );
      const enrichedModulos = (modulosResult.data.modulos || []).map((modulo) => {
        const carreraId = modulo.planId != null ? carreraIdByPlanId.get(modulo.planId) : null;
        const carrera = carreraId != null ? carreraById.get(carreraId) : null;
        return carrera ? { ...modulo, carrera } : modulo;
      });
      setModulos(sortModulos(enrichedModulos));
      setError(null);
    } catch (err) {
      console.error('Error fetching modulos: ', err);
      setError(
        'No se pudieron cargar los modulos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchModulos();
  }, [fetchModulos]);

  const handleDismissModuloModal = useCallback(() => {
    setOpenModuloModal(false);
  }, []);

  const handleModuloSaved = useCallback(() => {
    setOpenModuloModal(false);
    setEditingModuloId(null);
    setModuloFormResetKey((prev) => prev + 1);
    void fetchModulos();
    setTimeout(() => {
      void fetchModulos();
    }, 400);
  }, [fetchModulos]);

  const handleCreateModulo = useCallback(() => {
    setEditingModuloId(null);
    setOpenModuloModal(true);
  }, []);

  const handleEditModulo = useCallback((id: string) => {
    setEditingModuloId(id);
    setOpenModuloModal(true);
    setMenuAnchorEl(null);
    setMenuModuloId(null);
  }, []);

  const handleDeleteModulo = useCallback(async (id: string) => {
    const modulo = modulos.find((item) => String(item.id) === id);
    const moduloTitle = modulo?.titulo ? ` "${modulo.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el modulo${moduloTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteModulo = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteModulo',
      );
      await deleteModulo({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuModuloId(null);
      void fetchModulos();
      setTimeout(() => {
        void fetchModulos();
      }, 400);
    } catch (err) {
      console.error('Error deleting modulo: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar modulos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el modulo: ${message}`);
      } else {
        setError('No se pudo eliminar el modulo en Data Connect.');
      }
    }
  }, [fetchModulos, functions, modulos]);

  const handleProcessRowUpdate = useCallback(async (newRow: Modulo, oldRow: Modulo) => {
    const nextOrden = normalizeOrden(newRow.orden);
    if (nextOrden === oldRow.orden) {
      return oldRow;
    }

    const updateModuloOrden = httpsCallable<
      {
        id: number;
        orden?: number | null;
      },
      { id: number | null }
    >(functions, 'updateModuloOrden');

    await updateModuloOrden({ id: oldRow.id, orden: nextOrden });

    const updatedRow = { ...oldRow, orden: nextOrden };
    setModulos((current) =>
      sortModulos(current.map((modulo) => (modulo.id === updatedRow.id ? updatedRow : modulo))),
    );
    setError(null);
    return updatedRow;
  }, [functions]);

  const handleProcessRowUpdateError = useCallback((err: unknown) => {
    console.error('Error updating modulo orden: ', err);
    const message = (err as { message?: string } | null)?.message || '';
    setError(message ? `No se pudo actualizar el orden: ${message}` : 'No se pudo actualizar el orden.');
  }, []);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: 'Nro.',
        align: 'center',
        headerAlign: 'center',
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'carrera',
        headerName: 'Carrera',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Modulo) => getModuloCarreraLabel(row),
      },
      {
        field: 'titulo',
        headerName: 'Modulo',
        flex: 1.25,
        minWidth: 190,
        valueGetter: (_value, row: Modulo) => row.titulo || '',
      },
      {
        field: 'orden',
        headerName: 'Ord.',
        type: 'number',
        width: 60,
        minWidth: 60,
        maxWidth: 60,
        align: 'center',
        headerAlign: 'center',
        editable: true,
        valueParser: (value) => normalizeOrden(value),
        valueGetter: (_value, row: Modulo) => (row.orden != null ? row.orden : null),
      },
      {
        field: 'plan',
        headerName: 'Plan',
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        valueGetter: (_value, row: Modulo) => row.plan?.planEstudio || '',
      },
      {
        field: 'horas',
        headerName: 'Horas',
        type: 'number',
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        valueGetter: (_value, row: Modulo) => (row.horas != null ? row.horas : null),
      },
      {
        field: 'creditos',
        headerName: 'Creditos',
        type: 'number',
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        valueGetter: (_value, row: Modulo) => (row.creditos != null ? row.creditos : null),
      },
      {
        field: 'duracionEfsrt',
        headerName: 'Dur. EFSRT',
        type: 'number',
        width: 95,
        minWidth: 95,
        maxWidth: 95,
        valueGetter: (_value, row: Modulo) => (row.duracionEfsrt != null ? row.duracionEfsrt : null),
      },
      {
        field: 'creditosEfsrt',
        headerName: 'Cred. EFSRT',
        type: 'number',
        width: 95,
        minWidth: 95,
        maxWidth: 95,
        valueGetter: (_value, row: Modulo) => (row.creditosEfsrt != null ? row.creditosEfsrt : null),
      },
      {
        field: 'comun',
        headerName: 'Comun',
        type: 'boolean',
        width: 82,
        minWidth: 82,
        maxWidth: 82,
        valueGetter: (_value, row: Modulo) => Boolean(row.comun || (row.planIds?.length ?? 0) > 1),
      },
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
              setMenuModuloId(String((params.row as Modulo).id));
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
    () =>
      columns.map((column) => ({
        field: column.field,
        label:
          typeof column.headerName === 'string' && column.headerName.trim().length > 0
            ? column.headerName
            : column.field,
        checked: columnVisibilityModel[column.field] !== false,
        disabled: column.field === 'numero' || column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Modulos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateModulo}>
            Crear Modulo
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) =>
        setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))
      }
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={modulos}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        processRowUpdate={handleProcessRowUpdate}
        onProcessRowUpdateError={handleProcessRowUpdateError}
        getRowClassName={(params) => getModuloEspecialidadRowClassName(params.row as Modulo)}
        sx={{
          '& .modulo-row-estetica': { bgcolor: '#f8bfdc' },
          '& .modulo-row-confeccion': { bgcolor: '#e8d3a8' },
          '& .modulo-row-cuero': { bgcolor: '#d3d6da' },
          '& .modulo-row-textil': { bgcolor: '#bfe8c8' },
          '& .modulo-row-computacion': { bgcolor: '#b8ddf7' },
          '& .modulo-row-manualidades': { bgcolor: '#ffd7a3' },
          '& .modulo-row-hosteleria': { bgcolor: '#b6e6a9' },
          '& .modulo-row-electricidad': { bgcolor: '#fff08a' },
          '& .modulo-row-construccion-carpinteria': { bgcolor: '#dcc7ff' },
          '& .MuiDataGrid-row:hover': { filter: 'brightness(0.985)' },
        }}
      />

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuModuloId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuModuloId) handleEditModulo(menuModuloId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuModuloId) void handleDeleteModulo(menuModuloId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openModuloModal}
        onClose={handleDismissModuloModal}
        title={editingModuloId ? 'Editar Modulo' : 'Crear Modulo'}
        maxWidth={760}
      >
        <ModuloForm
          key={`${editingModuloId ?? 'new-modulo'}-${moduloFormResetKey}`}
          asModal
          moduloId={editingModuloId ?? undefined}
          onCancel={handleDismissModuloModal}
          onSaved={handleModuloSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
