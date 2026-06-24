'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

export type AcademicFieldType = 'text' | 'number' | 'textarea' | 'timestamp';

export interface AcademicFieldConfig {
  name: string;
  label: string;
  type?: AcademicFieldType;
  required?: boolean;
}

interface AcademicEntityFormProps {
  entityId?: string;
  entityKey: string;
  entityLabel: string;
  getCallableName: string;
  saveCallableName: string;
  fields: AcademicFieldConfig[];
  onSaved?: () => void;
  onCancel?: () => void;
}

type EntityData = Record<string, unknown>;

function formatInitialValue(value: unknown, type?: AcademicFieldType) {
  if (value === null || value === undefined) return '';
  if (type === 'timestamp' && typeof value === 'string') return value.slice(0, 16);
  return String(value);
}

function buildPayload(fields: AcademicFieldConfig[], values: Record<string, string>) {
  return fields.reduce<Record<string, string | number | null>>((payload, field) => {
    const raw = values[field.name]?.trim() ?? '';
    if (field.type === 'number') {
      payload[field.name] = raw ? Number(raw) : null;
    } else {
      payload[field.name] = raw || null;
    }
    return payload;
  }, {});
}

export function AcademicEntityForm({
  entityId,
  entityKey,
  entityLabel,
  getCallableName,
  saveCallableName,
  fields,
  onSaved,
  onCancel,
}: AcademicEntityFormProps) {
  const initialValues = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, ''])) as Record<string, string>,
    [fields],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [loading, setLoading] = useState(false);
  const [loadingEntity, setLoadingEntity] = useState(Boolean(entityId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    const fetchEntity = async () => {
      if (!entityId) return;

      setLoadingEntity(true);
      try {
        const functions = getFunctions(app);
        const getEntity = httpsCallable<{ id: number }, Record<string, EntityData | null>>(
          functions,
          getCallableName,
        );
        const result = await getEntity({ id: Number(entityId) });
        const fetched = result.data[entityKey];

        if (fetched) {
          setValues(
            Object.fromEntries(
              fields.map((field) => [
                field.name,
                formatInitialValue(fetched[field.name], field.type),
              ]),
            ) as Record<string, string>,
          );
        }
      } catch (err) {
        console.error(`Error fetching ${entityKey}: `, err);
        setError(`No se pudo cargar ${entityLabel.toLowerCase()} para edicion.`);
      } finally {
        setLoadingEntity(false);
      }
    };

    void fetchEntity();
  }, [entityId, entityKey, entityLabel, fields, getCallableName]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateEntity = httpsCallable<Record<string, unknown>, { id: number | null }>(
        functions,
        saveCallableName,
      );

      await createOrUpdateEntity({
        id: entityId ? Number(entityId) : undefined,
        ...buildPayload(fields, values),
      });

      onSaved?.();
    } catch (err) {
      console.error(`Error handling ${entityKey} form: `, err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError(`No tienes acceso para crear o editar ${entityLabel.toLowerCase()} (requiere level >= 600).`);
      } else if (message) {
        setError(`No se pudo guardar ${entityLabel.toLowerCase()}: ${message}`);
      } else {
        setError(`No se pudo guardar ${entityLabel.toLowerCase()} en Data Connect.`);
      }
      setLoading(false);
    }
  };

  if (loadingEntity) {
    return (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            value={values[field.name] ?? ''}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
            }
            fullWidth
            margin="normal"
            required={field.required}
            type={
              field.type === 'number'
                ? 'number'
                : field.type === 'timestamp'
                  ? 'datetime-local'
                  : undefined
            }
            minRows={field.type === 'textarea' ? 3 : undefined}
            multiline={field.type === 'textarea'}
            InputLabelProps={field.type === 'timestamp' ? { shrink: true } : undefined}
          />
        ))}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (entityId ? 'Actualizar' : 'Crear')}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
}
