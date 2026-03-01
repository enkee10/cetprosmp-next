'use client';
import React, { useEffect, useState } from "react";
import FullCustomAccordion, {
  CustomList,
  CustomListItem,
  CustomTypography,
} from "../FullCustomAccordion/FullCustomAccordion2";

interface Subitem {
  id: string;
  titulo: string;
}

interface Item {
  id: string;
  titulo: string;
  subitems?: Subitem[];
}

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
}

export default function AcordionIntranet({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const rootId = "intranet";

  useEffect(() => {
    fetch("/intranet.json")
      .then((res) => res.json())
      .then((data: Item[]) => setItems(data));
  }, []);

  const isDisabled = items.length === 0;

  return (
    <FullCustomAccordion
      id={rootId}
      title="Intranet"
      ancestors={[]}
      expanded={!isDisabled && openAccordions.includes(rootId)}
      onChange={() => {
        if (!isDisabled) {
          handleAccordionChange(rootId, []);
        }
      }}
    >
      {!isDisabled &&
        items.map((item) => {
          const itemId = `${rootId}-${item.id}`;
          const hasSubitems =
            Array.isArray(item.subitems) && item.subitems.length > 0;

          if (item.titulo.trim() === "" && !hasSubitems) return null;

          return hasSubitems ? (
            <FullCustomAccordion
              key={itemId}
              id={itemId}
              title={item.titulo}
              ancestors={[rootId]}
              expanded={openAccordions.includes(itemId)}
              onChange={() => handleAccordionChange(itemId, [rootId])}
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
