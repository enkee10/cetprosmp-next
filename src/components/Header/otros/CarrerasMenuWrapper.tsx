// Importación de React y hooks necesarios
import React, { useEffect, useRef, useState } from "react";

// Importación de componentes de MUI
import {
  Box,
  Button,
  Typography,
  Paper,
  Popper,
  ClickAwayListener,
} from "@mui/material";

// Importación de íconos de MUI
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Definición del tipo Modulo
type Modulo = {
  id: number;
  tituloComercial: string;
  horas?: number;
  activo?: boolean;
};

// Definición del tipo Carrera
type Carrera = {
  id: number;
  tituloComercial: string;
  codigo: string | null;
  duracion: number;
  modulos: Modulo[];
};

// Definición del tipo Especialidad
type Especialidad = {
  id: number;
  tituloComercial: string;
  carreras: Carrera[];
};

// Componente principal exportado
export default function CarrerasMenuWrapper() {
  const anchoMenu = "256px"; // Ancho del menú desplegable

  // Estado que controla si el menú principal está abierto
  const [open, setOpen] = useState(false);

  // Estado que contiene las especialidades cargadas del JSON
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  // Estado que contiene las carreras con módulos válidos (con código)
  const [carreras, setCarreras] = useState<
    { id: number; titulo: string; modulos: Modulo[] }[]
  >([]);

  // Estado con los módulos de una carrera seleccionada
  const [modulos, setModulos] = useState<Modulo[] | null>(null);

  // Referencia para posicionar el menú de carreras
  const [anchorCarrera, setAnchorCarrera] = useState<HTMLElement | null>(null);

  // Referencia para posicionar el menú de módulos
  const [anchorModulo, setAnchorModulo] = useState<HTMLElement | null>(null);

  // Estado con módulos de carreras que no tienen código (se muestran como sueltos)
  const [modulosDirectos, setModulosDirectos] = useState<Modulo[]>([]);

  // Referencia al botón "Carreras"
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Al montar el componente, se carga el JSON y se ordenan las especialidades por ID
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carreras.json");
      const data: Especialidad[] = await res.json();
      const sorted = [...data].sort((a, b) => a.id - b.id); // Ordenar por ID ascendente
      setEspecialidades(sorted);
    };
    fetchData();
  }, []);

  // Función que reinicia todos los submenús y anclas
  const resetMenuState = () => {
    setCarreras([]);
    setModulos(null);
    setAnchorCarrera(null);
    setAnchorModulo(null);
    setModulosDirectos([]);
  };

  // Controla la apertura/cierre del menú principal al hacer clic en el botón
  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) resetMenuState(); // Si se cierra, reinicia todo
      return next;
    });
  };

  // Si se hace clic fuera del menú y no en el botón, se cierra
  const handleClickAway = (event: MouseEvent | TouchEvent) => {
    if (
      buttonRef.current &&
      event.target instanceof Node &&
      buttonRef.current.contains(event.target)
    ) {
      return; // No cerrar si el clic fue en el botón
    }
    setOpen(false);
    resetMenuState();
  };

  // Al pasar el mouse por una especialidad, muestra sus carreras y módulos
  const handleEspecialidadEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    carrerasLista: Carrera[]
  ) => {
    const visibles: { id: number; titulo: string; modulos: Modulo[] }[] = [];
    const modulosSueltos: Modulo[] = [];

    // Ordenar carreras por ID
    const carrerasOrdenadas = [...carrerasLista].sort((a, b) => a.id - b.id);

    for (const car of carrerasOrdenadas) {
      const modulosOrdenados = [...car.modulos].sort((a, b) => a.id - b.id);
      if (car.codigo && car.codigo.trim() !== "") {
        // Solo se muestran carreras con código
        visibles.push({
          id: car.id,
          titulo: car.tituloComercial,
          modulos: modulosOrdenados,
        });
      } else {
        // Si la carrera no tiene código, sus módulos se agregan como sueltos
        modulosSueltos.push(...modulosOrdenados);
      }
    }

    setAnchorCarrera(e.currentTarget); // Posiciona el menú de carreras
    setCarreras(visibles); // Actualiza las carreras válidas
    setModulosDirectos(modulosSueltos.sort((a, b) => a.id - b.id)); // Módulos sueltos ordenados
    setModulos(null); // Cierra submenú de módulos
  };

  // Al pasar el mouse por una carrera, se muestran sus módulos
  const handleCarreraEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    modulos: Modulo[]
  ) => {
    const ordenados = [...modulos].sort((a, b) => a.id - b.id); // Ordenar módulos por ID
    setAnchorModulo(e.currentTarget); // Posiciona el menú de módulos
    setModulos(ordenados); // Actualiza los módulos visibles
  };

  return (
    // Detecta clics fuera del componente
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box component="span" sx={{ zIndex: 1300, position: "relative", lineHeight:"0px" }}>
        {/* Botón Carreras con ícono desplegable */}
        <Button
          color="inherit"
          onClick={handleToggle}
          ref={buttonRef}
          sx={{
            whiteSpace: "nowrap", // Evita saltos de línea
          }}
        >
          Carreras
          {/* Icono flecha hacia abajo 
          <ArrowDropDownIcon sx={{fontSize:"13px"}} />*/}
        </Button>

        {/* Menú de Especialidades */}
        {open && buttonRef.current && (
          <Popper open anchorEl={buttonRef.current} placement="bottom-start">
            <Paper sx={{ width: anchoMenu, mt: 1.6, ml: -20 }}>
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
                    "&:hover": { backgroundColor: "#eee" }, // Efecto hover
                  }}
                >
                  <Typography>{esp.tituloComercial}</Typography>
                  <ArrowRightIcon fontSize="small" /> {/* Ícono flecha derecha */}
                </Box>
              ))}
            </Paper>
          </Popper>
        )}

        {/* Menú de Carreras + Módulos sueltos */}
        <Popper
          open={anchorCarrera !== null}
          anchorEl={anchorCarrera}
          placement="right-start"
        >
          <Paper sx={{ width: anchoMenu, ml: -1 }}>
            {/* Carreras con código */}
            {carreras.map((car) => (
              <Box
                key={`car-${car.id}`}
                onMouseEnter={(e) => handleCarreraEnter(e, car.modulos)}
                sx={{
                  px: 2,
                  py: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems:"center",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "#eee" },
                }}
              >
                <Typography>{car.titulo}</Typography>
                <ArrowRightIcon fontSize="small" /> {/* flecha para submenu */}
              </Box>
            ))}

            {/* Módulos de carreras sin código */}
            {modulosDirectos.map((mod) => (
              <Box
                key={`mod-${mod.id}`}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: "default",
                  "&:hover": { backgroundColor: "#eee" },
                }}
              >
                <Typography>{mod.tituloComercial}</Typography>
              </Box>
            ))}
          </Paper>
        </Popper>

        {/* Menú de Módulos de una carrera */}
        <Popper
          open={Boolean(modulos)}
          anchorEl={anchorModulo}
          placement="right-start"
        >
          <Paper sx={{ width: anchoMenu, ml: -1 }}>
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
