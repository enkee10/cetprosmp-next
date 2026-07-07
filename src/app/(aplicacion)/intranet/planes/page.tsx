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
import { PlanForm } from '@/components/intranet/planes/PlanForm';

interface Plan {
  id: number;
  duracion: string | null;
  creditos: number | null;
  tituloComercial: string | null;
  slug: string | null;
  descripcion2: string | null;
  imagenPortadaUrl: string | null;
  planEstudio: string | null;
  periodoCaducidad: string | null;
  resolucionTipo: string | null;
  nro: string | null;
  anio: number | null;
  genera: string | null;
  carreraId: number | null;
  periodoVigenciaId: number | null;
  versionId: number | null;
}

interface CarreraOption {
  id: number;
  nombre: string | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  archivado: boolean | null;
}

const formatResolucion = (plan: Plan) =>
  [
    plan.resolucionTipo,
    plan.nro,
    plan.anio != null ? String(plan.anio) : '',
    plan.genera,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('_');

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [carreras, setCarreras] = useState<CarreraOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
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
      rowNumber: true,
      carreraTitulo: true,
      planEstudio: true,
      creditos: true,
      periodoVigenciaTitulo: false,
      periodoCaducidad: false,
      versionTitulo: false,
      duracion: true,
      resolucionTipo: true,
      imagenPortada: false,
      tituloComercial: false,
      slug: false,
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
      const listCarreras = httpsCallable<undefined, { carreras?: CarreraOption[] }>(
        functions,
        'listCarreras',
      );
      const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(
        functions,
        'listSemestres',
      );
      const [planesResult, carrerasResult, semestresResult] = await Promise.all([
        listPlanes(),
        listCarreras(),
        listSemestres(),
      ]);
      const nextCarreras = carrerasResult.data.carreras || [];
      const nextSemestres = semestresResult.data.semestres || [];
      const nextCarreraTitleById = new Map(
        nextCarreras.map((carrera) => [carrera.id, carrera.nombre || `Carrera ${carrera.id}`]),
      );
      const nextPlanes = (planesResult.data.planes || []).slice().sort((a, b) => {
        const planEstudioCompare = String(b.planEstudio || '').localeCompare(
          String(a.planEstudio || ''),
          'es',
          { numeric: true },
        );
        if (planEstudioCompare !== 0) return planEstudioCompare;
        return String(a.carreraId != null ? nextCarreraTitleById.get(a.carreraId) || '' : '').localeCompare(
          String(b.carreraId != null ? nextCarreraTitleById.get(b.carreraId) || '' : ''),
          'es',
          { numeric: true },
        );
      });

      setPlanes(nextPlanes);
      setCarreras(nextCarreras);
      setSemestres(nextSemestres);
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

  const carreraTitleById = useMemo(
    () => new Map(carreras.map((carrera) => [carrera.id, carrera.nombre || `Carrera ${carrera.id}`])),
    [carreras],
  );

  const semestreTitleById = useMemo(
    () => new Map(semestres.map((semestre) => [semestre.id, semestre.titulo || `Semestre ${semestre.id}`])),
    [semestres],
  );

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
    const planTitle =
      plan?.tituloComercial ||
      plan?.planEstudio ||
      (plan?.periodoVigenciaId != null ? semestreTitleById.get(plan.periodoVigenciaId) : undefined);
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
  }, [fetchPlanes, functions, planes, semestreTitleById]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'rowNumber',
        headerName: '#',
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'carreraTitulo',
        headerName: 'Carrera',
        flex: 1.25,
        minWidth: 210,
        valueGetter: (_value, row: Plan) =>
          row.carreraId != null ? carreraTitleById.get(row.carreraId) || `Carrera ${row.carreraId}` : '',
      },
      {
        field: 'planEstudio',
        headerName: 'Plan Estudio',
        flex: 0.9,
        minWidth: 150,
        valueGetter: (_value, row: Plan) => row.planEstudio || '',
      },
      {
        field: 'creditos',
        headerName: 'Creditos',
        type: 'number',
        flex: 0.7,
        minWidth: 110,
        valueGetter: (_value, row: Plan) => (row.creditos != null ? row.creditos : null),
      },
      {
        field: 'periodoCaducidad',
        headerName: 'Caducado',
        flex: 0.8,
        minWidth: 125,
        valueGetter: (_value, row: Plan) => row.periodoCaducidad || '',
      },
      {
        field: 'versionTitulo',
        headerName: 'Version',
        flex: 0.8,
        minWidth: 130,
        valueGetter: (_value, row: Plan) =>
          row.versionId != null ? semestreTitleById.get(row.versionId) || `Semestre ${row.versionId}` : '',
      },
      {
        field: 'duracion',
        headerName: 'Duracion',
        flex: 0.8,
        minWidth: 120,
        valueGetter: (_value, row: Plan) => row.duracion || '',
      },
      {
        field: 'resolucionTipo',
        headerName: 'Resolucion',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Plan) => formatResolucion(row),
      },
      {
        field: 'imagenPortada',
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
          const row = params.row as Plan;
          const label =
            row.tituloComercial ||
            row.planEstudio ||
            (row.periodoVigenciaId != null ? semestreTitleById.get(row.periodoVigenciaId) : undefined) ||
            'Plan';
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
                alt={label}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              >
                {label.trim().charAt(0).toUpperCase()}
              </Avatar>
            </Stack>
          );
        },
      },
      {
        field: 'tituloComercial',
        headerName: 'Titulo Comercial',
        flex: 1.2,
        minWidth: 190,
        valueGetter: (_value, row: Plan) => row.tituloComercial || '',
      },
      {
        field: 'periodoVigenciaTitulo',
        headerName: 'Periodo Vigencia',
        flex: 0.8,
        minWidth: 150,
        valueGetter: (_value, row: Plan) =>
          row.periodoVigenciaId != null
            ? semestreTitleById.get(row.periodoVigenciaId) || `Semestre ${row.periodoVigenciaId}`
            : '',
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
    [carreraTitleById, semestreTitleById],
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
        sx={{ '& .cover-cell': { p: 0 } }}
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
        maxWidth={1000}
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
