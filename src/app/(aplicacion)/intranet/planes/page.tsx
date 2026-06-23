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
import { PlanForm } from '@/components/intranet/planes/PlanForm';

interface Plan {
  id: number;
  version: string | null;
  duracion: string | null;
  creditos: number | null;
  nivel: string | null;
  tituloComercial: string | null;
  slug: string | null;
  descripcion2: string | null;
  carreraId: number | null;
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planFormResetKey, setPlanFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPlanId, setMenuPlanId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      tituloComercial: true,
      version: true,
      nivel: true,
      duracion: true,
      creditos: true,
      carreraId: true,
      slug: true,
      descripcion2: false,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchPlanes = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listPlanes = httpsCallable<undefined, { planes?: Plan[] }>(
        functions,
        'listPlanes',
      );
      const result = await listPlanes();
      setPlanes(result.data.planes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching planes: ', err);
      setError(
        'No se pudieron cargar los planes. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchPlanes();
  }, [fetchPlanes]);

  const handleDismissPlanModal = useCallback(() => {
    setOpenPlanModal(false);
  }, []);

  const handlePlanSaved = useCallback(() => {
    setOpenPlanModal(false);
    setEditingPlanId(null);
    setPlanFormResetKey((prev) => prev + 1);
    void fetchPlanes();
    setTimeout(() => {
      void fetchPlanes();
    }, 400);
  }, [fetchPlanes]);

  const handleCreatePlan = useCallback(() => {
    setEditingPlanId(null);
    setOpenPlanModal(true);
  }, []);

  const handleEditPlan = useCallback((id: string) => {
    setEditingPlanId(id);
    setOpenPlanModal(true);
    setMenuAnchorEl(null);
    setMenuPlanId(null);
  }, []);

  const handleDeletePlan = useCallback(async (id: string) => {
    const plan = planes.find((item) => String(item.id) === id);
    const planTitle = plan?.tituloComercial || plan?.version;
    const planLabel = planTitle ? ` "${planTitle}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el plan${planLabel}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deletePlan = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deletePlan',
      );
      await deletePlan({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuPlanId(null);
      void fetchPlanes();
      setTimeout(() => {
        void fetchPlanes();
      }, 400);
    } catch (err) {
      console.error('Error deleting plan: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar planes (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el plan: ${message}`);
      } else {
        setError('No se pudo eliminar el plan en Data Connect.');
      }
    }
  }, [fetchPlanes, functions, planes]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'tituloComercial',
        headerName: 'Titulo Comercial',
        flex: 1.2,
        minWidth: 190,
        valueGetter: (_value, row: Plan) => row.tituloComercial || '',
      },
      {
        field: 'version',
        headerName: 'Version',
        flex: 0.75,
        minWidth: 115,
        valueGetter: (_value, row: Plan) => row.version || '',
      },
      {
        field: 'nivel',
        headerName: 'Nivel',
        flex: 0.8,
        minWidth: 120,
        valueGetter: (_value, row: Plan) => row.nivel || '',
      },
      {
        field: 'duracion',
        headerName: 'Duracion',
        flex: 0.8,
        minWidth: 120,
        valueGetter: (_value, row: Plan) => row.duracion || '',
      },
      {
        field: 'creditos',
        headerName: 'Creditos',
        flex: 0.7,
        minWidth: 110,
        valueGetter: (_value, row: Plan) => (row.creditos != null ? row.creditos : ''),
      },
      {
        field: 'carreraId',
        headerName: 'Carrera ID',
        flex: 0.75,
        minWidth: 120,
        valueGetter: (_value, row: Plan) => (row.carreraId != null ? row.carreraId : ''),
      },
      {
        field: 'slug',
        headerName: 'Slug',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Plan) => row.slug || '',
      },
      {
        field: 'descripcion2',
        headerName: 'Descripcion 2',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: Plan) => row.descripcion2 || '',
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
              setMenuPlanId(String((params.row as Plan).id));
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
        disabled: column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Planes"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreatePlan}>
            Crear Plan
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
        rows={planes}
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
          setMenuPlanId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPlanId) handleEditPlan(menuPlanId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuPlanId) void handleDeletePlan(menuPlanId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openPlanModal}
        onClose={handleDismissPlanModal}
        title={editingPlanId ? 'Editar Plan' : 'Crear Plan'}
      >
        <PlanForm
          key={`${editingPlanId ?? 'new-plan'}-${planFormResetKey}`}
          asModal
          planId={editingPlanId ?? undefined}
          onCancel={handleDismissPlanModal}
          onSaved={handlePlanSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
