// src/components/SidebarUserInfo.tsx
import React from "react";
import {
  Box,
  Avatar,
  Typography,
  Button,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useUser } from "../../context/UserContext";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

export default function SidebarUserInfo() {
  const { user, setUser, logout } = useUser();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const resGoogle = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const googleUser = resGoogle.data;
        // API base URL from environment variable
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
          src={user.avatar}
          alt={user.nombre || user.nombres}
          sx={{ width: 48, height: 48 }}
          imgProps={{ referrerPolicy: "no-referrer" }}
        />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {user.nombre || user.nombres}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.cargo || "—"}
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
