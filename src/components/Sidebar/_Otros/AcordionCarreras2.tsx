import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  List,
  ListItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

export default function AcordionCarreras() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/data/carreras.json");
      const data: Especialidad[] = await res.json();

      // Ordenar por ID
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

  return (
    <Box sx={{bgcolor:"red"}}>
      {especialidades.map((esp) => (
        <Accordion key={esp.id } sx={{bgcolor:"yellow" }}>
          <AccordionSummary sx={{bgcolor:"green", px:1}} expandIcon={<ExpandMoreIcon sx={{bgcolor:"blue"}}/>}>
            <Typography sx={{bgcolor:"aqua"}}>{esp.tituloComercial}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{bgcolor:"cyan"}}>
            {esp.carreras
              .filter((car) => car.codigo !== null)
              .map((car) => (
                <Accordion key={car.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{car.tituloComercial}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense disablePadding  sx={{bgcolor:"gray"}}>
                      {car.modulos.map((mod) => (
                        <ListItem key={mod.id} sx={{ pl: 3, bgcolor:"orange"}}>
                          <Typography variant="body2">
                            {mod.tituloComercial}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}

            {/* Módulos sueltos (de carreras sin código) */}
            {esp.carreras
              .filter((car) => car.codigo === null)
              .flatMap((car) => car.modulos)
              .map((mod) => (
                <ListItem key={mod.id} sx={{ pl: 2 }}>
                  <Typography variant="body2">{mod.tituloComercial}</Typography>
                </ListItem>
              ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
