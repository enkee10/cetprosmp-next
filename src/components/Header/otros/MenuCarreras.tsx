import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Popper, ClickAwayListener } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";

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

type Props = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  open: boolean;
};

export default function MenuCarreras({ anchorEl, open, onClose }: Props) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[] | null>(null);
  const [modulos, setModulos] = useState<Modulo[] | null>(null);
  const [anchorCarrera, setAnchorCarrera] = useState<HTMLElement | null>(null);
  const [anchorModulo, setAnchorModulo] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carreras.json");
      const data = await res.json();
      setEspecialidades(data);
    };
    fetchData();
  }, []);

  const handleEspecialidadEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    carreras: Carrera[]
  ) => {
    setAnchorCarrera(e.currentTarget);
    setCarreras(carreras);
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
    <ClickAwayListener onClickAway={onClose}>
      <Box sx={{ zIndex: 1300, position: "relative" }}>
        {/* Menú de especialidades */}
        {open && anchorEl && (
          <Popper open anchorEl={anchorEl} placement="bottom-start">
            <Paper sx={{ width: 240, mt: 1.6, ml: -18 }}>
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
        )}

        {/* Carreras */}
        <Popper open={Boolean(carreras)} anchorEl={anchorCarrera} placement="right-start">
          <Paper sx={{ width: 240 }}>
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
          </Paper>
        </Popper>

        {/* Módulos */}
        <Popper open={Boolean(modulos)} anchorEl={anchorModulo} placement="right-start">
          <Paper sx={{ width: 240 }}>
            {modulos?.map((mod) => (
              <Box
                key={mod.id}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: "default",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <Typography>{mod.tituloComercial}</Typography>
              </Box>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
