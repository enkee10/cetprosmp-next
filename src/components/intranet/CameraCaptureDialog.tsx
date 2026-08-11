'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface CameraCaptureDialogProps {
  open: boolean;
  title: string;
  fileName: string;
  onClose: () => void;
  onAccept: (file: File) => void;
  formatError?: (error: unknown, fallback: string) => string;
}

const defaultFormatError = (error: unknown, fallback: string) => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : '';
  return message || fallback;
};

export default function CameraCaptureDialog({
  open,
  title,
  fileName,
  onClose,
  onAccept,
  formatError = defaultFormatError,
}: CameraCaptureDialogProps) {
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPreview, setCameraPreview] = useState<{ file: File; url: string } | null>(null);

  const stopCameraCapture = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setCameraStarting(false);
    setCameraError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const startCamera = async () => {
      setCameraStarting(true);
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Tu navegador no permite abrir la camara desde esta pagina.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError(formatError(error, 'No se pudo abrir la camara.'));
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [formatError, open]);

  useEffect(() => {
    if (!open || cameraPreview || !cameraStreamRef.current || !cameraVideoRef.current) return;
    cameraVideoRef.current.srcObject = cameraStreamRef.current;
    void cameraVideoRef.current.play().catch(() => undefined);
  }, [cameraPreview, open]);

  const handleCaptureCameraImage = useCallback(async () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('La camara todavia no esta lista.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('No se pudo capturar la imagen.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('No se pudo generar la imagen.');
      return;
    }

    const file = new File([blob], fileName, { type: 'image/jpeg' });
    const url = URL.createObjectURL(file);
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { file, url };
    });
  }, [fileName]);

  const handleRetakeCameraImage = useCallback(() => {
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setCameraError(null);
  }, []);

  const handleAcceptCameraImage = useCallback(() => {
    if (!cameraPreview) return;
    onAccept(cameraPreview.file);
    stopCameraCapture();
  }, [cameraPreview, onAccept, stopCameraCapture]);

  return (
    <Dialog open={open} onClose={stopCameraCapture} fullWidth maxWidth="sm">
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {cameraError ? <Alert severity="error">{cameraError}</Alert> : null}
          {cameraStarting ? <LinearProgress /> : null}
          {cameraPreview ? (
            <Box
              component="img"
              src={cameraPreview.url}
              alt="Vista previa del documento"
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                bgcolor: 'common.black',
                borderRadius: 1,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Box
              component="video"
              ref={cameraVideoRef}
              muted
              playsInline
              autoPlay
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                bgcolor: 'common.black',
                borderRadius: 1,
                objectFit: 'contain',
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={stopCameraCapture}>Cancelar</Button>
        {cameraPreview ? (
          <>
            <Button onClick={handleRetakeCameraImage}>Tomar otra</Button>
            <Button variant="contained" onClick={handleAcceptCameraImage}>
              Aceptar foto
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={() => void handleCaptureCameraImage()}
            disabled={cameraStarting || Boolean(cameraError)}
          >
            Tomar foto
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
