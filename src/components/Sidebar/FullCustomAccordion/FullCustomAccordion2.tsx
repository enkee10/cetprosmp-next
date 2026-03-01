// src/components/FullCustomAccordion.tsx
import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled } from "@mui/material/styles";

// 🎨 Estilos personalizados
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  p: 0,
  m: 0,
  backgroundColor: "#f0fff3",
  color: "#000",
  borderRadius: 8,
  marginBottom: theme.spacing(0),
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  "&:before": { display: "none" },
  "&.Mui-expanded": { margin: 0 },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: "#318515",
  padding: theme.spacing(1),
  height: "48px !important",
  borderRadius: 6,
  "& .MuiAccordionSummary-content": { margin: 0 },
  "& .MuiAccordionSummary-content.Mui-expanded": { margin: 0 },
  "&.Mui-expanded": { minHeight: "48px" },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  backgroundColor: "#ffffff",
  padding: theme.spacing(0, 0, 0, 1),
  borderTop: "1px solid #ccc",
  "& li": {
    paddingLeft: "0px",
  },
}));

const StyledList = styled(List)(({ theme }) => ({
  backgroundColor: "#f9f9f9",
  padding: 0,
  margin: 0,
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(0.4),
  paddingLeft: theme.spacing(0.5),
  backgroundColor: "#ffffff",
  position: "relative",
  minHeight: "48px",
  "&::before": {
    alignSelf: "flex-start",
    content: '"•"',
    fontSize: "1.2rem",
    lineHeight: 1,
    color: "#888",
    flexShrink: 0,
    marginTop: "0px",
  },
  "&:hover": {
    backgroundColor: "#f1f1f1",
  },
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  fontSize: "0.95rem",
  color: "#333",
}));

// Props del componente
interface Props {
  id: string;
  ancestors: string[];
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  customExpandIcon?: React.ReactNode;
}

// Componente completo reutilizable
export default function FullCustomAccordion({
  id,
  ancestors,
  expanded,
  onChange,
  title,
  children,
  customExpandIcon,
}: Props) {
  // ✅ Ícono con rotación personalizada solo si no se usa customExpandIcon
  const rotatingIcon = (
    <Box
      sx={{
        transition: "transform 0.2s ease-in-out",
        transform: expanded ? "rotate(-270deg)" : "rotate(0deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ExpandMoreIcon />
    </Box>
  );

  return (
    <StyledAccordion expanded={expanded} onChange={onChange}>
      <StyledAccordionSummary expandIcon={customExpandIcon ?? rotatingIcon}>
        <StyledTypography fontWeight="bold">{title}</StyledTypography>
      </StyledAccordionSummary>
      <StyledAccordionDetails>{children}</StyledAccordionDetails>
    </StyledAccordion>
  );
}

// Exportar estilos internos para uso opcional
export {
  StyledList as CustomList,
  StyledListItem as CustomListItem,
  StyledTypography as CustomTypography,
};
