'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, storage } from '@/lib/firebase';
import { buildPostStorageFilePath } from '@/lib/postStoragePath';
import FormLoadingOverlay from '@/components/FormLoadingOverlay';
import PostTinyMceEditor from './PostTinyMceEditor';

export type PostTipo = 'noticia' | 'evento' | 'comunicado' | 'curso';
export type PostEstado = 'borrador' | 'publicado' | 'archivado';

export interface PostFormValues {
  titulo: string;
  slug: string;
  tipo: PostTipo;
  contenido: string;
  resumen: string | null;
  imagenPortadaUrl: string | null;
  estado: PostEstado;
  comentariosActivos: boolean;
  entidadTipo: string | null;
  entidadId: string | null;
  fechaPublicacion: string | null;
}

interface PostFormProps {
  onCancel?: () => void;
  onSubmit: (data: PostFormValues) => void | Promise<void>;
  initialData?: Record<string, unknown>;
  isSubmitting?: boolean;
  submittingMessage?: string;
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const schema: yup.ObjectSchema<PostFormValues> = yup.object({
  titulo: yup.string().trim().max(220, 'Maximo 220 caracteres').required('El titulo es requerido'),
  slug: yup
    .string()
    .trim()
    .max(260, 'Maximo 260 caracteres')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa solo minusculas, numeros y guiones')
    .required('El slug es requerido'),
  tipo: yup
    .mixed<PostTipo>()
    .oneOf(['noticia', 'evento', 'comunicado', 'curso'])
    .required('El tipo es requerido'),
  contenido: yup
    .string()
    .test('contenido-richtext', 'El contenido es requerido', (value) => stripHtml(value || '').length > 0)
    .required('El contenido es requerido'),
  resumen: yup.string().defined().nullable().max(500, 'Maximo 500 caracteres'),
  imagenPortadaUrl: yup
    .string()
    .defined()
    .nullable()
    .test('url-opcional', 'Debe ser una URL valida', (value) => {
      if (!value) return true;
      return /^https?:\/\/.+/i.test(value);
    }),
  estado: yup.mixed<PostEstado>().oneOf(['borrador', 'publicado', 'archivado']).required(),
  comentariosActivos: yup.boolean().required(),
  entidadTipo: yup.string().defined().nullable().max(80, 'Maximo 80 caracteres'),
  entidadId: yup.string().defined().nullable().max(120, 'Maximo 120 caracteres'),
  fechaPublicacion: yup.string().defined().nullable(),
});

const normalizeSlug = (value: string): string =>
  value
    .replace(/[ñÑ]/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const toDatetimeLocal = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
  return date.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string | null): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export default function PostForm({
  onCancel,
  onSubmit,
  initialData,
  isSubmitting = false,
  submittingMessage,
}: PostFormProps) {
  const auth = getAuth(app);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastAutoSlugRef = useRef('');
  const isCreating = !initialData;

  const defaultValues = useMemo<PostFormValues>(
    () => ({
      titulo: '',
      slug: '',
      tipo: 'noticia',
      contenido: '',
      resumen: '',
      imagenPortadaUrl: '',
      estado: 'borrador',
      comentariosActivos: true,
      entidadTipo: '',
      entidadId: '',
      fechaPublicacion: '',
    }),
    [],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: yupResolver(schema) as Resolver<PostFormValues>,
    defaultValues,
  });

  const titulo = watch('titulo');
  const slug = watch('slug');
  const imagenPortadaUrl = watch('imagenPortadaUrl');
  const initialSlug = normalizeSlug(asString(initialData?.slug));
  const currentSlug = normalizeSlug(asString(slug));
  const storageSlug = initialSlug || currentSlug;
  const hasStorageSlug = Boolean(storageSlug);
  const postStorageTarget = useMemo(
    () => ({
      slug: storageSlug,
    }),
    [storageSlug],
  );

  const getInitialFormValues = useCallback((): PostFormValues => {
    if (!initialData) return defaultValues;

    return {
      titulo: asString(initialData.titulo),
      slug: asString(initialData.slug),
      tipo: ['noticia', 'evento', 'comunicado', 'curso'].includes(asString(initialData.tipo))
        ? (asString(initialData.tipo) as PostTipo)
        : 'noticia',
      contenido: asString(initialData.contenido),
      resumen: asString(initialData.resumen),
      imagenPortadaUrl: asString(initialData.imagenPortadaUrl),
      estado: ['borrador', 'publicado', 'archivado'].includes(asString(initialData.estado))
        ? (asString(initialData.estado) as PostEstado)
        : 'borrador',
      comentariosActivos: initialData.comentariosActivos !== false,
      entidadTipo: asString(initialData.entidadTipo),
      entidadId: asString(initialData.entidadId),
      fechaPublicacion: toDatetimeLocal(initialData.fechaPublicacion),
    };
  }, [defaultValues, initialData]);

  useEffect(() => {
    const nextAutoSlug = normalizeSlug(titulo || '');
    const currentSlug = String(getValues('slug') || '');
    const shouldApplyAutoSlug = !currentSlug || currentSlug === lastAutoSlugRef.current;

    if (shouldApplyAutoSlug) {
      setValue('slug', nextAutoSlug, { shouldValidate: true, shouldDirty: true });
    }
    lastAutoSlugRef.current = nextAutoSlug;
  }, [getValues, setValue, titulo]);

  useEffect(() => {
    const nextValues = getInitialFormValues();
    reset(nextValues);
    lastAutoSlugRef.current = nextValues.slug;
    setUploadError(null);
  }, [getInitialFormValues, reset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      if (!hasStorageSlug) {
        setUploadError('Completa el slug antes de subir archivos.');
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUploadError('Debes iniciar sesion para subir imagenes.');
        return;
      }

      const tokenResult = await currentUser.getIdTokenResult(true);
      const level = Number(tokenResult.claims.level ?? 0);
      if (!Number.isFinite(level) || level < 400) {
        setUploadError('Tu cuenta necesita nivel 400 o superior para subir imagenes.');
        return;
      }

      const storageRef = ref(storage, buildPostStorageFilePath(postStorageTarget, file.name));
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setValue('imagenPortadaUrl', downloadUrl, { shouldDirty: true, shouldValidate: true });
    } catch (error: unknown) {
      console.error('Error uploading post cover:', error);
      setUploadError((error as { message?: string } | null)?.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const submitForm = (data: PostFormValues) =>
    onSubmit({
      ...data,
      titulo: data.titulo.trim(),
      slug: normalizeSlug(data.slug),
      resumen: data.resumen?.trim() || null,
      imagenPortadaUrl: data.imagenPortadaUrl?.trim() || null,
      entidadTipo: data.entidadTipo?.trim() || null,
      entidadId: data.entidadId?.trim() || null,
      fechaPublicacion:
        data.estado === 'publicado'
          ? toIsoOrNull(data.fechaPublicacion) || new Date().toISOString()
          : toIsoOrNull(data.fechaPublicacion),
    });

  const handleCancelClick = () => {
    const nextValues = getInitialFormValues();
    reset(nextValues);
    lastAutoSlugRef.current = nextValues.slug;
    setUploadError(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
    onCancel?.();
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }} aria-busy={isSubmitting}>
      <form id="post-form" onSubmit={handleSubmit(submitForm)}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(2, minmax(320px, 1fr))',
            },
            gap: 2,
            mt: 1,
            width: { xs: 'calc(100vw - 64px)', md: 880 },
            maxWidth: '100%',
          }}
        >
          <Controller
            name="titulo"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                inputRef={(el) => {
                  field.ref(el);
                  titleInputRef.current = el;
                }}
                label="Titulo"
                error={!!errors.titulo}
                helperText={errors.titulo?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={slug || ''}
                label="Slug"
                error={!!errors.slug}
                helperText={errors.slug?.message}
                fullWidth
                onChange={(event) => field.onChange(normalizeSlug(event.target.value))}
              />
            )}
          />
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.tipo}>
                <InputLabel>Tipo</InputLabel>
                <Select {...field} label="Tipo">
                  <MenuItem value="noticia">Noticia</MenuItem>
                  <MenuItem value="evento">Evento</MenuItem>
                  <MenuItem value="comunicado">Comunicado</MenuItem>
                  <MenuItem value="curso">Informacion de curso</MenuItem>
                </Select>
                {errors.tipo?.message ? <FormHelperText>{errors.tipo.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            name="estado"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.estado}>
                <InputLabel>Estado</InputLabel>
                <Select {...field} label="Estado">
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="publicado">Publicado</MenuItem>
                  <MenuItem value="archivado">Archivado</MenuItem>
                </Select>
              </FormControl>
            )}
          />
          <Controller
            name="resumen"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                label="Resumen"
                error={!!errors.resumen}
                helperText={errors.resumen?.message}
                multiline
                minRows={3}
                fullWidth
                sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}
              />
            )}
          />
          <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
            <Controller
              name="contenido"
              control={control}
              render={({ field }) => (
                <PostTinyMceEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  postSlug={storageSlug}
                  disabled={isSubmitting || !hasStorageSlug}
                  error={!!errors.contenido}
                  helperText={
                    !hasStorageSlug
                      ? 'Completa el slug antes de editar el contenido.'
                      : errors.contenido?.message
                  }
                />
              )}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
            {imagenPortadaUrl ? (
              <Box
                component="img"
                src={imagenPortadaUrl}
                alt=""
                sx={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 1,
                }}
              />
            ) : null}
            <Controller
              name="imagenPortadaUrl"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ''}
                  label="Imagen portada URL"
                  error={!!errors.imagenPortadaUrl}
                  helperText={errors.imagenPortadaUrl?.message}
                  fullWidth
                />
              )}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverChange}
              />
              <Button
                variant="outlined"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploading || !hasStorageSlug}
              >
                {isUploading ? <CircularProgress size={22} /> : 'Subir portada'}
              </Button>
              {!hasStorageSlug ? (
                <Typography variant="caption" color="text.secondary">
                  Completa el slug para subir archivos.
                </Typography>
              ) : uploadError ? (
                <Typography variant="caption" color="error">
                  {uploadError}
                </Typography>
              ) : null}
            </Box>
          </Box>
          <Controller
            name="fechaPublicacion"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                label="Fecha publicacion"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
          />
          <Controller
            name="comentariosActivos"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                label="Comentarios activos"
              />
            )}
          />
          <Controller
            name="entidadTipo"
            control={control}
            render={({ field }) => (
              <TextField {...field} value={field.value || ''} label="Entidad tipo" fullWidth />
            )}
          />
          <Controller
            name="entidadId"
            control={control}
            render={({ field }) => (
              <TextField {...field} value={field.value || ''} label="Entidad ID" fullWidth />
            )}
          />
        </Box>
      </form>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        {onCancel ? (
          <Button onClick={handleCancelClick} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" form="post-form" variant="contained" disabled={isUploading || isSubmitting}>
          {isCreating ? 'Crear' : 'Guardar Cambios'}
        </Button>
      </Box>
      <FormLoadingOverlay
        open={isSubmitting}
        message={submittingMessage || (isCreating ? 'Creando post...' : 'Guardando post...')}
      />
    </Box>
  );
}
