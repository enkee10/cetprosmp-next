'use client';
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoNombre from './LogoNombre';
import MenuPrincipal from './MenuPrincipal/MenuPrincipal';
import Busqueda from './Busqueda2';
import Apps from './Apps2';
import Settings from './Settings2';
import User from './User2';
import Sidebar from '../Sidebar/Sidebar';
import { useUser } from '../../context/UserContext';

export default function Header() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const { user } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20 && isLargeScreen) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLargeScreen]);

  useEffect(() => {
    if (!isSmallScreen && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isSmallScreen, sidebarOpen]);

  useEffect(() => {
    if (isSmallScreen) {
      const closeAllMenusEvent = new Event('cerrar-todos-los-menus');
      window.dispatchEvent(closeAllMenusEvent);
    }
  }, [isSmallScreen]);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: scrolled ? '48px' : 'auto',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            px: { xs: 1, md: 2 },
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            minHeight: 'auto !important',
          }}
        >
          {isSmallScreen && (
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={() => setSidebarOpen(true)}
              edge="start"
              sx={{ ml: '0px' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'center', md: 'flex-start' },
              alignItems: 'center',
              minWidth: '238px',
            }}
          >
            <LogoNombre forceCompact={scrolled} />
          </Box>

          <Box
            id="menuPrincipal"
            sx={{
              display: { xs: 'none', md: 'flex' },
              visibility: busquedaAbierta ? 'hidden' : 'visible',
            }}
          >
            <MenuPrincipal />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
            }}
          >
            <Busqueda onOpenChange={setBusquedaAbierta} />
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Settings />
            </Box>
            {user && (
              <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Apps />
              </Box>
            )}
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <User />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => {}}
      />
    </>
  );
}
