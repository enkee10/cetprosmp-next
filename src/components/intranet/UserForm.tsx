'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, Avatar, CircularProgress, Typography, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import { app, storage } from '@/lib/firebase';
import { connectorConfig, listPermisos as dcListPermisos } from '@dataconnect/generated';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUsername } from './userForm_utilities';

const createValidationSchema = (isCreating: boolean) => yup.object().shape({
  apellido_paterno: yup.string().required('El apellido paterno es requerido'),
  apellido_materno: yup.string().required('El apellido materno es requerido'),
  nombre: yup.string().required('El nombre es requerido'),
  username: yup.string().min(3).required('El nombre de usuario es requerido'),
  sexo: yup.string().oneOf(['F', 'M']).required(),
  fecha_nacimiento: yup.string().nullable(),
  celular: yup.string().matches(/^\d{9}$/, 'El celular debe tener 9 dígitos').required('El celular es requerido'),
  telefono: yup.string().nullable(),
  email: yup.string().email('Debe ser un email válido').required('El email es requerido'),
  tipo_documento: yup.string().oneOf(['DNI', 'CE']).required(),
  dni: yup.string().matches(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  password: isCreating
    ? yup.string().min(8, 'La contraseña debe tener al menos 8 caracteres').required('La contraseña es requerida')
    : yup.string().notRequired(),
  instruccion: yup.string().oneOf(['Primaria', 'Secundaria', 'Superior']).required('El grado de instrucción es requerido'),
  estado_civil: yup.string().oneOf(['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)']).required(),
  direccion: yup.string().nullable(),
  distrito: yup.string().nullable(),
  permisoId: yup.string().required('El permiso es requerido'),
  avatar: yup.string().url('Debe ser una URL válida').nullable(),
  bloqueado: yup.boolean(),
});

interface UserFormValues {
  apellido_paterno: string;
  apellido_materno: string;
  nombre: string;
  username: string;
  sexo: 'F' | 'M';
  fecha_nacimiento: string;
  celular: string;
  telefono: string;
  email: string;
  tipo_documento: 'DNI' | 'CE';
  dni: string;
  password: string;
  instruccion: 'Primaria' | 'Secundaria' | 'Superior';
  estado_civil: 'Soltero' | 'Casado(a)' | 'Viudo(a)' | 'Divorciado(a)';
  direccion: string;
  distrito: string;
  permisoId: string;
  avatar: string;
  bloqueado: boolean;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormValues) => void;
  initialData?: Record<string, unknown>;
}

interface Permiso {
  id: number;
  titulo: string | null;
  scala: number | null;
}

const UserForm: React.FC<UserFormProps> = ({ open, onClose, onSubmit, initialData }) => {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isCreating = !initialData;
  const auth = getAuth(app);
  const dataConnect = useMemo(() => getDataConnect(app, connectorConfig), []);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const apellidoPaternoRef = useRef<HTMLInputElement>(null);

  const { handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<UserFormValues>({
    resolver: yupResolver(createValidationSchema(isCreating)),
  });

  const nombre = watch('nombre');
  const apellido_paterno = watch('apellido_paterno');

  useEffect(() => {
    generateUsername(nombre, apellido_paterno, setValue);
  }, [nombre, apellido_paterno, setValue]);

  useEffect(() => {
    const fetchPermisos = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        const result = await dcListPermisos(dataConnect);
        setPermisos(result.data.permisos || []);
      } catch (error) {
        console.error('Error fetching permisos: ', error);
        setPermisos([]);
      }
    };

    fetchPermisos();
  }, [auth, dataConnect]);

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
        setUploadError('Error: No tienes permiso para subir archivos.');
      } else {
        setUploadError(`Ocurrió un error al subir la imagen: ${parsedError.message || 'desconocido'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const dob = initialData?.fecha_nacimiento ?? initialData?.fechaNacimiento;
    let formattedDob = '';

    if (dob && typeof dob.toDate === 'function') {
      formattedDob = dob.toDate().toISOString().split('T')[0];
    } else if (typeof dob === 'string') {
      formattedDob = dob.split('T')[0];
    }

    const defaultValues = {
      apellido_paterno: initialData?.apellido_paterno || initialData?.apellidoPaterno || '',
      apellido_materno: initialData?.apellido_materno || initialData?.apellidoMaterno || '',
      nombre: initialData?.nombre || '',
      username: initialData?.username || '',
      sexo: initialData?.sexo || 'F',
      fecha_nacimiento: formattedDob,
      celular: initialData?.celular || '',
      telefono: initialData?.telefono || '',
      email: initialData?.email || '',
      tipo_documento: initialData?.tipo_documento || initialData?.tipoDocumento || 'DNI',
      dni: initialData?.dni || '',
      password: '',
      instruccion: initialData?.instruccion || 'Primaria',
      estado_civil: initialData?.estado_civil || initialData?.estadoCivil || 'Soltero',
      direccion: initialData?.direccion || '',
      distrito: initialData?.distrito || '',
      permisoId: initialData?.permisoId ? String(initialData.permisoId) : (permisos[0]?.id ? String(permisos[0].id) : ''),
      avatar: initialData?.avatar || '',
      bloqueado: initialData?.bloqueado ?? initialData?.blocked ?? false,
    };

    reset(defaultValues);
    setUploadError(null);
  }, [open, initialData, reset, permisos]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableEnforceFocus
      maxWidth="md"
      fullWidth
      TransitionProps={{ onEntered: () => apellidoPaternoRef.current?.focus() }}
    >
      <DialogTitle>{isCreating ? 'Agregar Usuario' : 'Editar Usuario'}</DialogTitle>
      <DialogContent>
        <form id="user-form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
            <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
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
            <Controller name="permisoId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.permisoId}>
                <InputLabel>Permiso</InputLabel>
                <Select {...field} label="Permiso" inputProps={{ tabIndex: 18 }}>
                  {permisos.map((permiso) => (
                    <MenuItem key={permiso.id} value={String(permiso.id)}>
                      {permiso.titulo || `Permiso ${permiso.id}`}
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
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} tabIndex={22}>Cancelar</Button>
        <Button type="submit" form="user-form" variant="contained" disabled={isUploading} tabIndex={21}>
          {isCreating ? 'Crear' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;

