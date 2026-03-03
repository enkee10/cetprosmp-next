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
import { useAuth } from "@/context/AuthContext";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";

export default function User() {
  const { user, login, logout } = useAuth();
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

  if (!isMounted) return null;

  return (
    <>
      {user ? (
        <>
          <IconButton onClick={handleOpen} color="inherit">
            <Avatar
              alt={user.displayName || "Usuario"}
              src={user.photoURL!}
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

            <Typography
              variant="body2"
              sx={{ color: "white", textAlign: "center", fontWeight: "bold" }}
            >
              {user.email}
            </Typography>
            
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              mb={2}
            >
              <Avatar
                src={user.photoURL!}
                alt={user.displayName!}
                sx={{ width: 64, height: 64, my: 1 }}
              />
              <Typography variant="h6" fontWeight="bold">
                ¡Hola, {user.displayName}!
              </Typography>
            </Box>

            <Box display="flex" justifyContent="center">
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
                  marginBottom: 2,
                  borderRadius: 999,
                  backgroundColor: "gray",
                  color: "white",
                  px: "16px",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "#fff",
                  },
                }}
              >
                Cerrar sesión
              </Button>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

              <Box
                sx={{
                  display: "flex !important",
                  justifyContent: "space-around !important",
                  width: "100%",
                  "& .miTexto": {
                    fontSize: 12,
                    color: "white",
                    opacity: 0.8,
                  },
                }}
              >
                <Typography className="miTexto">Política de Privacidad</Typography>
                <Typography className="miTexto">Condiciones del Servicio</Typography>
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
