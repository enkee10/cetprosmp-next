'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

export type AcademicFieldType = 'text' | 'number' | 'number-list' | 'textarea' | 'timestamp' | 'date' | 'select' | 'boolean';

export interface AcademicSelectOption {
  value: string | number;
  label: string;
}

export interface AcademicFieldConfig {
  name: string;
  label: string;
  type?: AcademicFieldType;
  required?: boolean;
  options?: AcademicSelectOption[];
  optionsCallableName?: string;
  optionsRowsKey?: string;
  optionValueField?: string;
  optionLabelField?: string;
  optionValueType?: 'string' | 'number';
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
  if (type === 'boolean') return value === true ? 'true' : 'false';
  if (type === 'number-list' && Array.isArray(value)) return value.join(', ');
  if (type === 'date' && typeof value === 'string') return value.slice(0, 10);
  if (type === 'timestamp' && typeof value === 'string') return value.slice(0, 16);
  return String(value);
}

function buildPayload(fields: AcademicFieldConfig[], values: Record<string, string>) {
  return fields.reduce<Record<string, string | number | number[] | boolean | null>>((payload, field) => {
    const raw = values[field.name]?.trim() ?? '';
    if (field.type === 'number') {
      payload[field.name] = raw ? Number(raw) : null;
    } else if (field.type === 'number-list') {
      payload[field.name] = raw
        ? raw
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isFinite(item) && item > 0)
        : [];
    } else if (field.type === 'boolean') {
      payload[field.name] = raw === 'true';
    } else if (field.type === 'select' && field.optionValueType === 'number') {
      payload[field.name] = raw ? Number(raw) : null;
    } else {
      payload[field.name] = raw || null;
    }
    return payload;
  }, {});
}

function getOptionLabel(row: Record<string, unknown>, field: AcademicFieldConfig) {
  const labelField = field.optionLabelField ?? 'titulo';
  const label =
    row[labelField] ??
    row.nombre ??
    row.titulo ??
    row.id ??
    '';

  return String(label);
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
  const [selectOptions, setSelectOptions] = useState<Record<string, AcademicSelectOption[]>>({});

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    const fetchSelectOptions = async () => {
      const selectFields = fields.filter((field) => field.type === 'select');
      if (selectFields.length === 0) {
        setSelectOptions({});
        return;
      }

      const functions = getFunctions(app);
      const nextOptions: Record<string, AcademicSelectOption[]> = {};

      for (const field of selectFields) {
        if (field.options) {
          nextOptions[field.name] = field.options;
          continue;
        }

        if (!field.optionsCallableName || !field.optionsRowsKey) {
          nextOptions[field.name] = [];
          continue;
        }

        const listOptions = httpsCallable<undefined, Record<string, Record<string, unknown>[]>>(
          functions,
          field.optionsCallableName,
        );
        const result = await listOptions();
        const rows = result.data[field.optionsRowsKey] ?? [];
        const valueField = field.optionValueField ?? 'id';

        nextOptions[field.name] = rows
          .map((row) => ({
            value: String(row[valueField] ?? ''),
            label: getOptionLabel(row, field),
          }))
          .filter((option) => option.value !== '');
      }

      setSelectOptions(nextOptions);
    };

    fetchSelectOptions().catch((err) => {
      console.error(`Error fetching select options for ${entityKey}: `, err);
      setError(`No se pudieron cargar las opciones de ${entityLabel.toLowerCase()}.`);
    });
  }, [entityKey, entityLabel, fields]);

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
        {fields.map((field) => {
          if (field.type === 'select') {
            return (
              <FormControl key={field.name} fullWidth margin="normal" required={field.required}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  label={field.label}
                  value={values[field.name] ?? ''}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.name]: String(event.target.value) }))
                  }
                >
                  <MenuItem value="">
                    <em>Seleccionar</em>
                  </MenuItem>
                  {(selectOptions[field.name] ?? []).map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          if (field.type === 'boolean') {
            return (
              <FormControlLabel
                key={field.name}
                sx={{ display: 'block', mt: 2, mb: 1 }}
                control={
                  <Checkbox
                    checked={values[field.name] === 'true'}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field.name]: event.target.checked ? 'true' : 'false' }))
                    }
                  />
                }
                label={field.label}
              />
            );
          }

          return (
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
                  : field.type === 'date'
                    ? 'date'
                  : field.type === 'timestamp'
                    ? 'datetime-local'
                    : undefined
              }
              minRows={field.type === 'textarea' ? 3 : undefined}
              multiline={field.type === 'textarea'}
              InputLabelProps={field.type === 'timestamp' || field.type === 'date' ? { shrink: true } : undefined}
            />
          );
        })}

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
