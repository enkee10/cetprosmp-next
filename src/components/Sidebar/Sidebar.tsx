// src/components/Sidebar.tsx

import { useEffect, useRef } from "react";
import SidebarUserInfo from "../Sidebar/SidebarUserInfo";
import AcordionGeneral from "./AcordionGeneral";
import { SwipeableDrawer, Box } from "@mui/material";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void; // necesario para SwipeableDrawer
}

export default function Sidebar({ open, onClose, onOpen = () => {} }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Cerrar al hacer clic en cualquier enlace dentro del Sidebar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!sidebarRef.current) return;

      const target = e.target as HTMLElement;
      const clickedInside = sidebarRef.current.contains(target);

      if (clickedInside && target.closest("a")) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sidebarRef.current) return;
      const target = e.target as HTMLElement;

      // Enter sobre un <a> dentro del Sidebar
      if (e.key === "Enter" && sidebarRef.current.contains(target) && target.closest("a")) {
        onClose();
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableBackdropTransition={false}
      disableDiscovery={false}
      disableSwipeToOpen={true}
      swipeAreaWidth={0}
      transitionDuration={250}
      hysteresis={0.4}
      sx={{
        "& .MuiDrawer-paper": {
          width: 300,
          boxSizing: "border-box",
        },
      }}
    >
      <Box ref={sidebarRef}>
        <SidebarUserInfo />
        <AcordionGeneral />
      </Box>
    </SwipeableDrawer>
  );
}
