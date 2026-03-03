// src/components/SidebarUserInfo.tsx
import React from "react";
import {
  Box,
  Avatar,
  Typography,
  Button,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/context/AuthContext";

export default function SidebarUserInfo() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return (
      <Box p={2}>
        <Button
          onClick={() => login()}
          fullWidth
          variant="contained"
          sx={{
            backgroundColor: "#1076dc",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "#0051a1",
            },
          }}
        >
          Iniciar sesión
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" p={2} gap={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          src={user.photoURL!}
          alt={user.displayName!}
          sx={{ width: 48, height: 48 }}
          imgProps={{ referrerPolicy: "no-referrer" }}
        />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {user.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      </Box>

      <Button
        onClick={() => logout()}
        fullWidth
        startIcon={<LogoutIcon />}
        sx={{
          fontWeight: "bold",
          textTransform: "none",
          borderRadius: 2,
          backgroundColor: "#1076dc",
          color: "white",
          "&:hover": {
            backgroundColor: "#0051a1",
          },
        }}
      >
        Cerrar sesión
      </Button>
    </Box>
  );
}
