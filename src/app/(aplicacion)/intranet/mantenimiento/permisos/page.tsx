'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { httpsCallable } from 'firebase/functions';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';

type PermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

type Role = {
  id: number;
  titulo?: string | null;
  scala?: number | null;
};

type PermissionEntity = {
  id: string;
  title?: string | null;
  label?: string | null;
  section: string;
};

type RolePermission = {
  id?: number;
  roleId?: number | null;
  entity?: string | null;
  canView?: boolean | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
};

type PermissionRow = {
  id: string;
  label: string;
  section: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const actionLabels: Record<PermissionAction, string> = {
  canView: 'Ver',
  canCreate: 'Crear',
  canEdit: 'Editar',
  canDelete: 'Eliminar',
};

const emptyPermission = (entity: PermissionEntity): PermissionRow => ({
  id: entity.id,
  label: entity.title || entity.label || entity.id,
  section: entity.section,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
});

export default function PermisosPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [entities, setEntities] = useState<PermissionEntity[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');

  const isSuperUser = Number(user?.level ?? 0) >= 600;

  const buildRows = useCallback((
    nextEntities: PermissionEntity[],
    nextPermissions: RolePermission[],
    roleId: number | '',
  ) => {
    if (!roleId) return nextEntities.map(emptyPermission);
    const byEntity = new Map(
      nextPermissions
        .filter((permission) => Number(permission.roleId ?? 0) === roleId && permission.entity)
        .map((permission) => [String(permission.entity), permission]),
    );

    return nextEntities.map((entity) => {
      const permission = byEntity.get(entity.id);
      return {
        ...emptyPermission(entity),
        canView: Boolean(permission?.canView),
        canCreate: Boolean(permission?.canCreate),
        canEdit: Boolean(permission?.canEdit),
        canDelete: Boolean(permission?.canDelete),
      };
    });
  }, []);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const listPermisos = httpsCallable<undefined, {
        roles?: Role[];
        entities?: PermissionEntity[];
        permissions?: RolePermission[];
      }>(functions, 'listPermisos');
      const result = await listPermisos();
      const nextRoles = result.data.roles ?? [];
      const nextEntities = result.data.entities ?? [];
      const nextPermissions = result.data.permissions ?? [];
      const nextRoleId = selectedRoleId || nextRoles[0]?.id || '';

      setRoles(nextRoles);
      setEntities(nextEntities);
      setPermissions(nextPermissions);
      setSelectedRoleId(nextRoleId);
      setRows(buildRows(nextEntities, nextPermissions, nextRoleId));
      setMessage(null);
    } catch (error) {
      console.error('Error loading permisos:', error);
      setMessage('No se pudieron cargar los permisos.');
      setMessageSeverity('error');
    } finally {
      setLoading(false);
    }
  }, [buildRows, selectedRoleId]);

  useEffect(() => {
    void fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    setRows(buildRows(entities, permissions, selectedRoleId));
  }, [buildRows, entities, permissions, selectedRoleId]);

  const handleToggle = useCallback((entityId: string, action: PermissionAction) => {
    setRows((current) =>
      current.map((row) =>
        row.id === entityId
          ? { ...row, [action]: !row[action] }
          : row,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setMessage(null);
    try {
      const savePermisosRol = httpsCallable(functions, 'savePermisosRol');
      await savePermisosRol({
        roleId: selectedRoleId,
        permissions: rows.map((row) => ({
          entity: row.id,
          canView: row.canView,
          canCreate: row.canCreate,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
        })),
      });
      setMessage('Permisos guardados.');
      setMessageSeverity('success');
      await fetchPermissions();
    } catch (error) {
      console.error('Error saving permisos:', error);
      setMessage('No se pudieron guardar los permisos.');
      setMessageSeverity('error');
    } finally {
      setSaving(false);
    }
  }, [fetchPermissions, rows, selectedRoleId]);

  const columns = useMemo<GridColDef<PermissionRow>[]>(
    () => [
      {
        field: 'label',
        headerName: 'Entidad',
        flex: 1.1,
        minWidth: 190,
      },
      {
        field: 'section',
        headerName: 'Seccion',
        flex: 0.8,
        minWidth: 150,
      },
      ...(['canView', 'canCreate', 'canEdit', 'canDelete'] as PermissionAction[]).map((action) => ({
        field: action,
        headerName: actionLabels[action],
        width: 110,
        align: 'center' as const,
        headerAlign: 'center' as const,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<PermissionRow>) => (
          <Checkbox
            checked={Boolean(params.row[action])}
            disabled={!selectedRoleId || saving}
            onChange={() => handleToggle(params.row.id, action)}
            inputProps={{ 'aria-label': `${actionLabels[action]} ${params.row.label}` }}
          />
        ),
      })),
    ],
    [handleToggle, saving, selectedRoleId],
  );

  if (!isSuperUser) {
    return (
      <IntranetListLayout title="Permisos">
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="error">Solo el superusuario puede administrar permisos.</Alert>
        </Box>
      </IntranetListLayout>
    );
  }

  return (
    <IntranetListLayout
      title="Permisos"
      message={message}
      messageSeverity={messageSeverity}
      commands={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="permiso-role-label">Rol</InputLabel>
            <Select
              labelId="permiso-role-label"
              label="Rol"
              value={selectedRoleId}
              disabled={loading || saving || roles.length === 0}
              onChange={(event) => setSelectedRoleId(Number(event.target.value))}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.titulo || `Rol ${role.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress color="inherit" size={18} /> : <SaveIcon />}
            disabled={!selectedRoleId || loading || saving}
            onClick={handleSave}
          >
            Guardar
          </Button>
        </Stack>
      }
    >
      {roles.length === 0 && !loading ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="info">No hay roles editables para configurar.</Alert>
        </Box>
      ) : null}

      <Typography sx={{ px: 2, pb: 1, color: 'text.secondary', fontSize: 13 }}>
        El superusuario no aparece en la lista porque siempre conserva acceso total.
      </Typography>

      <IntranetDataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 50 } } }}
        rowHeight={52}
      />
    </IntranetListLayout>
  );
}
