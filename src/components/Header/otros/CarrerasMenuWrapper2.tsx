// src/components/CarrerasMenuWrapper.tsx
// Importaciones de React y componentes MUI
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography, Paper, Popper } from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";

// Tipos para los datos que se mostrarán en el menú
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
  //Ancho de menu
  const anchoMenu = '250px';
  // Estado que controla si el menú principal (especialidades) está abierto
  const [open, setOpen] = useState(false);

  // Estados para almacenar los datos cargados del archivo JSON
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[] | null>(null);
  const [modulos, setModulos] = useState<Modulo[] | null>(null);

  // Elementos que se usarán como referencia para anclar los Popper secundarios
  const [anchorCarrera, setAnchorCarrera] = useState<HTMLElement | null>(null);
  const [anchorModulo, setAnchorModulo] = useState<HTMLElement | null>(null);

  // Referencias del DOM
  const wrapperRef = useRef<HTMLDivElement | null>(null); // contenedor general
  const anchorRef = useRef<HTMLButtonElement | null>(null); // botón Carreras
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // temporizador para cierre automático

  // Al montar el componente, se carga el archivo JSON con la jerarquía de datos
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carreras.json");
      const data = await res.json();
      setEspecialidades(data);
    };
    fetchData();
  }, []);

  // Inicia un temporizador que cerrará todo el menú tras cierto tiempo
  const startCloseTimer = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setCarreras(null);
      setModulos(null);
      setAnchorCarrera(null);
      setAnchorModulo(null);
    }, 150); // 150ms de espera antes de cerrar
  };

  // Cancela el temporizador de cierre si el mouse vuelve a entrar
  const cancelCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // Cuando el mouse entra a una especialidad, se muestran sus carreras
  const handleEspecialidadEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    carreras: Carrera[]
  ) => {
    setAnchorCarrera(e.currentTarget); // ancla Popper de carreras
    setCarreras(carreras);            // muestra carreras de esta especialidad
    setModulos(null);                 // oculta módulos si se cambia de especialidad
  };

  // Cuando el mouse entra a una carrera, se muestran sus módulos
  const handleCarreraEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    modulos: Modulo[]
  ) => {
    setAnchorModulo(e.currentTarget); // ancla Popper de módulos
    setModulos(modulos);              // muestra módulos de esta carrera
  };

  return (
    <Box
      sx={{ lineHeight: "0px" }} // opcional: evita que se cree espacio vertical innecesario
      ref={wrapperRef}
      onMouseEnter={() => {
        cancelCloseTimer();     // si el mouse entra, se cancela el cierre automático
        setOpen(true);          // se abre el menú
      }}
      onMouseLeave={startCloseTimer} // al salir completamente del menú, empieza cierre
    >
      {/* Botón que actúa como disparador y ancla del Popper principal */}
      <Button color="inherit" ref={anchorRef}>
        Carreras
      </Button>

      {/* Popper: Menú de Especialidades */}
      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start">
        <Paper sx={{ width: anchoMenu, mt: 1.6, ml: -18 }}>
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

      {/* Popper: Menú de Carreras (submenú al pasar sobre una especialidad) */}
      <Popper
        open={Boolean(carreras)}
        anchorEl={anchorCarrera}
        placement="right-start"
      >
        <Paper sx={{ width: anchoMenu }}>
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

      {/* Popper: Menú de Módulos (tercer nivel, al pasar sobre una carrera) */}
      <Popper
        open={Boolean(modulos)}
        anchorEl={anchorModulo}
        placement="right-start"
      >
        <Paper sx={{ width: anchoMenu }}>
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
  );
}
