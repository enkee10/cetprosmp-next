// src/components/Header/MenuPrincipal/MenuPrincipal.tsx
"use client";
import { Box, Button, styled } from "@mui/material";
import InicioMenuWrapper from "./InicioMenuWrapper";
import NosotrosMenuWrapper from "./NosotrosMenuWrapper";
import CarrerasMenuWrapper from "./CarrerasMenuWrapper4";
import NovedadesMenuWrapper from "./NovedadesMenuWrapper";
import MatriculaMenuWrapper from "./MatriculaMenuWrapper";
import IntranetMenuWrapper from "./IntranetMenuWrapper";
import { useAuth } from "@/context/AuthContext"; // asegúrate que esta ruta es correcta

const MenuBox = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: "none",
  justifyContent: "center",
  gap: theme.spacing(1),
  flexWrap: "wrap",

  [theme.breakpoints.up("md")]: {
    display: "flex",
    "& button, a": {
      display: "inline-flex",
      alignItems: "flex-start",
      //alignItems: "center",
      paddingLeft: theme.spacing(0.7),
      paddingRight: theme.spacing(0.7),
      paddingTop: 0,
      paddingBottom: 0,
      minWidth: "auto",
      height: "1.2rem",
      transform: "translateY(-2px)",
    },
  },

  [theme.breakpoints.up("lg")]: {
    "& button a": {
      //display: "inline-flex",
      alignItems: "center",
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(2),
      transform: "translateY(1px)",
    },
  },
}));

export default function MenuPrincipal() {
  const { user } = useAuth();

  return (
    <MenuBox>
      <InicioMenuWrapper />
      <CarrerasMenuWrapper />
      <NosotrosMenuWrapper />
      <NovedadesMenuWrapper />
      <MatriculaMenuWrapper />
      {user && <IntranetMenuWrapper />}
    </MenuBox>
  );
}
