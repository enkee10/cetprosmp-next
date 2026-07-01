'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Modal1Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number | 'sm' | 'md' | 'lg' | (string & {});
  disableAutoFocus?: boolean;
  disableEnforceFocus?: boolean;
}

const MODAL_WIDTH_PRESETS = {
  sm: '560px',
  md: '720px',
  lg: '1000px',
} as const;

export default function Modal1({
  open,
  onClose,
  title,
  children,
  maxWidth = 1000,
  disableAutoFocus = false,
  disableEnforceFocus = false,
}: Modal1Props) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const prevBodyUserSelectRef = useRef<string>('');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const modalMaxWidth =
    typeof maxWidth === 'number'
      ? `${maxWidth}px`
      : MODAL_WIDTH_PRESETS[maxWidth as keyof typeof MODAL_WIDTH_PRESETS] ?? maxWidth;

  useEffect(() => {
    if (open) {
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
      dragStartRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      const deltaX = event.clientX - start.pointerX;
      const deltaY = event.clientY - start.pointerY;

      setDragOffset({
        x: start.originX + deltaX,
        y: start.originY + deltaY,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.body.style.userSelect = prevBodyUserSelectRef.current;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  const handleTitlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    event.preventDefault();
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };
    prevBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    setIsDragging(true);
  };

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const getScrollableTarget = (target: EventTarget | null) => {
      let element = target instanceof Element ? target : null;

      while (element && container.contains(element)) {
        const style = window.getComputedStyle(element);
        const canScrollY =
          /(auto|scroll|overlay)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight;

        if (canScrollY) {
          return element as HTMLElement;
        }

        element = element.parentElement;
      }

      return container;
    };

    const handleWheel = (event: WheelEvent) => {
      const scrollTarget = getScrollableTarget(event.target);
      const { scrollTop, scrollHeight, clientHeight } = scrollTarget;

      // Si no hay overflow, bloqueamos para que no “caiga” al scroll de fondo.
      if (scrollHeight <= clientHeight) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const scrollingUp = event.deltaY < 0;
      const scrollingDown = event.deltaY > 0;

      if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (scrollTarget !== container) {
        event.stopPropagation();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      keepMounted
      fullWidth={false}
      maxWidth={false}
      scroll="paper"
      disableScrollLock
      disableAutoFocus={disableAutoFocus}
      disableEnforceFocus={disableEnforceFocus}
      sx={{
        '& .MuiDialog-container': {
          alignItems: { xs: 'stretch', sm: 'center' },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
        },
        '& .MuiDialog-paper': {
          width: { xs: 'calc(100vw - 16px)', sm: `min(${modalMaxWidth}, calc(100vw - 32px))` },
          maxWidth: { xs: 'calc(100vw - 16px)', sm: `min(${modalMaxWidth}, calc(100vw - 32px))` },
          maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 32px)' },
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          transition: isDragging ? 'none' : undefined,
          m: 0,
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          onPointerDown={handleTitlePointerDown}
          sx={{
            minHeight: 56,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        >
          <Typography variant="h6">{title}</Typography>
          <IconButton aria-label="Cerrar" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        ref={contentRef}
        sx={{
          p: 2,
          width: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
