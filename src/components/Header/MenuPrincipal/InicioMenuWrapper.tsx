'use client';
// src/components/InicioMenuWrapper.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Popper } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import NextLink from "next/link";
import { cerrarTodosLosMenus } from "@/components/Header/MenuPrincipal/_otros/CerrarTodoMenus";

// Componentes personalizados
import {
  MenuContainer,
  MenuItemBox,
  MenuText,
} from "@/components/Header/MenuPrincipal/FullCustomMenu/FullCustomMenu";

// Tipos
type SubItem = { id: number; titulo: string; slug: string };
type Item = { id: number; titulo: string; slug: string; subitems?: SubItem[] };

export default function InicioMenuWrapper() {
  const anchoMenu = "256px";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [subitems, setSubitems] = useState<SubItem[] | null>(null);
  const [anchorSubmenu, setAnchorSubmenu] = useState<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/inicio.json");
      const data: Item[] = await res.json();

      const conSubitems = data
        .filter((i) => i.subitems && i.subitems.length > 0)
        .sort((a, b) => a.id - b.id);

      const sinSubitems = data
        .filter((i) => !i.subitems || i.subitems.length === 0)
        .sort((a, b) => a.id - b.id);

      setItems([...conSubitems, ...sinSubitems]);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleCloseAllMenus = () => {
      setOpen(false);
      setSubitems(null);
      setAnchorSubmenu(null);
    };

    window.addEventListener("cerrar-todos-los-menus", handleCloseAllMenus);
    return () => {
      window.removeEventListener("cerrar-todos-los-menus", handleCloseAllMenus);
    };
  }, []);

  const startCloseTimer = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setSubitems(null);
      setAnchorSubmenu(null);
    }, 150);
  };

  const cancelCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleItemEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    subitems?: SubItem[]
  ) => {
    if (subitems && subitems.length > 0) {
      setAnchorSubmenu(e.currentTarget);
      setSubitems([...subitems].sort((a, b) => a.id - b.id));
    } else {
      setSubitems(null);
      setAnchorSubmenu(null);
    }
  };

  return (
    <Box
      ref={wrapperRef}
      onMouseEnter={() => {
        if (items.length > 0) {
          cancelCloseTimer();
          setOpen(true);
        }
      }}
      onMouseLeave={startCloseTimer}
    >
      <Button
        color="inherit"
        href="/"
        component={NextLink}
        ref={anchorRef}
      >
        Inicio
      </Button>

      {items.length > 0 && (
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1300 }}>
          <MenuContainer sx={{ ml: -12 }} ancho={anchoMenu}>
            {items.map((item) =>
              item.subitems && item.subitems.length > 0 ? (
                <MenuItemBox
                  key={item.id}
                  onMouseEnter={(e) => handleItemEnter(e, item.subitems)}
                  iconRight={
                    <ArrowRightIcon
                      fontSize="small"
                      sx={{ mt: 0.5, alignSelf: "flex-start" }}
                    />
                  }
                >
                  <MenuText>{item.titulo}</MenuText>
                </MenuItemBox>
              ) : (
                <NextLink
                  key={item.id}
                  href={`/inicio/${item.slug}`}
                  onClick={cerrarTodosLosMenus}
                  style={{ textDecoration: "none" }}
                >
                  <MenuItemBox>
                    <MenuText>{item.titulo}</MenuText>
                  </MenuItemBox>
                </NextLink>
              )
            )}
          </MenuContainer>
        </Popper>
      )}

      {subitems && (
        <Popper open anchorEl={anchorSubmenu} placement="right-start" sx={{ zIndex: 1300 }}>
          <MenuContainer sx={{ mt: 0 }}>
            {subitems.map((sub) => (
              <NextLink
                key={sub.id}
                href={`/inicio/${sub.slug}`}
                onClick={cerrarTodosLosMenus}
                style={{ textDecoration: "none" }}
              >
                <MenuItemBox>
                  <MenuText>{sub.titulo}</MenuText>
                </MenuItemBox>
              </NextLink>
            ))}
          </MenuContainer>
        </Popper>
      )}
    </Box>
  );
}
