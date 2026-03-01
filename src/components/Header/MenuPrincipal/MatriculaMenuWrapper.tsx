'use client';
// src/components/MatriculaMenuWrapper.tsx
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

type SubItem = { id: number; titulo: string; slug: string };
type Item = {
  id: number;
  titulo: string;
  slug: string;
  subitems?: SubItem[];
};

export default function MatriculaMenuWrapper() {
  const anchoMenu = "156px";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [subItems, setSubItems] = useState<SubItem[] | null>(null);
  const [anchorSub, setAnchorSub] = useState<HTMLElement | null>(null);

  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/matricula.json");
        const data: Item[] = await res.json();

        const conContenido = data
          .filter((i) => i.subitems && i.subitems.length > 0)
          .sort((a, b) => a.id - b.id);

        const sinContenido = data
          .filter((i) => !i.subitems || i.subitems.length === 0)
          .sort((a, b) => a.id - b.id);

        setItems([...conContenido, ...sinContenido]);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleCloseAllMenus = () => {
      setOpen(false);
      setSubItems(null);
      setAnchorSub(null);
    };

    window.addEventListener("cerrar-todos-los-menus", handleCloseAllMenus);
    return () => {
      window.removeEventListener("cerrar-todos-los-menus", handleCloseAllMenus);
    };
  }, []);

  const startCloseTimer = () => {
    timerRef.current = setTimeout(() => {
      setOpen(false);
      setSubItems(null);
      setAnchorSub(null);
    }, 150);
  };

  const cancelCloseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    subitems?: SubItem[]
  ) => {
    if (subitems && subitems.length > 0) {
      setAnchorSub(e.currentTarget);
      setSubItems([...subitems].sort((a, b) => a.id - b.id));
    } else {
      setAnchorSub(null);
      setSubItems(null);
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
        Matrícula
      </Button>

      {items.length > 0 && (
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1300 }}>
          <MenuContainer ancho={anchoMenu} sx={{ ml: -5 }}>
            {items.map((item) =>
              item.subitems && item.subitems.length > 0 ? (
                <MenuItemBox
                  key={item.id}
                  onMouseEnter={(e) => handleMouseEnter(e, item.subitems)}
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
                  href={`/matricula/${item.slug}`}
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

      <Popper open={Boolean(subItems)} anchorEl={anchorSub} placement="right-start" sx={{ zIndex: 1300 }}>
        <MenuContainer sx={{ mt: 0 }}>
          {subItems?.map((sub) => (
            <Link
              key={sub.id}
              href={`/matricula/${sub.slug}`}
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
    </Box>
  );
}
