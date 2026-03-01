'use client';
// src/components/Header/MenuPrincipal/IntranetMenuWrapper.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Popper } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import Link from "next/link";
import { cerrarTodosLosMenus } from "@/components/Header/MenuPrincipal/_otros/CerrarTodoMenus";

import {
  MenuContainer,
  MenuItemBox,
  MenuText,
} from "@/components/Header/MenuPrincipal/FullCustomMenu/FullCustomMenu";

type SubItem = {
  id: number;
  titulo: string;
  slug: string;
};

type Item = {
  id: number;
  titulo: string;
  slug: string;
  contenido?: SubItem[];
};

export default function IntranetMenuWrapper() {
  const anchoMenu = "156px";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [subItems, setSubItems] = useState<SubItem[] | null>(null);
  const [anchorSubMenu, setAnchorSubMenu] = useState<HTMLElement | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/intranet.json");
      const data: Item[] = await res.json();

      const withContent = data
        .filter((item) => item.contenido && item.contenido.length > 0)
        .sort((a, b) => a.id - b.id);

      const withoutContent = data
        .filter((item) => !item.contenido || item.contenido.length === 0)
        .sort((a, b) => a.id - b.id);

      setItems([...withContent, ...withoutContent]);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleCerrarMenus = () => {
      setOpen(false);
      setSubItems(null);
      setAnchorSubMenu(null);
    };

    window.addEventListener("cerrar-todos-los-menus", handleCerrarMenus);
    return () => {
      window.removeEventListener("cerrar-todos-los-menus", handleCerrarMenus);
    };
  }, []);

  const startCloseTimer = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setSubItems(null);
      setAnchorSubMenu(null);
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
    contenido?: SubItem[]
  ) => {
    if (contenido && contenido.length > 0) {
      setAnchorSubMenu(e.currentTarget);
      setSubItems([...contenido].sort((a, b) => a.id - b.id));
    } else {
      setSubItems(null);
      setAnchorSubMenu(null);
    }
  };

  return (
    <Box
      ref={wrapperRef}
      onMouseEnter={() => {
        cancelCloseTimer();
        if (items.length > 0) setOpen(true);
      }}
      onMouseLeave={startCloseTimer}
    >
      <Button color="inherit" ref={anchorRef}>
        Intranet
      </Button>

      {items.length > 0 && (
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1300 }}>
          <MenuContainer ancho={anchoMenu} sx={{ ml: -5 }}>
            {items.map((item) =>
              item.contenido && item.contenido.length > 0 ? (
                <MenuItemBox
                  key={item.id}
                  onMouseEnter={(e) => handleItemEnter(e, item.contenido)}
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
                <Link
                  key={item.id}
                  href={`/intranet/${item.slug}`}
                  onClick={cerrarTodosLosMenus}
                  style={{ textDecoration: "none" }}
                >
                  <MenuItemBox>
                    <MenuText>{item.titulo}</MenuText>
                  </MenuItemBox>
                </Link>
              )
            )}
          </MenuContainer>
        </Popper>
      )}

      {subItems && (
        <Popper open anchorEl={anchorSubMenu} placement="right-start" sx={{ zIndex: 1300 }}>
          <MenuContainer sx={{ mt: 0 }}>
            {subItems.map((sub) => (
              <Link
                key={sub.id}
                href={`/intranet/${sub.slug}`}
                onClick={cerrarTodosLosMenus}
                style={{ textDecoration: "none" }}
              >
                <MenuItemBox>
                  <MenuText>{sub.titulo}</MenuText>
                </MenuItemBox>
              </Link>
            ))}
          </MenuContainer>
        </Popper>
      )}
    </Box>
  );
}
