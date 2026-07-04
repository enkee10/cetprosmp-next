'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Box, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, Avatar, CircularProgress, Typography, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { app, functions, storage } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import FormLoadingOverlay from '@/components/FormLoadingOverlay';
import { generateUsername } from './userForm_utilities';

const createValidationSchema = (isCreating: boolean) => yup.object().shape({
  apellido_paterno: yup.string().required('El apellido paterno es requerido'),
  apellido_materno: yup.string().required('El apellido materno es requerido'),
  nombre: yup.string().required('El nombre es requerido'),
  username: yup.string().min(3).required('El nombre de usuario es requerido'),
  sexo: yup.string().oneOf(['F', 'M']).required(),
  fecha_nacimiento: yup
    .string()
    .nullable()
    .test(
      'fecha-format',
      'La fecha de nacimiento debe tener formato YYYY-MM-DD',
      (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    )
    .test(
      'fecha-rango',
      'La fecha de nacimiento debe estar entre 1900 y 2100',
      (value) => {
        if (!value) return true;
        const year = Number(value.slice(0, 4));
        if (!Number.isFinite(year) || year < 1900 || year > 2100) return false;
        const dt = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === value;
      },
    ),
  celular: yup.string().matches(/^\d{9}$/, 'El celular debe tener 9 dígitos').required('El celular es requerido'),
  telefono: yup.string().nullable(),
  email: yup.string().email('Debe ser un email válido').required('El email es requerido'),
  tipo_documento: yup.string().oneOf(['DNI', 'CE']).required(),
  dni: yup.string().matches(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  nacionalidad: yup.string().required('La nacionalidad es requerida'),
  password: isCreating
    ? yup.string().min(8, 'La contraseña debe tener al menos 8 caracteres').required('La contraseña es requerida')
    : yup.string().notRequired(),
  instruccion: yup.string().oneOf(['Primaria', 'Secundaria', 'Superior']).required('El grado de instrucción es requerido'),
  estado_civil: yup.string().oneOf(['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)']).required(),
  direccion: yup.string().nullable(),
  distrito: yup.string().nullable(),
  rolId: yup.string().required('El rol es requerido'),
  avatar: yup.string().url('Debe ser una URL válida').nullable(),
  bloqueado: yup.boolean(),
  correo_institucional: yup.string().nullable(),
  fecha_creacion: yup.string().nullable(),
  fecha_modificacion: yup.string().nullable(),
  email_creador: yup.string().nullable(),
});

interface UserFormValues {
  apellido_paterno: string;
  apellido_materno: string;
  nombre: string;
  username: string;
  sexo: 'F' | 'M';
  fecha_nacimiento: string | null | undefined;
  celular: string;
  telefono: string | null | undefined;
  email: string;
  tipo_documento: 'DNI' | 'CE';
  dni: string;
  nacionalidad: string;
  password: string;
  instruccion: 'Primaria' | 'Secundaria' | 'Superior';
  estado_civil: 'Soltero' | 'Casado(a)' | 'Viudo(a)' | 'Divorciado(a)';
  direccion: string | null | undefined;
  distrito: string | null | undefined;
  rolId: string;
  avatar: string | null | undefined;
  bloqueado: boolean | undefined;
  correo_institucional: string | null | undefined;
  fecha_creacion: string | null | undefined;
  fecha_modificacion: string | null | undefined;
  email_creador: string | null | undefined;
}

interface UserFormProps {
  onCancel?: () => void;
  onSubmit: (data: UserFormValues) => void | Promise<void>;
  initialData?: Record<string, unknown>;
  isSubmitting?: boolean;
  submittingMessage?: string;
}

interface Role {
  id: number;
  titulo?: string | null;
  scala?: number | null;
}

const EXCLUDED_ROLE_IDS = new Set<number>([1, 2]);
const INSTITUTIONAL_DOMAIN = 'cetprosmp.edu.pe';

const normalizeAliasToken = (value: string | null | undefined): string =>
  String(value || '')
    .replace(/[ñÑ]/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const computeInstitutionalEmail = (params: {
  rolId: string | null | undefined;
  dni: string | null | undefined;
  nombre: string | null | undefined;
  apellidoPaterno: string | null | undefined;
  apellidoMaterno: string | null | undefined;
}): string => {
  const roleId = Number(params.rolId || 0);
  if (!Number.isFinite(roleId) || roleId <= 0) return '';

  if (roleId >= 1 && roleId <= 3) {
    const normalizedDni = String(params.dni || '').trim().replace(/\D+/g, '');
    return /^\d{8}$/.test(normalizedDni) ? `${normalizedDni}@${INSTITUTIONAL_DOMAIN}` : '';
  }

  if (roleId >= 4 && roleId <= 9) {
    const firstNameInitial = normalizeAliasToken(params.nombre).slice(0, 1);
    const lastName = normalizeAliasToken(params.apellidoPaterno);
    const secondLastNameInitial = normalizeAliasToken(params.apellidoMaterno).slice(0, 1);
    if (!firstNameInitial || !lastName || !secondLastNameInitial) return '';
    const alias = `${firstNameInitial}${lastName}${secondLastNameInitial}`;
    return `${alias}@${INSTITUTIONAL_DOMAIN}`;
  }

  return '';
};

const formatDateTimeForDisplay = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const pad = (number: number) => String(number).padStart(2, '0');
  return [
    `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`,
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  ].join(' ');
};

const getInitialString = (
  initialData: Record<string, unknown> | undefined,
  camelKey: string,
  snakeKey: string,
): string => {
  const value = initialData?.[camelKey] ?? initialData?.[snakeKey];
  return typeof value === 'string' ? value.trim() : '';
};

const UserForm: React.FC<UserFormProps> = ({
  onCancel,
  onSubmit,
  initialData,
  isSubmitting = false,
  submittingMessage,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isCreating = !initialData;
  const auth = getAuth(app);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const apellidoPaternoRef = useRef<HTMLInputElement>(null);
  const lastAutoInstitutionalEmailRef = useRef('');
  const dniImagenFrenteProcesadaUrl = getInitialString(
    initialData,
    'dniImagenFrenteProcesadaUrl',
    'dni_imagen_frente_procesada_url',
  );
  const dniImagenReversoProcesadaUrl = getInitialString(
    initialData,
    'dniImagenReversoProcesadaUrl',
    'dni_imagen_reverso_procesada_url',
  );
  const hasProcessedDniImages = Boolean(dniImagenFrenteProcesadaUrl || dniImagenReversoProcesadaUrl);

  const { handleSubmit, control, formState: { errors }, reset, watch, setValue, getValues } = useForm<UserFormValues>({
    resolver: yupResolver(createValidationSchema(isCreating)) as Resolver<UserFormValues>,
    defaultValues: {
      apellido_paterno: '',
      apellido_materno: '',
      nombre: '',
      username: '',
      sexo: 'F',
      fecha_nacimiento: '',
      celular: '',
      telefono: '',
      email: '',
      tipo_documento: 'DNI',
      dni: '',
      nacionalidad: 'PERUANA',
      password: '',
      instruccion: 'Primaria',
      estado_civil: 'Soltero',
      direccion: '',
      distrito: '',
      rolId: '',
      avatar: '',
      bloqueado: false,
      correo_institucional: '',
      fecha_creacion: '',
      fecha_modificacion: '',
      email_creador: '',
    },
  });

  const nombre = watch('nombre');
  const apellido_paterno = watch('apellido_paterno');
  const apellido_materno = watch('apellido_materno');
  const dni = watch('dni');
  const rolId = watch('rolId');

  useEffect(() => {
    generateUsername(nombre, apellido_paterno, setValue);
  }, [nombre, apellido_paterno, setValue]);

  useEffect(() => {
    const institutionalEmail = computeInstitutionalEmail({
      rolId,
      dni,
      nombre,
      apellidoPaterno: apellido_paterno,
      apellidoMaterno: apellido_materno,
    });
    const currentInstitutionalEmail = String(getValues('correo_institucional') || '').trim();
    const shouldApplyAutoEmail =
      !currentInstitutionalEmail
      || currentInstitutionalEmail === lastAutoInstitutionalEmailRef.current;

    if (shouldApplyAutoEmail) {
      setValue('correo_institucional', institutionalEmail, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    lastAutoInstitutionalEmailRef.current = institutionalEmail;
  }, [rolId, dni, nombre, apellido_paterno, apellido_materno, getValues, setValue]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const listRoles = httpsCallable<undefined, { roles?: Role[] }>(functions, 'listRoles');
        const result = await listRoles();
        setRoles(
          (result.data.roles || [])
            .filter((role) => !EXCLUDED_ROLE_IDS.has(Number(role.id)))
            .map((role) => ({
              id: role.id,
              titulo: role.titulo ?? null,
              scala: role.scala ?? null,
            })),
        );
      } catch (error) {
        console.error('Error fetching roles: ', error);
        setRoles([]);
      }
    };

    fetchRoles();
  }, []);

  const avatarUrl = watch('avatar');

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'avatar',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    const storageRef = ref(storage, `usuarios/${Date.now()}_${file.name}`);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUploadError('Error: Debes iniciar sesión para subir archivos.');
        return;
      }

      const tokenResult = await currentUser.getIdTokenResult(true);
      const level = Number(tokenResult.claims.level ?? 0);
      if (!Number.isFinite(level) || level < 400) {
        setUploadError('Error: Tu sesión no tiene nivel suficiente para subir archivos. Cierra sesión e ingresa nuevamente.');
        return;
      }

      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(snapshot.ref);

      setValue(field, downloadURL, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch (error: unknown) {
      const parsedError = error as { code?: string; message?: string };
      console.error('Error uploading file:', error);
      if (parsedError.code === 'storage/unauthorized') {
        setUploadError('Error: No tienes acceso para subir archivos.');
      } else {
        setUploadError(`Ocurrió un error al subir la imagen: ${parsedError.message || 'desconocido'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
    const asSexo = (value: unknown): 'F' | 'M' => (value === 'M' ? 'M' : 'F');
    const asTipoDocumento = (value: unknown): 'DNI' | 'CE' => (value === 'CE' ? 'CE' : 'DNI');
    const asInstruccion = (value: unknown): 'Primaria' | 'Secundaria' | 'Superior' =>
      value === 'Secundaria' || value === 'Superior' ? value : 'Primaria';
    const asEstadoCivil = (value: unknown): 'Soltero' | 'Casado(a)' | 'Viudo(a)' | 'Divorciado(a)' =>
      value === 'Casado(a)' || value === 'Viudo(a)' || value === 'Divorciado(a)' ? value : 'Soltero';
    const asBoolean = (value: unknown): boolean => value === true;
    const dob = initialData?.fecha_nacimiento ?? initialData?.fechaNacimiento;
    let formattedDob = '';

    if (dob && typeof dob === 'object' && 'toDate' in dob && typeof dob.toDate === 'function') {
      formattedDob = dob.toDate().toISOString().split('T')[0];
    } else if (typeof dob === 'string') {
      formattedDob = dob.split('T')[0];
    }

    const defaultValues: UserFormValues = {
      apellido_paterno: asString(initialData?.apellido_paterno ?? initialData?.apellidoPaterno),
      apellido_materno: asString(initialData?.apellido_materno ?? initialData?.apellidoMaterno),
      nombre: asString(initialData?.nombre),
      username: asString(initialData?.username),
      sexo: asSexo(initialData?.sexo),
      fecha_nacimiento: formattedDob,
      celular: asString(initialData?.celular),
      telefono: asString(initialData?.telefono),
      email: asString(initialData?.email),
      tipo_documento: asTipoDocumento(initialData?.tipo_documento ?? initialData?.tipoDocumento),
      dni: asString(initialData?.dni),
      nacionalidad: asString(initialData?.nacionalidad ?? initialData?.Nacionalidad) || 'PERUANA',
      password: '',
      instruccion: asInstruccion(initialData?.instruccion),
      estado_civil: asEstadoCivil(initialData?.estado_civil ?? initialData?.estadoCivil),
      direccion: asString(initialData?.direccion),
      distrito: asString(initialData?.distrito),
      rolId:
        initialData?.rolId != null
          ? String(initialData.rolId)
          : (roles[0]?.id ? String(roles[0].id) : ''),
      avatar: asString(initialData?.avatar),
      bloqueado: asBoolean(initialData?.bloqueado ?? initialData?.blocked),
      correo_institucional: asString(initialData?.correo_institucional ?? initialData?.correoInstitucional),
      fecha_creacion: asString(initialData?.fecha_creacion ?? initialData?.fechaCreacion),
      fecha_modificacion: asString(initialData?.fecha_modificacion ?? initialData?.fechaModificacion),
      email_creador: asString(initialData?.email_creador ?? initialData?.emailCreador),
    };

    reset(defaultValues);
    const institutionalFromDefaults = computeInstitutionalEmail({
      rolId: defaultValues.rolId,
      dni: defaultValues.dni,
      nombre: defaultValues.nombre,
      apellidoPaterno: defaultValues.apellido_paterno,
      apellidoMaterno: defaultValues.apellido_materno,
    });
    lastAutoInstitutionalEmailRef.current = institutionalFromDefaults;
    if (!defaultValues.correo_institucional) {
      setValue('correo_institucional', institutionalFromDefaults, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (!initialData) {
      const nowIso = new Date().toISOString();
      const creatorEmail = auth.currentUser?.email || '';
      setValue('fecha_creacion', nowIso, { shouldDirty: false, shouldValidate: false });
      setValue('fecha_modificacion', nowIso, { shouldDirty: false, shouldValidate: false });
      setValue('email_creador', creatorEmail, { shouldDirty: false, shouldValidate: false });
    }
    setUploadError(null);
  }, [auth.currentUser?.email, initialData, reset, roles, setValue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apellidoPaternoRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
      }}
      aria-busy={isSubmitting}
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
            mt: 1,
            width: '100%',
          }}
        >
            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar src={avatarUrl || undefined} sx={{ width: 100, height: 100 }} />
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} />
              <Button sx={{ mt: 1 }} variant="outlined" onClick={() => avatarInputRef.current?.click()} disabled={isUploading} tabIndex={23}>
                {isUploading ? <CircularProgress size={24} /> : (avatarUrl ? 'Cambiar Avatar' : 'Subir Avatar')}
              </Button>
              {errors.avatar && <Typography color="error" variant="caption">{errors.avatar.message as string}</Typography>}
              {uploadError && <Typography color="error" variant="caption" sx={{ mt: 1 }}>{uploadError}</Typography>}
            </Box>

            <Controller name="apellido_paterno" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 1 }} inputRef={(el) => { field.ref(el); apellidoPaternoRef.current = el; }} label="Apellido Paterno" error={!!errors.apellido_paterno} helperText={errors.apellido_paterno?.message} fullWidth />} />
            <Controller name="apellido_materno" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 2 }} label="Apellido Materno" error={!!errors.apellido_materno} helperText={errors.apellido_materno?.message} fullWidth />} />
            <Controller name="nombre" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 3 }} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} fullWidth />} />
            <Controller name="username" control={control} render={({ field }) => <TextField {...field} label="Username" error={!!errors.username} helperText={errors.username?.message} fullWidth disabled />} />

            <Controller name="sexo" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Sexo</InputLabel>
                <Select {...field} label="Sexo" inputProps={{ tabIndex: 4 }}>
                  <MenuItem value="M">Masculino</MenuItem>
                  <MenuItem value="F">Femenino</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="fecha_nacimiento" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 5 }} label="Fecha de Nacimiento" type="date" InputLabelProps={{ shrink: true }} error={!!errors.fecha_nacimiento} helperText={errors.fecha_nacimiento?.message} fullWidth />} />
            <Controller name="celular" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 6 }} label="Celular" error={!!errors.celular} helperText={errors.celular?.message} fullWidth />} />
            <Controller name="telefono" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 7 }} label="Teléfono" error={!!errors.telefono} helperText={errors.telefono?.message} fullWidth />} />
            <Controller name="email" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 8 }} label="Email" type="email" error={!!errors.email} helperText={errors.email?.message} fullWidth />} />

            <Controller name="tipo_documento" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento</InputLabel>
                <Select {...field} label="Tipo de Documento" inputProps={{ tabIndex: 9 }}>
                  <MenuItem value="DNI">DNI</MenuItem>
                  <MenuItem value="CE">CE</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="dni" control={control} render={({ field: { onBlur, ...field } }) => (
              <TextField
                {...field}
                inputProps={{ tabIndex: 10 }}
                label="N° Documento"
                error={!!errors.dni}
                helperText={errors.dni?.message}
                fullWidth
                onBlur={(e) => {
                  onBlur();
                  if (isCreating) {
                    setValue('password', e.target.value, { shouldValidate: true });
                  }
                }}
              />
            )} />

            <Controller name="nacionalidad" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 11 }} label="Nacionalidad" error={!!errors.nacionalidad} helperText={errors.nacionalidad?.message} fullWidth />} />

            {isCreating && (
              <Controller name="password" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  inputProps={{ tabIndex: 13 }}
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )} />
            )}

            <Controller name="instruccion" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.instruccion}>
                <InputLabel>Grado de Instrucción</InputLabel>
                <Select {...field} label="Grado de Instrucción" inputProps={{ tabIndex: 14 }}>
                  <MenuItem value="Primaria">Primaria</MenuItem>
                  <MenuItem value="Secundaria">Secundaria</MenuItem>
                  <MenuItem value="Superior">Superior</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="estado_civil" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Estado Civil</InputLabel>
                <Select {...field} label="Estado Civil" inputProps={{ tabIndex: 15 }}>
                  <MenuItem value="Soltero">Soltero</MenuItem>
                  <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                  <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                  <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                </Select>
              </FormControl>
            )} />

            <Controller name="direccion" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 16 }} label="Dirección" error={!!errors.direccion} helperText={errors.direccion?.message} fullWidth />} />
            <Controller name="distrito" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 17 }} label="Distrito" error={!!errors.distrito} helperText={errors.distrito?.message} fullWidth />} />
            <Controller name="rolId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.rolId}>
                <InputLabel>Rol</InputLabel>
                <Select {...field} label="Rol" inputProps={{ tabIndex: 18 }}>
                  {field.value && !roles.some((role) => String(role.id) === String(field.value)) && (
                    <MenuItem value={field.value} disabled>
                      Rol actual no disponible en este formulario
                    </MenuItem>
                  )}
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={String(role.id)}>
                      {role.titulo || `Rol ${role.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )} />

            <Controller
              name="bloqueado"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} inputProps={{ tabIndex: 20 }} />}
                  label="Bloqueado"
                />
              )}
            />

            <Controller
              name="correo_institucional"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Correo Institucional"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
                />
              )}
            />
            <Controller
              name="fecha_creacion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={formatDateTimeForDisplay(field.value)}
                  label="Fecha Creacion"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  inputProps={{ readOnly: true, tabIndex: -1 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
            <Controller
              name="fecha_modificacion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={formatDateTimeForDisplay(field.value)}
                  label="Fecha Modificacion"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  inputProps={{ readOnly: true, tabIndex: -1 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
            <Controller
              name="email_creador"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Creador"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  inputProps={{ readOnly: true, tabIndex: -1 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
            {!isCreating && (
              <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' }, mt: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  DNI procesado
                </Typography>
                {hasProcessedDniImages ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'minmax(0, 1fr)',
                        md: 'repeat(2, minmax(0, 1fr))',
                      },
                      gap: 2,
                    }}
                  >
                    {dniImagenFrenteProcesadaUrl && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Frente procesado
                        </Typography>
                        <Box
                          component="img"
                          src={dniImagenFrenteProcesadaUrl}
                          alt="DNI frente procesado"
                          sx={{
                            display: 'block',
                            width: '100%',
                            maxWidth: 400,
                            height: 'auto',
                            mt: 0.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </Box>
                    )}
                    {dniImagenReversoProcesadaUrl && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Reverso procesado
                        </Typography>
                        <Box
                          component="img"
                          src={dniImagenReversoProcesadaUrl}
                          alt="DNI reverso procesado"
                          sx={{
                            display: 'block',
                            width: '100%',
                            maxWidth: 400,
                            height: 'auto',
                            mt: 0.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aun no hay imagenes procesadas para este usuario.
                  </Typography>
                )}
              </Box>
            )}
        </Box>
      </form>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={isSubmitting} tabIndex={22}>
            Cancelar
          </Button>
        )}
        <Button type="submit" form="user-form" variant="contained" disabled={isUploading || isSubmitting} tabIndex={21}>
          {isCreating ? 'Crear' : 'Guardar Cambios'}
        </Button>
      </Box>
      <FormLoadingOverlay
        open={isSubmitting}
        message={submittingMessage || (isCreating ? 'Creando usuario...' : 'Guardando cambios...')}
        //variant="fullscreen"
      />
    </Box>
  );
};

export default UserForm;
