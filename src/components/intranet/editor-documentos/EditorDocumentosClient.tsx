'use client';

import React, { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SaveIcon from '@mui/icons-material/Save';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import CameraCaptureDialog from '@/components/intranet/CameraCaptureDialog';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { functions } from '@/lib/firebase';
import { imageFileToOptimizedDataUrl } from '@/lib/imageOptimization';

type DocumentoSide = 'frente' | 'reverso';
interface EditorUser {
  id?: number | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
  avatar?: string | null;
  avatarTiny?: string | null;
  avatarPequeno?: string | null;
  avatarMediano?: string | null;
  dniImagenFrenteUrl?: string | null;
  dniImagenReversoUrl?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
}

interface EditorMatricula {
  id: number;
  semestreId?: number | null;
  userId?: number | null;
  user?: EditorUser | null;
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorSavedPayload {
  side: DocumentoSide;
  processedUrl?: string | null;
  smallUrl?: string | null;
  originalUrl?: string | null;
}

interface EditorImagenesContentProps {
  matriculaId?: number | null;
  userId?: number | null;
  documentId?: string | null;
  side: DocumentoSide;
  onSaved?: (payload: EditorSavedPayload) => void;
  onClose?: () => void;
  embedded?: boolean;
  variant?: 'full' | 'simple';
  instructionText?: string;
}

const studentName = (user?: EditorUser | null) =>
  [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre].filter(Boolean).join(' ').trim() || user?.email || '';

const getSmallProcessedDniUrl = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const marker = '/o/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return url;
    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    const storagePath = decodeURIComponent(encodedPath);
    if (!storagePath.includes('/documentos-procesados/')) return url;
    const smallPath = storagePath.replace(/(\.[a-z0-9]+)$/i, '-small$1');
    if (smallPath === storagePath) return url;
    parsed.pathname = `${parsed.pathname.slice(0, markerIndex + marker.length)}${encodeURIComponent(smallPath)}`;
    return parsed.toString();
  } catch {
    return url;
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = src;
  });

const canvasToJpegDataUrl = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/jpeg', 0.94);

async function transformImageDataUrl(dataUrl: string, rotationDegrees: number, crop?: Rect | null) {
  const image = await loadImage(dataUrl);
  const radians = rotationDegrees * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedWidth = Math.max(1, Math.round(image.width * cos + image.height * sin));
  const rotatedHeight = Math.max(1, Math.round(image.width * sin + image.height * cos));
  const canvas = document.createElement('canvas');
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el lienzo.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, rotatedWidth, rotatedHeight);
  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  if (!crop) return canvasToJpegDataUrl(canvas);
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(crop.width));
  cropCanvas.height = Math.max(1, Math.round(crop.height));
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) throw new Error('No se pudo preparar el recorte.');
  cropCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  );
  return canvasToJpegDataUrl(cropCanvas);
}

function ThumbButton({
  url,
  label,
  onClick,
}: {
  url?: string | null;
  label: string;
  onClick: () => void;
}) {
  const displayUrl = getSmallProcessedDniUrl(url || '');
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={label}
      style={{
        width: 112,
        minHeight: 58,
        padding: 0,
        border: '1px solid rgba(0,0,0,0.18)',
        background: '#fff',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {displayUrl ? (
        <Box
          component="img"
          src={displayUrl}
          alt={label}
          sx={{ display: 'block', width: 100, height: 'auto', maxHeight: 70, mx: 'auto', objectFit: 'contain' }}
        />
      ) : (
        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
          Editar
        </Typography>
      )}
    </Box>
  );
}

export function EditorImagenesModal({
  open,
  matriculaId,
  userId,
  documentId,
  side,
  onClose,
  onSaved,
  variant = 'full',
  instructionText,
}: {
  open: boolean;
  matriculaId?: number | null;
  userId?: number | null;
  documentId?: string | null;
  side: DocumentoSide;
  onClose: () => void;
  onSaved?: (payload: EditorSavedPayload) => void;
  variant?: 'full' | 'simple';
  instructionText?: string;
}) {
  return (
    <Modal1 open={open} onClose={onClose} title="Editor de Imagenes" maxWidth={variant === 'simple' ? 'md' : 'lg'} disableAutoFocus disableEnforceFocus>
      {open ? (
        <EditorImagenesContent
          embedded
          matriculaId={matriculaId}
          userId={userId}
          documentId={documentId}
          side={side}
          onClose={onClose}
          onSaved={onSaved}
          variant={variant}
          instructionText={instructionText}
        />
      ) : null}
    </Modal1>
  );
}

export function EditorImagenesPage() {
  const searchParams = useSearchParams();
  const matriculaId = Number(searchParams.get('matriculaId') || 0);
  const userId = Number(searchParams.get('userId') || 0);
  const documentId = searchParams.get('documentId') || '';
  const side = (searchParams.get('lado') === 'reverso' ? 'reverso' : 'frente') as DocumentoSide;

  return (
    <EditorImagenesContent
      matriculaId={Number.isFinite(matriculaId) && matriculaId > 0 ? matriculaId : null}
      userId={Number.isFinite(userId) && userId > 0 ? userId : null}
      documentId={documentId || null}
      side={side}
    />
  );
}

export function EditorDocumentosPage() {
  const { can } = useIntranetPermissions();
  const { settings, loading: loadingSettings } = useAppSettings();
  const [matriculas, setMatriculas] = useState<EditorMatricula[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 30 });
  const [editorTarget, setEditorTarget] = useState<{ matriculaId: number; side: DocumentoSide } | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRow, setMenuRow] = useState<EditorMatricula | null>(null);
  const [generatingAvatarId, setGeneratingAvatarId] = useState<number | null>(null);

  const semestreActualId = Number(settings.general.semestreActualId || 0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loadingSettings) return;
      if (!can('editor-documentos', 'view')) {
        setLoading(false);
        setMessage('No tienes permiso para ver el editor de documentos.');
        return;
      }
      setLoading(true);
      try {
        const callable = httpsCallable<{ semestreId?: number | null }, { matriculas?: EditorMatricula[] }>(
          functions,
          'listEditorDocumentosMatriculas',
          { timeout: 30000 },
        );
        const result = await callable({ semestreId: semestreActualId || null });
        if (active) {
          setMatriculas(result.data.matriculas || []);
          setMessage(null);
        }
      } catch (error) {
        console.error('Error loading editor documentos:', error);
        if (active) setMessage('No se pudieron cargar los documentos.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [can, loadingSettings, semestreActualId]);

  const openEditor = useCallback((matriculaId: number, side: DocumentoSide) => {
    setEditorTarget({ matriculaId, side });
  }, []);

  const openProcessedImage = useCallback((url?: string | null) => {
    setMenuAnchorEl(null);
    setMenuRow(null);
    if (!url) {
      setMessage('Esta imagen procesada aun no esta disponible.');
      return;
    }
    const opened = window.open(url, '_blank');
    opened?.focus();
  }, []);

  const handleEditorSaved = useCallback((payload: EditorSavedPayload) => {
    setMatriculas((current) =>
      current.map((item) => {
        if (!editorTarget || item.id !== editorTarget.matriculaId || !item.user) return item;
        return {
          ...item,
          user: {
            ...item.user,
            ...(payload.side === 'frente'
              ? {
                dniImagenFrenteProcesadaUrl: payload.processedUrl || item.user.dniImagenFrenteProcesadaUrl,
                dniImagenFrenteUrl: payload.originalUrl || item.user.dniImagenFrenteUrl,
              }
              : {
                dniImagenReversoProcesadaUrl: payload.processedUrl || item.user.dniImagenReversoProcesadaUrl,
                dniImagenReversoUrl: payload.originalUrl || item.user.dniImagenReversoUrl,
              }),
          },
        };
      }),
    );
    setEditorTarget(null);
  }, [editorTarget]);

  const handleGenerateAvatar = useCallback(async (row: EditorMatricula) => {
    setMenuAnchorEl(null);
    setMenuRow(null);
    setGeneratingAvatarId(row.id);
    setMessage(null);
    try {
      const callable = httpsCallable<{ matriculaId: number }, { ok?: boolean; jobId?: string }>(
        functions,
        'regenerateEditorDocumentoAvatar',
        { timeout: 120000 },
      );
      await callable({ matriculaId: row.id });
      setMessage('Se envio la regeneracion del avatar. En unos momentos se reemplazara el avatar anterior.');
    } catch (error) {
      console.error('Error regenerating avatar:', error);
      setMessage('No se pudo iniciar la generacion del avatar.');
    } finally {
      setGeneratingAvatarId(null);
    }
  }, []);

  const columns = useMemo<GridColDef<EditorMatricula>[]>(
    () => [
      { field: 'numero', headerName: '#', width: 70, valueGetter: (_value, row) => row.id },
      {
        field: 'avatar',
        headerName: 'Avatar',
        width: 82,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const user = row.user;
          const url = user?.avatarTiny || user?.avatarPequeno || user?.avatarMediano || user?.avatar || '';
          return url ? (
            <Box component="img" src={url} alt="" sx={{ width: 42, height: 42, objectFit: 'cover', objectPosition: '50% 10%' }} />
          ) : null;
        },
      },
      {
        field: 'estudiante',
        headerName: 'Estudiante',
        flex: 1,
        minWidth: 220,
        valueGetter: (_value, row) => studentName(row.user),
      },
      {
        field: 'documento',
        headerName: 'Documento',
        width: 140,
        valueGetter: (_value, row) => [row.user?.tipoDocumento || 'DNI', row.user?.dni].filter(Boolean).join(' '),
      },
      {
        field: 'dniFrente',
        headerName: 'DNI frente',
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <ThumbButton
            url={row.user?.dniImagenFrenteProcesadaUrl}
            label="Editar DNI frente"
            onClick={() => openEditor(row.id, 'frente')}
          />
        ),
      },
      {
        field: 'dniReverso',
        headerName: 'DNI reverso',
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <ThumbButton
            url={row.user?.dniImagenReversoProcesadaUrl}
            label="Editar DNI reverso"
            onClick={() => openEditor(row.id, 'reverso')}
          />
        ),
      },
      {
        field: 'acciones',
        headerName: '...',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) => (
          <IconButton
            size="small"
            aria-label="Opciones"
            disabled={generatingAvatarId === row.id}
            onClick={(event) => {
              setMenuAnchorEl(event.currentTarget);
              setMenuRow(row);
            }}
          >
            {generatingAvatarId === row.id ? <CircularProgress size={18} /> : <MoreHorizIcon />}
          </IconButton>
        ),
      },
    ],
    [generatingAvatarId, openEditor],
  );

  return (
    <IntranetListLayout
      title="Editor de Documentos"
      message={message}
      commands={<Typography variant="body2" color="text.secondary">Semestre actual</Typography>}
    >
      <IntranetDataGrid
        rows={matriculas}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        rowHeight={86}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[30]}
      />
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuRow(null);
        }}
      >
        <MenuItem disabled={!menuRow?.user?.dniImagenFrenteProcesadaUrl} onClick={() => menuRow && handleGenerateAvatar(menuRow)}>
          Generar Avatar
        </MenuItem>
        <MenuItem onClick={() => openProcessedImage(menuRow?.user?.dniImagenFrenteProcesadaUrl)}>
          Ver Frente
        </MenuItem>
        <MenuItem onClick={() => openProcessedImage(menuRow?.user?.dniImagenReversoProcesadaUrl)}>
          Ver Reverso
        </MenuItem>
      </Menu>
      <EditorImagenesModal
        open={Boolean(editorTarget)}
        matriculaId={editorTarget?.matriculaId ?? null}
        side={editorTarget?.side ?? 'frente'}
        onClose={() => setEditorTarget(null)}
        onSaved={handleEditorSaved}
      />
    </IntranetListLayout>
  );
}

function EditorImagenesContent({
  matriculaId,
  userId,
  documentId,
  side,
  onSaved,
  onClose,
  embedded = false,
  variant = 'full',
  instructionText,
}: EditorImagenesContentProps) {
  const { can } = useIntranetPermissions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const lastAutoFitSourceRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [matricula, setMatricula] = useState<EditorMatricula | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState('');
  const [initialDataUrl, setInitialDataUrl] = useState('');
  const [replacementOriginalDataUrl, setReplacementOriginalDataUrl] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0.2);
  const [freeRotation, setFreeRotation] = useState(0);
  const [perspectivePoints, setPerspectivePoints] = useState<Point[]>([]);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [rotationApplying, setRotationApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const user = matricula?.user;
  const originalUrl = side === 'frente' ? user?.dniImagenFrenteUrl : user?.dniImagenReversoUrl;
  const processedUrl = side === 'frente' ? user?.dniImagenFrenteProcesadaUrl : user?.dniImagenReversoProcesadaUrl;
  const canEdit = can('editor-documentos', 'edit');
  const isSimpleVariant = variant === 'simple';

  const loadDocumentImageData = useCallback(async () => {
    const callable = httpsCallable<
      { matriculaId?: number | null; userId?: number | null; documentId?: string | null; side: DocumentoSide; source: 'original' | 'procesada' },
      { dataUrl?: string }
    >(
      functions,
      'getEditorDocumentoImageData',
      { timeout: 120000 },
    );
    const result = await callable({ matriculaId, userId, documentId, side, source: 'original' });
    const dataUrl = result.data.dataUrl || '';
    if (!dataUrl) throw new Error('La funcion no devolvio la imagen original.');
    return dataUrl;
  }, [documentId, matriculaId, side, userId]);

  const clearEditorImage = useCallback(() => {
    setSourceDataUrl('');
    setInitialDataUrl('');
    setReplacementOriginalDataUrl('');
    lastAutoFitSourceRef.current = '';
    setImageSize({ width: 0, height: 0 });
    setPerspectivePoints([]);
    setFreeRotation(0);
    setDraggingPointIndex(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!sourceDataUrl) {
      canvas.width = 1;
      canvas.height = 1;
      setImageSize({ width: 0, height: 0 });
      return;
    }
    const image = await loadImage(sourceDataUrl);
    setImageSize({ width: image.width, height: image.height });
    canvas.width = Math.max(1, Math.round(image.width * zoom));
    canvas.height = Math.max(1, Math.round(image.height * zoom));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (perspectivePoints.length) {
      ctx.fillStyle = '#00c853';
      ctx.strokeStyle = '#00c853';
      ctx.lineWidth = 2;
      perspectivePoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x * zoom, point.y * zoom, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(String(index + 1), point.x * zoom + 7, point.y * zoom - 7);
      });
      if (perspectivePoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(perspectivePoints[0].x * zoom, perspectivePoints[0].y * zoom);
        perspectivePoints.slice(1).forEach((point) => ctx.lineTo(point.x * zoom, point.y * zoom));
        if (perspectivePoints.length === 4) ctx.closePath();
        ctx.stroke();
      }
    }
  }, [perspectivePoints, sourceDataUrl, zoom]);

  useEffect(() => {
    void drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (!isSimpleVariant || !sourceDataUrl || lastAutoFitSourceRef.current === sourceDataUrl) return;
    let active = true;
    const fitImageToContainer = async () => {
      try {
        const image = await loadImage(sourceDataUrl);
        if (!active) return;
        const containerWidth = Math.max(280, viewerRef.current?.clientWidth ?? 720);
        const nextZoom = Math.max(0.1, Math.min(1.15, (containerWidth - 32) / image.width));
        setZoom(nextZoom);
        lastAutoFitSourceRef.current = sourceDataUrl;
      } catch {
        // El lienzo principal mantiene el manejo visual del error.
      }
    };
    void fitImageToContainer();
    return () => {
      active = false;
    };
  }, [isSimpleVariant, sourceDataUrl]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!matriculaId && !userId && !documentId) {
        setMessage('No se indico la matricula o usuario.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = matriculaId
          ? await httpsCallable<{ matriculaId: number }, { matricula?: EditorMatricula | null }>(
            functions,
            'getEditorDocumentoMatricula',
            { timeout: 30000 },
          )({ matriculaId })
          : { data: { matricula: null } };
        if (!active) return;
        const nextMatricula = result.data.matricula || null;
        const nextUrl = side === 'frente'
          ? nextMatricula?.user?.dniImagenFrenteUrl
          : nextMatricula?.user?.dniImagenReversoUrl;
        let dataUrl = '';
        if (nextUrl || !matriculaId) {
          try {
            dataUrl = await loadDocumentImageData();
          } catch (error) {
            console.warn('No se encontro imagen original para el editor.', error);
          }
        }
        if (!active) return;
        setMatricula(nextMatricula);
        if (dataUrl) {
          lastAutoFitSourceRef.current = '';
          setSourceDataUrl(dataUrl);
          setInitialDataUrl(dataUrl);
          setReplacementOriginalDataUrl('');
          setMessage(null);
        } else {
          clearEditorImage();
          setMessage('No hay imagen original cargada. Usa Cambiar Archivo o Camara para agregarla.');
        }
      } catch (error) {
        console.error('Error loading editor image:', error);
        if (active) {
          clearEditorImage();
          setMessage('No hay imagen original cargada. Usa Cambiar Archivo o Camara para agregarla.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [clearEditorImage, documentId, loadDocumentImageData, matriculaId, side, userId]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(imageSize.width, (event.clientX - rect.left) / zoom)),
      y: Math.max(0, Math.min(imageSize.height, (event.clientY - rect.top) / zoom)),
    };
  };

  const findPerspectivePointIndex = (point: Point) => {
    const tolerance = Math.max(14 / zoom, 8);
    return perspectivePoints.findIndex((candidate) =>
      Math.hypot(candidate.x - point.x, candidate.y - point.y) <= tolerance,
    );
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (freeRotation) {
      setMessage('Aplica el giro libre antes de colocar o mover puntos de perspectiva.');
      return;
    }
    const point = pointFromEvent(event);
    const existingPointIndex = findPerspectivePointIndex(point);
    const canvas = canvasRef.current;
    if (existingPointIndex >= 0) {
      setDraggingPointIndex(existingPointIndex);
      canvas?.setPointerCapture(event.pointerId);
      return;
    }
    if (perspectivePoints.length < 4) {
      setPerspectivePoints((current) => [...current, point]);
      setDraggingPointIndex(perspectivePoints.length);
      canvas?.setPointerCapture(event.pointerId);
    }
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointIndex === null) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    setPerspectivePoints((current) =>
      current.map((candidate, index) => index === draggingPointIndex ? point : candidate),
    );
  };

  const handleCanvasPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    setDraggingPointIndex(null);
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const commitRotation = async (degrees: number) => {
    if (!degrees || !sourceDataUrl || rotationApplying) return;
    setRotationApplying(true);
    try {
      lastAutoFitSourceRef.current = '';
      setSourceDataUrl(await transformImageDataUrl(sourceDataUrl, degrees));
      setPerspectivePoints([]);
      setDraggingPointIndex(null);
      setFreeRotation(0);
    } finally {
      setRotationApplying(false);
    }
  };

  const loadReplacementFile = async (file: File) => {
    if (!file) return;
    let dataUrl: string;
    try {
      dataUrl = file.type.startsWith('image/') && file.type !== 'image/gif'
        ? await imageFileToOptimizedDataUrl(file)
        : await readFileAsDataUrl(file);
    } catch (error) {
      console.warn('No se pudo optimizar la imagen del editor; se usara el archivo recibido.', error);
      dataUrl = await readFileAsDataUrl(file);
    }
    setSourceDataUrl(dataUrl);
    setInitialDataUrl(dataUrl);
    setReplacementOriginalDataUrl(dataUrl);
    lastAutoFitSourceRef.current = '';
    setPerspectivePoints([]);
    setFreeRotation(0);
    setDraggingPointIndex(null);
    setMessage('Imagen original reemplazada en el editor. Se sobrescribira el original al guardar.');
  };

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await loadReplacementFile(file);
  };

  const handleCameraAccept = async (file: File) => {
    await loadReplacementFile(file);
  };

  const handleReset = () => {
    lastAutoFitSourceRef.current = '';
    setSourceDataUrl(initialDataUrl);
    setPerspectivePoints([]);
    setFreeRotation(0);
    setDraggingPointIndex(null);
  };

  const handleSave = async () => {
    if (!canEdit) {
      setMessage('No tienes permiso para editar documentos.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (!sourceDataUrl) {
        setMessage('Carga una imagen desde archivo o camara antes de guardar.');
        return;
      }
      const finalDataUrl = freeRotation ? await transformImageDataUrl(sourceDataUrl, freeRotation) : sourceDataUrl;
      const callable = httpsCallable<
        {
          matriculaId?: number | null;
          userId?: number | null;
          documentId?: string | null;
          side: DocumentoSide;
          imageDataUrl: string;
          replacementOriginalDataUrl?: string;
          perspectivePoints?: Array<{ x: number; y: number }> | null;
        },
        { ok?: boolean; processedUrl?: string; smallUrl?: string; originalUrl?: string }
      >(functions, 'saveEditorDocumentoImage', { timeout: 180000 });
      const result = await callable({
        matriculaId,
        userId,
        documentId,
        side,
        imageDataUrl: finalDataUrl,
        replacementOriginalDataUrl: replacementOriginalDataUrl || undefined,
        perspectivePoints: !freeRotation && perspectivePoints.length === 4
          ? perspectivePoints.map((point) => ({ x: point.x / imageSize.width, y: point.y / imageSize.height }))
          : null,
      });
      setSourceDataUrl(finalDataUrl);
      setInitialDataUrl(finalDataUrl);
      setReplacementOriginalDataUrl('');
      lastAutoFitSourceRef.current = '';
      setFreeRotation(0);
      setPerspectivePoints([]);
      setDraggingPointIndex(null);
      setMessage('Imagen guardada y procesada correctamente.');
      onSaved?.({
        side,
        processedUrl: result.data.processedUrl ?? null,
        smallUrl: result.data.smallUrl ?? null,
        originalUrl: result.data.originalUrl ?? null,
      });
      onClose?.();
    } catch (error) {
      console.error('Error saving editor image:', error);
      setMessage('No se pudo guardar la imagen editada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, bgcolor: 'background.paper', minHeight: embedded ? 0 : '100vh' }}>
      <Box sx={{ px: embedded ? 0 : 2, py: embedded ? 0 : 1.5, borderBottom: embedded ? 0 : 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="h4" component="h1" sx={{ lineHeight: 1.1 }}>
              Editor de Imagenes
            </Typography>
            <Typography
              variant="body2"
              color={instructionText ? 'error.main' : 'text.secondary'}
              sx={instructionText ? { fontWeight: 800 } : undefined}
            >
              {instructionText || `${studentName(user)} ${user?.dni ? `- ${user.tipoDocumento || 'DNI'} ${user.dni}` : ''} - ${side}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {!isSimpleVariant && originalUrl ? (
              <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => window.open(originalUrl, '_blank')?.focus()}>
                Original
              </Button>
            ) : null}
            {!isSimpleVariant && processedUrl ? (
              <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => window.open(processedUrl, '_blank')?.focus()}>
                Procesado
              </Button>
            ) : null}
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || loading || !sourceDataUrl || !canEdit}>
              Guardar
            </Button>
          </Stack>
        </Stack>
      </Box>

      {message ? <Alert severity={message.includes('correctamente') ? 'success' : 'warning'} sx={{ m: 2 }}>{message}</Alert> : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: isSimpleVariant ? '190px minmax(0, 1fr)' : '250px minmax(0, 1fr)' }, gap: 0 }}>
        <Stack spacing={1.5} sx={{ p: 2, borderRight: { md: 1 }, borderColor: 'divider' }}>
          {!isSimpleVariant ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <ImageSearchIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Perspectiva</Typography>
            </Stack>
          ) : null}

          <ButtonGroup size="small" fullWidth>
            <Tooltip title="Zoom menos"><IconButton onClick={() => setZoom((value) => Math.max(0.2, value - 0.1))}><ZoomOutIcon /></IconButton></Tooltip>
            <Tooltip title="Zoom mas"><IconButton onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}><ZoomInIcon /></IconButton></Tooltip>
            <Tooltip title="Girar izquierda 90"><IconButton onClick={() => void commitRotation(-90)} disabled={!sourceDataUrl || rotationApplying}><RotateLeftIcon /></IconButton></Tooltip>
            <Tooltip title="Girar derecha 90"><IconButton onClick={() => void commitRotation(90)} disabled={!sourceDataUrl || rotationApplying}><RotateRightIcon /></IconButton></Tooltip>
          </ButtonGroup>

          <Stack spacing={1} sx={{ display: isSimpleVariant ? 'none' : 'flex' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ThreeSixtyIcon fontSize="small" />
              <Typography variant="body2">Giro libre: {freeRotation}°</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Rotar -0.5 grados">
                <span>
                  <IconButton size="small" onClick={() => void commitRotation(-0.5)} disabled={!sourceDataUrl || rotationApplying}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Slider
                min={-15}
                max={15}
                step={0.5}
                value={freeRotation}
                disabled={!sourceDataUrl || rotationApplying}
                onChange={(_event, value) => {
                  setFreeRotation(Number(value));
                  setPerspectivePoints([]);
                  setDraggingPointIndex(null);
                }}
                onChangeCommitted={(_event, value) => {
                  void commitRotation(Number(value));
                }}
              />
              <Tooltip title="Rotar +0.5 grados">
                <span>
                  <IconButton size="small" onClick={() => void commitRotation(0.5)} disabled={!sourceDataUrl || rotationApplying}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <Divider />

          <Button onClick={() => setPerspectivePoints([])} disabled={!perspectivePoints.length} sx={{ display: isSimpleVariant ? 'none' : 'inline-flex' }}>
            Limpiar puntos
          </Button>

          <Divider />

          <input hidden ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} />
          <Button startIcon={<AddPhotoAlternateIcon />} onClick={() => fileInputRef.current?.click()}>
            Cambiar Archivo
          </Button>
          <Button startIcon={<CameraAltIcon />} onClick={() => setCameraOpen(true)} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            Camara
          </Button>
          <Button startIcon={<RestartAltIcon />} onClick={handleReset} disabled={!initialDataUrl}>
            Restablecer
          </Button>
        </Stack>

        <Box ref={viewerRef} sx={{ p: 2, overflow: 'auto', minHeight: isSimpleVariant ? 380 : 520, bgcolor: '#f7f7f7' }}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 420 }}>
              <CircularProgress />
            </Stack>
          ) : sourceDataUrl ? (
            <Box sx={{ width: 'max-content', minWidth: '100%', display: 'flex', justifyContent: isSimpleVariant ? 'center' : 'flex-start' }}>
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                style={{
                  display: 'block',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.22)',
                  cursor: draggingPointIndex !== null ? 'grabbing' : 'copy',
                  touchAction: 'none',
                  transform: freeRotation ? `rotate(${freeRotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}
              />
            </Box>
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 420, color: 'text.secondary' }}>
              <ImageSearchIcon />
              <Typography variant="body2">
                Sin imagen original cargada.
              </Typography>
              <Typography variant="caption">
                Usa Cambiar Archivo o Camara para cargar una imagen y editarla.
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>
      <CameraCaptureDialog
        open={cameraOpen}
        title="Capturar imagen"
        fileName={`editor-documento-${side}-${Date.now()}.jpg`}
        onClose={() => setCameraOpen(false)}
        onAccept={(file) => {
          void handleCameraAccept(file);
        }}
      />
    </Box>
  );
}
