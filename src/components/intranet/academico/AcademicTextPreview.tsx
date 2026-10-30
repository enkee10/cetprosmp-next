'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Box, IconButton, Popover, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type PreviewRequest = { text: string; anchor: HTMLElement; variant: 'caption' | 'body2' };
type Preview = PreviewRequest & { top: number; left: number; maxWidth: number };
const PreviewContext = createContext<{
  request: (preview: PreviewRequest, event?: Event) => void;
  close: () => void;
} | null>(null);

/** A single preview for the whole view, including text inside session cards. */
export function AcademicTextPreviewProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedClickRef = useRef<Event | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    previewRef.current = null;
    setPreview(null);
  }, []);
  const request = useCallback((next: PreviewRequest, event?: Event) => {
    // The click that closes an existing preview must not immediately reopen it.
    if (!enabled || (event && dismissedClickRef.current === event)) return;
    close();
    const open = () => {
      timerRef.current = null;
      if (!next.anchor.isConnected) return;
      const rect = next.anchor.getBoundingClientRect();
      const availableWidth = Math.min(window.innerWidth - 8, rect.right + 20) - Math.max(8, rect.left - 20);
      const value = { ...next, top: rect.top + rect.height / 2, left: rect.left + rect.width / 2,
        maxWidth: Math.max(1, Math.min(rect.width + 40, availableWidth)) };
      previewRef.current = value;
      setPreview(value);
    };
    // Allow a second click to enter the existing editor before covering the text.
    if (event) timerRef.current = setTimeout(open, 500);
    else open();
  }, [close, enabled]);

  useEffect(() => {
    if (!enabled) { close(); return; }
    const cancelPending = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    const dismiss = (event: MouseEvent) => {
      if (event.target instanceof Node && paperRef.current?.contains(event.target)) return;
      if (previewRef.current) dismissedClickRef.current = event;
      close();
    };
    const scroll = (event: Event) => {
      // Long previews may scroll within the viewport without being dismissed.
      if (event.target instanceof Node && paperRef.current?.contains(event.target)) return;
      close();
    };
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    // A second press must cancel the preview before it can cover the mouseup.
    document.addEventListener('pointerdown', cancelPending, true);
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('scroll', scroll, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', cancelPending, true);
      document.removeEventListener('click', dismiss, true);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [close, enabled]);
  const context = useMemo(() => enabled ? { request, close } : null, [request, close, enabled]);

  return (
    <PreviewContext.Provider value={context}>
      {children}
      {enabled && preview && (
        <Popover
          open
          onClose={close}
          anchorReference="anchorPosition"
          anchorPosition={{ top: preview.top, left: preview.left }}
          transformOrigin={{ vertical: 'center', horizontal: 'center' }}
          marginThreshold={8}
          disableScrollLock
          disableRestoreFocus
          slotProps={{ paper: {
            ref: paperRef,
            role: 'dialog',
            'aria-label': 'Contenido completo',
            sx: { p: '10px', width: 'max-content', maxWidth: `${preview.maxWidth}px`, boxSizing: 'border-box',
              border: '1px solid', borderColor: 'divider', borderRadius: '4px' },
          } }}
        >
          <Box sx={{ display: 'flow-root' }}>
            <IconButton size="small" aria-label="Cerrar texto completo" title="Cerrar" onClick={close}
              sx={{ p: 0, width: 20, height: 20, float: 'right', ml: '4px' }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Typography variant={preview.variant} component="p"
              sx={{ m: 0, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.25 }}>
              {preview.text}
            </Typography>
          </Box>
        </Popover>
      )}
    </PreviewContext.Provider>
  );
}

export function AcademicPreviewText({ text, lines, variant, onEdit }: {
  text: string;
  lines: number;
  variant: 'caption' | 'body2';
  onEdit?: () => void;
}) {
  const preview = useContext(PreviewContext);
  const ref = useRef<HTMLSpanElement>(null);
  const show = (event?: Event) => {
    if (!ref.current) return;
    const anchor = ref.current.closest<HTMLElement>('[data-academic-card]');
    if (anchor) preview?.request({ text, anchor, variant }, event);
  };
  return (
    <Typography
      ref={ref}
      component="span"
      variant={variant}
      role={preview ? 'button' : undefined}
      tabIndex={preview ? 0 : undefined}
      aria-haspopup={preview ? 'dialog' : undefined}
      onClick={event => { if (event.detail === 1) show(event.nativeEvent); }}
      onKeyDown={event => {
        if (preview && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); event.stopPropagation(); show();
        }
      }}
      onDoubleClick={event => {
        preview?.close();
        if (!onEdit) return;
        event.preventDefault(); event.stopPropagation(); onEdit();
      }}
      title={preview ? `Clic para ver el texto completo${onEdit ? '. Doble clic para editar' : ''}` : onEdit ? 'Doble clic para editar' : undefined}
      sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden',
        wordBreak: 'break-word', lineHeight: 1.25, cursor: preview ? 'pointer' : onEdit ? 'text' : 'inherit',
        borderBottom: onEdit ? '1px dotted transparent' : undefined,
        '&:hover': onEdit ? { borderBottomColor: 'text.secondary' } : undefined }}
    >
      {text}
    </Typography>
  );
}
