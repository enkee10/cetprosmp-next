import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useUser } from "../../../context/UserContext";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout"; // asegúrate de importar esto

export default function User() {
  const { user, setUser, logout } = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';


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
        <>
          <IconButton onClick={handleOpen} color="inherit">
            <Avatar
              alt={user.nombre || user.nombres || "Usuario"}
              src={user.avatar}
              sx={{ width: 32, height: 32 }}
            />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              sx: {
                width: 320,
                borderRadius: 6,
                padding: 2,
                backgroundColor: "#1e1e1e",
                color: "#fff",
                position: "relative",
                boxShadow: 3,
              },
            }}
            MenuListProps={{
              sx: {
                paddingTop: 0,
                paddingBottom: 0,
              },
            }}
          >
            {/* Boton Cerrar */}
            <Box display="flex" alignSelf="flex-end">
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.2)",
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Correo y rol */}
            <Typography
              variant="body2"
              sx={{ color: "white", textAlign: "center", fontWeight: "bold" }}
            >
              {user.email}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "white", mb: 3, textAlign: "center" }}
            >
              {user.cargo || "—"}
            </Typography>

            {/* Avatar, saludo y nombre */}
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              mb={2}
            >
              <Avatar
                src={user.avatar}
                alt={user.nombre || user.nombres}
                sx={{ width: 64, height: 64, mb: 1 }}
              />
              <Typography variant="h6" fontWeight="bold">
                ¡Hola, {user.nombre || user.nombres}!
              </Typography>
            </Box>

            {/* Botón para cuenta */}
            <Box display= "flex"
                  justifyContent="center">
              <Button
                variant="outlined"
                href="https://myaccount.google.com"
                target="_blank"
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  borderColor: "rgba(255,255,255,0.3)",
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "#fff",
                  },
                }}
              >
                Administrar tu Cuenta de Google
              </Button>
            </Box>
            {/* Botón cerrar sesión */}
            <Box mt={2} display= "flex"
                  justifyContent="center" flexWrap="wrap">
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
                  opacity:0.8,
                  marginBottom: 2,
                  borderRadius:999,
                  backgroundColor:"gray",
                  color:"white",
                  px:"16px",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "#fff",
                  },
                }}
              >
                Cerrar sesión
              </Button>

              {/* Divisor */}
              <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

              {/* Footer */}
              <Box
                sx={{
                  display:"flex !important",
                  justifyContent:"space-around !important",
                  width:"100%",
                  "& .miTexto": {
                    fontSize: 12,
                    color: "white",
                    opacity: 0.8,
                  },
                }}
              >
                <Typography className="miTexto">
                  Política de Privacidad
                </Typography>
                <Typography className="miTexto">
                  Condiciones del Servicio
                </Typography>
              </Box>
            </Box>
          </Menu>
        </>
      ) : (
        <Button
          onClick={() => login()}
          sx={{
            backgroundColor: "#cceeff",
            color: "black",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "999px",
            paddingX: 1.2,
            paddingY: 0.5,
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
