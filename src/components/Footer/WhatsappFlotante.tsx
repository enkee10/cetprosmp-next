'use client';

import { Box, Button, Fade, Popper, Typography } from '@mui/material';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const numero = '51015346663';
const mensaje = 'Hola, quisiera más información sobre los cursos que se dictan.';
const encodedMensaje = encodeURIComponent(mensaje);

// ✅ Detecta si es móvil
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// ✅ Genera enlace según dispositivo
const getWhatsAppLink = () =>
  isMobile()
    ? `whatsapp://send?phone=${numero}&text=${encodedMensaje}`
    : `https://web.whatsapp.com/send?phone=${numero}&text=${encodedMensaje}`;

const WhatsappFlotante = () => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popperRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = () => setOpen((prev) => !prev);

  // ✅ Cierra al alejarse por arriba o derecha (salvo si está sobre el menú)
  const handleMouseMove = (event: MouseEvent) => {
    if (!open || !anchorRef.current || !popperRef.current) return;

    const iconRect = anchorRef.current.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const distanceTop = iconRect.top - mouseY;
    const distanceRight = mouseX - iconRect.right;

    const isInsidePopper = popperRef.current.contains(event.target as Node);

    if ((distanceTop > 75 || distanceRight > 75) && !isInsidePopper) {
      setOpen(false);
    }
  };

  // ✅ Cierra al hacer clic fuera
  const handleClickOutside = (event: MouseEvent) => {
    if (!anchorRef.current || anchorRef.current.contains(event.target as Node)) return;
    if (popperRef.current && popperRef.current.contains(event.target as Node)) return;
    setOpen(false);
  };

  // ✅ Cierra al hacer scroll
  const handleScroll = () => setOpen(false);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [open]);

  // ✅ Enlace fijo para QR (funciona en móviles)
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `https://wa.me/${numero}?text=${encodedMensaje}`
  )}`;

  return (
    <Box
      ref={anchorRef}
      sx={{
        position: 'fixed',
        bottom: { xs: 20, lg: 40 },
        left: { xs: 20, lg: 40 },
        zIndex: 200,
      }}
    >
      {/* ✅ Botón flotante de WhatsApp */}
      <Button
        onClick={handleToggle}
        sx={{
          minWidth: 0,
          p: 0,
          borderRadius: '50%',
          bgcolor: '#d32525',
          '&:hover': { bgcolor: '#231ebe' },
        }}
      >
        <Box
          component="img"
          src="/imagenes/redes_sociales/whatsapp.png"
          alt="WhatsApp"
          sx={{ width:{xs:'42px',md:'60px'}, height:{xs:'42px',md:'60px'}}}
        />
      </Button>

      {/* ✅ Menú emergente con QR y botón */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="top-start"
        transition
        sx={{ zIndex: 200 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 20],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={250}>
            <Box
              ref={popperRef}
              sx={{
                bgcolor: 'white',
                color: 'black',
                p: 2,
                borderRadius: 2,
                boxShadow: 4,
                width: 240,
                textAlign: 'center',
                position: 'relative',
                zIndex: 200,
              }}
            >
              {/* ✅ Triángulo decorativo */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  left: 16,
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '10px solid white',
                }}
              />

              <Typography variant="body2" gutterBottom>
                Escanea en tu celular
              </Typography>

              <Image src={qrURL} alt="QR WhatsApp" width={200} height={200} />

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 1 }}
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)} // ✅ Cierra al hacer clic en el botón
              >
                ó Inicia Whatsappweb
              </Button>
            </Box>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default WhatsappFlotante;
