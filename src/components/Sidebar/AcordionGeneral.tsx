"use client";
import React, { useEffect, useState } from "react";
import AcordionPrincipal from "./AcordionPrincipal/AcordionPrincipal";
import AcordionIntranet from "./AcordionIntranet/AcordionIntranet";
import { Box } from "@mui/material";
import { useUser } from "@/context/UserContext";

// Tipos para leer el JSON de intranet
interface Subitem {
  id: string;
  titulo: string;
}
interface Item {
  id: string;
  titulo: string;
  subitems?: Subitem[];
}

export default function AcordionGeneral() {
  const { user } = useUser();
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [intranetData, setIntranetData] = useState<Item[]>([]);

  // Cargar los IDs que se deben abrir automáticamente
  useEffect(() => {
    if (user) {
      // Usuario logueado: abrir Intranet y sus primeros descendientes
      const loadIntranet = async () => {
        try {
          const res = await fetch("/intranet.json");
          const data: Item[] = await res.json();

          if (!Array.isArray(data) || data.length === 0) return;

          const firstItem = data[0];
          const firstChildId = `intranet-${firstItem.id}`;
          const subitemId = firstItem.subitems?.[0]?.id;
          const fullSubitemId = subitemId ? `intranet-${firstItem.id}-${subitemId}` : null;

          const toOpen = ["intranet"];
          if (firstItem && firstItem.subitems?.length) {
            toOpen.push(firstChildId);
          }
          if (fullSubitemId) {
            toOpen.push(fullSubitemId);
          }

          setOpenAccordions(toOpen);
        } catch (error) {
          console.error("Error loading intranet.json:", error);
        }
      };

      loadIntranet();
    } else {
      // Usuario NO logueado: abrir Principal y Carreras
      setOpenAccordions(["principal"/*, "principal-carreras"*/]);
    }
  }, [user]);

  const handleAccordionChange = (id: string, ancestors: string[]) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(id);
      return isOpen ? prev.filter((item) => item !== id) : [...ancestors, id];
    });
  };

  return (
    <>
      <Box mb={2} mx={1}
        sx={{
          "& .MuiAccordionSummary-root": {
            backgroundColor: "#a0cde0",
          },
        }}
      >
        <AcordionPrincipal
          openAccordions={openAccordions}
          handleAccordionChange={handleAccordionChange}
        />
      </Box>

      {user && (
        <Box mb={2} mx={1}
          sx={{
            "& .MuiAccordionSummary-root": {
              backgroundColor: "#a0df9c",
            },
          }}
        >
          <AcordionIntranet
            openAccordions={openAccordions}
            handleAccordionChange={handleAccordionChange}
          />
        </Box>
      )}
    </>
  );
}
