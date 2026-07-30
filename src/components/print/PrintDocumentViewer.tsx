'use client';

import React, { CSSProperties, ReactNode, RefObject, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  GlobalStyles,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import Modal1 from '@/components/Modal1';

export type PrintOrientation = 'landscape' | 'portrait';

export type PrintMarginsCm = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type PrintPageSizeMm = {
  width: number;
  height: number;
};

export const A4_LANDSCAPE_SIZE_MM: PrintPageSizeMm = { width: 297, height: 210 };
export const A4_PORTRAIT_SIZE_MM: PrintPageSizeMm = { width: 210, height: 297 };

export const cmToMm = (value: number) => value * 10;

export const clampPrintMarginCm = (value: number) =>
  Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0));

export const getA4PageSizeMm = (orientation: PrintOrientation): PrintPageSizeMm =>
  orientation === 'portrait' ? A4_PORTRAIT_SIZE_MM : A4_LANDSCAPE_SIZE_MM;

export const getPrintContentWidthMm = (pageSize: PrintPageSizeMm, margins: PrintMarginsCm) =>
  Math.max(1, pageSize.width - cmToMm(margins.left) - cmToMm(margins.right));

export const getPrintContentHeightMm = (pageSize: PrintPageSizeMm, margins: PrintMarginsCm) =>
  Math.max(1, pageSize.height - cmToMm(margins.top) - cmToMm(margins.bottom));

type SettingsSnapshot = {
  orientation: PrintOrientation;
  margins: PrintMarginsCm;
  showOverflow: boolean;
};

type PrintDocumentViewerProps = {
  title: string;
  orientation: PrintOrientation;
  onOrientationChange: (orientation: PrintOrientation) => void;
  margins: PrintMarginsCm;
  onMarginsChange: (margins: PrintMarginsCm) => void;
  showPageOverflow: boolean;
  onShowPageOverflowChange: (show: boolean) => void;
  scalePercent: number;
  onScalePercentChange?: (scale: number) => void;
  minScalePercent?: number;
  maxScalePercent?: number;
  filters?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  canPrint?: boolean;
  pageSizeMm?: PrintPageSizeMm;
  viewerRef?: RefObject<HTMLDivElement | null>;
  onViewerScroll?: () => void;
  floatingScrollbarRef?: RefObject<HTMLDivElement | null>;
  onFloatingScrollbarScroll?: () => void;
  floatingScrollbarWidth?: number;
  contentMinWidthMm?: number;
  globalStyles?: Record<string, unknown>;
  printTitleBlank?: boolean;
  printButtonLabel?: string;
};

export default function PrintDocumentViewer({
  title,
  orientation,
  onOrientationChange,
  margins,
  onMarginsChange,
  showPageOverflow,
  onShowPageOverflowChange,
  scalePercent,
  onScalePercentChange,
  minScalePercent = 55,
  maxScalePercent = 100,
  filters,
  children,
  loading = false,
  error = null,
  canPrint = true,
  pageSizeMm = getA4PageSizeMm(orientation),
  viewerRef,
  onViewerScroll,
  floatingScrollbarRef,
  onFloatingScrollbarScroll,
  floatingScrollbarWidth = 0,
  contentMinWidthMm,
  globalStyles,
  printTitleBlank = true,
  printButtonLabel = 'Imprimir',
}: PrintDocumentViewerProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsSnapshotRef = useRef<SettingsSnapshot | null>(null);
  const minWidthMm = contentMinWidthMm ?? pageSizeMm.width;

  const openPrintSettings = () => {
    settingsSnapshotRef.current = {
      orientation,
      margins: { ...margins },
      showOverflow: showPageOverflow,
    };
    setSettingsOpen(true);
  };

  const acceptPrintSettings = () => {
    settingsSnapshotRef.current = null;
    setSettingsOpen(false);
  };

  const cancelPrintSettings = () => {
    const snapshot = settingsSnapshotRef.current;
    if (snapshot) {
      onOrientationChange(snapshot.orientation);
      onMarginsChange(snapshot.margins);
      onShowPageOverflowChange(snapshot.showOverflow);
    }
    settingsSnapshotRef.current = null;
    setSettingsOpen(false);
  };

  const updatePrintMargin = (key: keyof PrintMarginsCm, rawValue: string) => {
    const value = Number(rawValue);
    onMarginsChange({
      ...margins,
      [key]: clampPrintMarginCm(value),
    });
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);
    if (printTitleBlank) document.title = '\u00a0';
    window.requestAnimationFrame(() => {
      window.print();
      window.setTimeout(restoreTitle, 3000);
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', color: '#111' }}>
      <GlobalStyles
        styles={{
          '@page': {
            size: `A4 ${orientation}`,
            margin: `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`,
          },
          '@media print': {
            body: {
              margin: 0,
              background: '#fff !important',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            },
            '.print-toolbar, .print-floating-scrollbar': {
              display: 'none !important',
            },
          },
          '.print-page': {
            width: `${pageSizeMm.width}mm`,
            height: `${pageSizeMm.height}mm`,
          },
          ...(globalStyles || {}),
        } as Record<string, CSSProperties | Record<string, CSSProperties>>}
      />
      <Stack
        className="print-toolbar"
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          px: 2,
          py: 1,
          bgcolor: '#fff',
          borderBottom: '1px solid #d0d7de',
          mb: 2,
        }}
      >
        <Typography sx={{ flex: 1, fontWeight: 800, lineHeight: 1 }}>
          {title}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={openPrintSettings}
          sx={{ flexShrink: 0, minHeight: 40, whiteSpace: 'nowrap' }}
        >
          Config...
        </Button>
        {filters}
        <TextField
          label="Escala"
          size="small"
          type="number"
          value={scalePercent}
          onChange={(event) => {
            if (!onScalePercentChange) return;
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            onScalePercentChange(Math.max(minScalePercent, Math.min(maxScalePercent, Math.round(value))));
          }}
          inputProps={{ min: minScalePercent, max: maxScalePercent, step: 1, readOnly: !onScalePercentChange }}
          InputProps={{ endAdornment: <Typography sx={{ ml: 0.5, color: 'text.secondary' }}>%</Typography> }}
          sx={{ width: { xs: '100%', md: 100 }, flexShrink: 0 }}
        />
        <span>
          <IconButton aria-label={printButtonLabel} color="primary" onClick={handlePrint} disabled={!canPrint || loading}>
            <PrintIcon />
          </IconButton>
        </span>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ maxWidth: 720, mx: 'auto', px: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : (
        <>
          <Box
            className="print-viewer"
            ref={viewerRef}
            onScroll={onViewerScroll}
            sx={{
              width: '100%',
              maxWidth: '100vw',
              minWidth: 0,
              boxSizing: 'border-box',
              px: 2,
              pb: floatingScrollbarRef ? 5 : 2,
              overflowX: 'scroll',
              overflowY: 'visible',
              overscrollBehaviorX: 'contain',
              WebkitOverflowScrolling: 'touch',
              '@media print': { px: 0, pb: 0 },
            }}
          >
            <Box
              className="print-viewer-inner"
              sx={{
                width: 'fit-content',
                minWidth: `${minWidthMm}mm`,
                maxWidth: 'none',
                mx: { xs: 0, lg: 'auto' },
              }}
            >
              {children}
            </Box>
          </Box>
          {floatingScrollbarRef ? (
            <Box
              className="print-floating-scrollbar"
              ref={floatingScrollbarRef}
              onScroll={onFloatingScrollbarScroll}
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                width: '100vw',
                height: 18,
                overflowX: 'scroll',
                overflowY: 'hidden',
                bgcolor: '#eceff3',
                borderTop: '1px solid #c8d2df',
                boxSizing: 'border-box',
                scrollbarGutter: 'stable',
                '@media print': { display: 'none' },
              }}
            >
              <Box sx={{ width: `${floatingScrollbarWidth}px`, minWidth: `${minWidthMm}mm`, height: 1 }} />
            </Box>
          ) : null}
        </>
      )}

      <Modal1
        open={settingsOpen}
        onClose={cancelPrintSettings}
        title="Configuracion de impresion"
        maxWidth="sm"
      >
        <Stack spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Orientacion</InputLabel>
            <Select
              label="Orientacion"
              value={orientation}
              onChange={(event) => onOrientationChange(event.target.value as PrintOrientation)}
              MenuProps={{ disableScrollLock: true }}
            >
              <MenuItem value="landscape">Horizontal</MenuItem>
              <MenuItem value="portrait">Vertical</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Margenes en centimetros
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            <TextField
              label="Superior"
              type="number"
              size="small"
              value={margins.top}
              onChange={(event) => updatePrintMargin('top', event.target.value)}
              inputProps={{ min: 0, max: 10, step: 0.1 }}
              InputProps={{ endAdornment: <Typography sx={{ ml: 0.5, color: 'text.secondary' }}>cm</Typography> }}
              fullWidth
            />
            <TextField
              label="Inferior"
              type="number"
              size="small"
              value={margins.bottom}
              onChange={(event) => updatePrintMargin('bottom', event.target.value)}
              inputProps={{ min: 0, max: 10, step: 0.1 }}
              InputProps={{ endAdornment: <Typography sx={{ ml: 0.5, color: 'text.secondary' }}>cm</Typography> }}
              fullWidth
            />
            <TextField
              label="Izquierdo"
              type="number"
              size="small"
              value={margins.left}
              onChange={(event) => updatePrintMargin('left', event.target.value)}
              inputProps={{ min: 0, max: 10, step: 0.1 }}
              InputProps={{ endAdornment: <Typography sx={{ ml: 0.5, color: 'text.secondary' }}>cm</Typography> }}
              fullWidth
            />
            <TextField
              label="Derecho"
              type="number"
              size="small"
              value={margins.right}
              onChange={(event) => updatePrintMargin('right', event.target.value)}
              inputProps={{ min: 0, max: 10, step: 0.1 }}
              InputProps={{ endAdornment: <Typography sx={{ ml: 0.5, color: 'text.secondary' }}>cm</Typography> }}
              fullWidth
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={showPageOverflow}
                onChange={(event) => onShowPageOverflowChange(event.target.checked)}
              />
            }
            label="Mostrar desbordamiento de margen"
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={cancelPrintSettings}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={acceptPrintSettings}>
              Aceptar
            </Button>
          </Stack>
        </Stack>
      </Modal1>
    </Box>
  );
}
