// src/components/Apps.tsx

'use client';
import React, { useState, useRef, useEffect } from "react";
import {
  IconButton,
  Popper,
  Box,
  Typography,
  Avatar,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { googleApps } from "./otros/data/googleApps2";

export default function Apps() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const theme = useTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down("md")); // ← detecta md

  // Obtenemos los datos del usuario desde localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const avatarUrl: string = storedUser?.avatar || "";
  const userName: string = storedUser?.name || "Usuario";

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Cierra el menú automáticamente si cambia a pantalla pequeña
  useEffect(() => {
    if (isMediumScreen && open) {
      setOpen(false);
    }
  }, [isMediumScreen, open]);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box ref={anchorRef} sx={{ display: "inline-block" }}>
        {/* Botón con el ícono de apps */}
        <IconButton color="inherit" onClick={handleToggle} component="span">
          <span className="material-symbols-outlined">apps</span>
        </IconButton>

        {/* Popper con la cuadrícula de aplicaciones */}
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-end"
          modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
          sx={{ zIndex: 1300 }}
        >
          <Box
            sx={{
              width: 328,
              maxHeight: 400,
              p: 0.7,
              mt: 0,
              mr: -6,
              bgcolor: "background.paper",
              borderRadius: 6,
              boxShadow: 3,
              overflow: "hidden",
            }}
          >
            {/* Contenedor en forma de cuadrícula */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1.25,
                maxHeight: 350,
                overflowY: "auto",
                py: 1.5,
                px: 1,
                scrollbarGutter: "stable",
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#ccc",
                  borderRadius: 3,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "transparent",
                },
              }}
            >
              {googleApps.map((app) => (
                <Box
                  key={app.name}
                  component="a"
                  href={app.url}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    textDecoration: "none",
                    textAlign: "center",
                    color: "text.primary",
                    "&:hover": {
                      bgcolor: "action.hover",
                      borderRadius: 2,
                    },
                    py: 0.5,
                    px: 1,
                  }}
                  onClick={handleClose}
                >
                  {app.name === "Cuenta" && avatarUrl ? (
                    <Avatar
                      alt={userName}
                      src={avatarUrl}
                      sx={{ width: 40, height: 40, margin: "0 auto" }}
                      imgProps={{
                        referrerPolicy: "no-referrer",
                      }}
                    />
                  ) : (
                    <img
                      src={app.icon}
                      alt={app.name}
                      width={40}
                      height={40}
                      style={{ display: "block", margin: "0 auto" }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      fontSize: "0.87rem",
                      fontWeight: 400,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {app.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
