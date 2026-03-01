// src/components/CarrerasMenuWrapper.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography, Paper, Popper } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord"; // Viñeta

// Tipos de datos
type Modulo = { id: number; tituloComercial: string };
type Carrera = {
  id: number;
  tituloComercial: string;
  codigo: string | null;
  duracion: number;
  modulos: Modulo[];
};
type Especialidad = {
  id: number;
  tituloComercial: string;
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
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carreras.json");
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
      //sx={{ lineHeight: "0px" }}
      ref={wrapperRef}
      onMouseEnter={() => {
        cancelCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={startCloseTimer}
    >
      <Button color="inherit" ref={anchorRef}>
        Carreras
      </Button>

      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start">
        <Paper sx={{ width: anchoMenu, mt: 1, ml: -20 }}>
          {especialidades.map((esp) => (
            <Box
              key={esp.id}
              onMouseEnter={(e) => handleEspecialidadEnter(e, esp.carreras)}
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#eee" },
              }}
            >
              <Typography noWrap>{esp.tituloComercial}</Typography>
              <ArrowRightIcon fontSize="small" />
            </Box>
          ))}
        </Paper>
      </Popper>

      <Popper open={Boolean(carreras)} anchorEl={anchorCarrera} placement="right-start">
        <Paper sx={{ width: anchoMenu, ml: -1 }}>
          {carreras?.map((car) => (
            <Box
              key={car.id}
              onMouseEnter={(e) => handleCarreraEnter(e, car.modulos)}
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#eee" },
              }}
            >
              <Typography>{car.tituloComercial}</Typography>
              <ArrowRightIcon fontSize="small" />
            </Box>
          ))}

          {modulosSueltos?.map((mod) => (
            <Box
              key={mod.id}
              sx={{
                px: 2,
                py: 1,
                cursor: "default",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              <FiberManualRecordIcon sx={{  alignSelf:'flex-start', mt:1, fontSize: 8 }} />
              <Typography>{mod.tituloComercial}</Typography>
            </Box>
          ))}
        </Paper>
      </Popper>

      <Popper open={Boolean(modulos)} anchorEl={anchorModulo} placement="right-start">
        <Paper sx={{ width: anchoMenu, ml: -1 }}>
          {modulos?.map((mod) => (
            <Box
              key={mod.id}
              sx={{
                px: 2,
                py: 1,
                cursor: "default",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              <FiberManualRecordIcon sx={{ alignSelf:'flex-start', mt:1, fontSize: 8}} />
              <Typography>{mod.tituloComercial}</Typography>
            </Box>
          ))}
        </Paper>
      </Popper>
    </Box>
  );
}
