// src/components/AcordionCarreras.tsx
import React, { useEffect, useState } from "react";
import FullCustomAccordion, {
  CustomList,
  CustomListItem,
  CustomTypography,
} from "../FullCustomAccordion/FullCustomAccordion2";

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
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

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

  const handleAccordionChange = (id: string, ancestors: string[]) => {
    const isOpen = openAccordions.includes(id);
    if (isOpen) {
      setOpenAccordions((prev) => prev.filter((item) => item !== id));
    } else {
      setOpenAccordions([...ancestors, id]);
    }
  };

  return (
    <>
      {especialidades.map((esp) => {
        const espId = `esp-${esp.id}`;
        return (
          <FullCustomAccordion
            key={espId}
            id={espId}
            title={esp.tituloComercial}
            expanded={openAccordions.includes(espId)}
            onChange={() => handleAccordionChange(espId, [])}
            ancestors={[]}
          >
            {esp.carreras
              .filter((car) => car.codigo !== null)
              .map((car) => {
                const carId = `car-${car.id}`;
                return (
                  <FullCustomAccordion
                    key={carId}
                    id={carId}
                    title={car.tituloComercial}
                    expanded={openAccordions.includes(carId)}
                    onChange={() =>
                      handleAccordionChange(carId, [espId])
                    }
                    ancestors={[espId]}
                  >
                    <CustomList>
                      {car.modulos.map((mod) => (
                        <CustomListItem key={mod.id}>
                          <CustomTypography>{mod.tituloComercial}</CustomTypography>
                        </CustomListItem>
                      ))}
                    </CustomList>
                  </FullCustomAccordion>
                );
              })}

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
        );
      })}
    </>
  );
}
