// src/components/Settings.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  IconButton,
  Paper,
  Popper,
  ClickAwayListener,
  MenuItem,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Settings() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<null | HTMLElement>(null);

  const theme = useTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (isMediumScreen && open) {
      setOpen(false);
    }
  }, [isMediumScreen, open]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Botón con ícono de configuración */}
      <IconButton component="span" color="inherit" ref={anchorRef} onClick={handleToggle}>
        <SettingsIcon />
      </IconButton>

      {/* Menú tipo Popper personalizado */}
      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end" sx={{ zIndex: 1300 }}>
        <ClickAwayListener onClickAway={handleClose}>
          <Paper elevation={4} sx={{ mt: 0, mr: 0, minWidth: 180 }}>
            <Box>
              <MenuItem onClick={handleClose}>Claros</MenuItem>
              <MenuItem onClick={handleClose}>Oscuro</MenuItem>
              <MenuItem onClick={handleClose}>Institucional</MenuItem>
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
