'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, storage } from '@/lib/firebase';

interface CoverImageFieldProps {
  value: string;
  onChange: (value: string) => void;
  storageFolder: string;
  disabled?: boolean;
}

const getStorageSafeFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'portada';

export default function CoverImageField({
  value,
  onChange,
  storageFolder,
  disabled = false,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const auth = getAuth(app);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
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

      const fileName = getStorageSafeFileName(file.name);
      const storageRef = ref(storage, `academico/${storageFolder}/${Date.now()}_${fileName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      onChange(downloadUrl);
    } catch (error: unknown) {
      console.error('Error uploading cover image:', error);
      setUploadError((error as { message?: string } | null)?.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {value ? (
        <Box
          component="img"
          src={value}
          alt=""
          sx={{
            width: '100%',
            height: 180,
            objectFit: 'cover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 1.5,
          }}
        />
      ) : null}
      <TextField
        label="Imagen de portada URL"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        margin="normal"
        disabled={disabled || isUploading}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Button
          variant="outlined"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? <CircularProgress size={22} /> : value ? 'Cambiar portada' : 'Subir portada'}
        </Button>
        {value ? (
          <Button onClick={() => onChange('')} disabled={disabled || isUploading}>
            Quitar
          </Button>
        ) : null}
      </Box>
      {uploadError ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {uploadError}
        </Alert>
      ) : null}
    </Box>
  );
}
