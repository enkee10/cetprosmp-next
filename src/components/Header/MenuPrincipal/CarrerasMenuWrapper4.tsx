'use client';
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Popper } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import Link from "next/link";
import { cerrarTodosLosMenus } from "./_otros/CerrarTodoMenus";
import NextLink from 'next/link';

import {
  MenuContainer,
  MenuItemBox,
  ModuleItemBox,
  MenuText,
} from "@/components/Header/MenuPrincipal/FullCustomMenu/FullCustomMenu";

type Modulo = { id: number; tituloComercial: string; slug: string };
type Carrera = {
  id: number;
  tituloComercial: string;
  slug: string;
  codigo: string | null;
  duracion: number;
  modulos: Modulo[];
};
type Especialidad = {
  id: number;
  tituloComercial: string;
  slug: string;
  carreras: Carrera[];
};

export default function CarrerasMenuWrapper() {
  const anchoMenu = "256px";

  const [open, setOpen] = useState(false);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[] | null>(null);
  const [modulosSueltos, setModulosSueltos] = useState<Modulo[] | null>(null);
  const [modulos, setModulos] = useState<Modulo[] | null>(null);

  const [anchorCarrera, setAnchorCarrera] = useState<HTMLElement | null>(null);
  const [anchorModulo, setAnchorModulo] = useState<HTMLElement | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carrusel.json");
      const data: Especialidad[] = await res.json();

      const sortedData = data
        .sort((a, b) => a.id - b.id)
        .map((esp) => ({
          ...esp,
          carreras: esp.carreras
            .sort((a, b) => a.id - b.id)
            .map((car) => ({
              ...car,
              modulos: car.modulos.sort((a, b) => a.id - b.id),
            })),
        }));

      setEspecialidades(sortedData);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleCerrarMenus = () => {
      setOpen(false);
      setCarreras(null);
      setModulosSueltos(null);
      setModulos(null);
      setAnchorCarrera(null);
      setAnchorModulo(null);
    };

    window.addEventListener("cerrar-todos-los-menus", handleCerrarMenus);
    return () => {
      window.removeEventListener("cerrar-todos-los-menus", handleCerrarMenus);
    };
  }, []);

  const startCloseTimer = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setCarreras(null);
      setModulosSueltos(null);
      setModulos(null);
      setAnchorCarrera(null);
      setAnchorModulo(null);
    }, 150);
  };

  const cancelCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleEspecialidadEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    carreras: Carrera[]
  ) => {
    setAnchorCarrera(e.currentTarget);

    const carrerasConCodigo = carreras.filter((car) => car.codigo !== null);
    const carrerasSinCodigo = carreras.filter((car) => car.codigo === null);

    const modulos = carrerasSinCodigo
      .flatMap((car) => car.modulos)
      .sort((a, b) => a.id - b.id);

    setCarreras(carrerasConCodigo);
    setModulosSueltos(modulos.length > 0 ? modulos : null);
    setModulos(null);
  };

  const handleCarreraEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    modulos: Modulo[]
  ) => {
    setAnchorModulo(e.currentTarget);
    setModulos(modulos);
  };

  return (
    <Box
      ref={wrapperRef}
      onMouseEnter={() => {
        cancelCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={startCloseTimer}
    >
      <Button
      color="inherit"
      href="/especialidades"
      component={NextLink}
      ref={anchorRef}
      >
        Carreras
      </Button>

      {especialidades.length > 0 && (
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1300 }}>
          <MenuContainer sx={{ ml: -20 }}>
            {especialidades.map((esp) => (
              <Link
                key={esp.id}
                href={`/especialidades/${esp.slug}`}
                style={{ textDecoration: "none" }}
                onClick={cerrarTodosLosMenus}
              >
                <MenuItemBox
                  onMouseEnter={(e) => handleEspecialidadEnter(e, esp.carreras)}
                  iconRight={
                    <ArrowRightIcon fontSize="small" sx={{ mt: 0.5, alignSelf: "flex-start" }} />
                  }
                >
                  <MenuText>{esp.tituloComercial}</MenuText>
                </MenuItemBox>
              </Link>
            ))}
          </MenuContainer>
        </Popper>
      )}

      <Popper open={Boolean(carreras)} anchorEl={anchorCarrera} placement="right-start" sx={{ zIndex: 1300 }}>
        <MenuContainer ancho={anchoMenu} sx={{ mt: 0 }}>
          {carreras?.map((car) => (
            <Link
              key={car.id}
              href={`/carreras/${car.slug}`}
              style={{ textDecoration: "none" }}
              onClick={cerrarTodosLosMenus}
            >
              <MenuItemBox
                onMouseEnter={(e) => handleCarreraEnter(e, car.modulos)}
                iconRight={
                  <ArrowRightIcon fontSize="small" sx={{ mt: 0.5, alignSelf: "flex-start" }} />
                }
              >
                <MenuText>{car.tituloComercial}</MenuText>
              </MenuItemBox>
            </Link>
          ))}

          {modulosSueltos?.map((mod) => (
            <Link
              key={mod.id}
              href={`/modulos/${mod.slug}`}
              style={{ textDecoration: "none" }}
              onClick={cerrarTodosLosMenus}
            >
              <ModuleItemBox>
                <MenuText>{mod.tituloComercial}</MenuText>
              </ModuleItemBox>
            </Link>
          ))}
        </MenuContainer>
      </Popper>

      <Popper open={Boolean(modulos)} anchorEl={anchorModulo} placement="right-start" sx={{ zIndex: 1300 }}>
        <MenuContainer ancho={anchoMenu} sx={{ mt: 0 }}>
          {modulos?.map((mod) => (
            <Link
              key={mod.id}
              href={`/modulos/${mod.slug}`}
              style={{ textDecoration: "none" }}
              onClick={cerrarTodosLosMenus}
            >
              <ModuleItemBox>
                <MenuText>{mod.tituloComercial}</MenuText>
              </ModuleItemBox>
            </Link>
          ))}
        </MenuContainer>
      </Popper>
    </Box>
  );
}
