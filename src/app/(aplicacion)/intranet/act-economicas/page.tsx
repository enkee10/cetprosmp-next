'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { ActEconomicaForm } from '@/components/intranet/act-economicas/ActEconomicaForm';

interface ActEconomica {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  familiaId: number | null;
  especialidadId: number | null;
}

interface FamiliaOption {
  id: number;
  titulo: string | null;
}

interface EspecialidadOption {
  id: number;
  titulo: string | null;
}

export default function ActEconomicasPage() {
  const [actEconomicas, setActEconomicas] = useState<ActEconomica[]>([]);
  const [familias, setFamilias] = useState<FamiliaOption[]>([]);
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActEconomicaModal, setOpenActEconomicaModal] = useState(false);
  const [editingActEconomicaId, setEditingActEconomicaId] = useState<string | null>(null);
  const [actEconomicaFormResetKey, setActEconomicaFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuActEconomicaId, setMenuActEconomicaId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      portada: true,
      titulo: true,
      descripcion: false,
      familiaTitulo: true,
      especialidadTitulo: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchActEconomicas = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listActEconomicas = httpsCallable<undefined, { actEconomicas?: ActEconomica[] }>(
        functions,
        'listActEconomicas',
      );
      const listFamilias = httpsCallable<undefined, { familias?: FamiliaOption[] }>(
        functions,
        'listFamilias',
      );
      const listEspecialidades = httpsCallable<undefined, { especialidades?: EspecialidadOption[] }>(
        functions,
        'listEspecialidades',
      );
      const [actEconomicasResult, familiasResult, especialidadesResult] = await Promise.all([
        listActEconomicas(),
        listFamilias(),
        listEspecialidades(),
      ]);
      setActEconomicas(actEconomicasResult.data.actEconomicas || []);
      setFamilias(familiasResult.data.familias || []);
      setEspecialidades(especialidadesResult.data.especialidades || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching act economicas: ', err);
      setError(
        'No se pudieron cargar las actividades economicas. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  const familiaTitleById = useMemo(
    () => new Map(familias.map((familia) => [familia.id, familia.titulo || `Familia ${familia.id}`])),
    [familias],
  );

  const especialidadTitleById = useMemo(
    () =>
      new Map(
        especialidades.map((especialidad) => [
          especialidad.id,
          especialidad.titulo || `Especialidad ${especialidad.id}`,
        ]),
      ),
    [especialidades],
  );

  useEffect(() => {
    void fetchActEconomicas();
  }, [fetchActEconomicas]);

  const handleDismissActEconomicaModal = useCallback(() => {
    setOpenActEconomicaModal(false);
  }, []);

  const handleActEconomicaSaved = useCallback(() => {
    setOpenActEconomicaModal(false);
    setEditingActEconomicaId(null);
    setActEconomicaFormResetKey((prev) => prev + 1);
    void fetchActEconomicas();
    setTimeout(() => {
      void fetchActEconomicas();
    }, 400);
  }, [fetchActEconomicas]);

  const handleCreateActEconomica = useCallback(() => {
    setEditingActEconomicaId(null);
    setOpenActEconomicaModal(true);
  }, []);

  const handleEditActEconomica = useCallback((id: string) => {
    setEditingActEconomicaId(id);
    setOpenActEconomicaModal(true);
    setMenuAnchorEl(null);
    setMenuActEconomicaId(null);
  }, []);

  const handleDeleteActEconomica = useCallback(async (id: string) => {
    const actEconomica = actEconomicas.find((item) => String(item.id) === id);
    const actEconomicaTitle = actEconomica?.titulo ? ` "${actEconomica.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar la actividad economica${actEconomicaTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteActEconomica = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteActEconomica',
      );
      await deleteActEconomica({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuActEconomicaId(null);
      void fetchActEconomicas();
      setTimeout(() => {
        void fetchActEconomicas();
      }, 400);
    } catch (err) {
      console.error('Error deleting act economica: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar actividades economicas (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar la actividad economica: ${message}`);
      } else {
        setError('No se pudo eliminar la actividad economica en Data Connect.');
      }
    }
  }, [actEconomicas, fetchActEconomicas, functions]);

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
          const row = params.row as ActEconomica;
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
                alt={row.titulo || 'Actividad economica'}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              >
                {(row.titulo || 'A').trim().charAt(0).toUpperCase()}
              </Avatar>
            </Stack>
          );
        },
      },
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: ActEconomica) => row.titulo || '',
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: ActEconomica) => row.descripcion || '',
      },
      {
        field: 'familiaTitulo',
        headerName: 'Familia',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: ActEconomica) =>
          row.familiaId != null ? familiaTitleById.get(row.familiaId) || `Familia ${row.familiaId}` : '',
      },
      {
        field: 'especialidadTitulo',
        headerName: 'Especialidad',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: ActEconomica) =>
          row.especialidadId != null
            ? especialidadTitleById.get(row.especialidadId) || `Especialidad ${row.especialidadId}`
            : '',
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
              setMenuActEconomicaId(String((params.row as ActEconomica).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [especialidadTitleById, familiaTitleById],
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
      title="Gestion de Actividades Economicas"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateActEconomica}>
            Crear Actividad Economica
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
        rows={actEconomicas}
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
          setMenuActEconomicaId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuActEconomicaId) handleEditActEconomica(menuActEconomicaId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuActEconomicaId) void handleDeleteActEconomica(menuActEconomicaId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openActEconomicaModal}
        onClose={handleDismissActEconomicaModal}
        title={editingActEconomicaId ? 'Editar Actividad Economica' : 'Crear Actividad Economica'}
        maxWidth={760}
      >
        <ActEconomicaForm
          key={`${editingActEconomicaId ?? 'new-act-economica'}-${actEconomicaFormResetKey}`}
          asModal
          actEconomicaId={editingActEconomicaId ?? undefined}
          onCancel={handleDismissActEconomicaModal}
          onSaved={handleActEconomicaSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
