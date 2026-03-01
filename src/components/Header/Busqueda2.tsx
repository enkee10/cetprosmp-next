'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  IconButton,
  Box,
  TextField,
  ClickAwayListener,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

interface BusquedaProps {
  onOpenChange?: (open: boolean) => void;
}

const Busqueda = ({ onOpenChange }: BusquedaProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null); // referencia al input real

  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const isXlDown = useMediaQuery(theme.breakpoints.down('xl'));

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false); // solo cerrar, no limpiar
  };

  const handleCloseAndClear = () => {
    setQuery('');   // limpiar texto
    setOpen(false); // cerrar
    
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBuscar = () => {
    console.log('Buscar:', query);
    //handleClose();
  };

  // Notifica al padre y coloca el foco en el input al abrir
  useEffect(() => {
    onOpenChange?.(open);
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, onOpenChange]);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box
        ref={anchorRef}
        sx={{
          display: 'inline-block',
          position: 'relative',
          padding: 0,
          margin: 0,
        }}
      >
        {/* Botón de búsqueda principal */}
        <IconButton color="inherit" onClick={handleToggle}>
          <SearchIcon />
        </IconButton>

        {/* Menú flotante encima del botón */}
        {open && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 9999,
            }}
          >
            <Paper
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'transparent',
                boxShadow: 'none',
              }}
            >
              <IconButton
                onClick={handleCloseAndClear}
                sx={{ color: 'white', bgcolor: '#1976d2' }}
              >
                <CloseIcon />
              </IconButton>

              <TextField
                inputRef={inputRef}
                size="small"
                variant="outlined"
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 6,
                  width: isMdDown
                    ? 'calc(100vw - 96px)'
                    : isXlDown
                    ? 'calc(100vw - 490px)'
                    : '700px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 6,
                    height: '40px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '8px 14px',
                  },
                }}
              />

              <IconButton onClick={handleBuscar} sx={{ color: 'white', bgcolor: '#1976d2' }}>
                <SearchIcon />
              </IconButton>
            </Paper>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default Busqueda;
