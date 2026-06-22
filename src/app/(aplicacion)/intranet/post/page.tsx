'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { getAuth } from 'firebase/auth';
import { QueryFetchPolicy } from 'firebase/data-connect';
import {
  createPost,
  deletePost,
  listPosts,
  updatePost,
  type ListPostsData,
} from '@dataconnect/generated';
import { app } from '@/lib/firebase';
import { getClientDataConnect } from '@/lib/dataconnect';
import { useAuth } from '@/context/AuthContext';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import PostForm, { type PostFormValues } from '@/components/intranet/posts/PostForm';

type Post = ListPostsData['posts'][number];

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = String((error as { message?: string } | null)?.message || '');
  if (message.includes('PERMISSION_DENIED') || message.includes('@auth rejected')) {
    return 'No tienes acceso suficiente para administrar posts. Cierra sesion e ingresa otra vez si te acaban de asignar permisos.';
  }
  if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('duplicate')) {
    return 'Ya existe un post con ese slug.';
  }
  return message || fallback;
};

const formatDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function PostsPage() {
  const { user, loading: authLoading } = useAuth();
  const auth = getAuth(app);
  const dataConnect = useMemo(() => getClientDataConnect(app), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postFormResetKey, setPostFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const errorMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      id: true,
      titulo: true,
      tipo: true,
      fechaActualizacion: true,
      estado: true,
      comentariosActivos: true,
      slug: false,
      entidadTipo: false,
      entidadId: false,
      fechaPublicacion: false,
      creadoPorUid: false,
      actions: true,
    });

  const fetchPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const result = await listPosts(dataConnect, { fetchPolicy: QueryFetchPolicy.SERVER_ONLY });
      setPosts(result.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setErrorMessage(getErrorMessage(error, 'No se pudo cargar la lista de posts desde Data Connect.'));
    } finally {
      setLoading(false);
    }
  }, [auth, dataConnect, user]);

  useEffect(() => {
    if (authLoading) return;
    void fetchPosts();
  }, [authLoading, fetchPosts]);

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

  const handleAddPost = () => {
    setSelectedPost(null);
    setFormOpen(true);
  };

  const handleEditPost = (row: Post) => {
    setSelectedPost(row);
    setFormOpen(true);
    setMenuAnchorEl(null);
    setMenuPost(null);
  };

  const handleDismissPostModal = () => {
    if (formSubmitting) return;
    setFormOpen(false);
  };

  const handleCancelPostModal = () => {
    if (formSubmitting) return;
    setFormOpen(false);
    setSelectedPost(null);
    setPostFormResetKey((prev) => prev + 1);
  };

  const handleDeletePost = async (row: Post) => {
    if (!window.confirm('Estas seguro de eliminar este post? Esta accion es irreversible.')) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      await deletePost(dataConnect, { id: row.id });
      setMenuAnchorEl(null);
      setMenuPost(null);
      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      showTemporaryErrorMessage(getErrorMessage(error, 'No se pudo eliminar el post.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: PostFormValues) => {
    setLoading(true);
    setFormSubmitting(true);
    setErrorMessage(null);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      if (selectedPost) {
        await updatePost(dataConnect, {
          id: selectedPost.id,
          ...data,
        });
      } else {
        await createPost(dataConnect, data);
      }

      await fetchPosts();
      setFormOpen(false);
      setSelectedPost(null);
      setPostFormResetKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving post:', error);
      setErrorMessage(getErrorMessage(error, 'No se pudo guardar el post.'));
    } finally {
      setFormSubmitting(false);
      setLoading(false);
    }
  };

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 42, minWidth: 42, maxWidth: 42 },
      { field: 'titulo', headerName: 'Titulo', flex: 1.4, minWidth: 190 },
      {
        field: 'tipo',
        headerName: 'Tipo',
        flex: 0.7,
        minWidth: 115,
        renderCell: (params) => String(params.value || '').toUpperCase(),
      },
      {
        field: 'fechaActualizacion',
        headerName: 'Actualizacion',
        flex: 0.9,
        minWidth: 145,
        renderCell: (params) => formatDate(params.value),
      },
      {
        field: 'estado',
        headerName: 'Estado',
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) => {
          const estado = String(params.value || '');
          const color = estado === 'publicado' ? 'success' : estado === 'archivado' ? 'default' : 'warning';
          return <Chip label={estado || 'sin estado'} color={color} size="small" />;
        },
      },
      {
        field: 'comentariosActivos',
        headerName: 'Comentarios',
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Activos" color="success" size="small" />
          ) : (
            <Chip label="Inactivos" color="default" size="small" />
          ),
      },
      { field: 'slug', headerName: 'Slug', flex: 1.1, minWidth: 160 },
      { field: 'entidadTipo', headerName: 'Entidad tipo', flex: 0.8, minWidth: 120 },
      { field: 'entidadId', headerName: 'Entidad ID', flex: 0.7, minWidth: 110 },
      {
        field: 'fechaPublicacion',
        headerName: 'Publicacion',
        flex: 0.9,
        minWidth: 145,
        renderCell: (params) => formatDate(params.value),
      },
      { field: 'creadoPorUid', headerName: 'Creado por UID', flex: 1, minWidth: 170 },
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
              setMenuPost(params.row as Post);
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
      title="Administracion de Posts"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleAddPost}>
            Agregar
          </Button>
          <Button variant="outlined" disabled>
            Otros...
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
        rows={posts}
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
          setMenuPost(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPost) handleEditPost(menuPost);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuPost) void handleDeletePost(menuPost);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={formOpen}
        onClose={handleDismissPostModal}
        title={selectedPost ? 'Editar Post' : 'Agregar Post'}
        disableAutoFocus
        disableEnforceFocus
      >
        <PostForm
          key={`${selectedPost ? selectedPost.id : 'new-post'}-${postFormResetKey}`}
          onCancel={handleCancelPostModal}
          onSubmit={handleFormSubmit}
          isSubmitting={formSubmitting}
          submittingMessage={selectedPost ? 'Guardando cambios...' : 'Creando post...'}
          initialData={
            selectedPost ? (selectedPost as unknown as Record<string, unknown>) : undefined
          }
        />
      </Modal1>
    </IntranetListLayout>
  );
}
