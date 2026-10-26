'use client';
import { invalidateMatriculaLists } from '@/lib/matriculasListCache';
import { getListsRevision, loadListPage, peekListPage, subscribeLists } from '@/lib/intranetListCache';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Avatar,
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
  GridFilterModel,
  GridSortModel,
} from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import UserForm from '@/components/intranet/users/UserForm';
import { MatriculaForm } from '@/components/intranet/matriculas/MatriculasClient';
import { EditorImagenesModal } from '@/components/intranet/editor-documentos/EditorDocumentosClient';
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
  avatarTiny?: string;
  avatarPequeno?: string;
  avatarMediano?: string;
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
  fechaVencimiento?: string;
  telefono?: string;
  sexo?: string;
  nombreColegio?: string;
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
type DocumentoSide = 'frente' | 'reverso';
type UsersPageResult = { rows: User[]; rowCount: number };
type UserAvatars = Record<string, Pick<User, 'avatarTiny' | 'recorteFotografia'>>;
const userSearchFields = ['username', 'nickName', 'correoInstitucional', 'email', 'celular', 'sexo',
  'fechaNacimiento', 'dni', 'nacionalidad', 'estadoCivil', 'instruccion', 'direccion', 'distrito', 'rolId', 'bloqueado'];
const normalizeUser = (row: User): User => ({
  ...row,
  blocked: Boolean(row.blocked),
  bloqueado: Boolean(row.bloqueado ?? row.blocked),
  nacionalidad: row.nacionalidad || 'PERUANA',
  rolId: row.rolId != null && Number.isFinite(Number(row.rolId)) ? Number(row.rolId) : null,
});

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
  avatarTiny,
  avatarPequeno,
  recorteFotografia,
  nombre,
  apellidoPaterno,
  useRecorteFotografia,
  showImage,
}: Pick<User, 'avatar' | 'avatarTiny' | 'avatarPequeno' | 'recorteFotografia' | 'nombre' | 'apellidoPaterno'> & {
  useRecorteFotografia: boolean;
  showImage: boolean;
}) => {
  const fallbackSrc = avatar?.trim() || undefined;
  const tinySrc = avatarTiny?.trim() || undefined;
  const normalSrc = tinySrc || avatarPequeno?.trim() || fallbackSrc;
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
    : tinySrc
      ? `avatarTiny: ${tinySrc}`
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
        width: 48,
        height: 48,
        fontSize: 16,
        fontWeight: 700,
        bgcolor: 'transparent',
        color: '#ffffff',
        background: 'linear-gradient(180deg, #8fd8ff 0%, #ffffff 100%)',
      }}
      imgProps={{
        referrerPolicy: 'no-referrer',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 10%',
        },
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
  const { can, isSuperUser } = useIntranetPermissions();
  const { settings: appSettings } = useAppSettings();
  const canDeleteRecords = can('users', 'delete');
  const canCreateMatriculas = can('matriculas', 'create');
  const canEditDniImagesInUserForm = useMemo(() => {
    if (isSuperUser) return true;
    const normalizedTitle = String(user?.roleTitle || user?.cargo || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizedTitle.includes('administrativo')
      || normalizedTitle.includes('coordinador')
      || normalizedTitle.includes('director');
  }, [isSuperUser, user?.cargo, user?.roleTitle]);
  const [users, setUsers] = useState<User[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [pageRowsKey, setPageRowsKey] = useState('');
  const [pageAvatars, setPageAvatars] = useState<UserAvatars>({});
  const [listRevision, setListRevision] = useState(getListsRevision);
  useEffect(() => subscribeLists(() => setListRevision(getListsRevision())), []);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const detailsRequestRef = useRef(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [matriculaUser, setMatriculaUser] = useState<User | null>(null);
  const [editorTarget, setEditorTarget] = useState<{ user: User; side: DocumentoSide } | null>(null);
  const [matriculaFormResetKey, setMatriculaFormResetKey] = useState(0);
  const [userFormResetKey, setUserFormResetKey] = useState(0);
  const errorMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchUsersRequestRef = useRef(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 30,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [queryFilterModel, setQueryFilterModel] = useState(filterModel);
  useEffect(() => {
    const timer = window.setTimeout(() => setQueryFilterModel(filterModel), 250);
    return () => window.clearTimeout(timer);
  }, [filterModel]);
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

  const pageRequest = useMemo(() => ({
    ...paginationModel,
    sortModel,
    filterModel: queryFilterModel,
    quickFilterFields: userSearchFields.filter((field) =>
      queryFilterModel.quickFilterExcludeHiddenColumns === false || columnVisibilityModel[field] !== false),
  }), [paginationModel, sortModel, queryFilterModel, columnVisibilityModel]);
  const pageCacheKey = useMemo(() => JSON.stringify(['users', user?.uid, user?.role, user?.level, pageRequest]),
    [user?.uid, user?.role, user?.level, pageRequest]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++fetchUsersRequestRef.current;
    if (!user) {
      setUsers([]);
      setRowCount(0);
      setPageRowsKey('');
      setPageAvatars({});
      setLoading(false);
      return;
    }
    const requestRevision = listRevision;
    setLoading(!peekListPage(pageCacheKey));
    setErrorMessage(null);
    try {
      const result = await loadListPage(pageCacheKey, async () =>
        (await httpsCallable<typeof pageRequest, UsersPageResult>(functions, 'listUsersPage', { timeout: 60000 })(pageRequest)).data);
      if (requestId !== fetchUsersRequestRef.current || requestRevision !== getListsRevision()) return;
      setUsers(result.rows.map(normalizeUser));
      setPageRowsKey(pageCacheKey);
      setPageAvatars({});
      setRowCount(result.rowCount);
      if (!result.rows.length && result.rowCount > 0 && pageRequest.page > 0) {
        setPaginationModel((current) => ({ ...current, page: Math.max(0, Math.ceil(result.rowCount / current.pageSize) - 1) }));
      }
    } catch (error) {
      if (requestId !== fetchUsersRequestRef.current || requestRevision !== getListsRevision()) return;
      console.error('Error fetching users: ', error);
      setErrorMessage(isPermissionDeniedDataConnectError(error)
        ? getCallableErrorMessage(error, 'No tienes acceso para listar usuarios.')
        : 'No se pudo cargar la lista de usuarios desde Data Connect.');
    } finally {
      if (requestId === fetchUsersRequestRef.current) setLoading(false);
    }
  }, [pageCacheKey, pageRequest, user, listRevision]);

  useEffect(() => {
    if (authLoading) return;
    void fetchUsers();
    return () => { fetchUsersRequestRef.current += 1; };
  }, [authLoading, fetchUsers]);

  const avatarUserIds = useMemo(() => users.filter((row) =>
    appSettings.visualizaciones.mostrarImagenAvatarEstudiantesEnListas || !isStudentUser(row)).map((row) => row.id),
  [users, appSettings.visualizaciones.mostrarImagenAvatarEstudiantesEnListas]);
  useEffect(() => {
    if (loading || pageRowsKey !== pageCacheKey || !avatarUserIds.length || columnVisibilityModel.avatar === false) return;
    let active = true;
    const requestRevision = getListsRevision();
    void loadListPage(`${pageCacheKey}|avatars|${avatarUserIds.join(',')}`, async () =>
      (await httpsCallable<{ userIds: number[] }, { avatars: UserAvatars }>(functions, 'getUsersPageAvatars')({ userIds: avatarUserIds })).data)
      .then((result) => {
        if (active && requestRevision === getListsRevision()) setPageAvatars(result.avatars);
      }).catch((error) => {
        if (active) console.warn('No se pudieron cargar los avatares de usuarios.', error);
      });
    return () => { active = false; };
  }, [loading, pageRowsKey, pageCacheKey, avatarUserIds, columnVisibilityModel.avatar, listRevision]);
  const displayUsers = useMemo(() => users.map((row) => ({ ...row, ...pageAvatars[row.id] })), [users, pageAvatars]);

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
    detailsRequestRef.current += 1;
    setDetailsLoading(false);
    setDetailsError(null);
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = useCallback(async (row: User) => {
    const requestId = ++detailsRequestRef.current;
    setSelectedUser(row);
    setFormOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setMenuAnchorEl(null);
    setMenuUser(null);
    try {
      const result = await httpsCallable<{ documentId: string }, { user: User }>(functions, 'getUserDetails')({ documentId: row.documentId });
      if (requestId !== detailsRequestRef.current) return;
      setSelectedUser(normalizeUser(result.data.user));
      setUserFormResetKey((current) => current + 1);
    } catch (error) {
      if (requestId === detailsRequestRef.current) setDetailsError(getCallableErrorMessage(error, 'No se pudieron cargar los datos del usuario.'));
    } finally {
      if (requestId === detailsRequestRef.current) setDetailsLoading(false);
    }
  }, []);

  const handleMatricularUser = async (row: User) => {
    setMenuAnchorEl(null);
    setMenuUser(null);
    try {
      const result = await httpsCallable<{ documentId: string }, { user: User }>(functions, 'getUserDetails')({ documentId: row.documentId });
      setMatriculaUser(normalizeUser(result.data.user));
      setMatriculaFormResetKey((prev) => prev + 1);
    } catch (error) {
      showTemporaryErrorMessage(getCallableErrorMessage(error, 'No se pudieron cargar los datos del usuario.'));
    }
  };

  const handleDismissUserModal = () => {
    if (formSubmitting) return;
    detailsRequestRef.current += 1;
    setFormOpen(false);
  };

  const handleDismissMatriculaModal = () => {
    setMatriculaUser(null);
  };

  const handleMatriculaSaved = () => {
    setMatriculaUser(null);
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
        invalidateMatriculaLists();
        setMenuAnchorEl(null);
        setMenuUser(null);
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
    let userChanged = false;
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
        userChanged = true;
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
        userChanged = true;
      }

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
      if (userChanged) invalidateMatriculaLists();
      setFormSubmitting(false);
      setLoading(false);
    }
  };

  const handleAvatarRemovedFromForm = useCallback(async () => {
    setSelectedUser((current) => current
      ? {
        ...current,
        avatar: undefined,
        avatarTiny: undefined,
        avatarPequeno: undefined,
        avatarMediano: undefined,
        recorteFotografia: null,
      }
      : current);
    await fetchUsers();
  }, [fetchUsers]);

  const updateUserLocally = useCallback((userId: number, patch: Partial<User>) => {
    setUsers((current) =>
      current.map((item) => item.id === userId ? { ...item, ...patch } : item),
    );
    setSelectedUser((current) => current?.id === userId ? { ...current, ...patch } : current);
  }, []);

  const handleEditUserDniSide = useCallback((side: DocumentoSide) => {
    if (!selectedUser) return;
    setEditorTarget({ user: selectedUser, side });
  }, [selectedUser]);

  const handleUserDniSaved = useCallback((payload: {
    side: DocumentoSide;
    processedUrl?: string | null;
    originalUrl?: string | null;
  }) => {
    if (!editorTarget?.user?.id) {
      setEditorTarget(null);
      return;
    }

    const patch: Partial<User> = payload.side === 'frente'
      ? {
        dniImagenFrenteProcesadaUrl: payload.processedUrl || editorTarget.user.dniImagenFrenteProcesadaUrl,
        dniImagenFrenteUrl: payload.originalUrl || editorTarget.user.dniImagenFrenteUrl,
      }
      : {
        dniImagenReversoProcesadaUrl: payload.processedUrl || editorTarget.user.dniImagenReversoProcesadaUrl,
        dniImagenReversoUrl: payload.originalUrl || editorTarget.user.dniImagenReversoUrl,
      };
    updateUserLocally(editorTarget.user.id, patch);
    setUserFormResetKey((prev) => prev + 1);
    setEditorTarget(null);
  }, [editorTarget, updateUserLocally]);

  const handleGenerateAvatarForUser = useCallback(async (targetUser: User) => {
    if (!targetUser.id) {
      throw new Error('El usuario no tiene id.');
    }
    const callable = httpsCallable<{ userId: number }, { ok?: boolean; jobId?: string }>(
      functions,
      'regenerateEditorDocumentoAvatar',
      { timeout: 120000 },
    );
    await callable({ userId: targetUser.id });
  }, []);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'avatar',
        headerName: 'Avatar',
        width: 68,
        minWidth: 68,
        maxWidth: 68,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as User;
          const { avatar, avatarTiny, avatarPequeno, recorteFotografia, nombre, apellidoPaterno } = row;
          return (
            <Box
              component="button"
              type="button"
              aria-label={`Abrir usuario ${row.username}`}
              onClick={() => void handleEditUser(row)}
              sx={{
                border: 0,
                padding: 0,
                background: 'transparent',
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0,
              }}
            >
              <UserAvatarCell
                avatar={avatar}
                avatarTiny={avatarTiny}
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
            component="button"
            type="button"
            onClick={() => void handleEditUser(params.row as User)}
            title={String(params.value ?? '')}
            sx={{
              border: 0,
              padding: 0,
              background: 'transparent',
              font: 'inherit',
              color: 'primary.main',
              textAlign: 'left',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
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
      handleEditUser,
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
      title="Usuarios"
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
        rows={displayUsers}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        rowHeight={50}
        paginationModel={paginationModel}
        rowCount={rowCount}
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        sortModel={sortModel}
        onSortModelChange={(model) => {
          setSortModel(model);
          setPaginationModel((current) => ({ ...current, page: 0 }));
        }}
        filterModel={filterModel}
        onFilterModelChange={(model) => {
          setFilterModel(model);
          setPaginationModel((current) => ({ ...current, page: 0 }));
        }}
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
        {canCreateMatriculas ? (
          <MenuItem
            onClick={() => {
              if (menuUser) handleMatricularUser(menuUser);
            }}
          >
            Matricular...
          </MenuItem>
        ) : null}
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
        {formOpen && detailsLoading ? <LinearProgress aria-label="Cargando datos del usuario" /> : null}
        {formOpen && detailsError ? (
          <Alert severity="error" action={<Button onClick={() => selectedUser && void handleEditUser(selectedUser)}>Reintentar</Button>}>
            {detailsError}
          </Alert>
        ) : null}
        {formOpen && !detailsLoading && !detailsError ? (
          <UserForm
            key={`${selectedUser ? selectedUser.id : 'new-user'}-${userFormResetKey}`}
            onCancel={handleDismissUserModal}
            onSubmit={handleFormSubmit}
            onAvatarRemoved={handleAvatarRemovedFromForm}
            onEditDniSide={handleEditUserDniSide}
            onGenerateAvatar={selectedUser ? () => handleGenerateAvatarForUser(selectedUser) : undefined}
            isSuperUser={isSuperUser}
            canEditDniImages={canEditDniImagesInUserForm}
            isSubmitting={formSubmitting}
            submittingMessage={selectedUser ? 'Guardando cambios...' : 'Creando usuario...'}
            initialData={
              selectedUser ? (selectedUser as unknown as Record<string, unknown>) : undefined
            }
          />
        ) : null}
      </Modal1>

      <Modal1
        open={Boolean(matriculaUser)}
        onClose={handleDismissMatriculaModal}
        title="Nueva Matricula"
        maxWidth="md"
        disableAutoFocus
      >
        {matriculaUser ? (
          <MatriculaForm
            key={`${matriculaUser.id}-${matriculaFormResetKey}`}
            isOpen={Boolean(matriculaUser)}
            onCancel={handleDismissMatriculaModal}
            onSaved={handleMatriculaSaved}
            defaultSemestreId={appSettings.general.semestreActualId}
            reconocimientoDniActivo={appSettings.formularioMatricula.activarReconocimientoDni}
            initialUser={matriculaUser}
          />
        ) : null}
      </Modal1>

      <EditorImagenesModal
        open={Boolean(editorTarget)}
        userId={editorTarget?.user.id ?? null}
        side={editorTarget?.side ?? 'frente'}
        onClose={() => setEditorTarget(null)}
        onSaved={handleUserDniSaved}
      />
    </IntranetListLayout>
  );
};

export default UsersPage;
