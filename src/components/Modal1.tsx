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
}

export default function Modal1({
  open,
  onClose,
  title,
  children,
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

    const handleWheel = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;

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
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      keepMounted
      fullWidth={false}
      maxWidth={false}
      scroll="paper"
      disableScrollLock
      sx={{
        '& .MuiDialog-container': {
          alignItems: { xs: 'stretch', sm: 'center' },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
        },
        '& .MuiDialog-paper': {
          width: 'fit-content',
          maxWidth: 'calc(100vw - 16px)',
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
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
