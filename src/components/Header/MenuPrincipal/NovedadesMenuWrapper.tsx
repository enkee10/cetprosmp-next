'use client';
// src/components/Header/MenuPrincipal/NovedadesMenuWrapper.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Popper } from "@mui/material";
import Link from "next/link";
import NextLink from "next/link"; // usamos NextLink en el Button
import { cerrarTodosLosMenus } from "./_otros/CerrarTodoMenus";

import {
  MenuContainer,
  MenuItemBox,
  MenuText,
} from "@/components/Header/MenuPrincipal/FullCustomMenu/FullCustomMenu";

type NavItem = {
  id: number;
  titulo: string;
  path?: string;
  subitems?: NavItem[];
};

export default function NovedadesMenuWrapper() {
  const anchoMenu = "156px";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NavItem[]>([]);

  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/novedades.json", { cache: "no-store" });
        const data: NavItem[] = await res.json();

        let entries: NavItem[] = [];
        const padre = Array.isArray(data)
          ? data.find((d) => Array.isArray(d.subitems) && d.subitems.length > 0)
          : undefined;

        if (padre?.subitems) {
          entries = padre.subitems;
        } else if (Array.isArray(data)) {
          entries = data.filter((d) => d.path && d.path !== "/publicaciones");
        }

        // Solo Noticias/Eventos/Comunicados en este orden
        const orden = [
          "/publicaciones/noticias",
          "/publicaciones/eventos",
          "/publicaciones/comunicados",
        ];

        setItems(
          entries
            .filter((e) => orden.includes(e.path || ""))
            .sort(
              (a, b) => orden.indexOf(a.path || "") - orden.indexOf(b.path || "")
            )
        );
      } catch {
        setItems([]);
      }
    })();
  }, []);

  useEffect(() => {
    const handleCloseAll = () => setOpen(false);
    window.addEventListener("cerrar-todos-los-menus", handleCloseAll);
    return () => window.removeEventListener("cerrar-todos-los-menus", handleCloseAll);
  }, []);

  const startCloseTimer = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  return (
    <Box
      onMouseEnter={() => {
        cancelCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={startCloseTimer}
    >
      {/* Botón: enlace a la página principal de Publicaciones */}
      <Button
        color="inherit"
        href="/publicaciones"
        component={NextLink}
        ref={anchorRef}
        onClick={cerrarTodosLosMenus}
      >
        Novedades
      </Button>

      {/* Menú: un solo nivel (Noticias / Eventos / Comunicados) */}
      {items.length > 0 && (
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          sx={{ zIndex: 1300 }}
        >
          <MenuContainer ancho={anchoMenu} sx={{ ml: -5 }}>
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.path || "#"}
                onClick={cerrarTodosLosMenus}
                style={{ textDecoration: "none" }}
              >
                <MenuItemBox>
                  <MenuText>{item.titulo}</MenuText>
                </MenuItemBox>
              </Link>
            ))}
          </MenuContainer>
        </Popper>
      )}
    </Box>
  );
}
