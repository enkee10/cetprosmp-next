'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';

interface Personal {
  id: number;
  memo: string | null;
  userId: number | null;
  userUsername: string | null;
  avatar?: string | null;
  cargo: string | null;
  especialidadIds?: number[];
  especialidadesTitulo?: string | null;
}

interface UserOption {
  id: number;
  username: string | null;
  avatar?: string | null;
  rolTitulo?: string | null;
}

interface EspecialidadOption {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
}

const getEspecialidadLabel = (especialidad: EspecialidadOption) =>
  especialidad.tituloComercial || especialidad.titulo || `Especialidad ${especialidad.id}`;

const isStudentRole = (value: string | null | undefined) =>
  String(value ?? '').trim().toLowerCase() === 'estudiante';

function PersonalForm({
  personalId,
  users,
  especialidades,
  onSaved,
  onCancel,
}: {
  personalId?: string;
  users: UserOption[];
  especialidades: EspecialidadOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [memo, setMemo] = useState('');
  const [especialidadIds, setEspecialidadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPersonal, setLoadingPersonal] = useState(Boolean(personalId));
  const [error, setError] = useState<string | null>(null);
  const functions = useMemo(() => getFunctions(app), []);

  useEffect(() => {
    const fetchPersonal = async () => {
      if (!personalId) return;

      setLoadingPersonal(true);
      try {
        const getPersonal = httpsCallable<{ id: number }, { personal: Personal | null }>(functions, 'getPersonal');
        const result = await getPersonal({ id: Number(personalId) });
        const personal = result.data.personal;
        if (personal) {
          setUserId(personal.userId != null ? String(personal.userId) : '');
          setMemo(personal.memo || '');
          setEspecialidadIds((personal.especialidadIds || []).map(String));
        }
      } catch (err) {
        console.error('Error fetching personal: ', err);
        setError('No se pudo cargar personal para edicion.');
      } finally {
        setLoadingPersonal(false);
      }
    };

    void fetchPersonal();
  }, [functions, personalId]);

  const selectedUser = users.find((user) => String(user.id) === userId) || null;
  const especialidadTitleById = useMemo(
    () => new Map(especialidades.map((especialidad) => [String(especialidad.id), getEspecialidadLabel(especialidad)])),
    [especialidades],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!userId) {
      setError('Selecciona personal.');
      setLoading(false);
      return;
    }

    try {
      const createOrUpdatePersonal = httpsCallable<
        { id?: number; userId: number; memo?: string | null; especialidadIds: number[] },
        { id: number | null }
      >(functions, 'createOrUpdatePersonal');

      await createOrUpdatePersonal({
        id: personalId ? Number(personalId) : undefined,
        userId: Number(userId),
        memo: memo || null,
        especialidadIds: especialidadIds.map(Number),
      });
      onSaved();
    } catch (err) {
      console.error('Error saving personal: ', err);
      const message = (err as { message?: string } | null)?.message || '';
      setError(message ? `No se pudo guardar personal: ${message}` : 'No se pudo guardar personal.');
      setLoading(false);
    }
  };

  if (loadingPersonal) {
    return (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <FormControl fullWidth required margin="normal">
          <InputLabel>Personal</InputLabel>
          <Select label="Personal" value={userId} onChange={(event) => setUserId(String(event.target.value))}>
            <MenuItem value="">Seleccionar</MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={String(user.id)}>
                {user.username || `Personal ${user.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Cargo"
          value={selectedUser?.rolTitulo || ''}
          fullWidth
          margin="normal"
          disabled
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Especialidades</InputLabel>
          <Select
            multiple
            label="Especialidades"
            value={especialidadIds}
            onChange={(event) => {
              const value = event.target.value;
              setEspecialidadIds(typeof value === 'string' ? value.split(',') : value);
            }}
            renderValue={(selected) =>
              selected.map((id) => especialidadTitleById.get(String(id)) || `Especialidad ${id}`).join(' / ')
            }
          >
            {especialidades.map((especialidad) => {
              const value = String(especialidad.id);
              return (
                <MenuItem key={especialidad.id} value={value}>
                  <Checkbox checked={especialidadIds.includes(value)} />
                  <ListItemText primary={getEspecialidadLabel(especialidad)} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          label="Memo"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (personalId ? 'Actualizar' : 'Crear')}
          </Button>
          <Button variant="outlined" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPersonalId, setMenuPersonalId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    numero: true,
    avatar: true,
    personal: true,
    cargo: true,
    especialidades: true,
    memo: false,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      const listPersonal = httpsCallable<undefined, { personal?: Personal[] }>(functions, 'listPersonal');
      const listUsers = httpsCallable<undefined, { users?: UserOption[] }>(functions, 'listUsers');
      const listEspecialidades = httpsCallable<undefined, { especialidades?: EspecialidadOption[] }>(
        functions,
        'listEspecialidades',
      );
      const [personalResult, usersResult, especialidadesResult] = await Promise.all([
        listPersonal(),
        listUsers(),
        listEspecialidades(),
      ]);

      const users = usersResult.data.users || [];
      const avatarByUserId = new Map(users.map((user) => [String(user.id), user.avatar?.trim() || null]));

      setPersonal(
        (personalResult.data.personal || [])
          .map((item) => ({
            ...item,
            avatar: item.avatar?.trim() || (item.userId != null ? avatarByUserId.get(String(item.userId)) : null) || null,
          }))
          .slice()
          .sort((a, b) =>
            String(a.cargo ?? '').localeCompare(String(b.cargo ?? ''), 'es', { numeric: true }) ||
            String(a.userUsername ?? '').localeCompare(String(b.userUsername ?? ''), 'es', { numeric: true }),
          ),
      );
      setUsers(
        users
          .filter((user) => !isStudentRole(user.rolTitulo))
          .sort((a, b) => String(a.username ?? '').localeCompare(String(b.username ?? ''), 'es', { numeric: true })),
      );
      setEspecialidades(
        (especialidadesResult.data.especialidades || [])
          .slice()
          .sort((a, b) => getEspecialidadLabel(a).localeCompare(getEspecialidadLabel(b), 'es', { numeric: true })),
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching personal: ', err);
      setError('No se pudo cargar personal.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSaved = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setFormResetKey((prev) => prev + 1);
    void fetchData();
    setTimeout(() => void fetchData(), 400);
  }, [fetchData]);

  const handleDelete = useCallback(async (id: string) => {
    const item = personal.find((row) => String(row.id) === id);
    const title = item?.userUsername ? ` "${item.userUsername}"` : '';
    if (!window.confirm(`Estas seguro de eliminar personal${title}? Esta accion es irreversible.`)) return;

    try {
      const deletePersonal = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deletePersonal');
      await deletePersonal({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuPersonalId(null);
      void fetchData();
      setTimeout(() => void fetchData(), 400);
    } catch (err) {
      console.error('Error deleting personal: ', err);
      const message = (err as { message?: string } | null)?.message || '';
      setError(message ? `No se pudo eliminar personal: ${message}` : 'No se pudo eliminar personal.');
    }
  }, [fetchData, functions, personal]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        width: 60,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'avatar',
        headerName: 'Avatar',
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as Personal;
          const avatarSrc = row.avatar?.trim() || undefined;
          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <Avatar
                src={avatarSrc}
                alt={row.userUsername || 'Personal'}
                imgProps={{ referrerPolicy: 'no-referrer' }}
              >
                {(row.userUsername || 'P').trim().slice(0, 1).toUpperCase()}
              </Avatar>
            </Box>
          );
        },
      },
      {
        field: 'personal',
        headerName: 'Personal',
        flex: 1,
        minWidth: 190,
        valueGetter: (_value, row: Personal) => row.userUsername || '',
      },
      {
        field: 'cargo',
        headerName: 'Cargo',
        flex: 0.9,
        minWidth: 150,
        valueGetter: (_value, row: Personal) => row.cargo || '',
      },
      {
        field: 'especialidades',
        headerName: 'Especialidades',
        flex: 1.4,
        minWidth: 240,
        valueGetter: (_value, row: Personal) => row.especialidadesTitulo || '',
      },
      {
        field: 'memo',
        headerName: 'Memo',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Personal) => row.memo || '',
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
              setMenuPersonalId(String((params.row as Personal).id));
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
      title="Gestion de Personal"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={() => {
              setEditingId(null);
              setOpenModal(true);
            }}
          >
            Crear Personal
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={personal}
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
          setMenuPersonalId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPersonalId) {
              setEditingId(menuPersonalId);
              setOpenModal(true);
              setMenuAnchorEl(null);
              setMenuPersonalId(null);
            }
          }}
        >
          Editar
        </MenuItem>
        <MenuItem onClick={() => { if (menuPersonalId) void handleDelete(menuPersonalId); }}>
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editingId ? 'Editar Personal' : 'Crear Personal'}
        maxWidth={680}
      >
        <PersonalForm
          key={`${editingId ?? 'new-personal'}-${formResetKey}`}
          personalId={editingId ?? undefined}
          users={users}
          especialidades={especialidades}
          onCancel={() => setOpenModal(false)}
          onSaved={handleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
