'use client';

import { useState } from 'react';
import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  getIdentityDocumentError, getIdentityDocumentType, isAttendingSecondary, validateManualStudent,
  type IdentityStudentData,
} from '@/lib/identityDocument';
import { dayInAppTimeZone, toDateOnlyInputValue } from '@/lib/dateOnly';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';

export type RegistroStudentValues = IdentityStudentData & { dni?: string | null };

interface Props {
  initialValues: RegistroStudentValues;
  editing?: boolean;
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: RegistroStudentValues) => Promise<void>;
}

// The enrollment button and each student's pencil use exactly the same fields.
export default function RegistroMatriculaForm({ initialValues, editing = false, submitting, error, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<RegistroStudentValues>({
    ...initialValues, fechaNacimiento: toDateOnlyInputValue(initialValues.fechaNacimiento),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const required = !editing;
  const update = (field: keyof RegistroStudentValues, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
  };
  const field = (name: keyof RegistroStudentValues, label: string, options: { required?: boolean; type?: string; choices?: string[] } = {}) => (
    <TextField
      key={name} name={name} label={label} fullWidth size="small"
      value={values[name] ?? ''} disabled={submitting}
      required={Boolean(options.required)} type={options.type || 'text'}
      select={Boolean(options.choices)}
      onChange={event => update(name, name === 'dni' ? event.target.value.replace(/\D/g, '') : event.target.value)}
      error={Boolean(errors[name])} helperText={errors[name] || (name === 'dni' ? getIdentityDocumentType(values.dni ?? '') || 'DNI: 8 dígitos · CE: 9 dígitos, comienza con 0' : undefined)}
      slotProps={{
        inputLabel: options.type === 'date' ? { shrink: true } : undefined,
        htmlInput: name === 'dni' ? { maxLength: 9, inputMode: 'numeric' }
          : options.type === 'date' ? { min: '1900-01-01', max: dayInAppTimeZone() } : undefined,
      }}
    >
      {options.choices && [<MenuItem key="empty" value=""><em>Sin especificar</em></MenuItem>, ...options.choices.map(choice => (
        <MenuItem key={choice} value={choice}>{name === 'sexo' ? choice === 'F' ? 'Femenino' : 'Masculino' : choice}</MenuItem>
      ))]}
    </TextField>
  );

  return (
    <Box component="form" noValidate onSubmit={async event => {
      event.preventDefault();
      if (submitting) return;
      const validation: Record<string, string> = validateManualStudent(values, required);
      const document = String(values.dni ?? '').trim();
      const documentError = document || required ? getIdentityDocumentError(document) : null;
      if (documentError) validation.dni = documentError;
      setErrors(validation);
      if (Object.keys(validation).length) return;
      await onSubmit({ ...values, dni: document });
    }}>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}
        <Typography variant="body2" color="text.secondary">
          {editing ? 'Edita los datos del estudiante. Todos los campos son opcionales.' : 'Completa los datos del estudiante para crear su matrícula.'}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {field('dni', 'Documento', { required })}
          {field('nombre', 'Nombres', { required })}
          {field('apellidoPaterno', 'Apellido paterno', { required })}
          {field('apellidoMaterno', 'Apellido materno', { required })}
          {field('fechaNacimiento', 'Fecha de nacimiento', { required, type: 'date' })}
          {field('sexo', 'Sexo', { required, choices: ['F', 'M'] })}
          {field('instruccion', 'Grado de instrucción', { choices: ['Primaria', 'Secundaria en curso..', 'Secundaria', 'Superior'] })}
          {field('nombreColegio', 'Colegio', { required: required && isAttendingSecondary(values.instruccion) })}
          {field('nacionalidad', 'Nacionalidad')}
          {field('estadoCivil', 'Estado civil', { choices: ['Soltero', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'] })}
          {field('direccion', 'Dirección')}
          {field('distrito', 'Distrito')}
          {field('celular', 'Celular')}
          {field('telefono', 'Teléfono')}
          {field('email', 'Correo electrónico', { type: 'email' })}
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear matrícula'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
