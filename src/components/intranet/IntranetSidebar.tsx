'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AcordionIntranet, { IntranetMenuSection, menuSections } from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
import { isDocenteRole, isStaffRestrictedRole } from '@/lib/intranetPermissions';
import { httpsCallable } from 'firebase/functions';

type DocenteModulo = {
  id: number;
  nombre?: string | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

const getDocenteModuloTitle = (modulo: DocenteModulo) =>
  `Notas ${modulo.nombre || modulo.modulo?.titulo || modulo.modulo?.tituloComercial || `Modulo ${modulo.id}`}`;

export default function IntranetSidebar() {
  const { user } = useAuth();
  const [openAccordions, setOpenAccordions] = useState<string[]>(['intranet-registros']);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [docenteModulos, setDocenteModulos] = useState<DocenteModulo[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDocente = isDocenteRole(user?.role);
  const isStaffRestricted = isStaffRestrictedRole(user?.role);

  useEffect(() => {
    if (!isDocente) {
      setDocenteModulos([]);
      return;
    }

    let active = true;
    const loadDocenteModulos = async () => {
      try {
        const listRegistroAuxiliarDocenteModulos = httpsCallable<
          { semestreTitulo?: string },
          { modulos?: DocenteModulo[] }
        >(functions, 'listRegistroAuxiliarDocenteModulos');
        const result = await listRegistroAuxiliarDocenteModulos({ semestreTitulo: '2026-1' });
        if (active) setDocenteModulos(result.data.modulos || []);
      } catch (error) {
        console.error('Error loading docente registro auxiliar modulos:', error);
        if (active) setDocenteModulos([]);
      }
    };

    void loadDocenteModulos();
    return () => {
      active = false;
    };
  }, [isDocente]);

  const visibleSections = useMemo<IntranetMenuSection[]>(() => {
    if (isDocente) {
      return menuSections
        .filter((section) => ['registros', 'reportes'].includes(section.id))
        .map((section) => {
          if (section.id !== 'registros') return { ...section, items: [] };
          return {
            ...section,
            items: docenteModulos.map((modulo) => ({
              id: `registro-auxiliar-${modulo.id}`,
              title: getDocenteModuloTitle(modulo),
              path: `/intranet/registro-auxiliar?grupoModuloId=${modulo.id}`,
              icon: <FactCheckIcon />,
            })),
          };
        });
    }

    if (isStaffRestricted) {
      return menuSections.filter((section) => ['registros', 'reportes'].includes(section.id));
    }

    return menuSections;
  }, [docenteModulos, isDocente, isStaffRestricted]);

  const hoveredSection = visibleSections.find((section) => section.id === hoveredSectionId) ?? null;

  const handleAccordionChange = (id: string, ancestors: string[]) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(id);
      return isOpen ? prev.filter((item) => item !== id) : [...ancestors, id];
    });
  };

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const handleCompactSectionEnter = (sectionId: string, element: HTMLElement) => {
    clearCloseTimer();
    setHoveredSectionId(sectionId);
    setAnchorEl(element);
  };

  const scheduleCompactMenuClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoveredSectionId(null);
      setAnchorEl(null);
    }, 140);
  };

  return (
    <Box
      sx={{
        bgcolor: '#5a3929',
        color: '#f7f0df',
        minHeight: '100vh',
        width: collapsed ? 64 : 230,
        flexShrink: 0,
        transition: 'width 180ms ease',
        overflow: 'visible',
        position: 'relative',
        zIndex: 20,
        '& .MuiDivider-root': {
          borderColor: 'rgba(255,255,255,0.08)',
        },
        '& .MuiAccordion-root': {
          bgcolor: 'transparent',
          color: 'inherit',
          boxShadow: 'none',
          borderRadius: '0 !important',
        },
        '& .MuiAccordionSummary-root': {
          bgcolor: '#5a3929',
          color: '#b9e8ff',
          borderRadius: '0 !important',
          minHeight: '48px !important',
          '&:hover': { bgcolor: '#684431' },
          '& .MuiAccordionSummary-content': { color: '#b9e8ff' },
          '& .MuiTypography-root': { color: '#b9e8ff' },
          '& .MuiTypography-root, & .MuiTypography-root *': { color: '#b9e8ff' },
          '& .MuiSvgIcon-root': { color: '#b9e8ff' },
        },
        '& .MuiAccordionSummary-expandIconWrapper': {
          color: '#b9e8ff',
        },
        '& .MuiAccordionDetails-root': {
          bgcolor: '#4b3023',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        },
        '& .MuiAccordionDetails-root .MuiList-root': {
          bgcolor: 'transparent',
        },
        '& .MuiAccordionDetails-root .MuiListItem-root': {
          bgcolor: 'transparent',
        },
        '& .MuiAccordionDetails-root .MuiListItemButton-root': {
          color: 'rgba(247,240,223,0.78)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fffaf0' },
        },
        '& .MuiAccordionDetails-root .MuiListItemIcon-root': {
          color: 'inherit',
        },
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: '72px !important',
          px: collapsed ? 1 : 1.5,
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        {!collapsed && (
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              INTRANET-SMP
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(247, 240, 223, 0.72)',
                display: 'block',
                fontSize: 10.5,
                fontStyle: 'italic',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              automatizando procesos..
            </Typography>
          </Box>
        )}
        <IconButton
          color="inherit"
          aria-label={collapsed ? 'Expandir menu intranet' : 'Contraer menu intranet'}
          onClick={() => {
            clearCloseTimer();
            setCollapsed((prev) => !prev);
            setHoveredSectionId(null);
            setAnchorEl(null);
          }}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.08)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      {collapsed ? (
        <Box sx={{ py: 1 }}>
          {visibleSections.map((section) => (
            <Box
              key={section.id}
              onMouseEnter={(event) => handleCompactSectionEnter(section.id, event.currentTarget)}
              onMouseLeave={scheduleCompactMenuClose}
              sx={{
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconButton
                aria-label={section.title}
                color="inherit"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1,
                  color: hoveredSectionId === section.id ? '#d7f3ff' : '#b9e8ff',
                  bgcolor: hoveredSectionId === section.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                  '& svg': { fontSize: 24 },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: '#d7f3ff' },
                }}
              >
                {section.icon}
              </IconButton>
            </Box>
          ))}

          <Popper
            open={Boolean(hoveredSection && anchorEl)}
            anchorEl={anchorEl}
            placement="right-start"
            sx={{ zIndex: 1400 }}
            modifiers={[
              {
                name: 'offset',
                options: { offset: [0, 0] },
              },
            ]}
          >
            {hoveredSection && (
              <Paper
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleCompactMenuClose}
                elevation={8}
                sx={{
                  width: 260,
                  ml: 0.5,
                  bgcolor: '#4b3023',
                  color: '#f7f0df',
                  borderRadius: 0,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    minHeight: 52,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    bgcolor: '#5a3929',
                  }}
                >
                  <Box sx={{ display: 'flex', '& svg': { fontSize: 22 } }}>{hoveredSection.icon}</Box>
                  <Typography sx={{ fontWeight: 700 }}>{hoveredSection.title}</Typography>
                </Box>
                <List dense disablePadding>
                  {hoveredSection.items.length > 0 ? (
                    hoveredSection.items.map((item) => (
                      <ListItemButton
                        key={item.id}
                        component={Link}
                        href={item.path}
                        sx={{
                          minHeight: 42,
                          px: 2,
                          color: 'rgba(247,240,223,0.78)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fffaf0' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34, color: 'inherit', '& svg': { fontSize: 20 } }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: 13.5 }} />
                      </ListItemButton>
                    ))
                  ) : (
                    <Box sx={{ px: 2, py: 1.5, color: 'rgba(247,240,223,0.58)', fontSize: 13 }}>
                      Sin opciones
                    </Box>
                  )}
                </List>
              </Paper>
            )}
          </Popper>
        </Box>
      ) : (
        <AcordionIntranet
          openAccordions={openAccordions}
          handleAccordionChange={handleAccordionChange}
          showRoot={false}
          sections={visibleSections}
        />
      )}
      <Divider />
    </Box>
  );
}
