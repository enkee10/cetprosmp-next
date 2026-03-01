'use client'
// src/components/User.tsx
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Popper,
  Typography,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState, useRef, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useUser } from "../../context/UserContext";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";

export default function User() {
  const { user, setUser, logout } = useUser();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  // API base URL from environment variable
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

  const theme = useTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const resGoogle = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const googleUser = resGoogle.data;

        const resStrapi = await axios.post(
          `${API_BASE}/api/google-sync`,
          {
            email: googleUser.email,
            name: {
              givenName: googleUser.given_name,
              familyName: googleUser.family_name,
            },
            picture: googleUser.picture,
          }
        );

        const { user: userData, token } = resStrapi.data;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("jwt", token);
      } catch (error) {
        console.error("❌ Error en login o sincronización:", error);
      }
    },
    onError: () => console.error("❌ Error al iniciar sesión con Google"),
    flow: "implicit",
  });

  if (!isMounted) return null;

  return (
    <>
      {user ? (
        <ClickAwayListener onClickAway={handleClose}>
          <Box ref={anchorRef} sx={{ display: "inline-block" }}>
            <IconButton onClick={handleToggle} color="inherit">
              <Avatar
                alt={user.nombre || user.nombres || "Usuario"}
                src={user.avatar}
                sx={{ width: 32, height: 32 }}
                imgProps={{ referrerPolicy: "no-referrer" }}
              />
            </IconButton>

            <Popper
              open={open}
              anchorEl={anchorRef.current}
              placement="bottom-end"
              modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
              sx={{ zIndex: 1300 }}
            >
              <Box
                sx={{
                  width: 320,
                  borderRadius: 6,
                  mt: -0.5,
                  p: 2,
                  bgcolor: "#fff",
                  color: "rgba(0, 0, 0, 0.87)",
                  position: "relative",
                  boxShadow: 3,
                }}
              >
                <IconButton
                  size="small"
                  onClick={handleClose}
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    color: "rgba(0, 0, 0, 0.87)",
                    bgcolor: "rgba(255, 255, 255, 0.514)",
                    "&:hover": {
                      bgcolor: "rgba(228, 228, 228, 0.523)",
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(0, 0, 0, 0.87)",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {user.email}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(0, 0, 0, 0.87)", mb: 3, textAlign: "center" }}
                >
                  {user.cargo || "—"}
                </Typography>

                <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                  <Avatar
                    src={user.avatar}
                    alt={user.nombre || user.nombres}
                    sx={{ width: 64, height: 64, mb: 1 }}
                    imgProps={{ referrerPolicy: "no-referrer" }}
                  />
                  <Typography variant="h6" fontWeight="bold">
                    ¡Hola, {user.nombre || user.nombres}!
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="center">
                  <Button
                    variant="outlined"
                    href="https://accounts.google.com/AccountChooser?continue=https://myaccount.google.com"
                    target="_blank"
                    sx={{
                      borderRadius: 999,
                      textTransform: "none",
                      borderColor: "rgba(0, 0, 0, 0.87)",
                      color: "rgba(0, 0, 0, 0.87)",
                      "&:hover": {
                        bgcolor: "rgba(176, 176, 176, 0.208)",
                        borderColor: "#6a6a6a87",
                      },
                    }}
                  >
                    Administrar tu Cuenta de Google
                  </Button>
                </Box>

                <Box mt={2} display="flex" justifyContent="center" flexWrap="wrap">
                  <Button
                    onClick={() => {
                      logout();
                      handleClose();
                    }}
                    variant="text"
                    startIcon={<LogoutIcon />}
                    sx={{
                      fontWeight: "bold",
                      textTransform: "none",
                      opacity: 0.8,
                      mb: 2,
                      borderRadius: 999,
                      bgcolor: "#1076dc",
                      color: "white",
                      px: "16px",
                      "&:hover": {
                        bgcolor: "#0051a1",
                        borderColor: "#fff",
                      },
                    }}
                  >
                    Cerrar sesión
                  </Button>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-around",
                      width: "100%",
                      "& .miTexto": {
                        fontSize: 12,
                        color: "rgb(0, 0, 0)",
                        opacity: 0.8,
                      },
                    }}
                  >
                    <Typography className="miTexto">Política de Privacidad</Typography>
                    <Typography className="miTexto">Condiciones del Servicio</Typography>
                  </Box>
                </Box>
              </Box>
            </Popper>
          </Box>
        </ClickAwayListener>
      ) : (
        <Button
          onClick={() => login()}
          sx={{
            backgroundColor: "#cceeff",
            color: "black",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "999px",
            px: 1.2,
            py: 0.5,
            ml: "8px",
            whiteSpace: "nowrap",
            minWidth: "auto",
            letterSpacing: "0",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#b3e6ff",
              boxShadow: "none",
            },
          }}
        >
          Iniciar sesión
        </Button>
      )}
    </>
  );
}
