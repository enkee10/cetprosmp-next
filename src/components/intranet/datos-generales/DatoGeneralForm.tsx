'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, storage } from '@/lib/firebase';
import { useDatosGenerales } from '@/context/DatosGeneralesContext';
import {
  DatosGenerales,
  DatosGeneralesFormData,
  emptyDatosGeneralesForm,
  toDatosGeneralesFormData,
} from '@/lib/datosGenerales';

export type DatoGeneral = DatosGenerales;
type DatoGeneralTextField = Exclude<keyof DatosGeneralesFormData, 'logoUrl'>;

interface DatoGeneralFormProps {
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

const fields: Array<{
  name: DatoGeneralTextField;
  label: string;
  gridColumn?: string;
}> = [
  { name: 'nombreInstitucion', label: 'Nombre de la institucion', gridColumn: '1 / span 7' },
  { name: 'codigoModular', label: 'Codigo modular', gridColumn: '1 / span 3' },
  { name: 'tipoGestion', label: 'Tipo de gestion', gridColumn: '4 / span 4' },
  { name: 'departamento', label: 'Departamento', gridColumn: '1 / span 3' },
  { name: 'provincia', label: 'Provincia', gridColumn: '4 / span 4' },
  { name: 'distrito', label: 'Distrito' },
  { name: 'dre', label: 'DRE' },
  { name: 'direccion', label: 'Direccion' },
  { name: 'telefono1', label: 'Telefono 1' },
  { name: 'telefono2', label: 'Telefono 2' },
  { name: 'correo', label: 'Correo' },
  { name: 'paginaWeb', label: 'Pagina web' },
  { name: 'ruc', label: 'RUC' },
  { name: 'rd', label: 'RD' },
  { name: 'facebook', label: 'Facebook' },
  { name: 'youtube', label: 'YouTube' },
  { name: 'twitter', label: 'Twitter' },
  { name: 'instagram', label: 'Instagram' },
  { name: 'tiktok', label: 'TikTok' },
];

const getStorageSafeFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'logo';

export function DatoGeneralForm({
  asModal = false,
  onSaved,
  onCancel,
}: DatoGeneralFormProps) {
  const [form, setForm] = useState<DatosGeneralesFormData>(emptyDatosGeneralesForm);
  const [loadingDatoGeneral, setLoadingDatoGeneral] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { refreshDatosGenerales } = useDatosGenerales();

  useEffect(() => {
    const fetchDatoGeneral = async () => {
      setLoadingDatoGeneral(true);
      try {
        const functions = getFunctions(app);
        const getDatoGeneral = httpsCallable<
          undefined,
          { datoGeneral: DatoGeneral | null }
        >(functions, 'getDatoGeneral');
        const result = await getDatoGeneral();
        const datoGeneral = result.data.datoGeneral;

        if (datoGeneral) {
          setForm(toDatosGeneralesFormData(datoGeneral));
        }
      } catch (err) {
        console.error('Error fetching dato general: ', err);
        setError('No se pudo cargar el registro para edicion.');
      } finally {
        setLoadingDatoGeneral(false);
      }
    };

    void fetchDatoGeneral();
  }, []);

  const handleChange = (field: keyof DatosGeneralesFormData, value: string) => {
    setSuccess(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError(null);
    setSuccess(null);
    setUploadingLogo(true);

    try {
      const currentUser = getAuth(app).currentUser;
      if (!currentUser) {
        setLogoError('Debes iniciar sesion para subir el logo.');
        return;
      }

      const tokenResult = await currentUser.getIdTokenResult(true);
      const level = Number(tokenResult.claims.level ?? 0);
      if (!Number.isFinite(level) || level < 600) {
        setLogoError('Tu cuenta necesita nivel 600 o superior para subir el logo.');
        return;
      }

      const fileName = getStorageSafeFileName(file.name);
      const storageRef = ref(storage, `datos-generales/logo/${Date.now()}_${fileName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      handleChange('logoUrl', downloadUrl);
    } catch (uploadError) {
      console.error('Error uploading logo:', uploadError);
      setLogoError((uploadError as { message?: string } | null)?.message || 'No se pudo subir el logo.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!form.nombreInstitucion?.trim()) {
      setError('El nombre de la institucion es obligatorio.');
      setSaving(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateDatoGeneral = httpsCallable<
        Partial<DatosGenerales>,
        { id: number | null; datoGeneral?: DatosGenerales }
      >(functions, 'createOrUpdateDatoGeneral');

      await createOrUpdateDatoGeneral(form);
      await refreshDatosGenerales();

      if (onSaved) {
        onSaved();
      } else {
        setSuccess('Datos generales guardados correctamente.');
      }
      setSaving(false);
    } catch (err) {
      console.error('Error saving dato general: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para guardar datos generales (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el registro: ${message}`);
      } else {
        setError('No se pudo guardar el registro en Data Connect.');
      }
      setSaving(false);
    }
  };

  if (loadingDatoGeneral) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) return loadingContent;
    return <Container maxWidth="md">{loadingContent}</Container>;
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          Editar Datos Generales
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            gridAutoRows: { md: '56px' },
            '& .MuiFormControl-root': { m: 0 },
          }}
        >
          <Box
            sx={{
              gridColumn: { xs: '1 / -1', md: '8 / span 5' },
              gridRow: { md: '1 / span 4' },
              minHeight: { xs: 250, md: '100%' },
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.default',
            }}
          >
            <Box
              component={form.logoUrl ? 'img' : 'div'}
              src={form.logoUrl || undefined}
              alt={form.logoUrl ? 'Logo institucional' : undefined}
              sx={{
                flex: '1 1 auto',
                minHeight: 112,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                objectFit: 'contain',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
                color: 'text.secondary',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {!form.logoUrl ? 'Logo institucional' : null}
            </Box>

            <TextField
              label="Logo URL"
              value={form.logoUrl || ''}
              onChange={(event) => handleChange('logoUrl', event.target.value)}
              fullWidth
              size="small"
              disabled={uploadingLogo || saving}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoUpload}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo || saving}
              >
                {uploadingLogo ? <CircularProgress size={20} /> : form.logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              {form.logoUrl ? (
                <Button
                  size="small"
                  onClick={() => handleChange('logoUrl', '')}
                  disabled={uploadingLogo || saving}
                >
                  Quitar
                </Button>
              ) : null}
            </Box>

            {logoError ? (
              <Alert severity="error" sx={{ py: 0 }}>
                {logoError}
              </Alert>
            ) : null}
          </Box>

          {fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              type="text"
              value={form[field.name] || ''}
              onChange={(event) => handleChange(field.name, event.target.value)}
              fullWidth
              required={field.name === 'nombreInstitucion'}
              slotProps={{
                htmlInput: {
                  inputMode: field.name === 'codigoModular' || field.name === 'ruc' ? 'numeric' : undefined,
                },
              }}
              sx={{
                gridColumn: { xs: '1 / -1', md: field.gridColumn ?? 'span 6' },
              }}
            />
          ))}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );

  if (asModal) return formContent;
  return <Container maxWidth="md">{formContent}</Container>;
}
