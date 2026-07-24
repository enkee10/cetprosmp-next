'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
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
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import UserForm from '@/components/intranet/users/UserForm';
import Modal1 from '@/components/Modal1';
import { useAuth } from '@/context/AuthContext';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { useAppSettings } from '@/hooks/useAppSettings';

interface User {
  id: number;
  documentId: string;
  username: string;
  nickName?: string | null;
  email: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  celular: string;
  rolId?: number | null;
  blocked?: boolean;
  bloqueado?: boolean;
  avatar?: string;
  avatarPequeno?: string;
  photoURL?: string | null;
  recorteFotografia?: string | null;
  rolTitulo?: string | null;
  rolLevel?: number | null;
  tipoDocumento?: string;
  dni?: string;
  nacionalidad?: string;
  instruccion?: string;
  estadoCivil?: string;
  direccion?: string;
  distrito?: string;
  fechaNacimiento?: string;
  telefono?: string;
  sexo?: string;
  correoInstitucional?: string;
  correo_institucional?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  emailCreador?: string;
  fecha_creacion?: string;
  fecha_modificacion?: string;
  email_creador?: string;
  dniImagenFrenteUrl?: string | null;
  dniImagenReversoUrl?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
}

type UserFormSubmitData = Parameters<React.ComponentProps<typeof UserForm>['onSubmit']>[0];

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;

  if (code === 'functions/permission-denied') {
    return 'No tienes acceso suficiente para administrar usuarios. Si te acaban de asignar el rol, cierra sesion e ingresa otra vez.';
  }

  if (code === 'functions/internal') {
    return 'Data Connect no pudo completar la operacion. Revisa que las operaciones del connector esten desplegadas y que la funcion tenga acceso al servicio.';
  }

  return message || fallback;
};

const isPermissionDeniedDataConnectError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message || '');
  const code = String((error as { code?: string } | null)?.code || '');
  return (
    message.includes('PERMISSION_DENIED') ||
    message.includes('@auth rejected the request') ||
    code.includes('permission-denied')
  );
};

const isDeadlineExceededError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  const code = String((error as { code?: string } | null)?.code || '').toLowerCase();
  return code.includes('deadline-exceeded') || message.includes('deadline-exceeded');
};

const formatDateAsDayMonthYear = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const datePart = raw.split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return raw;

  return `${match[3]}/${match[2]}/${match[1]}`;
};

const UserAvatarCell = ({
  avatar,
  avatarPequeno,
  recorteFotografia,
  nombre,
  apellidoPaterno,
  useRecorteFotografia,
  showImage,
}: Pick<User, 'avatar' | 'avatarPequeno' | 'recorteFotografia' | 'nombre' | 'apellidoPaterno'> & {
  useRecorteFotografia: boolean;
  showImage: boolean;
}) => {
  const fallbackSrc = avatar?.trim() || undefined;
  const normalSrc = avatarPequeno?.trim() || fallbackSrc;
  const recorteSrc = recorteFotografia?.trim() || undefined;
  const preferredSrc = showImage ? (useRecorteFotografia ? (recorteSrc || normalSrc) : normalSrc) : undefined;
  const [src, setSrc] = useState(preferredSrc);

  useEffect(() => {
    setSrc(preferredSrc);
  }, [preferredSrc]);

  const initials =
    nombre && apellidoPaterno ? `${nombre[0]}${apellidoPaterno[0]}`.toUpperCase() : null;
  const debugSource = useRecorteFotografia && recorteSrc
    ? `recorteFotografia: ${recorteSrc}`
    : avatarPequeno?.trim()
      ? `avatarPequeno: ${avatarPequeno.trim()}`
      : fallbackSrc
        ? `avatar: ${fallbackSrc}`
        : 'sin URL';

  return (
    <Avatar
      src={src}
      title={debugSource}
      sx={{
        bgcolor: 'transparent',
        background: 'linear-gradient(180deg, #8fd8ff 0%, #ffffff 100%)',
      }}
      imgProps={{
        referrerPolicy: 'no-referrer',
        onError: () => {
          setSrc((current) => {
            if (current && normalSrc && current !== normalSrc) return normalSrc;
            if (current && fallbackSrc && current !== fallbackSrc) return fallbackSrc;
            return undefined;
          });
        },
      }}
    >
      {initials}
    </Avatar>
  );
};

const isStudentUser = (user: Pick<User, 'rolId' | 'rolTitulo'>) => {
  const roleTitle = String(user.rolTitulo ?? '').trim().toLowerCase();
  return Number(user.rolId ?? 0) === 3 || roleTitle.includes('estudiante') || roleTitle.includes('alumno');
};

const UsersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { can } = useIntranetPermissions();
  const { settings: appSettings } = useAppSettings();
  const canDeleteRecords = can('users', 'delete');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormResetKey, setUserFormResetKey] = useState(0);
  const errorMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchUsersInFlightRef = useRef<Promise<void> | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      avatar: true,
      username: true,
      nickName: false,
      correoInstitucional: true,
      email: false,
      sexo: false,
      fechaNacimiento: false,
      dni: false,
      nacionalidad: true,
      estadoCivil: false,
      instruccion: false,
      direccion: false,
      distrito: false,
      celular: true,
      rolId: true,
      bloqueado: true,
      actions: true,
    });

  const listUsers = useMemo(
    () =>
      httpsCallable<undefined, { users?: Record<string, unknown>[] }>(functions, 'listUsers', {
        timeout: 60000,
      }),
    [],
  );

  const fetchUsers = useCallback(
    async (attempt = 0) => {
      if (attempt === 0 && fetchUsersInFlightRef.current) {
        return fetchUsersInFlightRef.current;
      }

      const run = async () => {
        if (!user) {
          setUsers([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
          const result = await listUsers();
          const normalizedUsers: User[] = (result.data.users || []).map((row) => {
            const roleRaw = row.rolId;
            const roleParsed =
              typeof roleRaw === 'string' ? Number(roleRaw) : Number(roleRaw ?? NaN);
            return {
              ...(row as unknown as User),
              blocked: Boolean(row.blocked),
              bloqueado: Boolean(row.bloqueado ?? row.blocked),
              nacionalidad: String(row.nacionalidad || 'PERUANA'),
              rolId: Number.isFinite(roleParsed) ? roleParsed : null,
            };
          });
          setUsers(normalizedUsers);
        } catch (error) {
          if (isDeadlineExceededError(error) && attempt < 1) {
            await new Promise((resolve) => setTimeout(resolve, 900));
            await fetchUsers(attempt + 1);
            return;
          }

          console.error('Error fetching users: ', error);
          if (isPermissionDeniedDataConnectError(error)) {
            setErrorMessage(
              'No tienes acceso para listar usuarios (se requiere claim level >= 600). Cierra sesion e inicia nuevamente para refrescar claims.',
            );
          } else {
            setErrorMessage('No se pudo cargar la lista de usuarios desde Data Connect.');
          }
        } finally {
          setLoading(false);
        }
      };

      const promise = run();
      if (attempt === 0) {
        fetchUsersInFlightRef.current = promise;
        promise.finally(() => {
          if (fetchUsersInFlightRef.current === promise) {
            fetchUsersInFlightRef.current = null;
          }
        });
      }

      return promise;
    },
    [listUsers, user],
  );

  useEffect(() => {
    if (authLoading) return;
    fetchUsers();
  }, [authLoading, fetchUsers]);

  useEffect(() => {
    return () => {
      if (errorMessageTimerRef.current) {
        clearTimeout(errorMessageTimerRef.current);
      }
    };
  }, []);

  const showTemporaryErrorMessage = useCallback((message: string) => {
    if (errorMessageTimerRef.current) {
      clearTimeout(errorMessageTimerRef.current);
    }
    setErrorMessage(message);
    errorMessageTimerRef.current = setTimeout(() => {
      setErrorMessage(null);
      errorMessageTimerRef.current = null;
    }, 5000);
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (row: User) => {
    setSelectedUser(row);
    setFormOpen(true);
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

  const handleDismissUserModal = () => {
    if (formSubmitting) return;
    setFormOpen(false);
  };

  const handleDeleteUser = async (
    targetUser: Pick<
      User,
      'documentId' | 'email' | 'dni' | 'rolId' | 'nombre' | 'apellidoPaterno' | 'apellidoMaterno' | 'correoInstitucional' | 'correo_institucional'
    >,
  ) => {
    const {
      documentId,
      email,
      dni,
      rolId,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correoInstitucional,
      correo_institucional,
    } = targetUser;
    if (!documentId) {
      setErrorMessage('No se puede eliminar: el usuario no tiene documentId.');
      return;
    }

    if (
      window.confirm('Estas seguro de eliminar este usuario? Esta accion es irreversible.')
    ) {
      try {
        const deleteUser = httpsCallable(functions, 'deleteUser');
        await deleteUser({
          uid: documentId,
          email,
          dni,
          rolId,
          nombre,
          apellidoPaterno,
          apellidoMaterno,
          correo_institucional: correo_institucional ?? correoInstitucional ?? null,
        });
        setMenuAnchorEl(null);
        setMenuUser(null);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user: ', error);
        setErrorMessage(getCallableErrorMessage(error, 'No se pudo eliminar el usuario.'));
      }
    }
  };

  const handleFormSubmit = async (data: UserFormSubmitData) => {
    setLoading(true);
    setFormSubmitting(true);
    setErrorMessage(null);
    let workspaceWarning: string | null = null;
    try {
      if (selectedUser) {
        const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
        const dataToUpdate = { ...data };
        delete (dataToUpdate as { password?: unknown }).password;

        const updateResult = await updateUserProfile({
          documentId: selectedUser.documentId,
          previousEmail: selectedUser.email,
          previousCorreoInstitucional:
            selectedUser.correo_institucional ?? selectedUser.correoInstitucional ?? null,
          previousDni: selectedUser.dni,
          previousRolId: selectedUser.rolId,
          previousNombre: selectedUser.nombre,
          previousApellidoPaterno: selectedUser.apellidoPaterno,
          previousApellidoMaterno: selectedUser.apellidoMaterno,
          previousAvatar: selectedUser.avatar ?? null,
          previousAvatarPequeno: selectedUser.avatarPequeno ?? null,
          previousPhotoURL: selectedUser.photoURL ?? null,
          ...dataToUpdate,
        }) as { data?: { workspaceWarning?: string | null } };
        workspaceWarning =
          typeof updateResult.data?.workspaceWarning === 'string'
            ? updateResult.data.workspaceWarning
            : null;

        const currentRole = selectedUser.rolId ? String(selectedUser.rolId) : '';
        const nextRole = dataToUpdate.rolId ? String(dataToUpdate.rolId) : '';
        if (nextRole && nextRole !== currentRole) {
          const setUserRole = httpsCallable(functions, 'setUserRole');
          await setUserRole({
            uid: selectedUser.documentId,
            roleId: dataToUpdate.rolId,
          });
        }
      } else {
        const createNewUser = httpsCallable(functions, 'createNewUser');
        await createNewUser(data);
      }

      await fetchUsers();
      setFormOpen(false);
      setSelectedUser(null);
      setUserFormResetKey((prev) => prev + 1);
      if (workspaceWarning) {
        showTemporaryErrorMessage(workspaceWarning);
      }
    } catch (error) {
      console.error('Error saving user: ', error);
      const parsedMessage = getCallableErrorMessage(error, 'No se pudo guardar el usuario.');
      showTemporaryErrorMessage(parsedMessage);
    } finally {
      setFormSubmitting(false);
      setLoading(false);
    }
  };

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'avatar',
        headerName: 'Avatar',
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as User;
          const { avatar, avatarPequeno, recorteFotografia, nombre, apellidoPaterno } = row;
          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                pt: 0.25,
              }}
            >
              <UserAvatarCell
                avatar={avatar}
                avatarPequeno={avatarPequeno}
                recorteFotografia={recorteFotografia}
                nombre={nombre}
                apellidoPaterno={apellidoPaterno}
                useRecorteFotografia={
                  appSettings.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes && isStudentUser(row)
                }
                showImage={
                  appSettings.visualizaciones.mostrarImagenAvatarEstudiantesEnListas || !isStudentUser(row)
                }
              />
            </Box>
          );
        },
      },
      {
        field: 'username',
        headerName: 'Username',
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Box
            title={String(params.value ?? '')}
            sx={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              lineHeight: 1.35,
              maxHeight: '2.7em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {String(params.value ?? '')}
          </Box>
        ),
      },
      { field: 'nickName', headerName: 'Nick name', flex: 1, minWidth: 140 },
      {
        field: 'correoInstitucional',
        headerName: 'Correo Institucional',
        flex: 1.35,
        minWidth: 150,
        renderCell: (params) => {
          const row = params.row as User;
          return row.correoInstitucional ?? row.correo_institucional ?? '';
        },
      },
      { field: 'email', headerName: 'Correo', flex: 1.2, minWidth: 150 },
      { field: 'celular', headerName: 'Celular', flex: 0.7, minWidth: 95 },
      { field: 'sexo', headerName: 'Sexo', width: 80 },
      {
        field: 'fechaNacimiento',
        headerName: 'Fech. Nac.',
        flex: 0.75,
        minWidth: 100,
        renderCell: (params) => formatDateAsDayMonthYear(params.value),
      },
      { field: 'dni', headerName: 'N° de documento', flex: 0.8, minWidth: 135 },
      { field: 'nacionalidad', headerName: 'Nacionalidad', flex: 0.8, minWidth: 125 },
      { field: 'estadoCivil', headerName: 'Estado Civil', flex: 0.8, minWidth: 125 },
      { field: 'instruccion', headerName: 'Instrucción', flex: 0.8, minWidth: 120 },
      { field: 'direccion', headerName: 'Direccion', flex: 1.1, minWidth: 150 },
      { field: 'distrito', headerName: 'Distrito', flex: 0.8, minWidth: 120 },
      {
        field: 'rolId',
        headerName: 'Rol',
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        width: 60,
        minWidth: 60,
        renderCell: (params) => {
          const row = params.row as User;
          return typeof row.rolId === 'number' ? String(row.rolId) : 'Sin rol';
        },
      },
      {
        field: 'bloqueado',
        headerName: 'Estado',
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Bloqueado" color="error" size="small" />
          ) : (
            <Chip label="Activo" color="success" size="small" />
          ),
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
              setMenuUser(params.row as User);
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [
      appSettings.visualizaciones.mostrarImagenAvatarEstudiantesEnListas,
      appSettings.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes,
    ],
  );

  const columnToggleItems = useMemo(
    () =>
      columns
        .filter((column) => column.field !== 'actions')
        .map((column) => ({
          field: column.field,
          label:
            typeof column.headerName === 'string' && column.headerName.trim().length > 0
              ? column.headerName
              : column.field,
          checked: columnVisibilityModel[column.field] !== false,
        })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={errorMessage}
      messageSeverity="error"
      title="Administracion de Usuarios"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleAddUser}>
            Agregar
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
        rows={users}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        rowHeight={50}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sx={{
          '& .MuiDataGrid-cell': {
            alignItems: 'flex-start',
            overflow: 'hidden',
            py: 0.5,
          },
          '& .MuiDataGrid-cellContent': {
            display: '-webkit-box !important',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: '2',
            width: '100%',
            minWidth: 0,
            lineHeight: 1.35,
            maxHeight: '2.7em',
            whiteSpace: 'normal !important',
            overflow: 'hidden !important',
            textOverflow: 'ellipsis !important',
            wordBreak: 'break-word',
          },
        }}
      />

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuUser(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuUser) handleEditUser(menuUser);
          }}
        >
          Editar
        </MenuItem>
        {canDeleteRecords ? (
          <MenuItem
            onClick={() => {
              if (menuUser) {
                handleDeleteUser({
                  documentId: menuUser.documentId,
                  email: menuUser.email,
                  dni: menuUser.dni,
                  rolId: menuUser.rolId,
                  nombre: menuUser.nombre,
                  apellidoPaterno: menuUser.apellidoPaterno,
                  apellidoMaterno: menuUser.apellidoMaterno,
                  correoInstitucional: menuUser.correoInstitucional,
                  correo_institucional: menuUser.correo_institucional,
                });
              }
            }}
          >
            Eliminar
          </MenuItem>
        ) : null}
      </Menu>

      <Modal1
        open={formOpen}
        onClose={handleDismissUserModal}
        title={selectedUser ? 'Editar Usuario' : 'Agregar Usuario'}
        maxWidth="md"
      >
        {formOpen ? (
          <UserForm
            key={`${selectedUser ? selectedUser.id : 'new-user'}-${userFormResetKey}`}
            onCancel={handleDismissUserModal}
            onSubmit={handleFormSubmit}
            isSubmitting={formSubmitting}
            submittingMessage={selectedUser ? 'Guardando cambios...' : 'Creando usuario...'}
            initialData={
              selectedUser ? (selectedUser as unknown as Record<string, unknown>) : undefined
            }
          />
        ) : null}
      </Modal1>
    </IntranetListLayout>
  );
};

export default UsersPage;
