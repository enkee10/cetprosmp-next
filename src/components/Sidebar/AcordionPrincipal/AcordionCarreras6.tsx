import React, { useEffect, useState } from "react";
import Link from "next/link";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/material";
import FullCustomAccordion, {
  CustomList,
  CustomListItem,
  CustomTypography,
} from "../FullCustomAccordion/FullCustomAccordion2";

type Modulo = { id: number; tituloComercial: string; slug: string };
type Carrera = {
  id: number;
  tituloComercial: string;
  codigo: string | null;
  duracion: number;
  slug: string;
  modulos: Modulo[];
};
type Especialidad = {
  id: number;
  tituloComercial: string;
  slug: string;
  carreras: Carrera[];
};

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
}

export default function AcordionCarreras({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const rootId = "principal-carreras";

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

  // Expanded de AcordionCarreras pincipal
  const isRootExpanded = openAccordions.includes(rootId);


  // 🔁 Función para renderizar icono girado según estado
  const getStyledIcon = (expanded: boolean) => (
    <Box
      sx={{
        backgroundColor: "rgba(255, 0, 0, 0.2)",
        borderRadius: "50%",
        p: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s ease-in-out",
        transform: expanded ? "rotate(-270deg)" : "rotate(0deg)", // ▶ ↔ ▼
      }}
    >
      <ExpandMoreIcon />
    </Box>
  );

  return (
    <FullCustomAccordion
      id={rootId}
      title="Carreras"
      expanded={isRootExpanded}
      onChange={() => handleAccordionChange(rootId, ["principal"])}
      ancestors={["principal"]}
      customExpandIcon={
        <Link
          href="/especialidades"
          style={{ display: "flex", alignItems: "center" }}
        >
          {getStyledIcon(isRootExpanded)}
        </Link>
      }
    >
      {especialidades.map((esp) => {
        const espId = `${rootId}-esp-${esp.id}`;
        const isEspExpanded = openAccordions.includes(espId);

        return (
          <FullCustomAccordion
            key={espId}
            id={espId}
            title={esp.tituloComercial}
            expanded={isEspExpanded}
            onChange={() => handleAccordionChange(espId, [rootId, "principal"])}
            ancestors={[rootId, "principal"]}
            customExpandIcon={
              <Link
                href={`/especialidades/${esp.slug}`}
                style={{ display: "flex", alignItems: "center" }}
              >
                {getStyledIcon(isEspExpanded)}
              </Link>
            }
          >
            {esp.carreras
              .filter((car) => car.codigo !== null)
              .map((car) => {
                const carId = `${espId}-car-${car.id}`;
                const isCarExpanded = openAccordions.includes(carId);

                return (
                  <FullCustomAccordion
                    key={carId}
                    id={carId}
                    title={car.tituloComercial}
                    expanded={isCarExpanded}
                    onChange={() =>
                      handleAccordionChange(carId, [espId, rootId, "principal"])
                    }
                    ancestors={[espId, rootId, "principal"]}
                    customExpandIcon={
                      <Link
                        href={`/carreras/${car.slug}`}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        {getStyledIcon(isCarExpanded)}
                      </Link>
                    }
                  >
                    <CustomList>
                      {car.modulos.map((mod) => (
                        <CustomListItem key={mod.id}>
                          <Link
                            href={`/modulos/${mod.slug}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <CustomTypography>{mod.tituloComercial}</CustomTypography>
                          </Link>
                        </CustomListItem>
                      ))}
                    </CustomList>
                  </FullCustomAccordion>
                );
              })}

            {esp.carreras
              .filter((car) => car.codigo === null)
              .flatMap((car) => car.modulos)
              .map((mod) => (
                <CustomListItem key={mod.id}>
                  <Link
                    href={`/modulos/${mod.slug}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <CustomTypography>{mod.tituloComercial}</CustomTypography>
                  </Link>
                </CustomListItem>
              ))}
          </FullCustomAccordion>
        );
      })}
    </FullCustomAccordion>
  );
}
