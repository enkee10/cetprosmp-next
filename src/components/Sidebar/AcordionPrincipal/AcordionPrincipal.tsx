import React from "react";
import AcordionInicio from "./AcordionInicio";
import AcordionCarreras from "./AcordionCarreras6";
import AcordionNosotros from "./AcordionNosotros";
import AcordionNovedades from "./AcordionNovedades";
import AcordionMatricula from "./AcordionMatricula";
import FullCustomAccordion from "../FullCustomAccordion/FullCustomAccordion2";

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
}

export default function AcordionPrincipal({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const rootId = "principal";

  return (
    <FullCustomAccordion
      id={rootId}
      title="Menú Principal"
      ancestors={[]}
      expanded={openAccordions.includes(rootId)}
      onChange={() => handleAccordionChange(rootId, [])}
    >
      <AcordionInicio
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
      />
      <AcordionCarreras
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
      />
      <AcordionNosotros
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
      />
      <AcordionNovedades
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
      />
      <AcordionMatricula
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
      />
    </FullCustomAccordion>
  );
}
