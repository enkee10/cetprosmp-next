import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import FullCustomAccordion, {
  CustomList,
  CustomListItem,
  CustomTypography,
} from "./FullCustomAccordion";

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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [subExpandedId, setSubExpandedId] = useState<number | null>(null);

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

  return (
    <Box>
      {especialidades.map((esp) => (
        <FullCustomAccordion
          key={esp.id}
          title={esp.tituloComercial}
          expanded={expandedId === esp.id}
          onChange={() =>
            setExpandedId(expandedId === esp.id ? null : esp.id)
          }
        >
          {esp.carreras
            .filter((car) => car.codigo !== null)
            .map((car) => (
              <FullCustomAccordion
                key={car.id}
                title={car.tituloComercial}
                expanded={subExpandedId === car.id}
                onChange={() =>
                  setSubExpandedId(subExpandedId === car.id ? null : car.id)
                }
              >
                <CustomList dense disablePadding>
                  {car.modulos.map((mod) => (
                    <CustomListItem key={mod.id}>
                      <CustomTypography>{mod.tituloComercial}</CustomTypography>
                    </CustomListItem>
                  ))}
                </CustomList>
              </FullCustomAccordion>
            ))}

          {/* Módulos sueltos */}
          {esp.carreras
            .filter((car) => car.codigo === null)
            .flatMap((car) => car.modulos)
            .map((mod) => (
              <CustomListItem key={mod.id}>
                <CustomTypography>{mod.tituloComercial}</CustomTypography>
              </CustomListItem>
            ))}
        </FullCustomAccordion>
      ))}
    </Box>
  );
}
