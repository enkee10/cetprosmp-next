'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, Avatar, CircularProgress, Typography, IconButton, InputAdornment } from '@mui/material'; {/* Se agregaron IconButton e InputAdornment */ }
import { Visibility, VisibilityOff } from '@mui/icons-material'; // Se importaron los íconos del ojito
import { collection, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUsername } from './userForm_utilities';

const createValidationSchema = (isCreating: boolean) => yup.object().shape({
  foto: yup.string().transform(value => value || null).url('Debe ser una URL válida').nullable(),
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
  imagen_frente_dni: yup.string().url('Debe ser una URL válida').nullable(),
  imagen_reverso_dni: yup.string().url('Debe ser una URL válida').nullable(),
  password: isCreating
    ? yup.string().min(8, 'La contraseña debe tener al menos 8 caracteres').required('La contraseña es requerida')
    : yup.string().notRequired(),
  instruccion: yup.string().oneOf(['Primaria', 'Secundaria', 'Superior']).required('El grado de instrucción es requerido'),
  estado_civil: yup.string().oneOf(['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)']).required(),
  direccion: yup.string().nullable(),
  distrito: yup.string().nullable(),
  permisoId: yup.string().required("El permiso es requerido"),
  avatar: yup.string().url('Debe ser una URL válida').nullable(),
  bloqueado: yup.boolean(),
});

interface Permiso {
  id: string;
  titulo: string;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

const UserForm: React.FC<UserFormProps> = ({ open, onClose, onSubmit, initialData }) => {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // Se agregó el estado local para manipular la visibilidad de la contraseña
  const isCreating = !initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dniFrenteRef = useRef<HTMLInputElement>(null);
  const dniReversoRef = useRef<HTMLInputElement>(null);
  const apellidoPaternoRef = useRef<HTMLInputElement>(null); // Ref nativa para poder forzar el evento focus a nivel de DOM

  const { handleSubmit, control, formState: { errors }, reset, watch, setValue, setFocus } = useForm({ // Extraemos setFocus para forzar el enfoque manualmente
    resolver: yupResolver(createValidationSchema(isCreating)),
  });

  const nombre = watch('nombre');
  const apellido_paterno = watch('apellido_paterno');

  useEffect(() => {
    generateUsername(nombre, apellido_paterno, setValue);
  }, [nombre, apellido_paterno, setValue]);

  const fotoUrl = watch('foto');
  const avatarUrl = watch('avatar');
  const dniFrenteUrl = watch('imagen_frente_dni');
  const dniReversoUrl = watch('imagen_reverso_dni');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, field: 'foto' | 'avatar' | 'imagen_frente_dni' | 'imagen_reverso_dni') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    const storageRef = ref(storage, `usuarios/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(snapshot.ref);

      setValue(field, downloadURL, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);

      if (error.code === 'storage/unauthorized') {
        setUploadError('Error: No tienes permiso para subir archivos.');
      } else {
        setUploadError(`Ocurrió un error al subir la imagen: ${error.message || 'desconocido'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      const dob = initialData?.fecha_nacimiento;
      let formattedDob = '';
      if (dob && typeof dob.toDate === 'function') {
        formattedDob = dob.toDate().toISOString().split('T')[0];
      } else if (typeof dob === 'string') {
        formattedDob = dob.split('T')[0];
      }

      const defaultValues = {
        foto: initialData?.foto || '',
        apellido_paterno: initialData?.apellido_paterno || '',
        apellido_materno: initialData?.apellido_materno || '',
        nombre: initialData?.nombre || '',
        username: initialData?.username || '',
        sexo: initialData?.sexo || 'F',
        fecha_nacimiento: formattedDob,
        celular: initialData?.celular || '',
        telefono: initialData?.telefono || '',
        email: initialData?.email || '',
        tipo_documento: initialData?.tipo_documento || 'DNI',
        dni: initialData?.dni || '',
        imagen_frente_dni: initialData?.imagen_frente_dni || '',
        imagen_reverso_dni: initialData?.imagen_reverso_dni || '',
        password: '',
        instruccion: initialData?.instruccion || 'Primaria',
        estado_civil: initialData?.estado_civil || 'Soltero',
        direccion: initialData?.direccion || '',
        distrito: initialData?.distrito || '',
        permisoId: initialData?.permisoId || permisos.find(p => p.titulo.toLowerCase() === 'estudiante')?.id || '', // Autoselección predeterminada del rol de Estudiante
        avatar: initialData?.avatar || '',
        bloqueado: initialData?.bloqueado || false,
      };
      reset(defaultValues);
      setUploadError(null); // Reset error on open
    }
  }, [open, initialData, reset, permisos]); // Inclusión de permisos en el dependency array para prevenir carrera de datos

  useEffect(() => {
    const fetchPermisos = async () => {
      const querySnapshot = await getDocs(collection(db, "permisos"));
      const permisosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Permiso));
      setPermisos(permisosData);
    };
    fetchPermisos();
  }, []);

  return (
    <Dialog open={open} onClose={onClose} disableEnforceFocus maxWidth="md" fullWidth TransitionProps={{ onEntered: () => apellidoPaternoRef.current?.focus() }}> {/*  Se desactivó enforceFocus para que MUI respete el tabIndex personalizado */}
      <DialogTitle>{isCreating ? 'Agregar Usuario' : 'Editar Usuario'}</DialogTitle>
      <DialogContent>
        <form id="user-form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>

            <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar src={fotoUrl || undefined} sx={{ width: 100, height: 100 }} />
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => handleFileChange(e, 'foto')} />
              <Button
                sx={{ mt: 1 }}
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                tabIndex={23}
              > {/* Se agregó tabIndex 23 */}
                {isUploading ? <CircularProgress size={24} /> : (fotoUrl ? 'Cambiar Foto' : 'Subir Foto')}
              </Button>
              {errors.foto && <Typography color="error" variant="caption">{errors.foto.message as string}</Typography>}
              {uploadError && <Typography color="error" variant="caption" sx={{ mt: 1 }}>{uploadError}</Typography>}
            </Box>

            {/* Almacenamos el elemento HTML en nuestra ref nativa para el enfoque seguro */}
            <Controller name="apellido_paterno" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 1 }} inputRef={(el) => { field.ref(el); apellidoPaternoRef.current = el; }} label="Apellido Paterno" error={!!errors.apellido_paterno} helperText={errors.apellido_paterno?.message} fullWidth />} /> {/* Se asignó tabIndex 1 que faltaba */}
            <Controller name="apellido_materno" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 2 }} label="Apellido Materno" error={!!errors.apellido_materno} helperText={errors.apellido_materno?.message} fullWidth />} /> {/* Se agregó tabIndex 2 */}
            <Controller name="nombre" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 3 }} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} fullWidth />} /> {/* Se agregó tabIndex 3 */}
            <Controller name="username" control={control} render={({ field }) => <TextField {...field} label="Username" error={!!errors.username} helperText={errors.username?.message} fullWidth disabled />}
            />
            <Controller name="sexo" control={control} render={({ field }) => (
              <FormControl fullWidth> {/* Se quitó el comentario interno del Select para evitar bloqueos del value en MUI */}
                <InputLabel>Sexo</InputLabel>
                <Select {...field} label="Sexo" inputProps={{ tabIndex: 4 }}>
                  <MenuItem value="M">Masculino</MenuItem>
                  <MenuItem value="F">Femenino</MenuItem>
                </Select>
              </FormControl>)}
            />
            <Controller name="fecha_nacimiento" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 5 }} label="Fecha de Nacimiento" type="date" InputLabelProps={{ shrink: true }} error={!!errors.fecha_nacimiento} helperText={errors.fecha_nacimiento?.message} fullWidth />} /> {/* Se agregó tabIndex 5 */}
            <Controller name="celular" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 6 }} label="Celular" error={!!errors.celular} helperText={errors.celular?.message} fullWidth />} /> {/* Se agregó tabIndex 6 */}
            <Controller name="telefono" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 7 }} label="Teléfono" error={!!errors.telefono} helperText={errors.telefono?.message} fullWidth />} /> {/* Se agregó tabIndex 7 */}
            <Controller name="email" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 8 }} label="Email" type="email" error={!!errors.email} helperText={errors.email?.message} fullWidth />} /> {/* Se agregó tabIndex 8 */}
            <Controller name="tipo_documento" control={control} render={({ field }) => (
              <FormControl fullWidth> {/* Se extrajo el comentario para proteger el render interno del Select */}
                <InputLabel>Tipo de Documento</InputLabel>
                <Select {...field} label="Tipo de Documento" inputProps={{ tabIndex: 9 }}>
                  <MenuItem value="DNI">DNI</MenuItem>
                  <MenuItem value="CE">CE</MenuItem>
                </Select>
              </FormControl>)}
            />
            <Controller name="dni" control={control} render={({ field: { onBlur, ...field } }) => <TextField {...field} inputProps={{ tabIndex: 10 }} label="N° Documento" error={!!errors.dni} helperText={errors.dni?.message} fullWidth onBlur={(e) => { onBlur(); if (isCreating) { setValue('password', e.target.value, { shouldValidate: true }); } }} />} /> {/* La contraseña copia el texto ingresado en el DNI al salir del campo */}

            <Box sx={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar src={dniFrenteUrl || undefined} sx={{ width: 100, height: 60, borderRadius: 1 }} variant="rounded" />
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={dniFrenteRef} onChange={(e) => handleFileChange(e, 'imagen_frente_dni')} />
              <Button
                sx={{ mt: 1 }}
                variant="outlined"
                onClick={() => dniFrenteRef.current?.click()}
                disabled={isUploading}
                tabIndex={11}
              > {/* Se agregó tabIndex 11 */}
                {isUploading ? <CircularProgress size={24} /> : (dniFrenteUrl ? 'Cambiar Frente DNI' : 'Subir Frente DNI')}
              </Button>
              {errors.imagen_frente_dni && <Typography color="error" variant="caption">{errors.imagen_frente_dni.message as string}</Typography>}
            </Box>

            <Box sx={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar src={dniReversoUrl || undefined} sx={{ width: 100, height: 60, borderRadius: 1 }} variant="rounded" />
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={dniReversoRef} onChange={(e) => handleFileChange(e, 'imagen_reverso_dni')} />
              <Button
                sx={{ mt: 1 }}
                variant="outlined"
                onClick={() => dniReversoRef.current?.click()}
                disabled={isUploading}
                tabIndex={12}
              > {/* Se agregó tabIndex 12 */}
                {isUploading ? <CircularProgress size={24} /> : (dniReversoUrl ? 'Cambiar Reverso DNI' : 'Subir Reverso DNI')}
              </Button>
              {errors.imagen_reverso_dni && <Typography color="error" variant="caption">{errors.imagen_reverso_dni.message as string}</Typography>}
            </Box>

            {isCreating && (
              /* Se agregó tabIndex 13 */
              <Controller name="password" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  inputProps={{ tabIndex: 13 }}
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'} /* Cambia de tipo según el estado */
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          tabIndex={-1}
                        > {/* Se integró el botón del ojito, se le puso tabIndex -1 para que no afecte tu tabulación personalizada */}
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )} />
            )}
            <Controller name="instruccion" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.instruccion}> {/* Se extrajo comentario problemático */}
                <InputLabel>Grado de Instrucción</InputLabel>
                <Select {...field} label="Grado de Instrucción" inputProps={{ tabIndex: 14 }}>
                  <MenuItem value="Primaria">Primaria</MenuItem>
                  <MenuItem value="Secundaria">Secundaria</MenuItem>
                  <MenuItem value="Superior">Superior</MenuItem>
                </Select>
              </FormControl>)}
            />
            <Controller name="estado_civil" control={control} render={({ field }) => (
              <FormControl fullWidth> {/* Se removió comentario que rompía MUI */}
                <InputLabel>Estado Civil</InputLabel>
                <Select {...field} label="Estado Civil" inputProps={{ tabIndex: 15 }}>
                  <MenuItem value="Soltero">Soltero</MenuItem>
                  <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                  <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                  <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                </Select>
              </FormControl>)}
            />
            <Controller name="direccion" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 16 }} label="Dirección" error={!!errors.direccion} helperText={errors.direccion?.message} fullWidth />} /> {/* Se agregó tabIndex 16 */}
            <Controller name="distrito" control={control} render={({ field }) => <TextField {...field} inputProps={{ tabIndex: 17 }} label="Distrito" error={!!errors.distrito} helperText={errors.distrito?.message} fullWidth />} /> {/* Se agregó tabIndex 17 */}
            <Controller name="permisoId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.permisoId}> {/* Se reubicó este comentario por seguridad interna */}
                <InputLabel>Permiso</InputLabel>
                <Select {...field} label="Permiso" inputProps={{ tabIndex: 18 }}>
                  {permisos.map((p) => (<MenuItem key={p.id} value={p.id}>{p.titulo}</MenuItem>))}
                </Select>
              </FormControl>)}
            />
            <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar src={avatarUrl || undefined} sx={{ width: 100, height: 100 }} />
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => handleFileChange(e, 'avatar')} />
              <Button
                sx={{ mt: 1 }}
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                tabIndex={19}
              > {/* Se agregó tabIndex 19 */}
                {isUploading ? <CircularProgress size={24} /> : (avatarUrl ? 'Cambiar Avatar' : 'Subir Avatar')}
              </Button>
              {errors.avatar && <Typography color="error" variant="caption">{errors.avatar.message as string}</Typography>}
            </Box>
            <Controller name="bloqueado" control={control} render={({ field }) => (
              <FormControlLabel control={<Switch {...field} checked={field.value} inputProps={{ tabIndex: 20 }} />} label="Bloqueado" /> // Se agregó tabIndex 20
            )} />

          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} tabIndex={22}>Cancelar</Button> {/* Se agregó tabIndex 22 */}
        <Button type="submit" form="user-form" variant="contained" disabled={isUploading} tabIndex={21}>{isCreating ? 'Crear' : 'Guardar Cambios'}</Button> {/* Se agregó tabIndex 21 */}
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;