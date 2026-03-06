'use client'
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const createValidationSchema = (isCreating: boolean) => yup.object().shape({
  username: yup.string().min(3).required('El nombre de usuario es requerido'),
  email: yup.string().email('Debe ser un email válido').required('El email es requerido'),
  password: isCreating 
    ? yup.string().min(8, 'La contraseña debe tener al menos 8 caracteres').required('La contraseña es requerida') 
    : yup.string().notRequired(),
  nombre: yup.string(),
  apellidos: yup.string(),
  celular: yup.string().matches(/^\d{9}$/, 'El celular debe tener 9 dígitos').required('El celular es requerido'),
  tipo_documento: yup.string().oneOf(['DNI', 'CE']).required(),
  dni: yup.string().matches(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  sexo: yup.string().oneOf(['F', 'M']).required(),
  estado_civil: yup.string().oneOf(['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)']).required(),
  permisoId: yup.string().required("El permiso es requerido"),
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
        // Reset the form whenever the dialog opens or initialData changes.
        if (open) {
            const defaultValues = {
                username: initialData?.username || '',
                email: initialData?.email || '',
                password: '', // Always clear password for security
                nombre: initialData?.nombre || '',
                apellidos: initialData?.apellidos || '',
                celular: initialData?.celular || '',
                tipo_documento: initialData?.tipo_documento || 'DNI',
                dni: initialData?.dni || '',
                sexo: initialData?.sexo || 'F',
                estado_civil: initialData?.estado_civil || 'Soltero',
                permisoId: initialData?.permisoId || '',
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
            <Controller
              name="username"
              control={control}
              render={({ field }) => <TextField {...field} label="Username" error={!!errors.username} helperText={errors.username?.message} />}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => <TextField {...field} label="Email" type="email" error={!!errors.email} helperText={errors.email?.message} />}
            />
            {isCreating && (
              <Controller
                name="password"
                control={control}
                render={({ field }) => <TextField {...field} label="Contraseña" type="password" error={!!errors.password} helperText={errors.password?.message} />}
              />
            )}
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => <TextField {...field} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} />}
            />
            <Controller
              name="apellidos"
              control={control}
              render={({ field }) => <TextField {...field} label="Apellidos" error={!!errors.apellidos} helperText={errors.apellidos?.message} />}
            />
            <Controller
              name="celular"
              control={control}
              render={({ field }) => <TextField {...field} label="Celular" error={!!errors.celular} helperText={errors.celular?.message} />}
            />
            <Controller
              name="tipo_documento"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Tipo de Documento</InputLabel>
                  <Select {...field} label="Tipo de Documento">
                    <MenuItem value="DNI">DNI</MenuItem>
                    <MenuItem value="CE">CE</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="dni"
              control={control}
              render={({ field }) => <TextField {...field} label="DNI/CE" error={!!errors.dni} helperText={errors.dni?.message} />}
            />
            <Controller
              name="sexo"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Sexo</InputLabel>
                  <Select {...field} label="Sexo">
                    <MenuItem value="M">Masculino</MenuItem>
                    <MenuItem value="F">Femenino</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="estado_civil"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select {...field} label="Estado Civil">
                    <MenuItem value="Soltero">Soltero</MenuItem>
                    <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                    <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                    <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
                name="permisoId"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth error={!!errors.permisoId}>
                        <InputLabel>Permiso</InputLabel>
                        <Select {...field} label="Permiso">
                            {permisos.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.titulo}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            />
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
