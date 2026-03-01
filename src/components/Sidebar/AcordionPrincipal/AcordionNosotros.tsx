import React, { useEffect, useState } from "react";
import FullCustomAccordion, {
  CustomList,
  CustomListItem,
  CustomTypography,
} from "../FullCustomAccordion/FullCustomAccordion2";

interface Subitem {
  id: number;
  titulo: string;
}

interface Item {
  id: number;
  titulo: string;
  subitems?: Subitem[];
}

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
}

export default function AcordionNosotros({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const rootId = "principal-nosotros";

  useEffect(() => {
    fetch("/nosotros.json")
      .then((res) => res.json())
      .then((data: Item[]) => {
        const validItems = data.filter(
          (item) =>
            item.titulo.trim() !== "" ||
            (Array.isArray(item.subitems) && item.subitems.length > 0)
        );
        setItems(validItems);
      });
  }, []);

  const isDisabled = items.length === 0;

  return (
    <FullCustomAccordion
      id={rootId}
      title="Nosotros"
      ancestors={["principal"]}
      expanded={!isDisabled && openAccordions.includes(rootId)}
      onChange={() => {
        if (!isDisabled) {
          handleAccordionChange(rootId, ["principal"]);
        }
      }}
    >
      {!isDisabled &&
        items.map((item) => {
          const itemId = `${rootId}-${item.id}`;
          const tieneSubitems =
            Array.isArray(item.subitems) && item.subitems.length > 0;

          if (item.titulo.trim() === "" && !tieneSubitems) return null;

          return tieneSubitems ? (
            <FullCustomAccordion
              key={itemId}
              id={itemId}
              title={item.titulo}
              ancestors={[rootId, "principal"]}
              expanded={openAccordions.includes(itemId)}
              onChange={() => handleAccordionChange(itemId, [rootId, "principal"])}
            >
              <CustomList>
                {item.subitems!.map((sub) => (
                  <CustomListItem key={sub.id}>
                    <CustomTypography>{sub.titulo}</CustomTypography>
                  </CustomListItem>
                ))}
              </CustomList>
            </FullCustomAccordion>
          ) : (
            <CustomListItem key={itemId}>
              <CustomTypography>{item.titulo}</CustomTypography>
            </CustomListItem>
          );
        })}
    </FullCustomAccordion>
  );
}
