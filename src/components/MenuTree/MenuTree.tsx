'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NextLink from 'next/link';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  List,
  ListItem,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { styled } from '@mui/material/styles';
import { cerrarTodosLosMenus } from '@/components/Header/MenuPrincipal/_otros/CerrarTodoMenus';

export type MenuTreeNode = {
  id: string | number;
  title: React.ReactNode;
  href?: string;
  children?: MenuTreeNode[];
  kind?: 'item' | 'module';
};

type FlyoutLevel = {
  anchorEl: HTMLElement | null;
  nodes: MenuTreeNode[];
  width?: number | string;
};

type FlyoutMenuTreeProps = {
  label: React.ReactNode;
  href?: string;
  nodes: MenuTreeNode[];
  width?: number | string;
  rootMenuSx?: object;
  sx?: object;
};

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  p: 0,
  m: 0,
  backgroundColor: '#f0fff3',
  color: '#000',
  borderRadius: 8,
  marginBottom: theme.spacing(0),
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  '&:before': { display: 'none' },
  '&.Mui-expanded': { margin: 0 },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: '#318515',
  padding: theme.spacing(1),
  height: '48px !important',
  borderRadius: 6,
  '& .MuiAccordionSummary-content': { margin: 0 },
  '& .MuiAccordionSummary-content.Mui-expanded': { margin: 0 },
  '&.Mui-expanded': { minHeight: '48px' },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  backgroundColor: '#ffffff',
  padding: theme.spacing(0, 0, 0, 1),
  borderTop: '1px solid #ccc',
  '& li': {
    paddingLeft: '0px',
  },
}));

const StyledList = styled(List)(() => ({
  backgroundColor: '#f9f9f9',
  padding: 0,
  margin: 0,
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(0.4),
  paddingLeft: theme.spacing(0.5),
  backgroundColor: '#ffffff',
  position: 'relative',
  minHeight: '48px',
  '&::before': {
    alignSelf: 'flex-start',
    content: '"•"',
    fontSize: '1.2rem',
    lineHeight: 1,
    color: '#888',
    flexShrink: 0,
    marginTop: '0px',
  },
  '&:hover': {
    backgroundColor: '#f1f1f1',
  },
}));

const StyledTypography = styled(Typography)(() => ({
  fontSize: '0.95rem',
  color: 'inherit',
}));

function MenuPaper({
  children,
  width = 256,
  sx = {},
}: {
  children: React.ReactNode;
  width?: number | string;
  sx?: object;
}) {
  return <Paper sx={{ width, mt: 1.4, ml: -1, ...sx }}>{children}</Paper>;
}

function FlyoutItem({
  node,
  onMouseEnter,
}: {
  node: MenuTreeNode;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const content = (
    <Box
      onMouseEnter={onMouseEnter}
      sx={{
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
        cursor: node.href ? 'pointer' : 'default',
        '&:hover': { backgroundColor: node.kind === 'module' ? '#f5f5f5' : '#eee' },
      }}
    >
      {node.kind === 'module' ? (
        <FiberManualRecordIcon sx={{ alignSelf: 'flex-start', mt: 1, fontSize: 8, flexShrink: 0 }} />
      ) : null}
      <Box sx={{ flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
        <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{node.title}</Typography>
      </Box>
      {hasChildren ? (
        <ArrowRightIcon fontSize="small" sx={{ mt: 0.5, alignSelf: 'flex-start', flexShrink: 0 }} />
      ) : null}
    </Box>
  );

  if (!node.href) return content;

  return (
    <Link href={node.href} onClick={cerrarTodosLosMenus} style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}

export function FlyoutMenuTree({
  label,
  href,
  nodes,
  width = 256,
  rootMenuSx = {},
  sx = {},
}: FlyoutMenuTreeProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [levels, setLevels] = useState<FlyoutLevel[]>([]);

  useEffect(() => {
    const handleCloseAllMenus = () => {
      setLevels([]);
    };

    window.addEventListener('cerrar-todos-los-menus', handleCloseAllMenus);
    return () => window.removeEventListener('cerrar-todos-los-menus', handleCloseAllMenus);
  }, []);

  const clearCloseTimer = () => {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const startCloseTimer = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setLevels([]), 150);
  };

  const openRoot = () => {
    clearCloseTimer();
    if (nodes.length > 0) {
      setLevels([{ anchorEl: anchorRef.current, nodes, width }]);
    }
  };

  const handleItemEnter = (event: React.MouseEvent<HTMLDivElement>, node: MenuTreeNode, levelIndex: number) => {
    if (node.children?.length) {
      setLevels((current) => [
        ...current.slice(0, levelIndex + 1),
        { anchorEl: event.currentTarget, nodes: node.children || [], width },
      ]);
      return;
    }

    setLevels((current) => current.slice(0, levelIndex + 1));
  };

  return (
    <Box
      ref={wrapperRef}
      sx={sx}
      onMouseEnter={openRoot}
      onMouseLeave={startCloseTimer}
    >
      <Button
        color="inherit"
        component={href ? NextLink : 'button'}
        href={href}
        ref={anchorRef as React.Ref<HTMLButtonElement>}
      >
        {label}
      </Button>

      {levels.map((level, levelIndex) => (
        <Popper
          key={levelIndex}
          open={Boolean(level.anchorEl) && level.nodes.length > 0}
          anchorEl={level.anchorEl}
          placement={levelIndex === 0 ? 'bottom-start' : 'right-start'}
          sx={{ zIndex: 1300 }}
        >
          <MenuPaper width={level.width} sx={levelIndex === 0 ? rootMenuSx : { mt: 0 }}>
            {level.nodes.map((node) => (
              <FlyoutItem
                key={node.id}
                node={node}
                onMouseEnter={(event) => handleItemEnter(event, node, levelIndex)}
              />
            ))}
          </MenuPaper>
        </Popper>
      ))}
    </Box>
  );
}

type AccordionMenuTreeProps = {
  id: string;
  title: React.ReactNode;
  nodes: MenuTreeNode[];
  expandedIds: string[];
  onToggle: (id: string, ancestors: string[]) => void;
  ancestors?: string[];
  customExpandIcon?: React.ReactNode;
};

function AccordionNode({
  node,
  expandedIds,
  onToggle,
  ancestors,
}: {
  node: MenuTreeNode;
  expandedIds: string[];
  onToggle: (id: string, ancestors: string[]) => void;
  ancestors: string[];
}) {
  const nodeId = String(node.id);
  const hasChildren = Boolean(node.children?.length);

  if (!hasChildren) {
    const item = (
      <StyledListItem>
        <StyledTypography>{node.title}</StyledTypography>
      </StyledListItem>
    );

    if (!node.href) return item;

    return (
      <Link href={node.href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {item}
      </Link>
    );
  }

  const expanded = expandedIds.includes(nodeId);

  return (
    <StyledAccordion expanded={expanded} onChange={() => onToggle(nodeId, ancestors)}>
      <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
        <StyledTypography as="span" fontWeight="bold">
          {node.title}
        </StyledTypography>
      </StyledAccordionSummary>
      <StyledAccordionDetails>
        {node.children?.map((child) => (
          <AccordionNode
            key={child.id}
            node={child}
            expandedIds={expandedIds}
            onToggle={onToggle}
            ancestors={[nodeId, ...ancestors]}
          />
        ))}
      </StyledAccordionDetails>
    </StyledAccordion>
  );
}

export function AccordionMenuTree({
  id,
  title,
  nodes,
  expandedIds,
  onToggle,
  ancestors = [],
  customExpandIcon,
}: AccordionMenuTreeProps) {
  const expanded = expandedIds.includes(id);
  const rotatingIcon = (
    <Box
      sx={{
        transition: 'transform 0.2s ease-in-out',
        transform: expanded ? 'rotate(-270deg)' : 'rotate(0deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ExpandMoreIcon />
    </Box>
  );

  return (
    <StyledAccordion expanded={expanded} onChange={() => onToggle(id, ancestors)}>
      <StyledAccordionSummary expandIcon={customExpandIcon ?? rotatingIcon}>
        <StyledTypography as="span" fontWeight="bold">
          {title}
        </StyledTypography>
      </StyledAccordionSummary>
      <StyledAccordionDetails>
        <StyledList>
          {nodes.map((node) => (
            <AccordionNode
              key={node.id}
              node={node}
              expandedIds={expandedIds}
              onToggle={onToggle}
              ancestors={[id, ...ancestors]}
            />
          ))}
        </StyledList>
      </StyledAccordionDetails>
    </StyledAccordion>
  );
}

export {
  StyledList as MenuTreeList,
  StyledListItem as MenuTreeListItem,
  StyledTypography as MenuTreeTypography,
};
