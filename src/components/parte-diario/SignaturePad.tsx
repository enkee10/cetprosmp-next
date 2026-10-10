'use client';
import { useEffect, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { croppedSignature } from '@/lib/parteDiario';

export default function SignaturePad({ initialValue, onChange, disabled }: { initialValue: string | null; onChange: (value: string | null) => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), drawing = useRef(false);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const context = element.getContext('2d')!; context.clearRect(0, 0, element.width, element.height);
    let cancelled = false;
    if (initialValue) {
      const image = new Image(); image.onload = () => {
        if (cancelled) return;
        const scale = Math.min((element.width - 48) / image.width, (element.height - 48) / image.height, 1);
        const width = image.width * scale, height = image.height * scale;
        context.drawImage(image, (element.width - width) / 2, (element.height - height) / 2, width, height);
      }; image.src = initialValue;
    }
    return () => { cancelled = true; };
  }, [initialValue]);
  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget, rect = element.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * element.width / rect.width, y: (event.clientY - rect.top) * element.height / rect.height };
  };
  const finish = () => { if (!drawing.current) return; drawing.current = false; if (canvas.current) onChange(croppedSignature(canvas.current)); };
  return <Stack gap={1}>
    <Typography fontWeight={600}>Firma</Typography>
    <Box component="canvas" ref={canvas} width={920} height={480} aria-label="Recuadro para dibujar la firma"
      sx={{ width: '11.5cm', maxWidth: '100%', height: 'auto', aspectRatio: '11.5 / 6', bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1, touchAction: 'none', cursor: disabled ? 'default' : 'crosshair' }}
      onPointerDown={event => {
        if (disabled || event.button !== 0) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true;
        const p = position(event), context = event.currentTarget.getContext('2d')!;
        context.lineWidth = 3.2; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#152235'; context.fillStyle = '#152235';
        context.beginPath(); context.arc(p.x, p.y, 1.6, 0, Math.PI * 2); context.fill(); context.beginPath(); context.moveTo(p.x, p.y);
      }}
      onPointerMove={event => { if (!drawing.current || disabled) return; const p = position(event), context = event.currentTarget.getContext('2d')!; context.lineTo(p.x, p.y); context.stroke(); }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />
    <Button startIcon={<ClearIcon />} disabled={disabled} sx={{ alignSelf: 'flex-start' }} onClick={() => { canvas.current?.getContext('2d')?.clearRect(0, 0, 920, 480); onChange(null); }}>Limpiar firma</Button>
  </Stack>;
}
