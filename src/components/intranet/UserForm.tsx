'use client'
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Updated Validation Schema
const createValidationSchema = (isCreating: boolean) => yup.object().shape({
  username: yup.string().min(3).required('El nombre de usuario es requerido'),
  email: yup.string().email('Debe ser un email válido').required('El email es requerido'),
  password: isCreating 
    ? yup.string().min(8, 'La contraseña debe tener al menos 8 caracteres').required('La contraseña es requerida') 
    : yup.string().notRequired(),
  nombre: yup.string().required('El nombre es requerido'),
  apellido_paterno: yup.string().required('El apellido paterno es requerido'),
  apellido_materno: yup.string().required('El apellido materno es requerido'),
  celular: yup.string().matches(/^\d{9}$/, 'El celular debe tener 9 dígitos').required('El celular es requerido'),
  tipo_documento: yup.string().oneOf(['DNI', 'CE']).required(),
  dni: yup.string().matches(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  sexo: yup.string().oneOf(['F', 'M']).required(),
  estado_civil: yup.string().oneOf(['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)']).required(),
  permisoId: yup.string().required("El permiso es requerido"),
  fecha_nacimiento: yup.string().nullable(), // CORRECTED: Changed from yup.date() to yup.string()
  instruccion: yup.string().nullable(),
  foto: yup.string().url('Debe ser una URL válida').nullable(),
  direccion: yup.string().nullable(),
  distrito: yup.string().nullable(),
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
    const isCreating = !initialData;

    const { handleSubmit, control, formState: { errors }, reset } = useForm({
        resolver: yupResolver(createValidationSchema(isCreating))
    });

    useEffect(() => {
        if (open) {
            const dob = initialData?.fecha_nacimiento;
            let formattedDob = '';
            if (dob) {
                // Handle Firestore Timestamp object by converting it to a Date, then to an ISO string, and slicing it.
                if (typeof dob.toDate === 'function') {
                    formattedDob = dob.toDate().toISOString().split('T')[0];
                } 
                // Handle case where it might already be an ISO string
                else if (typeof dob === 'string') {
                    formattedDob = dob.split('T')[0];
                }
            }

            const defaultValues = {
                username: initialData?.username || '',
                email: initialData?.email || '',
                password: '', 
                nombre: initialData?.nombre || '',
                apellido_paterno: initialData?.apellido_paterno || '',
                apellido_materno: initialData?.apellido_materno || '',
                celular: initialData?.celular || '',
                tipo_documento: initialData?.tipo_documento || 'DNI',
                dni: initialData?.dni || '',
                sexo: initialData?.sexo || 'F',
                estado_civil: initialData?.estado_civil || 'Soltero',
                permisoId: initialData?.permisoId || '',
                fecha_nacimiento: formattedDob, // Use the correctly formatted date
                instruccion: initialData?.instruccion || '',
                foto: initialData?.foto || '',
                direccion: initialData?.direccion || '',
                distrito: initialData?.distrito || '',
                bloqueado: initialData?.bloqueado || false,
            };
            reset(defaultValues);
        }
    }, [open, initialData, reset]);

    useEffect(() => {
        const fetchPermisos = async () => {
            const querySnapshot = await getDocs(collection(db, "permisos"));
            const permisosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Permiso));
            setPermisos(permisosData);
        };
        fetchPermisos();
    }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isCreating ? 'Agregar Usuario' : 'Editar Usuario'}</DialogTitle>
      <DialogContent>
        <form id="user-form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
            
            {/* Existing Fields */}
            <Controller name="username" control={control} render={({ field }) => <TextField {...field} label="Username" error={!!errors.username} helperText={errors.username?.message} fullWidth/>}
            />
            <Controller name="email" control={control} render={({ field }) => <TextField {...field} label="Email" type="email" error={!!errors.email} helperText={errors.email?.message} fullWidth/>}
            />
            {isCreating && (
              <Controller name="password" control={control} render={({ field }) => <TextField {...field} label="Contraseña" type="password" error={!!errors.password} helperText={errors.password?.message} fullWidth/>}
              />
            )}
            <Controller name="nombre" control={control} render={({ field }) => <TextField {...field} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} fullWidth/>}
            />

            {/* New Apellido Fields */}
            <Controller name="apellido_paterno" control={control} render={({ field }) => <TextField {...field} label="Apellido Paterno" error={!!errors.apellido_paterno} helperText={errors.apellido_paterno?.message} fullWidth/>}
            />
            <Controller name="apellido_materno" control={control} render={({ field }) => <TextField {...field} label="Apellido Materno" error={!!errors.apellido_materno} helperText={errors.apellido_materno?.message} fullWidth/>}
            />

            <Controller name="celular" control={control} render={({ field }) => <TextField {...field} label="Celular" error={!!errors.celular} helperText={errors.celular?.message} fullWidth/>}
            />
            <Controller name="tipo_documento" control={control} render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Tipo de Documento</InputLabel>
                  <Select {...field} label="Tipo de Documento">
                    <MenuItem value="DNI">DNI</MenuItem>
                    <MenuItem value="CE">CE</MenuItem>
                  </Select>
                </FormControl>)}
            />
            <Controller name="dni" control={control} render={({ field }) => <TextField {...field} label="DNI/CE" error={!!errors.dni} helperText={errors.dni?.message} fullWidth/>}
            />

            {/* New Fields */}
            <Controller name="fecha_nacimiento" control={control} render={({ field }) => <TextField {...field} label="Fecha de Nacimiento" type="date" InputLabelProps={{ shrink: true }} error={!!errors.fecha_nacimiento} helperText={errors.fecha_nacimiento?.message} fullWidth/>}
            />
            <Controller name="instruccion" control={control} render={({ field }) => <TextField {...field} label="Grado de Instrucción" error={!!errors.instruccion} helperText={errors.instruccion?.message} fullWidth/>}
            />
             <Controller name="foto" control={control} render={({ field }) => <TextField {...field} label="URL de Foto" error={!!errors.foto} helperText={errors.foto?.message} fullWidth/>}
            />
            <Controller name="direccion" control={control} render={({ field }) => <TextField {...field} label="Dirección" error={!!errors.direccion} helperText={errors.direccion?.message} fullWidth/>}
            />
            <Controller name="distrito" control={control} render={({ field }) => <TextField {...field} label="Distrito" error={!!errors.distrito} helperText={errors.distrito?.message} fullWidth/>}
            />

            <Controller name="sexo" control={control} render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Sexo</InputLabel>
                  <Select {...field} label="Sexo">
                    <MenuItem value="M">Masculino</MenuItem>
                    <MenuItem value="F">Femenino</MenuItem>
                  </Select>
                </FormControl>)}
            />
            <Controller name="estado_civil" control={control} render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select {...field} label="Estado Civil">
                    <MenuItem value="Soltero">Soltero</MenuItem>
                    <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                    <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                    <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                  </Select>
                </FormControl>)}
            />
            <Controller name="permisoId" control={control} render={({ field }) => (
                <FormControl fullWidth error={!!errors.permisoId}>
                    <InputLabel>Permiso</InputLabel>
                    <Select {...field} label="Permiso">
                        {permisos.map((p) => (<MenuItem key={p.id} value={p.id}>{p.titulo}</MenuItem>))}
                    </Select>
                </FormControl>)}
            />
            <Controller name="bloqueado" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Bloqueado" />
            )}/>

          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="user-form" variant="contained">{isCreating ? 'Crear' : 'Guardar Cambios'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
